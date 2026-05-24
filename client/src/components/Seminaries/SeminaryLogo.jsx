import React, { useEffect, useState } from "react";
import { resolveImageUrl } from "../../utils/assetUrl";
import { seminaryInitial } from "../../utils/seminaryDisplay";

/**
 * לוגו מדרשייה או אות ראשונה — ליד שם המדרשייה בעמוד הציבורי.
 */
export default function SeminaryLogo({ seminary, size = 54, className = "" }) {
  const name = seminary?.name ?? "";
  const src = resolveImageUrl(seminary?.logo);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;
  const style = { width: size, height: size, fontSize: Math.max(14, Math.round(size * 0.42)) };

  if (showImage) {
    return (
      <img
        className={`seminaryCard__logo ${className}`.trim()}
        style={style}
        src={src}
        alt=""
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`seminaryCard__logoFallback ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      {seminaryInitial(name)}
    </div>
  );
}
