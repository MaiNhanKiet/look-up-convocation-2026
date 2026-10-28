"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveDataSource } from "@/lib/config";
import { getPrisma } from "@/lib/db";
import {
  clearAdminSession,
  readAdminPassword,
  requireAdmin,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/admin/session";
import {
  describeChanges,
  getStudent,
  parseStudentForm,
  recordAudit,
  type StudentInput,
} from "@/lib/admin/students";
import { consumePostgresQuota } from "@/lib/postgres/students";
import {
  clientAddress,
  consumeRequestQuota,
  hashRateLimitKey,
} from "@/lib/security/rate-limit";
import { parseStudentCode } from "@/lib/validators/student";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  if (!readAdminPassword()) {
    return { error: "Chưa cấu hình ADMIN_PASSWORD (tối thiểu 8 ký tự)." };
  }

  const request = new Request("http://admin.local", { headers: await headers() });
  const key = hashRateLimitKey(clientAddress(request), "admin-login");
  try {
    const quota =
      resolveDataSource() === "postgres"
        ? await consumePostgresQuota(key)
        : await consumeRequestQuota(key);
    if (!quota.allowed) {
      return { error: `Thử lại sau ${quota.retryAfterSeconds} giây.` };
    }
  } catch {
    return { error: "Không kiểm tra được giới hạn đăng nhập." };
  }

  const password = form.get("password");
  if (typeof password !== "string" || !verifyAdminPassword(password)) {
    return { error: "Mật khẩu không đúng." };
  }

  await setAdminSession();
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await clearAdminSession();
  redirect("/admin/login");
}

export type StudentFormState = {
  errors?: Partial<Record<keyof StudentInput, string>>;
  message?: string;
  // Echoed back because React resets the form after an action completes.
  values?: Record<string, string>;
  attempt?: number;
};

function echo(form: FormData, prev: StudentFormState) {
  const values: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  }
  return { values, attempt: (prev.attempt ?? 0) + 1 };
}

export async function saveStudentAction(
  prev: StudentFormState,
  form: FormData,
): Promise<StudentFormState> {
  await requireAdmin();

  const kept = echo(form, prev);
  const parsed = parseStudentForm(form);
  if (!parsed.ok) {
    return { ...kept, errors: parsed.errors, message: "Vui lòng kiểm tra lại các trường." };
  }
  const data = parsed.data;

  const original = parseStudentCode(form.get("originalCode") ?? "");
  const prisma = getPrisma();

  try {
    if (!original.ok) {
      if (await getStudent(data.studentCode)) {
        return { ...kept, errors: { studentCode: "MSSV đã tồn tại." } };
      }
      await prisma.student.create({ data });
      await recordAudit("CREATE", data.studentCode, data.fullName);
    } else {
      const before = await getStudent(original.code);
      if (!before) return { ...kept, message: "Sinh viên không còn tồn tại." };
      if (original.code !== data.studentCode && (await getStudent(data.studentCode))) {
        return { ...kept, errors: { studentCode: "MSSV đã tồn tại." } };
      }
      await prisma.student.update({ where: { studentCode: original.code }, data });
      await recordAudit(
        "UPDATE",
        data.studentCode,
        original.code !== data.studentCode
          ? `Đổi MSSV từ ${original.code}. ${describeChanges(before, data)}`
          : describeChanges(before, data),
      );
    }
  } catch {
    return { ...kept, message: "Không lưu được. Vui lòng thử lại." };
  }

  redirect(`/admin/students/${data.studentCode}?saved=1`);
}

export async function deleteStudentAction(form: FormData): Promise<void> {
  await requireAdmin();
  const code = parseStudentCode(form.get("studentCode") ?? "");
  if (!code.ok) redirect("/admin/students");

  const deleted = await getPrisma()
    .student.delete({ where: { studentCode: code.code }, select: { fullName: true } })
    .catch(() => null);
  if (deleted) await recordAudit("DELETE", code.code, deleted.fullName);
  redirect("/admin/students?deleted=1");
}
