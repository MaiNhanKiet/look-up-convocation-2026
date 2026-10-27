import { ExternalLink } from "lucide-react";
import type { PublicStudent } from "@/lib/types/student";
import { copy } from "@/lib/copy";
import styles from "./ceremony.module.css";

const topDetails = [
  { key: "checkinTime", label: "Giờ tập trung check-in" },
  { key: "checkinRoom", label: "Phòng check-in" },
  { key: "awardTime", label: "Thời gian trao bằng" },
] as const;
const bottomDetails = [
  { key: "seatTcn", label: "Số ghế tân cử nhân" },
  { key: "seatPh2", label: "Số ghế & khu vực phụ huynh" },
] as const;

function safeContactUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export function StudentInfoCard({ student }: { student: PublicStudent }) {
  const contactUrl = safeContactUrl(student.contactGroup);

  return (
    <div className={styles.attendance}>
      <dl className={styles.seatRow}>
        {topDetails.map(({ key, label }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd
              className={student[key] ? styles.seatValue : styles.missingValue}
            >
              {student[key] ?? copy.updating}
            </dd>
          </div>
        ))}
      </dl>
      <dl className={styles.attendanceRow}>
        {bottomDetails.map(({ key, label }) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd
              className={
                student[key] ? styles.attendanceValue : styles.missingValue
              }
            >
              {student[key] ?? copy.updating}
            </dd>
          </div>
        ))}
        <div>
          <dt>Nhóm liên lạc</dt>
          <dd className={styles.attendanceAction}>
            {contactUrl ? (
              <a
                className={styles.contactButton}
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Mở nhóm
                <ExternalLink size={15} strokeWidth={1.8} aria-hidden="true" />
              </a>
            ) : (
              <span className={styles.missingValue}>{copy.updating}</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
