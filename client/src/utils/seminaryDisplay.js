/**
 * שם תצוגה למדרשייה — תמיד עם הקידומה «מדרשיית» (אם עדיין לא הוזנה).
 */
export function seminaryDisplayName(name) {
  const n = String(name ?? "").trim();
  if (!n) return "מדרשייה";
  if (/^מדרשיי?ת[\s:]/u.test(n)) return n;
  return `מדרשיית ${n}`;
}

/** אות ראשונה ללוגו חלופי — מהשם עצמו, בלי הקידומה */
export function seminaryInitial(name) {
  const raw = String(name ?? "").trim();
  const core = raw.replace(/^מדרשיי?ת\s+/u, "").trim() || raw;
  const letter = core[0] ?? "?";
  return letter.toUpperCase();
}
