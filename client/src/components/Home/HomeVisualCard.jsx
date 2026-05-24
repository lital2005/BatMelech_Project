import React from "react";
import "./HomeVisualCard.css";

const VARIANTS = {
  indigo: "homeVisualCard--indigo",
  lavender: "homeVisualCard--lavender",
  mint: "homeVisualCard--mint",
  blush: "homeVisualCard--blush",
  sky: "homeVisualCard--sky",
};

/**
 * כרטיס ויזואלי רך — בלי תמונות סטוק (צנוע ונעים).
 */
export default function HomeVisualCard({
  variant = "indigo",
  icon,
  title,
  subtitle,
  tall = false,
  className = "",
}) {
  const variantClass = VARIANTS[variant] ?? VARIANTS.indigo;

  return (
    <div
      className={`homeVisualCard ${variantClass}${tall ? " homeVisualCard--tall" : ""} ${className}`.trim()}
    >
      <div className="homeVisualCard__glow" aria-hidden />
      {icon ? (
        <span className="homeVisualCard__icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      {title ? <span className="homeVisualCard__title">{title}</span> : null}
      {subtitle ? <span className="homeVisualCard__sub">{subtitle}</span> : null}
    </div>
  );
}
