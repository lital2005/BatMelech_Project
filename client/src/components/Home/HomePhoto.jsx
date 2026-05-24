import React, { useEffect, useState } from "react";
import "./HomePhoto.css";

/**
 * תמונת עמוד הבית — קבצים מקומיים ב-public/images/home + גיבוי אם נכשלת טעינה.
 */
export default function HomePhoto({
  src,
  alt = "",
  className = "",
  objectPosition = "center",
  fit = "cover",
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`homePhotoFallback ${className}`.trim()}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
      />
    );
  }

  const style = { objectPosition, objectFit: fit };

  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
