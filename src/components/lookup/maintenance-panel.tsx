"use client";

import { useLayoutEffect, useState } from "react";

import { remainingUntil } from "@/lib/maintenance-clock";
import styles from "./ceremony.module.css";

const UNITS = [
  ["days", "ngày"],
  ["hours", "giờ"],
  ["minutes", "phút"],
  ["seconds", "giây"],
] as const;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function reopenLabel(reopenAt: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(reopenAt));
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("hour")}:${pick("minute")} · ${pick("day")}.${pick("month")}`;
}

export function MaintenancePanel({ reopenAt }: { reopenAt: number | null }) {
  const [now, setNow] = useState<number | null>(null);

  useLayoutEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const left = remainingUntil(reopenAt, now ?? Number.POSITIVE_INFINITY);
  const settled =
    now != null && left.days + left.hours + left.minutes + left.seconds === 0;
  const spoken = `${left.days} ngày, ${left.hours} giờ, ${left.minutes} phút, ${left.seconds} giây`;

  return (
    <section className={styles.lookupPanel} aria-labelledby="maintenance-title">
      <div className={styles.panelIndex}>
        <span>{reopenAt == null ? "ĐANG CẬP NHẬT" : "MỞ LẠI LÚC"}</span>
        {reopenAt != null ? (
          <span className={styles.reopenMark}>{reopenLabel(reopenAt)}</span>
        ) : null}
      </div>
      <div className={`${styles.panelBody} ${styles.maintenanceBody}`}>
        <h2 id="maintenance-title" className={styles.maintenanceMessage}>
          <span className={styles.maintenanceLines}>
            <span>Hệ thống tra cứu</span>
            <span className={styles.maintenanceAccent}>
              đang được cập nhật.
            </span>
          </span>
          <span className={styles.maintenanceInvite}>
            <span aria-hidden="true" className={styles.noteLine} />
            Bạn vui lòng quay lại sau nhé.
            <span aria-hidden="true" className={styles.noteLine} />
          </span>
        </h2>
        <div
          className={styles.countdown}
          role="timer"
          aria-label={spoken}
          data-settled={settled || undefined}
        >
          {UNITS.map(([key, unit]) => (
            <div key={key} className={styles.countdownUnit}>
              <span className={styles.countdownValue}>{pad(left[key])}</span>
              <span className={styles.countdownLabel}>{unit}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
