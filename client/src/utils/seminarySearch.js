/** נרמול טקסט לחיפוש (עברית, רווחים) */
export function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u0591-\u05c7]/g, "");
}

/** האם מדרשייה פעילה לתצוגה ציבורית */
export function isSeminaryPublic(s) {
  const st = String(s?.status ?? "active").toLowerCase();
  const approval = String(s?.approvalStatus ?? "approved").toLowerCase();
  return st !== "inactive" && approval === "approved";
}

/**
 * ציון התאמה — גבוה יותר = רלוונטי יותר. -1 = לא עומד בקריטריונים.
 */
export function scoreSeminaryMatch(s, nameQ, locQ) {
  if (!nameQ && !locQ) return 0;

  const name = normalizeSearchText(s?.name);
  const city = normalizeSearchText(s?.city);
  const address = normalizeSearchText(s?.address);
  const locationBlob = `${city} ${address}`.trim();

  let score = 0;

  if (nameQ) {
    if (!name.includes(nameQ)) return -1;
    if (name === nameQ) score += 120;
    else if (name.startsWith(nameQ)) score += 90;
    else score += 55;
  }

  if (locQ) {
    const locHit =
      locationBlob.includes(locQ) || city.includes(locQ) || address.includes(locQ);
    if (!locHit) return -1;
    if (city === locQ || city.startsWith(locQ)) score += 70;
    else if (city.includes(locQ)) score += 50;
    else if (address.includes(locQ)) score += 45;
    else score += 35;
  }

  return score;
}

export function filterAndSortSeminaries(items, nameQuery, locationQuery) {
  const nameQ = normalizeSearchText(nameQuery);
  const locQ = normalizeSearchText(locationQuery);
  const hasFilter = Boolean(nameQ || locQ);

  const rows = (items ?? [])
    .filter(isSeminaryPublic)
    .map((s) => ({
      seminary: s,
      score: scoreSeminaryMatch(s, nameQ, locQ),
    }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => {
      if (hasFilter && b.score !== a.score) return b.score - a.score;
      return String(a.seminary.name ?? "").localeCompare(String(b.seminary.name ?? ""), "he");
    });

  return rows.map((r) => r.seminary);
}
