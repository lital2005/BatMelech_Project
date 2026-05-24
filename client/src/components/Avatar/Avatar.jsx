import React, { useEffect, useState } from "react";
import { resolveImageUrl } from "../../utils/assetUrl";
import "./avatar.css";

export default function Avatar({ user, size = 32 }) {
  const letter = (user?.firstName?.trim()?.[0] ?? user?.email?.trim()?.[0] ?? "?").toUpperCase();
  const src = resolveImageUrl(user?.profileImage);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.42)) }}
    >
      {showImage ? (
        <img
          className="avatar__img"
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{letter}</span>
      )}
    </div>
  );
}
