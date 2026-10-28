"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import {
  deleteStudentAction,
  saveStudentAction,
  type StudentFormState,
} from "@/app/admin/actions";
import { dangerButton, inputClass, primaryButton, secondaryButton } from "@/components/admin/ui";

type Values = Record<string, string | null>;

type FieldSpec = {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  hint?: string;
  mono?: boolean;
  wide?: boolean;
};

const SECTIONS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: "Thông tin sinh viên",
    fields: [
      { name: "studentCode", label: "MSSV *", placeholder: "SE123456", mono: true },
      { name: "fullName", label: "Họ và tên *", placeholder: "Nguyễn Văn A" },
      { name: "email", label: "Email", type: "email", placeholder: "ten@fpt.edu.vn" },
      { name: "sessionLabel", label: "Phiên", placeholder: "Phiên 1" },
    ],
  },
  {
    title: "Lịch và chỗ ngồi",
    fields: [
      { name: "seatTcn", label: "Ghế TCN", placeholder: "A-128" },
      { name: "seatPh2", label: "Ghế PH2", placeholder: "B-014" },
      { name: "checkinTime", label: "Giờ check-in", placeholder: "07:00" },
      { name: "checkinRoom", label: "Phòng check-in", placeholder: "Phòng 101" },
      { name: "awardTime", label: "Giờ trao bằng", placeholder: "08:30" },
      { name: "contactGroup", label: "Nhóm liên lạc", placeholder: "Link hoặc tên nhóm" },
    ],
  },
  {
    title: "Tài nguyên",
    fields: [
      { name: "invitationLink", label: "Link thư mời", type: "url", placeholder: "https://…", wide: true },
      { name: "driveLink", label: "Link Drive", type: "url", placeholder: "https://drive.google.com/…", wide: true },
      {
        name: "ledImageKey",
        label: "Hình LED",
        placeholder: "session-1/SE123456.webp",
        hint: "Đường dẫn object trong bucket MinIO, hoặc một URL https.",
        mono: true,
        wide: true,
      },
    ],
  },
];

export function StudentForm({ initial, originalCode }: { initial: Values; originalCode?: string }) {
  const [state, action, pending] = useActionState<StudentFormState, FormData>(saveStudentAction, {});
  const values: Values = state.values ?? initial;

  return (
    <form action={action} key={state.attempt ?? 0} className="space-y-4">
      {originalCode ? <input type="hidden" name="originalCode" value={originalCode} /> : null}
      {state.message ? (
        <p role="alert" className="rounded-md border border-[#f1c0bb] bg-[#fdf1ef] px-4 py-2.5 text-sm text-[#9b1c13]">
          {state.message}
        </p>
      ) : null}
      {SECTIONS.map((section) => (
        <fieldset key={section.title} className="rounded-lg border border-line bg-paper p-5">
          <legend className="px-1 text-sm font-semibold text-ink">{section.title}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {section.fields.map((field) => {
              const error = state.errors?.[field.name as keyof NonNullable<StudentFormState["errors"]>];
              return (
                <label key={field.name} className={field.wide ? "sm:col-span-2" : undefined}>
                  <span className="mb-1.5 block text-sm font-medium text-ink">{field.label}</span>
                  <input
                    name={field.name}
                    type={field.type ?? "text"}
                    defaultValue={values[field.name] ?? ""}
                    placeholder={field.placeholder}
                    aria-invalid={error ? true : undefined}
                    className={`${inputClass} ${field.mono ? "font-mono" : ""} ${error ? "border-[#e5484d]" : ""}`}
                  />
                  {error ? (
                    <span className="mt-1 block text-xs text-[#b42318]">{error}</span>
                  ) : field.hint ? (
                    <span className="mt-1 block text-xs text-muted">{field.hint}</span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Đang lưu…" : originalCode ? "Lưu thay đổi" : "Thêm sinh viên"}
        </button>
        <Link href="/admin/students" className={secondaryButton}>
          Huỷ
        </Link>
      </div>
    </form>
  );
}

export function DeleteStudentButton({ studentCode }: { studentCode: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button type="button" className={dangerButton} onClick={() => setConfirming(true)}>
        <Trash2 className="size-4" aria-hidden="true" />
        Xoá
      </button>
    );
  }
  return (
    <form action={deleteStudentAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="studentCode" value={studentCode} />
      <span className="text-sm text-[#b42318]">Xoá vĩnh viễn {studentCode}?</span>
      <button type="submit" className={`${dangerButton} bg-[#fde8e6]`}>
        Xác nhận xoá
      </button>
      <button type="button" className={secondaryButton} onClick={() => setConfirming(false)}>
        Không
      </button>
    </form>
  );
}
