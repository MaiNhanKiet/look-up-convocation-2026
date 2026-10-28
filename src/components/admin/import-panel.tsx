"use client";

import { FileUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge, Card, formatNumber, primaryButton, secondaryButton, Stat } from "@/components/admin/ui";

type ImportResult = {
  mode: "preview" | "commit";
  total: number;
  created: number;
  updated: number;
  skipped: number;
  duplicateCount: number;
  issueCount: number;
  issues: { line: number; studentCode: string; reason: string }[];
  sample: { studentCode: string; fullName: string; sessionLabel: string | null }[];
};

export function ImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [onlyNew, setOnlyNew] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);

  async function send(mode: "preview" | "commit") {
    if (!file) return;
    setBusy(mode);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("mode", mode);
    if (onlyNew) body.set("onlyNew", "1");
    try {
      const response = await fetch("/api/admin/import", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Không xử lý được tệp.");
        setResult(null);
      } else {
        setResult(data as ImportResult);
      }
    } catch {
      setError("Mất kết nối tới máy chủ.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-w-0 space-y-4">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md border border-dashed border-line bg-white px-4 py-5 hover:border-brand">
            <FileUp className="size-5 shrink-0 text-brand" aria-hidden="true" />
            <span className="min-w-0 text-sm">
              <span className="block truncate font-medium text-ink">{file ? file.name : "Chọn tệp CSV"}</span>
              <span className="text-muted">
                {file
                  ? `${formatNumber(Math.ceil(file.size / 1024))} KB`
                  : "UTF-8, dòng đầu là tiêu đề cột, tối đa 10 MB"}
              </span>
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setResult(null);
                setError(null);
              }}
            />
          </label>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={onlyNew}
                onChange={(event) => {
                  setOnlyNew(event.target.checked);
                  setResult(null);
                }}
                className="accent-brand"
              />
              Chỉ thêm MSSV mới, bỏ qua MSSV đã có
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={secondaryButton}
                disabled={!file || busy != null}
                onClick={() => send("preview")}
              >
                {busy === "preview" ? "Đang kiểm tra…" : "1. Kiểm tra"}
              </button>
              <button
                type="button"
                className={primaryButton}
                disabled={!file || busy != null || result?.mode !== "preview" || result.total === 0}
                onClick={() => send("commit")}
              >
                {busy === "commit" ? "Đang nhập…" : "2. Nhập dữ liệu"}
              </button>
            </div>
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-4 text-sm text-[#b42318]">
            {error}
          </p>
        ) : null}
      </Card>

      {result ? (
        <>
          {result.mode === "commit" ? (
            <p role="status" className="rounded-md border border-[#cfe0d3] bg-[#eef5ef] px-4 py-2.5 text-sm text-[#2f5138]">
              Đã nhập xong.{" "}
              <Link href="/admin/students?sort=updated" className="underline">
                Xem sinh viên vừa cập nhật
              </Link>
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Dòng hợp lệ" value={formatNumber(result.total)} />
            <Stat label="Thêm mới" value={formatNumber(result.created)} tone="good" hint="MSSV chưa có" />
            <Stat label="Cập nhật" value={formatNumber(result.updated)} hint="Ghi đè toàn bộ trường" />
            <Stat label="Bỏ qua" value={formatNumber(result.skipped)} />
            <Stat
              label="Dòng lỗi"
              value={formatNumber(result.issueCount)}
              tone={result.issueCount ? "bad" : "good"}
              hint={result.duplicateCount ? `${result.duplicateCount} MSSV lặp, giữ dòng cuối` : undefined}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Xem trước" description="8 dòng đầu sau khi chuẩn hoá">
              <table className="w-full text-sm">
                <tbody>
                  {result.sample.map((row) => (
                    <tr key={row.studentCode} className="border-t border-line/70 first:border-t-0">
                      <td className="py-2 pr-3 font-mono">{row.studentCode}</td>
                      <td className="py-2 pr-3">{row.fullName}</td>
                      <td className="py-2 text-right text-muted">{row.sessionLabel ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card
              title="Dòng bị bỏ qua do lỗi"
              description={
                result.issueCount > result.issues.length
                  ? `Hiển thị ${result.issues.length}/${result.issueCount}`
                  : undefined
              }
            >
              {result.issues.length ? (
                <ul className="max-h-72 space-y-1.5 overflow-y-auto text-sm">
                  {result.issues.map((issue) => (
                    <li key={`${issue.line}-${issue.studentCode}`} className="flex flex-wrap gap-2">
                      <Badge tone="bad">Dòng {issue.line}</Badge>
                      <span className="font-mono text-muted">{issue.studentCode || "—"}</span>
                      <span>{issue.reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Không có lỗi.</p>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
