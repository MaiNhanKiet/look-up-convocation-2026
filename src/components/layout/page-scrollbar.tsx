"use client";

import { useEffect, useRef, useState } from "react";

const FADE_DISTANCE = 140;

export function PageScrollbar() {
  const [thumb, setThumb] = useState({ top: 0, height: 0, opacity: 0, value: 0 });
  const metrics = useRef({ overflow: 0, travel: 0 });
  const drag = useRef<{ y: number; scroll: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const el = document.documentElement;
      const overflow = el.scrollHeight - el.clientHeight;
      const opacity = Math.max(0, Math.min(1, overflow / FADE_DISTANCE));
      const view = window.innerHeight - 16;
      const ratio = el.scrollHeight > 0 ? el.clientHeight / el.scrollHeight : 1;
      const height = Math.min(view, Math.max(32, ratio * view));
      const travel = Math.max(0, view - height);
      const top = overflow > 0 ? (el.scrollTop / overflow) * travel : 0;
      const value = overflow > 0 ? Math.round((el.scrollTop / overflow) * 100) : 0;
      metrics.current = { overflow, travel };
      setThumb((current) => {
        if (
          Math.abs(current.top - top) < 0.5 &&
          Math.abs(current.height - height) < 0.5 &&
          Math.abs(current.opacity - opacity) < 0.015 &&
          current.value === value
        ) {
          return current;
        }
        return { top, height, opacity, value };
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(document.documentElement);
    observer.observe(document.body);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function onPointerDown(event: React.PointerEvent<HTMLSpanElement>) {
    const { overflow, travel } = metrics.current;
    if (overflow <= 0 || travel <= 0) return;
    drag.current = {
      y: event.clientY,
      scroll: document.documentElement.scrollTop,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer can already be gone if the gesture ended immediately.
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLSpanElement>) {
    const start = drag.current;
    if (!start) return;
    const { overflow, travel } = metrics.current;
    if (travel <= 0) return;
    const next = start.scroll + ((event.clientY - start.y) / travel) * overflow;
    window.scrollTo({
      top: Math.min(overflow, Math.max(0, next)),
      behavior: "instant",
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLSpanElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="page-scrollbar max-[680px]:hidden">
      <span
        role="scrollbar"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={thumb.value}
        aria-label="Cuộn trang"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          height: thumb.height,
          opacity: thumb.opacity,
          pointerEvents: thumb.opacity > 0 ? "auto" : "none",
          transform: `translateY(${thumb.top}px)`,
        }}
      >
        <i aria-hidden="true" />
      </span>
    </div>
  );
}
