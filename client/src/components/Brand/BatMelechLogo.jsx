import React, { useId } from "react";
import "./BatMelechLogo.css";

/**
 * לוגו BatMelech — ספר פתוח עדין (לימוד תורה) עם ניצוץ מלכותי עדין
 */
export default function BatMelechLogo({ variant = "hero", className = "" }) {
  const uid = useId().replace(/:/g, "");
  const gradMain = `batLogo-main-${uid}`;
  const gradGlow = `batLogo-glow-${uid}`;

  const iconOnly = variant === "navIcon";
  const rootClass = ["batLogo", `batLogo--${variant}`, className].filter(Boolean).join(" ");

  return (
    <div className={rootClass}>
      <div className="batLogo__mark" aria-hidden="true">
        <svg className="batLogo__svg" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={gradMain} x1="12" y1="14" x2="60" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e9d5ff" />
              <stop offset="0.5" stopColor="#a5b4fc" />
              <stop offset="1" stopColor="#f0abfc" />
            </linearGradient>
            <linearGradient id={gradGlow} x1="36" y1="8" x2="36" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fef3c7" />
              <stop offset="1" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          <rect
            x="3"
            y="3"
            width="66"
            height="66"
            rx="20"
            fill="rgba(255,255,255,0.07)"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.25"
          />

          {/* ספר פתוח — צורה נקייה */}
          <path
            d="M36 24c-9 0-16 4.5-16 11.5v17c0 1.6 1.4 2.4 2.8 1.8L36 46l13.2 8.3c1.4.6 2.8-.2 2.8-1.8v-17C52 28.5 45 24 36 24z"
            fill={`url(#${gradMain})`}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="0.75"
          />
          <path
            d="M36 46V30"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <path
            d="M22 35.5c4.5-2.5 9.5-3.8 14-3.8s9.5 1.3 14 3.8"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />

          {/* ניצוץ עדין — «בת מלך» בלי כתר כבד */}
          <circle cx="36" cy="15" r="4" fill={`url(#${gradGlow})`} opacity="0.95" />
          <path
            d="M36 9v3M36 18v3M31 15h3M38 15h3"
            stroke="#fef9c3"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
      </div>
      {!iconOnly ? (
        <div className="batLogo__text">
          <span className="batLogo__name">BatMelech</span>
          <span className="batLogo__tag">בת מלך · בית למדרשיות</span>
        </div>
      ) : null}
    </div>
  );
}
