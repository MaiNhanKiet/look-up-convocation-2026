"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { LedPreview } from "@/components/lookup/led-preview";
import { StudentInfoCard } from "@/components/lookup/student-info-card";
import { copy } from "@/lib/copy";
import { maskEmail } from "@/lib/email";
import type { PublicStudent } from "@/lib/types/student";
import styles from "./ceremony.module.css";

export function StudentResult({
  student,
  correctionFormUrl,
}: {
  student: PublicStudent;
  correctionFormUrl: string | null;
}) {
  const [emailVisible, setEmailVisible] = useState(false);
  const hiddenEmail = student.email ? maskEmail(student.email) : copy.updating;
  const revealedEmail = student.email ?? copy.updating;

  return (
    <article
      className={styles.pass}
      aria-label="Thông tin tham dự lễ tốt nghiệp"
    >
      <div className={styles.passMasthead}>
        <p className={styles.passBrand}>FPT UNIVERSITY</p>
        <p className={styles.passLabel}>THÔNG TIN THAM DỰ LỄ TỐT NGHIỆP</p>
      </div>
      <div className={styles.passContent}>
        <div className={styles.passMain}>
          <div className={styles.identityLabel}>
            <span>Tân cử nhân</span>
            {student.demo ? (
              <span className={styles.demoLabel}>Dữ liệu minh họa</span>
            ) : null}
          </div>
          <h2 tabIndex={-1} className={styles.studentName}>
            {student.fullName}
          </h2>
          <p className={styles.studentCode}>
            <span className="sr-only">Mã số sinh viên: </span>
            {student.studentCode}
          </p>
          <p className={styles.studentSession}>
            <span className={styles.studentSessionLabel}>Phiên trao bằng</span>
            <strong className={styles.studentSessionValue}>
              {student.sessionLabel ?? copy.updating}
            </strong>
          </p>
          <StudentInfoCard student={student} />
          <div className={styles.emailRow}>
            <span className={styles.emailLabel}>Email</span>
            <p
              className={styles.emailValue}
              data-visible={emailVisible}
              aria-live="polite"
            >
              <span className={styles.emailMasked} aria-hidden={emailVisible}>
                {hiddenEmail}
              </span>
              <span
                className={styles.emailRevealed}
                aria-hidden={!emailVisible}
              >
                {revealedEmail}
              </span>
            </p>
            {student.email && student.emailRevealable ? (
              <button
                type="button"
                onClick={() => setEmailVisible((visible) => !visible)}
                className={styles.emailToggle}
                aria-label={
                  emailVisible ? "Ẩn địa chỉ email" : "Hiện địa chỉ email"
                }
                aria-pressed={emailVisible}
              >
                <span className={styles.emailToggleIcons} aria-hidden="true">
                  <Eye
                    className={styles.emailShowIcon}
                    size={16}
                    strokeWidth={1.5}
                  />
                  <EyeOff
                    className={styles.emailHideIcon}
                    size={16}
                    strokeWidth={1.5}
                  />
                </span>
              </button>
            ) : null}
          </div>
        </div>
        <LedPreview
          key={`${student.studentCode}-${student.ledExternalUrl ?? student.ledImageUrl ?? student.ledImageStatus}`}
          student={student}
          correctionFormUrl={correctionFormUrl}
        />
      </div>
    </article>
  );
}
