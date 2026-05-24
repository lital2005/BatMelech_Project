import React, { useMemo } from "react";

function displayUploader(user) {
  if (!user || typeof user !== "object") return "מרצה / רב";
  const n = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (n) return n;
  if (user.status === "lecturer") return "מרצה";
  return "צוות";
}

function fileLabel(meta, index) {
  if (meta?.originalName) return String(meta.originalName);
  return `קובץ ${index + 1}`;
}

export default function SeminaryCardMaterials({ materials, assetUrl }) {
  const files = useMemo(() => {
    const out = [];
    for (const m of materials ?? []) {
      if (!m || typeof m !== "object") continue;
      const uploader = displayUploader(m.rabbiUserCode);
      const topic = m.topicCode?.topicName ?? "חומר לימוד";
      const metaList =
        Array.isArray(m.attachmentMeta) && m.attachmentMeta.length
          ? m.attachmentMeta
          : (m.attachments ?? []).map((url) => ({ url, originalName: null }));

      metaList.forEach((meta, i) => {
        const raw = meta?.url ?? meta;
        if (!raw) return;
        out.push({
          id: `${m._id ?? "m"}-f-${i}`,
          href: assetUrl(raw),
          label: fileLabel(meta, i),
          topic,
          uploader,
          snippet: String(m.content ?? "").slice(0, 80),
        });
      });
    }
    return out;
  }, [materials, assetUrl]);

  return (
    <aside className="seminaryCard__materials" aria-label="קבצים מהמרצה">
      <h4 className="seminaryCard__sideTitle">קבצים מהמרצה</h4>
      {files.length ? (
        <ul className="seminaryFiles">
          {files.map((f) => (
            <li key={f.id} className="seminaryFiles__item">
              <a
                className="seminaryFiles__link"
                href={f.href}
                target="_blank"
                rel="noreferrer"
                download
              >
                <span className="seminaryFiles__icon" aria-hidden>
                  📎
                </span>
                <span className="seminaryFiles__text">
                  <span className="seminaryFiles__name">{f.label}</span>
                  <span className="seminaryFiles__meta muted">
                    {f.topic} · {f.uploader}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="seminaryCard__sideEmpty muted">אין עדיין קבצים שהועלו למדרשייה זו.</p>
      )}
    </aside>
  );
}
