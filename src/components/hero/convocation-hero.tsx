"use client";

import { useEffect, useState } from "react";
import { CeremonyMotif } from "./ceremony-motif";
import styles from "../lookup/ceremony.module.css";

const DEFAULT_ANIMATION_INTERVAL_MS = 5_000;
const FADE_DURATION_MS = 400;

function readAnimationInterval(): number {
  const value = Number(process.env.NEXT_PUBLIC_HERO_ANIMATION_INTERVAL_MS);
  return Number.isFinite(value) && value >= 3_500
    ? value
    : DEFAULT_ANIMATION_INTERVAL_MS;
}

export function ConvocationHero() {
  const [animationCycle, setAnimationCycle] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let fadeTimer: number;
    let restartTimer: number;
    const intervalMs = readAnimationInterval();

    function scheduleCycle() {
      fadeTimer = window.setTimeout(
        () => setIsFading(true),
        intervalMs - FADE_DURATION_MS,
      );
      restartTimer = window.setTimeout(() => {
        setAnimationCycle((cycle) => cycle + 1);
        setIsFading(false);
        scheduleCycle();
      }, intervalMs);
    }

    scheduleCycle();

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(restartTimer);
    };
  }, []);

  return (
    <section className={styles.hero} aria-labelledby="event-title">
      <p className={styles.eventIdentity}>FPT UNIVERSITY HCMC</p>
      <h1 id="event-title" className={styles.eventTitle}>
        <span>Graduation</span>
        <span className={styles.eventTitleLine}>
          Ceremony<span className={styles.titleDot}>.</span>
          <span className={styles.eventYear}>
            20
            <br />
            26
          </span>
        </span>
      </h1>
      <div className={styles.artwork}>
        <CeremonyMotif animationCycle={animationCycle} isFading={isFading} />
        <p
          key={animationCycle}
          className={`${styles.eventMotto} ${styles.repeatingArtwork}`}
          data-fading={isFading}
        >
          <span className={styles.mottoLine}>Rising together</span>
          <em className={styles.mottoLine}>with the nation.</em>
        </p>
      </div>
    </section>
  );
}
