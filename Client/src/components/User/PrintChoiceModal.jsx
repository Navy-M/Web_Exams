// PrintChoiceModal.jsx
import React, { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * A11y-first modal to choose between Print / Download PDF (with Cancel).
 * - RTL آماده
 * - تِراپ فوکِس، بستن با ESC، کلیک روی بک‌دراپ (قابل غیرفعال کردن)
 * - جلوگیری از اسکرول پس‌زمینه هنگام باز بودن
 * - عدم بسته‌شدن در حالت busy
 *
 * Props:
 *  - open: boolean
 *  - busy?: boolean
 *  - title?: string
 *  - message?: string
 *  - printLabel?: string
 *  - downloadLabel?: string
 *  - cancelLabel?: string
 *  - onPrint: () => void
 *  - onDownload: () => void
 *  - onCancel: () => void
 *  - disableBackdropClose?: boolean
 *  - dir?: "rtl" | "ltr"
 */
const PrintChoiceModal = ({
  open,
  busy = false,
  title = "گزارش کارنامه",
  message = "می‌خواهید گزارش را چاپ کنید یا فایل PDF دانلود شود؟",
  printLabel = "چاپ کامل",
  downloadLabel = "دانلود PDF",
  cancelLabel = "انصراف",
  onPrint,
  onDownload,
  onCancel,
  disableBackdropClose = false,
  dir = "rtl",
}) => {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const firstBtnRef = useRef(null);
  const lastActiveRef = useRef(null);

  // Prevent background scroll
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  // Focus management: save/restore + focus first control
  useEffect(() => {
    if (!open) return;
    lastActiveRef.current = document.activeElement;
    const t = setTimeout(() => {
      firstBtnRef.current?.focus();
    }, 0);
    return () => {
      clearTimeout(t);
      if (lastActiveRef.current && lastActiveRef.current.focus) {
        lastActiveRef.current.focus();
      }
    };
  }, [open]);

  // Focus trap
  const handleKeyDown = useCallback((e) => {
    if (!open || !dialogRef.current) return;
    if (e.key === "Escape") {
      if (!busy) onCancel?.();
      return;
    }
    if (e.key !== "Tab") return;

    const focusable = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const list = Array.from(focusable).filter(
      (el) => !el.hasAttribute("disabled") && !el.getAttribute("aria-hidden")
    );
    if (!list.length) return;

    const first = list[0];
    const last = list[list.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, [open, busy, onCancel]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  const onBackdropClick = (e) => {
    if (busy || disableBackdropClose) return;
    if (e.target === overlayRef.current) onCancel?.();
  };

  const content = (
    <div
      ref={overlayRef}
      className="ts-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pcm-title"
      aria-describedby="pcm-desc"
      onMouseDown={onBackdropClick}
      dir={dir}
      style={{
        // fallback minimal styles if host app hasn’t defined .ts-modal-overlay
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        ref={dialogRef}
        className="ts-modal card"
        style={{
          // fallback minimal styles if host app hasn’t defined .ts-modal / .card
          minWidth: 360,
          maxWidth: "90vw",
          background: "#fff",
          borderRadius: 12,
          padding: 16,
          boxShadow:
            "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <h3 id="pcm-title" style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          {busy && (
            <span
              aria-live="polite"
              style={{
                marginInlineStart: "auto",
                fontSize: 12,
                color: "var(--muted, #64748b)",
              }}
            >
              در حال آماده‌سازی…
            </span>
          )}
        </div>

        <p id="pcm-desc" className="muted" style={{ margin: 0, marginBottom: 12 }}>
          {message}
        </p>

        <div
          className="ts-modal-actions"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-start",
            flexWrap: "wrap",
            marginTop: 8,
          }}
        >
          <button
            ref={firstBtnRef}
            className="btn"
            onClick={onPrint}
            disabled={busy}
            style={btnStyle()}
          >
            {busy ? "…" : printLabel}
          </button>

          <button
            className="btn primary"
            onClick={onDownload}
            disabled={busy}
            style={btnStyle({ primary: true })}
          >
            {busy ? "…" : downloadLabel}
          </button>

          <button
            className="btn ghost"
            onClick={busy ? undefined : onCancel}
            disabled={busy}
            style={btnStyle({ ghost: true })}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );

  const portalRoot =
    document.getElementById("modal-root") ||
    document.getElementById("root") ||
    document.body;

  return createPortal(content, portalRoot);
};

function btnStyle({ primary, ghost } = {}) {
  const base = {
    borderRadius: 10,
    padding: "8px 12px",
    fontSize: 14,
    cursor: "pointer",
    border: "1px solid transparent",
  };
  if (primary) {
    return {
      ...base,
      background: "var(--primary, #2563eb)",
      color: "#fff",
    };
  }
  if (ghost) {
    return {
      ...base,
      background: "transparent",
      borderColor: "var(--line, #cd6262ff)",
      color: "var(--text, #531f1fff)",
    };
  }
  return {
    ...base,
    background: "var(--btn, #50dc81ff)",
    color: "var(--text, #0f172a)",
  };
}

export default PrintChoiceModal;
