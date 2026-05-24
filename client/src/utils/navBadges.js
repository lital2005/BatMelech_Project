/** אירוע לרענון מיידי של מוני ההודעות בסרגל */
export const NAV_BADGES_REFRESH = "nav-badges-refresh";

export function refreshNavBadges() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NAV_BADGES_REFRESH));
  }
}
