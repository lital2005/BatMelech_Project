import React, { useState } from "react";
import "./CollapsibleText.css";

const DEFAULT_MAX = 220;

/**
 * טקסט עם כפתור «קרא עוד» / «הצג פחות» כשהתוכן ארוך.
 */
export default function CollapsibleText({
  text,
  maxLength = DEFAULT_MAX,
  className = "",
  bodyClassName = "",
}) {
  const [expanded, setExpanded] = useState(false);
  const full = String(text ?? "").trim();
  if (!full) return null;

  const needsToggle = full.length > maxLength;
  const visible = !needsToggle || expanded ? full : `${full.slice(0, maxLength).trimEnd()}…`;

  return (
    <div className={`collapsibleText ${className}`.trim()}>
      <p className={`collapsibleText__body ${bodyClassName}`.trim()}>{visible}</p>
      {needsToggle ? (
        <button
          type="button"
          className="collapsibleText__toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? "הצג פחות" : "קרא עוד"}
        </button>
      ) : null}
    </div>
  );
}

