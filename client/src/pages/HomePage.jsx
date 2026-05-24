import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BatMelechLogo from "../components/Brand/BatMelechLogo";
import HomePhoto from "../components/Home/HomePhoto";
import { HOME_IMAGES, HOME_IMAGE_FOCUS } from "../data/homeImages";
import "./HomePage.css";

function MiniPoll({ pollId, question, optionLabels }) {
  const countsKey = `midrasha_pc_${pollId}`;
  const voteKey = `midrasha_pv_${pollId}`;

  const defaultCounts = useMemo(
    () => optionLabels.map((_, i) => 12 + i * 7 + (i % 3) * 4),
    [optionLabels]
  );

  const readCounts = useCallback(() => {
    try {
      const raw = localStorage.getItem(countsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === optionLabels.length) {
          return parsed.map((n, i) =>
            Number.isFinite(Number(n)) ? Math.max(0, Math.floor(Number(n))) : defaultCounts[i]
          );
        }
      }
    } catch {
      /* ignore */
    }
    return [...defaultCounts];
  }, [countsKey, defaultCounts, optionLabels.length]);

  const [counts, setCounts] = useState(() => readCounts());
  const [picked, setPicked] = useState(null);
  const [hasVoted, setHasVoted] = useState(() => {
    try {
      return localStorage.getItem(voteKey) !== null;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const v = localStorage.getItem(voteKey);
      if (v !== null && v !== "") setPicked(Number(v));
    } catch {
      /* ignore */
    }
  }, [voteKey]);

  const total = counts.reduce((a, b) => a + b, 0) || 1;

  function submitVote() {
    if (picked === null || hasVoted) return;
    const next = counts.map((c, i) => (i === picked ? c + 1 : c));
    setCounts(next);
    try {
      localStorage.setItem(countsKey, JSON.stringify(next));
      localStorage.setItem(voteKey, String(picked));
    } catch {
      /* ignore */
    }
    setHasVoted(true);
  }

  return (
    <div className="homePoll">
      <h3 className="homePoll__q">{question}</h3>
      {!hasVoted ? (
        <>
          <div className="homePoll__options">
            {optionLabels.map((label, i) => (
              <label key={label} className="homePoll__opt">
                <input
                  type="radio"
                  name={pollId}
                  checked={picked === i}
                  onChange={() => setPicked(i)}
                />
                <span className="homePoll__optBody">
                  <span className="homePoll__optLabel">{label}</span>
                  <span aria-hidden>◯</span>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="homePoll__submit"
            disabled={picked === null}
            onClick={submitVote}
          >
            שליחת הצבעה
          </button>
        </>
      ) : (
        <>
          <div className="homePoll__results" role="status">
            {optionLabels.map((label, i) => {
              const pct = Math.round((counts[i] / total) * 100);
              return (
                <div key={label} className="homePoll__barRow">
                  <div className="homePoll__barTop">
                    <span>{pct}%</span>
                    <span>{label}</span>
                  </div>
                  <div className="homePoll__bar">
                    <div
                      className="homePoll__barFill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="homePoll__thanks">תודה — ההצבעה נשמרה במכשיר זה (הדגמה)</p>
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="home">
      <header className="homeHero">
        <div className="homeHero__inner">
          <div>
            <BatMelechLogo variant="hero" />
            <div className="homeHero__badge">
              <span className="homeHero__badgeDot" aria-hidden />
              פלטפורמה לקהילת המדרשיות
            </div>
            <h1 className="homeHero__title">
              בית דיגיטלי למדרשיות — לתלמידות, לרבנים ולמרצות
            </h1>
            <p className="homeHero__lead">
              פלטפורמה שמכבדת את עולם המדרשיות לבנות חרידיות ודתיות: מידע על מוסדות,
              חומרי לימוד וגלריות צנועות, ושיח של שאלות ותשובות עם רבנים ומרצים
              שמלמדים במוסדות.
            </p>
            <div className="homeHero__actions">
              <Link className="homeHero__btn homeHero__btn--primary siteBtn siteBtn--primary" to="/seminaries">
                גלו מדרשיות
              </Link>
              <Link className="homeHero__btn homeHero__btn--ghost siteBtn siteBtn--ghost siteBtn--onDark" to="/qa">
                שאלות ותשובות
              </Link>
              <Link className="homeHero__btn homeHero__btn--ghost siteBtn siteBtn--ghost siteBtn--onDark" to="/about">
                אודות
              </Link>
            </div>
            <p className="homeHero__note">
              האתר מיועד ללמידה, לשקיפות ולחיבור בין תלמידות למוסדות — בצורה נקייה,
              מכבדת ונוחה לשימוש.
            </p>
          </div>

          <div className="homeHero__visual" aria-hidden>
            <div className="homeHero__collage">
              <div className="homeHero__imgCell homeHero__imgCell--tall">
                <HomePhoto
                  src={HOME_IMAGES.heroGirlsGroup}
                  alt="תלמידות ממדרשייה"
                  objectPosition={HOME_IMAGE_FOCUS.heroGirlsGroup}
                />
              </div>
              <div className="homeHero__imgCell">
                <HomePhoto
                  src={HOME_IMAGES.heroRabbi}
                  alt="רב בהרצאה ושיעור"
                  objectPosition={HOME_IMAGE_FOCUS.heroRabbi}
                />
              </div>
              <div className="homeHero__imgCell">
                <HomePhoto
                  src={HOME_IMAGES.heroAudience}
                  alt="תלמידות בהרצאה במדרשייה"
                  objectPosition={HOME_IMAGE_FOCUS.heroAudience}
                />
              </div>
            </div>
            <div className="homeHero__float">בית יהודי · למידה בצניעות</div>
          </div>
        </div>
      </header>

      <div className="homeStats" aria-label="מספרים מהירים">
        <div className="homeStat">
          <div className="homeStat__num">+40</div>
          <div className="homeStat__label">מדרשיות ברשימה</div>
        </div>
        <div className="homeStat">
          <div className="homeStat__num">24/7</div>
          <div className="homeStat__label">גישה לתוכן ולשאלות</div>
        </div>
        <div className="homeStat">
          <div className="homeStat__num">100%</div>
          <div className="homeStat__label">שקיפות לסטטוס פעיל</div>
        </div>
        <div className="homeStat">
          <div className="homeStat__num">∞</div>
          <div className="homeStat__label">סקרים והתייעצויות</div>
        </div>
      </div>

      <div className="homeContainer">
        <section className="homeSection" aria-labelledby="about-title">
          <div className="homeSection__head">
            <p className="homeSection__kicker">אודות האתר</p>
            <h2 id="about-title" className="homeSection__title">
              למה הקמנו את המרחב הזה?
            </h2>
            <p className="homeSection__desc">
              האתר נועד לשרת בנות שבוחנות מדרשייה מתוך ערכי בית יהודי: כבוד,
              צניעות ושמירה על רוח המשפחה — לצד לימוד תורה והכנה לחיי בית וקהילה.
              כאן תמצאו מידע מסודר, חיפוש נוח וחומרים מהשטח — בצורה מכבדת ומדויקת.
            </p>
          </div>

          <div className="homeAbout">
            <div className="homeAbout__text">
              <p>
                בלב הפלטפורמה עומדת הרשימה הציבורית של מדרשיות במצב פעיל, עם דפי
                מידע, יצירת קשר, גלריות וחומרי עזר. כל אלה מרכיבים תמונה עשירה על
                החיים במוסד.
              </p>
              <p>
                בשאלות ותשובות תלמידות כותבות — ועונים רבנים ורבניות וכן מרצים
                ומרצות, שכולם משמשים כאן בתפקיד «מרצה» מול התלמידות. כך נשמר שיח
                ברור ומהימן לפני שיחה אישית עם המוסד.
              </p>
              <p>
                מי שמנהלות את דף המדרשייה (כולל רבנים/ות במסגרת ההוראה) יכולות
                לעדכן נושאים, קבצים, תמונות צנועות וחומרים — הכול במקום אחד.
              </p>
            </div>
            <div>
              <ul className="homeAbout__list">
                <li>
                  <span className="homeAbout__check">✓</span>
                  ממשק בעברית, מותאם לקריאה נוחה מנייד ומחשב
                </li>
                <li>
                  <span className="homeAbout__check">✓</span>
                  חיפוש מדרשיות לפי שם, עיר וכתובת
                </li>
                <li>
                  <span className="homeAbout__check">✓</span>
                  תגובות ודירוגים על מדרשיות (למשתמשות רשומות)
                </li>
                <li>
                  <span className="homeAbout__check">✓</span>
                  סקרים קהילתיים — כדי לשמוע את הקול שלכן
                </li>
              </ul>
              <blockquote className="homeQuote">
                «בית טוב בנוי על תורה ודרך ארץ. אנחנו רוצות לעזור לכן למצוא מדרשייה
                שמתאימה לבית היהודי שלכן.»
                <cite>צוות האתר</cite>
              </blockquote>
            </div>
          </div>
        </section>

        <section className="homeSection" aria-labelledby="features-title">
          <div className="homeSection__head">
            <p className="homeSection__kicker">מה מחכה לכן כאן</p>
            <h2 id="features-title" className="homeSection__title">
              כלים שמלווים את הדרך
            </h2>
            <p className="homeSection__desc">
              אספנו עבורכן את הפיצ&apos;רים המרכזיים — כל אחד נועד לענות על צורך
              אחר בקהילה.
            </p>
          </div>
          <div className="homeFeatures">
            <article className="homeFeature">
              <div className="homeFeature__icon" aria-hidden>
                🏫
              </div>
              <h3 className="homeFeature__title">מדרשיות ופרופילים</h3>
              <p className="homeFeature__text">
                כרטיסים ברורים עם לוגו, פרטי קשר, תיאור וסטטוס פעיל — כדי לבחור
                בביטחון.
              </p>
            </article>
            <article className="homeFeature">
              <div className="homeFeature__icon" aria-hidden>
                🖼️
              </div>
              <h3 className="homeFeature__title">גלריות ורגעים</h3>
              <p className="homeFeature__text">
                תמונות מהשטח עם כיתובים — מרגישים את האווירה עוד לפני הביקור.
              </p>
            </article>
            <article className="homeFeature">
              <div className="homeFeature__icon" aria-hidden>
                📚
              </div>
              <h3 className="homeFeature__title">חומרי לימוד</h3>
              <p className="homeFeature__text">
                קבצים ונושאים מקושרים למדרשייה — הכול נגיש ומסודר לפי נושאים.
              </p>
            </article>
            <article className="homeFeature">
              <div className="homeFeature__icon" aria-hidden>
                💬
              </div>
              <h3 className="homeFeature__title">שאלות ותשובות</h3>
              <p className="homeFeature__text">
                תלמידות שואלות — רבנים, רבניות ומרצים עונים. תוכן אמיתי שממשיך לגדול.
              </p>
            </article>
            <article className="homeFeature">
              <div className="homeFeature__icon" aria-hidden>
                ⭐
              </div>
              <h3 className="homeFeature__title">תגובות וכוכבים</h3>
              <p className="homeFeature__text">
                אפשר לשתף חוויה ולתת דירוג — בכבוד ובשקיפות.
              </p>
            </article>
            <article className="homeFeature">
              <div className="homeFeature__icon" aria-hidden>
                📊
              </div>
              <h3 className="homeFeature__title">סקרים חיים</h3>
              <p className="homeFeature__text">
                משוב מהיר מהקהילה — רואות מיד איך מתפלגות ההעדפות (בהדגמה מקומית).
              </p>
            </article>
          </div>
        </section>

        <section className="homeSection" aria-labelledby="gallery-title">
          <div className="homeSection__head">
            <p className="homeSection__kicker">מהרגע שבו זה נראה כמו בית</p>
            <h2 id="gallery-title" className="homeSection__title">
              רגעים של למידה, עיון וצמיחה רוחנית
            </h2>
            <p className="homeSection__desc">
              תמונות להמחשה בלבד — בנות במדרשייה, ספרי קודש, שיעורים, ירושלים וטיולים
              לקברי צדיקים, בצניעות ומזוויות מכבדות.
            </p>
          </div>
          <div className="homeGallery">
            <div className="homeGallery__item homeGallery__item--lg">
              <HomePhoto
                src={HOME_IMAGES.galleryKotel}
                alt="ירושלים והכותל המערבי בשקיעה"
                objectPosition={HOME_IMAGE_FOCUS.galleryKotel}
              />
              <div className="homeGallery__cap">ירושלים והכותל</div>
            </div>
            <div className="homeGallery__item homeGallery__item--md">
              <HomePhoto
                src={HOME_IMAGES.galleryLecture}
                alt="הרצאה ושיעור עם רב מול תלמידות"
                objectPosition={HOME_IMAGE_FOCUS.galleryLecture}
              />
              <div className="homeGallery__cap">שיעור והרצאה</div>
            </div>
            <div className="homeGallery__item homeGallery__item--md">
              <HomePhoto
                src={HOME_IMAGES.galleryKever}
                alt="ביקור בקבר צדיק"
                objectPosition={HOME_IMAGE_FOCUS.galleryKever}
              />
              <div className="homeGallery__cap">קברי צדיקים</div>
            </div>
            <div className="homeGallery__item homeGallery__item--sm homeGallery__item--contain">
              <HomePhoto
                src={HOME_IMAGES.gallerySefarim}
                alt="מחזורי כוונת הלב"
                objectPosition={HOME_IMAGE_FOCUS.gallerySefarim}
                fit="contain"
              />
              <div className="homeGallery__cap">ספרי קודש</div>
            </div>
            <div className="homeGallery__item homeGallery__item--sm">
              <HomePhoto
                src={HOME_IMAGES.galleryTrip}
                alt="טיול מדרשייה — תלמידות יחד"
                objectPosition={HOME_IMAGE_FOCUS.galleryTrip}
              />
              <div className="homeGallery__cap">טיול מדרשייה</div>
            </div>
          </div>
        </section>

        <section className="homeSection" aria-labelledby="polls-title">
          <div className="homeSection__head">
            <p className="homeSection__kicker">סקרים מהירים</p>
            <h2 id="polls-title" className="homeSection__title">
              במה הכי משפיע עלייך בבחירת מדרשייה?
            </h2>
            <p className="homeSection__desc">
              נשמח להבין מה חשוב לכן — גם מבחינת ערכי בית יהודי, צניעות ושמירה על
              קשר עם הבית. ההצבעה נשמרת מקומית בדפדפן (הדגמה בלבד).
            </p>
          </div>
          <div className="homePolls">
            <MiniPoll
              pollId="importance"
              question="בבחירת מדרשייה — מה הכי משפיע עלייך? (כולל התאמה לבית היהודי)"
              optionLabels={[
                "התאמה לערכי בית ולשמירה על קשר הדוק עם ההורים",
                "רוח המוסד, צניעות וסגנון חיים שמתאים לי",
                "איכות השיעורים והרבנים / המרצים שאני שומעת עליהם",
                "קרבה גיאוגרפית לבית או לקהילה",
              ]}
            />
            <MiniPoll
              pollId="content"
              question="איזה תוכן תרצי לראות יותר באתר?"
              optionLabels={[
                "שאלות ותשובות עם רבנים ומרצים",
                "מדריכי הרשמה והכוונה לבתי יהודיים",
                "גלריות צנועות ועדכונים מהמוסדות",
                "חומרי לימוד וסיכומים לעיון",
              ]}
            />
          </div>
        </section>

        <section className="homeCta" aria-labelledby="cta-title">
          <h2 id="cta-title" className="homeCta__title">
            מוכנות להמשיך מהכאן?
          </h2>
          <p className="homeCta__text">
            עברו למדרשיות כדי לראות פרטים מלאים, או לעמוד השאלות והתשובות כדי לקרוא
            מה קורה בשיח הקהילתי.
          </p>
          <div className="homeCta__actions">
            <Link to="/seminaries">לרשימת המדרשיות</Link>
            <Link to="/register">הרשמה לאתר</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
