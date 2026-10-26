import type { PublicStudent } from "@/lib/types/student";
import { copy } from "@/lib/copy";
import styles from "./ceremony.module.css";

const topDetails = [
  { key: "seatTcn", label: "Số ghế tân cử nhân" },
  { key: "checkinZone", label: "Khu vực check-in" },
  { key: "checkinWaitingRoom", label: "Phòng chờ check-in" },
] as const;
const bottomDetails = [
  { key: "sessionLabel", label: "Phiên tham dự" },
] as const;
const parentSeatNote = "Theo hướng dẫn của BTC";

export function StudentInfoCard({ student }: { student: PublicStudent }) {
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
        <div>
          <dt>Số ghế hai phụ huynh</dt>
          <dd className={styles.attendanceValue}>{parentSeatNote}</dd>
        </div>
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
      </dl>
    </div>
  );
}
