"use client";

import { GraduationCap, TriangleAlert } from "lucide-react";
import { ArrowRight, Check, LoaderCircle, Trash2 } from "lucide";
import { MorphIcon } from "morphicons/react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { StudentResult } from "@/components/lookup/student-result";
import { TurnstileWidget } from "@/components/lookup/turnstile-widget";
import { copy } from "@/lib/copy";
import { lookupStudent } from "@/lib/lookup/lookup-student";
import type { PublicStudent } from "@/lib/types/student";
import { parseStudentCode } from "@/lib/validators/student";
import styles from "./ceremony.module.css";

const CODE_SLOTS = [
  /^[HQDSC]$/,
  /^[EAS]$/,
  /^\d$/,
  /^\d$/,
  /^\d$/,
  /^\d$/,
  /^\d$/,
  /^\d$/,
] as const;

const FORMAT_MESSAGE = copy.invalidCode;

const TELEX_TONE: Record<string, string> = {
  "\u0301": "s",
  "\u0300": "f",
  "\u0309": "r",
  "\u0303": "x",
  "\u0323": "j",
};

function noticeLines(message: string): string[] {
  const splitAt = message.indexOf(". ");
  if (splitAt === -1) return [message];
  return [message.slice(0, splitAt + 1), message.slice(splitAt + 2)];
}

function telexPieces(char: string): string {
  if (char === "đ" || char === "Đ") return "dd";
  const parts = [...char.normalize("NFD")];
  const base = parts[0] ?? "";
  if (parts.length === 1) return base;
  let tone = "";
  let shape = "";
  for (const mark of parts.slice(1)) {
    if (TELEX_TONE[mark]) tone = TELEX_TONE[mark];
    else if (mark === "\u0302") shape = "hat";
    else if (mark === "\u0306" || mark === "\u031b") shape = "w";
  }
  const core =
    shape === "hat" ? base + base : shape === "w" ? base + "w" : base;
  return core + tone;
}

function plainStudentCode(value: string): string {
  let letters = "";
  let rest = "";
  for (const char of value.replace(/\s/g, "")) {
    const expanded = telexPieces(char).toUpperCase();
    const fromMark = expanded.length > 1;
    for (const piece of expanded) {
      if (letters.length < 2) {
        if (/[A-Z]/.test(piece)) letters += piece;
        continue;
      }
      if (/\d/.test(piece)) rest += piece;
      else if (fromMark && /[A-Z]/.test(piece)) letters += piece;
      if (rest.length >= 6) break;
    }
    if (rest.length >= 6) break;
  }
  return (letters + rest).slice(0, 8);
}

function formatIssue(value: string): boolean {
  if (!value) return false;
  return [...value].some((char, index) => !CODE_SLOTS[index]?.test(char));
}

type Notice = { tone: "neutral" | "alert"; message: string; retry?: boolean };
const ease = [0.22, 1, 0.36, 1] as const;

export function StudentLookup({
  turnstileSiteKey,
  correctionFormUrl,
  children,
}: {
  turnstileSiteKey: string | null;
  correctionFormUrl: string | null;
  children: ReactNode;
}) {
  const inputId = useId();
  const hintId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const requestInFlight = useRef(false);
  const formatNoticeUsed = useRef(false);
  const [code, setCode] = useState("");
  const [formatInvalid, setFormatInvalid] = useState(false);
  const [showFormatMessage, setShowFormatMessage] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lookupLocked, setLookupLocked] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [student, setStudent] = useState<PublicStudent | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const parsedInput = parseStudentCode(code);
  const matchesResult =
    parsedInput.ok && student?.studentCode === parsedInput.code;

  const onTurnstileToken = useCallback(
    (token: string) => setTurnstileToken(token),
    [],
  );

  useEffect(() => {
    if (!lookupLocked || loading) return;
    let cancelled = false;
    const selectAll = () => {
      if (cancelled) return;
      const input = inputRef.current;
      if (!input || input.value.length === 0) return;
      input.focus();
      input.setSelectionRange(0, input.value.length);
    };
    selectAll();
    const frame = requestAnimationFrame(selectAll);
    const timer = window.setTimeout(selectAll, 60);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [lookupLocked, loading]);

  const followResultScroll = useRef(false);

  function scrollResultIntoView() {
    const node = resultRef.current;
    if (!node) return;
    const top = node.getBoundingClientRect().top + window.scrollY - 28;
    window.scrollTo({ top, behavior: "instant" });
  }

  function clearCode() {
    followResultScroll.current = false;
    setStudent(null);
    updateCode("");
    inputRef.current?.focus({ preventScroll: true });
  }

  function shakeFrame() {
    const frame = frameRef.current;
    if (!frame) return;
    frame.classList.remove(styles.shake);
    void frame.offsetWidth;
    frame.classList.add(styles.shake);
  }

  function updateCode(raw: string) {
    const next = plainStudentCode(raw);
    const input = inputRef.current;
    if (input && input.value !== next) {
      const typedLength = input.value.length;
      const caret = input.selectionStart ?? next.length;
      input.value = next;
      const pos =
        next.length > typedLength ? next.length : Math.min(caret, next.length);
      input.setSelectionRange(pos, pos);
    }
    setCode(next);
    setFieldError(null);
    setNotice(null);
    setLookupLocked(false);
    if (!next) {
      formatNoticeUsed.current = false;
      setFormatInvalid(false);
      setShowFormatMessage(false);
      return;
    }
    const invalid = formatIssue(next);
    setFormatInvalid(invalid);
    if (!invalid) {
      setShowFormatMessage(false);
      return;
    }
    if (!formatNoticeUsed.current) {
      formatNoticeUsed.current = true;
      setShowFormatMessage(true);
    }
    shakeFrame();
  }

  async function lookup(rawCode: string) {
    if (requestInFlight.current) return;
    const parsed = parseStudentCode(rawCode);
    if (!parsed.ok) {
      if (parsed.reason === "format") {
        setFormatInvalid(true);
        if (!formatNoticeUsed.current) {
          formatNoticeUsed.current = true;
          setShowFormatMessage(true);
        }
        shakeFrame();
      } else {
        setFieldError(copy.emptyCode);
      }
      inputRef.current?.focus();
      return;
    }

    requestInFlight.current = true;
    setCode(parsed.code);
    setFormatInvalid(false);
    setShowFormatMessage(false);
    setFieldError(null);
    setLoading(true);
    setLookupLocked(false);
    setNotice(null);
    followResultScroll.current = false;
    setStudent(null);

    try {
      const payload = await lookupStudent({
        studentCode: parsed.code,
        ...(turnstileToken ? { turnstileToken } : {}),
      });
      if (payload.ok) {
        followResultScroll.current = true;
        setStudent(payload.student);
        return;
      }
      if (payload.error.code === "INVALID_STUDENT_CODE") {
        setFormatInvalid(true);
        setShowFormatMessage(true);
        formatNoticeUsed.current = true;
        shakeFrame();
        inputRef.current?.focus();
        return;
      }
      if (payload.error.code === "NOT_FOUND") {
        setNotice({ tone: "neutral", message: payload.error.message });
        setLookupLocked(true);
        return;
      }
      if (payload.error.code === "RATE_LIMITED") {
        setNotice({ tone: "alert", message: payload.error.message });
        return;
      }
      if (payload.error.code === "SERVER_ERROR") {
        setNotice({ tone: "alert", message: payload.error.message });
        return;
      }
      setNotice({ tone: "alert", message: payload.error.message, retry: true });
    } catch {
      setNotice({ tone: "alert", message: copy.server });
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.experience}>
        <div className={styles.composition}>
          {children}
          <section
            id="tra-cuu"
            className={styles.lookupPanel}
            aria-labelledby="lookup-heading"
          >
            <div className={styles.panelIndex}>
              <span>DẤU MỐC TRƯỞNG THÀNH</span>
              <span aria-hidden="true">01 / 02</span>
            </div>
            <div className={styles.panelBody}>
              <p className={styles.panelKicker}>TRA CỨU THÔNG TIN THAM DỰ</p>
              <h2 id="lookup-heading" className={styles.lookupTitle}>
                Sẵn sàng cho <br />
                ngày Lễ tốt nghiệp.
              </h2>
              <form
                noValidate
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!parsedInput.ok) {
                    if (code && formatIssue(code)) {
                      setFormatInvalid(true);
                      if (!formatNoticeUsed.current) {
                        formatNoticeUsed.current = true;
                        setShowFormatMessage(true);
                      }
                      shakeFrame();
                    }
                    return;
                  }
                  void lookup(code);
                }}
              >
                <label htmlFor={inputId} className={styles.inputLabel}>
                  Nhập mã số sinh viên
                </label>
                <div
                  ref={frameRef}
                  className={styles.inputFrame}
                  data-state={
                    formatInvalid || fieldError
                      ? "invalid"
                      : matchesResult
                        ? "success"
                        : code
                          ? "typing"
                          : "idle"
                  }
                >
                  <GraduationCap
                    size={20}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  <input
                    ref={inputRef}
                    id={inputId}
                    name="student-code"
                    value={code}
                    maxLength={8}
                    readOnly={loading}
                    lang="en"
                    onChange={(event) => updateCode(event.target.value)}
                    onFocus={(event) => {
                      if (!lookupLocked || loading) return;
                      const input = event.currentTarget;
                      const selectAll = () =>
                        input.setSelectionRange(0, input.value.length);
                      selectAll();
                      requestAnimationFrame(selectAll);
                    }}
                    onCompositionEnd={(event) => {
                      const next = plainStudentCode(event.currentTarget.value);
                      if (next === code) return;
                      updateCode(event.currentTarget.value);
                    }}
                    placeholder="Ví dụ: SE180001"
                    autoCapitalize="characters"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    aria-invalid={
                      formatInvalid || fieldError ? true : undefined
                    }
                    aria-describedby={
                      showFormatMessage || fieldError ? hintId : undefined
                    }
                    className={styles.input}
                  />
                  {parsedInput.ok ? (
                    <button
                      type="button"
                      className={
                        lookupLocked || matchesResult
                          ? `${styles.inputCount} ${styles.inputClear}`
                          : styles.inputCount
                      }
                      disabled={!(lookupLocked || matchesResult)}
                      aria-label={
                        lookupLocked || matchesResult
                          ? "Xóa mã số sinh viên"
                          : undefined
                      }
                      onClick={clearCode}
                    >
                      <MorphIcon
                        icon={lookupLocked || matchesResult ? Trash2 : Check}
                        size={16}
                        strokeWidth={1.8}
                        absoluteStrokeWidth
                        reducedMotion="user"
                      />
                    </button>
                  ) : (
                    <span className={styles.inputCount} aria-hidden="true">
                      {`${code.trim().length}/8`}
                    </span>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {showFormatMessage || fieldError ? (
                    <motion.div
                      key="field-hint"
                      className={styles.reveal}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.42, ease }}
                    >
                      <div className={styles.revealPad}>
                        <div
                          id={hintId}
                          className={styles.inputHint}
                          data-error={showFormatMessage || Boolean(fieldError)}
                          role={
                            showFormatMessage || fieldError
                              ? "alert"
                              : undefined
                          }
                        >
                          <TriangleAlert size={14} aria-hidden="true" />
                          <span>{fieldError ?? FORMAT_MESSAGE}</span>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <button
                  type="submit"
                  disabled={
                    !parsedInput.ok || loading || lookupLocked || matchesResult
                  }
                  aria-busy={loading}
                  className={styles.submit}
                >
                  <span>{loading ? "Đang tra cứu" : "Tra cứu thông tin"}</span>
                  <MorphIcon
                    icon={loading ? LoaderCircle : ArrowRight}
                    size={19}
                    strokeWidth={1.6}
                    absoluteStrokeWidth
                    reducedMotion="user"
                  />
                </button>
                <AnimatePresence initial={false}>
                  {notice ? (
                    <motion.div
                      key="lookup-notice"
                      className={styles.reveal}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.42, ease }}
                    >
                      <div className={styles.revealPadLoose}>
                        <p
                          className={styles.inlineNotice}
                          data-tone={notice.tone}
                          role="alert"
                        >
                          {noticeLines(notice.message).map(
                            (line, index, lines) => (
                              <span key={line} className={styles.noticeLine}>
                                {line}
                                {index === lines.length - 1 && notice.retry ? (
                                  <button
                                    type="button"
                                    className={styles.inlineRetry}
                                    onClick={() => void lookup(code)}
                                  >
                                    Thử lại
                                  </button>
                                ) : null}
                              </span>
                            ),
                          )}
                        </p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                {turnstileSiteKey ? (
                  <div className="mt-4">
                    <TurnstileWidget
                      siteKey={turnstileSiteKey}
                      onToken={onTurnstileToken}
                    />
                  </div>
                ) : null}
              </form>
              <div className={styles.panelNote}>
                <span aria-hidden="true" className={styles.noteLine} />
                <p>Khoảnh khắc của bạn, bắt đầu từ đây.</p>
                <span aria-hidden="true" className={styles.noteLine} />
              </div>
            </div>
          </section>
        </div>

        <AnimatePresence
          initial={false}
          onExitComplete={() => {
            const reduce = window.matchMedia(
              "(prefers-reduced-motion: reduce)",
            ).matches;
            inputRef.current?.scrollIntoView({
              behavior: reduce ? "auto" : "smooth",
              block: "nearest",
            });
          }}
        >
          {student ? (
            <motion.div
              key={student.studentCode}
              ref={resultRef}
              className={styles.resultReveal}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onUpdate={() => {
                if (!followResultScroll.current) return;
                scrollResultIntoView();
              }}
              onAnimationComplete={() => {
                followResultScroll.current = false;
              }}
              transition={{
                height: { duration: 0.95, ease: [0.28, 0.55, 0.22, 1] },
                opacity: { duration: 0.45, ease },
              }}
            >
              <section
                className={styles.resultSection}
                aria-label="Kết quả tra cứu"
              >
                <div className={styles.sectionLabel}>
                  <span>02 — THÔNG TIN CỦA BẠN</span>
                  <span className={styles.sectionRule} aria-hidden="true" />
                </div>
                <motion.div
                  className={styles.resultStage}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08, ease }}
                >
                  <StudentResult
                    student={student}
                    correctionFormUrl={correctionFormUrl}
                  />
                </motion.div>
              </section>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className={styles.pageSignature} aria-hidden="true">
          <span>FPTU CONVOCATION DAY</span>
          <span>2026</span>
        </div>
      </div>
    </MotionConfig>
  );
}
