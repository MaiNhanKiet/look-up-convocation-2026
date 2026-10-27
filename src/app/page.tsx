import { StudentLookup } from "@/components/lookup/student-lookup";
import { MaintenancePanel } from "@/components/lookup/maintenance-panel";
import { ConvocationHero } from "@/components/hero/convocation-hero";
import {
  isMaintenanceMode,
  readCorrectionFormUrl,
  readMaintenanceReopenAt,
} from "@/lib/config";
import styles from "@/components/lookup/ceremony.module.css";
import { connection } from "next/server";

export const instant = false;

export default async function HomePage() {
  await connection();
  if (isMaintenanceMode()) {
    return (
      <div id="top" className="flex min-h-dvh flex-col">
        <main className="flex flex-1 flex-col">
          <div className={styles.experience}>
            <div className={styles.composition}>
              <ConvocationHero />
              <MaintenancePanel reopenAt={readMaintenanceReopenAt()} />
            </div>
            <div className={styles.pageSignature} aria-hidden="true">
              <span>FPTU CONVOCATION DAY</span>
              <span>2026</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const turnstileSiteKey =
    process.env.TURNSTILE_SITE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    null;

  return (
    <div id="top" className="flex min-h-dvh flex-col">
      <a href="#tra-cuu" className="skip-link">
        Đến phần tra cứu
      </a>
      <main className="flex flex-1 flex-col">
        <StudentLookup
          turnstileSiteKey={turnstileSiteKey}
          correctionFormUrl={readCorrectionFormUrl()}
        >
          <ConvocationHero />
        </StudentLookup>
      </main>
    </div>
  );
}
