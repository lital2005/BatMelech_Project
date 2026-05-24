import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SeminaryImageCarousel from "../components/Seminaries/SeminaryImageCarousel";
import SeminaryCardComments from "../components/Seminaries/SeminaryCardComments";
import SeminaryCardMaterials from "../components/Seminaries/SeminaryCardMaterials";
import { filterAndSortSeminaries, normalizeSearchText } from "../utils/seminarySearch";
import { useNavigate } from "react-router-dom";
import { commentsService, enrollmentService, seminaryService } from "../services";
import { useAuth } from "../auth/AuthContext";
import CenterToast from "../components/CenterToast";
import SeminaryLogo from "../components/Seminaries/SeminaryLogo";
import { seminaryDisplayName } from "../utils/seminaryDisplay";
import "./pages.css";
import "./SeminariesPage.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL ?? "http://localhost:5000";

function assetUrl(u) {
  if (!u) return "";
  if (String(u).startsWith("http")) return String(u);
  return `${API_BASE}${String(u)}`;
}

function normalizeSeminaries(data) {
  return Array.isArray(data) ? data : [];
}

function enrollmentApiMessage(err, fallback) {
  const msg = err?.body?.message;
  return typeof msg === "string" && msg.trim() ? msg : fallback;
}

export default function SeminariesPage() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const userId = user?._id;
  const isStudent = user?.status === "student";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [appliedNameQuery, setAppliedNameQuery] = useState("");
  const [appliedLocationQuery, setAppliedLocationQuery] = useState("");

  const [commentsBySeminary, setCommentsBySeminary] = useState({});
  const [draftBySeminary, setDraftBySeminary] = useState({});
  const [ratingDraftBySeminary, setRatingDraftBySeminary] = useState({});
  const [postingId, setPostingId] = useState(null);
  const [joinBySeminary, setJoinBySeminary] = useState({});
  const [joinBusyId, setJoinBusyId] = useState(null);
  const [joinNotice, setJoinNotice] = useState(null);

  const [lightbox, setLightbox] = useState(null);
  const resultsRef = useRef(null);

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const goLightbox = useCallback(
    (delta) => {
      setLightbox((prev) => {
        if (!prev?.items?.length) return prev;
        const n = prev.items.length;
        const next = (prev.index + delta + n) % n;
        return { ...prev, index: next };
      });
    },
    []
  );

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goLightbox(1);
      if (e.key === "ArrowLeft") goLightbox(-1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, closeLightbox, goLightbox]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    seminaryService
      .list()
      .then((data) => {
        if (!alive) return;
        setItems(normalizeSeminaries(data));
      })
      .catch((err) => {
        if (!alive) return;
        setError(err);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const hasSearch = Boolean(
    normalizeSearchText(appliedNameQuery) || normalizeSearchText(appliedLocationQuery)
  );

  const approved = useMemo(
    () => filterAndSortSeminaries(items, appliedNameQuery, appliedLocationQuery),
    [items, appliedNameQuery, appliedLocationQuery]
  );

  const runSearch = useCallback(() => {
    setAppliedNameQuery(nameInput);
    setAppliedLocationQuery(locationInput);
  }, [nameInput, locationInput]);

  useEffect(() => {
    if (!hasSearch || loading) return;
    const t = window.setTimeout(() => {
      if (approved.length === 1 && approved[0]?._id) {
        document
          .getElementById(`seminary-${approved[0]._id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
    return () => window.clearTimeout(t);
  }, [hasSearch, appliedNameQuery, appliedLocationQuery, loading, approved]);

  useEffect(() => {
    let alive = true;
    const ids = approved.map((s) => s._id).filter(Boolean);
    if (!ids.length) return undefined;

    Promise.all(
      ids.map(async (id) => {
        const rows = await commentsService.listBySeminary(id);
        return [id, Array.isArray(rows) ? rows : []];
      })
    )
      .then((pairs) => {
        if (!alive) return;
        const next = {};
        for (const [id, rows] of pairs) next[id] = rows;
        setCommentsBySeminary(next);
      })
      .catch(() => {
        /* ignore comment fetch errors to not block page */
      });

    return () => {
      alive = false;
    };
  }, [approved]);

  useEffect(() => {
    if (!joinNotice) return undefined;
    const t = window.setTimeout(() => setJoinNotice(null), 6000);
    return () => window.clearTimeout(t);
  }, [joinNotice]);

  useEffect(() => {
    if (!isLoggedIn || !isStudent || !userId) {
      setJoinBySeminary({});
      return undefined;
    }
    let alive = true;
    enrollmentService
      .myRequests(userId)
      .then((rows) => {
        if (!alive) return;
        const map = {};
        for (const row of Array.isArray(rows) ? rows : []) {
          const sid = row?.seminaryId?._id ?? row?.seminaryId;
          if (sid) map[String(sid)] = row;
        }
        setJoinBySeminary(map);
      })
      .catch(() => {
        if (!alive) return;
        setJoinBySeminary({});
      });
    return () => {
      alive = false;
    };
  }, [isLoggedIn, isStudent, userId]);

  async function requestJoinSeminary(seminaryId) {
    if (!seminaryId) return;
    if (!isLoggedIn || !userId) {
      navigate("/login");
      return;
    }
    if (!isStudent) return;

    setJoinBusyId(seminaryId);
    setJoinNotice(null);
    try {
      const row = await enrollmentService.requestJoin(seminaryId, userId);
      setJoinBySeminary((prev) => ({
        ...prev,
        [String(seminaryId)]: row,
      }));
      setJoinNotice({ type: "ok", text: "בקשת ההצטרפות נשלחה למרצה האחראי." });
    } catch (err) {
      setJoinNotice({
        type: "error",
        text: enrollmentApiMessage(err, "לא ניתן לשלוח את הבקשה"),
      });
    } finally {
      setJoinBusyId(null);
    }
  }

  async function submitComment(seminaryId) {
    if (!isLoggedIn || !userId) return;
    const text = String(draftBySeminary[seminaryId] ?? "").trim();
    if (text.length < 2) return;

    const rating = ratingDraftBySeminary[seminaryId] ?? 5;

    setPostingId(seminaryId);
    try {
      await commentsService.create(
        { seminaryCode: seminaryId, content: text, rating },
        userId
      );
      setDraftBySeminary((prev) => ({ ...prev, [seminaryId]: "" }));
      setRatingDraftBySeminary((prev) => ({ ...prev, [seminaryId]: 5 }));
      const rows = await commentsService.listBySeminary(seminaryId);
      setCommentsBySeminary((prev) => ({
        ...prev,
        [seminaryId]: Array.isArray(rows) ? rows : [],
      }));
    } catch (e) {
      setError(e);
    } finally {
      setPostingId(null);
    }
  }

  return (
    <div className="page page--seminaries">
      <CenterToast
        open={Boolean(joinNotice)}
        type={joinNotice?.type === "error" ? "error" : "ok"}
        title={joinNotice?.type === "error" ? "לא נשלחה הבקשה" : "הבקשה נשלחה"}
        message={joinNotice?.text ?? ""}
        onClose={() => setJoinNotice(null)}
      />

      <header className="pageHero">
        <div className="pageHero__inner">
          <h1 className="pageHero__title">מדרשיות</h1>
          <p className="pageHero__lead">
            גלו מדרשיות פעילות, צפו בתמונות מהשטח במבט מקרוב, וקראו מה קורה בקהילה.
          </p>
          <form
            className="pageHero__searchRow"
            onSubmit={(e) => {
              e.preventDefault();
              runSearch();
            }}
          >
            <label className="pageHero__searchField">
              <span className="pageHero__searchLabel">חיפוש לפי שם</span>
              <input
                className="pageHero__searchInput"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="שם המדרשייה…"
                autoComplete="off"
              />
            </label>
            <label className="pageHero__searchField">
              <span className="pageHero__searchLabel">חיפוש לפי עיר / כתובת</span>
              <input
                className="pageHero__searchInput"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="עיר או כתובת…"
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              className="pageHero__searchBtn"
              aria-label="חיפוש מדרשיות"
              title="חיפוש"
            >
              <svg
                className="pageHero__searchIcon"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M16.5 16.5L21 21"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </form>
        </div>
      </header>

      {loading && <div className="panel">טוען מדרשיות…</div>}
      {error && (
        <div className="panel panel--error">
          שגיאה בטעינת מדרשיות. {error?.message ?? ""}
        </div>
      )}

      {!loading && !error && (
        <div ref={resultsRef} className="seminariesResults">
          {hasSearch ? (
            <p className="seminariesResultsSummary" role="status">
              {approved.length
                ? `נמצאו ${approved.length} מדרשיות התואמות לחיפוש`
                : "לא נמצאו מדרשיות התואמות לחיפוש — נסי מילות אחרות"}
            </p>
          ) : null}
        <div className="grid grid--list grid--seminaries">
          {approved.length === 0 ? (
            <div className="panel">
              {hasSearch
                ? "אין תוצאות לחיפוש. בדקי את שם המדרשייה או את העיר/כתובת."
                : "אין כרגע מדרשיות פעילות להצגה."}
            </div>
          ) : (
            approved.map((s) => {
              const galleryRaw = (s.galleryImages ?? []).filter((g) => g?.image);
              const galleryForCarousel = galleryRaw.map((g) => ({
                ...g,
                image: assetUrl(g.image),
              }));
              const lightboxItems = galleryRaw.map((gi, i) => {
                const u = assetUrl(gi.image);
                const cap = gi.description && String(gi.description).trim();
                const a = cap || `${s.name ?? "מדרשייה"} — תמונה ${i + 1}`;
                return { src: u, caption: cap || "", alt: a };
              });

              const joinRow = joinBySeminary[String(s._id)] ?? null;
              const joinStatus = joinRow?.status;
              const displayName = seminaryDisplayName(s.name);

              return (
                <article
                  key={s._id}
                  id={s._id ? `seminary-${s._id}` : undefined}
                  className="seminaryCard seminaryCard--detail"
                >
                  <header className="seminaryCard__top">
                    <div className="seminaryCard__brand">
                      <SeminaryLogo seminary={s} size={56} />
                      <div className="seminaryCard__brandText">
                        <h3 className="seminaryCard__title">{displayName}</h3>
                        {s.city || s.address ? (
                          <p className="seminaryCard__location muted">
                            {[s.city, s.address].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="seminaryCard__topActions">
                      {isStudent ? (
                        joinStatus === "pending" ? (
                          <span className="seminaryJoin seminaryJoin--pending">
                            בקשה נשלחה — ממתינה לאישור
                          </span>
                        ) : joinStatus === "initial_approved" ? (
                          <span className="seminaryJoin seminaryJoin--ok">
                            אושרת — המדרשייה תיצור איתך קשר
                          </span>
                        ) : s.createdBy ? (
                          <button
                            type="button"
                            className="siteBtn siteBtn--primary siteBtn--sm seminaryJoin__btn"
                            disabled={joinBusyId === s._id}
                            onClick={() => requestJoinSeminary(s._id)}
                          >
                            {joinBusyId === s._id ? "שולח…" : "הצטרפות למדרשייה"}
                          </button>
                        ) : (
                          <span className="seminaryJoin seminaryJoin--muted muted">
                            הצטרפות אינה זמינה למדרשייה זו
                          </span>
                        )
                      ) : !isLoggedIn ? (
                        <button
                          type="button"
                          className="siteBtn siteBtn--primary siteBtn--sm seminaryJoin__btn"
                          onClick={() => navigate("/login")}
                        >
                          התחברי להצטרפות
                        </button>
                      ) : null}
                      {s.phone || s.email ? (
                        <div className="seminaryCard__contact muted">
                          {s.phone ? <span>{s.phone}</span> : null}
                          {s.phone && s.email ? (
                            <span className="seminaryCard__contactSep"> · </span>
                          ) : null}
                          {s.email ? <span>{s.email}</span> : null}
                        </div>
                      ) : null}
                    </div>
                  </header>

                  {galleryForCarousel.length ? (
                    <section
                      className="seminaryCard__gallery"
                      aria-label={`גלריה — ${displayName}`}
                    >
                      <div className="seminaryCard__galleryHead">
                        <h4 className="seminaryCard__galleryTitle">מה קורה אצלנו</h4>
                        <span className="seminaryCard__galleryHint muted">
                          גלילה לתמונות נוספות · לחיצה להגדלה
                        </span>
                      </div>
                      <SeminaryImageCarousel
                        images={galleryForCarousel}
                        seminaryName={displayName}
                        onOpenImage={(idx) =>
                          setLightbox({
                            items: lightboxItems,
                            index: idx,
                            title: displayName,
                          })
                        }
                      />
                    </section>
                  ) : null}

                  {s.about ? (
                    <div className="seminaryCard__body">
                      <div className="seminaryCard__about">{s.about}</div>
                    </div>
                  ) : null}

                  <div className="seminaryCard__below">
                    <SeminaryCardComments
                      seminaryId={s._id}
                      comments={commentsBySeminary[s._id] ?? []}
                      isLoggedIn={isLoggedIn}
                      draft={draftBySeminary[s._id] ?? ""}
                      rating={ratingDraftBySeminary[s._id] ?? 5}
                      posting={postingId === s._id}
                      onDraftChange={(v) =>
                        setDraftBySeminary((prev) => ({ ...prev, [s._id]: v }))
                      }
                      onRatingChange={(n) =>
                        setRatingDraftBySeminary((prev) => ({ ...prev, [s._id]: n }))
                      }
                      onSubmit={() => submitComment(s._id)}
                    />
                    <SeminaryCardMaterials materials={s.materials} assetUrl={assetUrl} />
                  </div>
                </article>
              );
            })
          )}
        </div>
        </div>
      )}

      {lightbox && lightbox.items[lightbox.index] ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`תמונה מוגדלת — ${lightbox.title}`}
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="lightbox__close"
            onClick={closeLightbox}
            aria-label="סגירה"
          >
            ×
          </button>
          {lightbox.items.length > 1 ? (
            <>
              <button
                type="button"
                className="lightbox__nav lightbox__nav--prev"
                onClick={(e) => {
                  e.stopPropagation();
                  goLightbox(-1);
                }}
                aria-label="תמונה קודמת"
              >
                ‹
              </button>
              <button
                type="button"
                className="lightbox__nav lightbox__nav--next"
                onClick={(e) => {
                  e.stopPropagation();
                  goLightbox(1);
                }}
                aria-label="תמונה הבאה"
              >
                ›
              </button>
            </>
          ) : null}
          <div className="lightbox__frame" onClick={(e) => e.stopPropagation()}>
            <img
              className="lightbox__img"
              src={lightbox.items[lightbox.index].src}
              alt={lightbox.items[lightbox.index].alt}
            />
            {lightbox.items[lightbox.index].caption ? (
              <p className="lightbox__caption">{lightbox.items[lightbox.index].caption}</p>
            ) : null}
            <p className="lightbox__counter muted">
              {lightbox.index + 1} / {lightbox.items.length}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
