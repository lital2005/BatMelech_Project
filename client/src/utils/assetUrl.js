const API_BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:5000";

/**
 * מנרמל קישור תמונה שהוזן בטופס (מוסיף https:// אם חסר).
 */
export function normalizeProfileImageUrl(raw) {
  const u = String(raw ?? "").trim();
  if (!u) return "";

  if (/^https?:\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:")) {
    return u;
  }
  if (u.startsWith("//")) {
    return `https:${u}`;
  }
  if (u.startsWith("/")) {
    return u;
  }
  if (/^[\w.-]+\.[a-z]{2,}/i.test(u)) {
    return `https://${u}`;
  }
  return u;
}

/**
 * כתובת מלאה לתצוגה — קישור חיצוני, data URL, או קובץ מהשרת (/uploads/...).
 */
export function resolveImageUrl(url) {
  const u = normalizeProfileImageUrl(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:")) {
    return u;
  }
  const base = String(API_BASE).replace(/\/+$/, "");
  return `${base}${u.startsWith("/") ? u : `/${u}`}`;
}
