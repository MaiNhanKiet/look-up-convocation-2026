import styles from "../lookup/ceremony.module.css";

/** Concentric gateways and the forward ribbon are drawn from the event KV. */
export function CeremonyMotif({
  animationCycle,
  isFading,
}: {
  animationCycle: number;
  isFading: boolean;
}) {
  return (
    <svg
      className={styles.motif}
      viewBox="0 0 680 400"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="210"
        cy="174"
        r="150"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      <circle
        cx="210"
        cy="174"
        r="130"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      <circle
        cx="210"
        cy="174"
        r="108"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      <circle
        cx="210"
        cy="174"
        r="78"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      <g className={styles.arcOrange}>
        <circle
          cx="210"
          cy="174"
          r="130"
          stroke="var(--color-brand)"
          strokeWidth="13"
          strokeDasharray="310 507"
          transform="rotate(-128 210 174)"
        />
      </g>
      <g className={styles.arcBrown}>
        <circle
          cx="210"
          cy="174"
          r="108"
          stroke="var(--ceremony-gold)"
          strokeWidth="3"
          strokeDasharray="90 589"
          transform="rotate(26 210 174)"
        />
      </g>
      {Array.from({ length: 24 }, (_, index) => (
        <path
          key={index}
          d={index % 3 === 0 ? "M210 29V43" : "M210 29V35"}
          stroke="currentColor"
          strokeWidth={index % 3 === 0 ? 1 : 0.6}
          transform={`rotate(${index * 15} 210 174)`}
        />
      ))}
      <path
        d="M210 86V108M210 240V262M122 174H144M276 174H298"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      <path d="M202 174H218M210 166V182" stroke="var(--color-brand-deep)" />
      <g
        key={animationCycle}
        className={styles.repeatingArtwork}
        data-fading={isFading}
      >
        <path
          className={styles.ribbonTrail}
          d="M163 290C282 344 463 328 674 238"
          pathLength={100}
          stroke="currentColor"
          strokeWidth="0.7"
        />
        <path
          className={styles.ribbonTrail}
          d="M139 306C295 370 492 349 674 275"
          pathLength={100}
          stroke="currentColor"
          strokeWidth="0.7"
        />
        <path
          className={styles.ribbonDraw}
          d="M210 202C252 279 389 304 674 189"
          pathLength={100}
          stroke="var(--ceremony-soft)"
          strokeWidth="24"
        />
        <path
          className={styles.ribbonDraw}
          d="M210 198C270 281 420 294 674 172"
          pathLength={100}
          stroke="var(--color-brand)"
          strokeWidth="7"
        />
        <path
          className={styles.ribbonDraw}
          d="M210 198C270 281 420 294 674 172"
          pathLength={100}
          stroke="var(--color-paper)"
          strokeWidth="1"
        />
        <path
          className={styles.ribbonArrow}
          d="M655.7 170.8L677.6 170.3L663.5 187"
          stroke="var(--color-brand)"
          strokeWidth="4"
          strokeLinecap="butt"
          strokeLinejoin="miter"
          strokeMiterlimit={6}
        />
        <path
          className={styles.ribbonFlow}
          d="M210 198C270 281 420 294 674 172"
          pathLength={100}
          stroke="#ffe6cf"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          className={styles.ribbonFlowHead}
          d="M210 198C270 281 420 294 674 172"
          pathLength={100}
          stroke="#ffffff"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          className={styles.pointerLine}
          d="M382 52H635"
          pathLength={100}
          stroke="currentColor"
          strokeWidth="0.7"
        />
        <path
          className={styles.pointerHead}
          d="M635 52L630 49M635 52L630 55"
          stroke="currentColor"
          strokeWidth="0.7"
        />
        <circle
          className={styles.pointerDot}
          cx="382"
          cy="52"
          r="2.5"
          fill="var(--color-brand)"
        />
      </g>
    </svg>
  );
}
