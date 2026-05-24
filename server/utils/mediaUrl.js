/**
 * נרמול קישור תמונת פרופיל (זהה ללוגיקה בלקוח).
 */
function normalizeProfileImageUrl(raw) {
  const u = String(raw ?? "").trim();
  if (!u) return "";

  if (/^https?:\/\//i.test(u) || u.startsWith("data:")) {
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

function isAllowedProfileImageUrl(url) {
  const u = normalizeProfileImageUrl(url);
  if (!u) return false;
  if (u.startsWith("/uploads/")) return true;
  if (/^https?:\/\//i.test(u)) return true;
  if (u.startsWith("data:image/")) return true;
  return false;
}

module.exports = {
  normalizeProfileImageUrl,
  isAllowedProfileImageUrl,
};
