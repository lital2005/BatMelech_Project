import { resolveImageUrl } from "./assetUrl";

/** בודק אם הדפדפן מצליח לטעון את התמונה (לפני שמירה בשרת). */
export function canLoadImageUrl(raw) {
  const url = resolveImageUrl(raw) || String(raw ?? "").trim();
  if (!url) return Promise.resolve(false);

  return new Promise((resolve) => {
    const img = new Image();
    img.referrerPolicy = "no-referrer";
    const done = (ok) => {
      img.onload = null;
      img.onerror = null;
      resolve(ok);
    };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}
