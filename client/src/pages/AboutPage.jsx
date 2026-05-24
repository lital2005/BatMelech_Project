import React from "react";
import { Link } from "react-router-dom";
import "./AboutPage.css";

export default function AboutPage() {
  return (
    <div className="about">
      <header className="pageHero pageHero--fullBleed pageHero--center aboutHero">
        <div className="pageHero__inner">
        <p className="pageHero__kicker">קצת מעבר למסך</p>
        <h1 className="pageHero__title">אודות המרחב שלנו</h1>
        <p className="pageHero__lead">
          כאן אנחנו לא רק מרכזים רשימה של מוסדות — אנחנו מנסים ללוות אתכן ברגע
          עדין ובעתיד חשוב: בחירת מדרשייה שמתאימה לנשמתכן, לבית שלכן ולדרך שבה
          אתן רוצות לבנות חיים של תורה, מידות וקהילה.
        </p>
        </div>
      </header>

      <section aria-labelledby="about-vision">
        <h2 id="about-vision" className="aboutSectionTitle">
          חזון
        </h2>
        <h3 className="aboutH3">כשבוחרים מדרשייה — בוחרים בית רוחני שני</h3>
        <div className="aboutProse">
          <p>
            השנים במדרשייה אינן רק «עוד שלב לימודים». הן זמן שבו נרקמת זהות,
            נרקמות חברויות נפש עמוקות, ונפתח הלב לתורה ולחיים של{" "}
            <strong>בית יהודי</strong> שאתן חולמות לבנות. לכן החיפוש אחרי המקום
            הנכון מגיע עם שאלות גדולות — לא רק על שעות הלימוד, אלא על הרוח,
            הסגנון וההתאמה לערכים שגדלתן עליהם.
          </p>
          <p>
            האתר נולד מתוך הבנה ש<strong>טכנולוגיה</strong> יכולה לשרת את הרוח —
            כשהיא עושה זאת בצניעות, בכבוד ובשקיפות. רצינו לתת לתלמידות ולמשפחות
            כלי שמאפשר להכיר מוסדות בלי רעש, עם מידע ברור, עם תמונות מכבדות
            ועם שיח של <strong>שאלות ותשובות</strong> שבו עונים רבנים, רבניות
            ומרצים — כי כולם, בתפקידי ההוראה, הם בשבילכן «מרצים» שפותחים דלת לידע
            ולסיוע.
          </p>
          <p>
            אנחנו מאמינות ש<strong>ידע מסודר</strong> מפחית חרדה, ש<strong>שיח כן</strong>{" "}
            בונה אמון, ושכל בת זכאית למקום שבו תרגישי שמבינים אותה — גם אם היא
            עדיין מנסחת לעצמה מה בדיוק היא מחפשת.
          </p>
        </div>
      </section>

      <hr className="aboutDivider" />

      <section aria-labelledby="about-values">
        <h2 id="about-values" className="aboutSectionTitle">
          ערכים
        </h2>
        <h3 className="aboutH3">מה מניע אותנו מאחורי הקוד והמילים</h3>
        <div className="aboutValues">
          <article className="aboutValue">
            <div className="aboutValue__icon" aria-hidden>
              🕯️
            </div>
            <h4 className="aboutValue__title">כבוד וצניעות</h4>
            <p className="aboutValue__text">
              העיצוב, התוכן והתמונות נבחרים מתוך רגישות לעולם בנות חרידיות ודתיות —
              בלי להמעיט ובלי להציג דבר שאינו הולם את הציבור שאליו אנחנו מדברות.
            </p>
          </article>
          <article className="aboutValue">
            <div className="aboutValue__icon" aria-hidden>
              🏠
            </div>
            <h4 className="aboutValue__title">בית לפני הכול</h4>
            <p className="aboutValue__text">
              בחירה במדרשייה נוגעת בהורים, באחים ובשייכות לקהילה. אנחנו מציגים
              מידע שמקל על שיח משפחתי מושכל — לא במקום הדעה של הרב או המשפחה,
              אלא לצידה.
            </p>
          </article>
          <article className="aboutValue">
            <div className="aboutValue__icon" aria-hidden>
              📖
            </div>
            <h4 className="aboutValue__title">תורה ודרך ארץ</h4>
            <p className="aboutValue__text">
              הלימוד הוא לב המסע, והאדם השלם נבנה גם ממידות, מאחריות ומחיבור לחיים
              שאחרי האולפנה. השאיפה שלנו היא לשקף מוסדות שמחזיקים בשני הקצוות —
              רוח ומציאות.
            </p>
          </article>
          <article className="aboutValue">
            <div className="aboutValue__icon" aria-hidden>
              🤝
            </div>
            <h4 className="aboutValue__title">שקיפות ואמון</h4>
            <p className="aboutValue__text">
              מדרשיות במצב פעיל, תגובות ודירוגים (למשתמשות רשומות), ושאלות שמקבלות
              מענה מסודר — כדי שתדעו מה אמיתי ומה עדיין פתוח לשיחה ישירה עם
              המוסד.
            </p>
          </article>
        </div>
      </section>

      <hr className="aboutDivider" />

      <section aria-labelledby="about-offer">
        <h2 id="about-offer" className="aboutSectionTitle">
          מה תמצאו כאן
        </h2>
        <h3 className="aboutH3">כלים שמחברים בין לב לבין מידע</h3>
        <ul className="aboutList">
          <li>
            <strong>מדרשיות פעילות</strong> — פרופילים עם פרטים, חומרים וגלריות
            צנועות, כדי לקבל תחושה אמיתית של המקום.
          </li>
          <li>
            <strong>שאלות ותשובות</strong> — מרחב שבו אפשר לקרוא שיח בין תלמידות
            לבין רבנים ומרצים; לפעמים מילה אחת של הבנה משנה את כל החלטה.
          </li>
          <li>
            <strong>חיבור למרצות ולצוות</strong> — מי שמנהלות את דף המדרשייה
            (ובכלל זה רבנים ורבניות בתפקידי לימוד) יכולות לעדכן תוכן ולשמור על קשר
            עם הקהילה הדיגיטלית.
          </li>
          <li>
            <strong>מקום לקול שלכן</strong> — תגובות, דירוגים וסקרים שמאפשרים
            לבטא העדפות וערכים, בלי לאבד את הכבוד ההדדי.
          </li>
        </ul>
      </section>

      <blockquote className="aboutQuote">
        «הדרך ארוכה — ולפעמים מספיק אור קטן בחלון כדי לדעת שבחרת נכון. אנחנו
        מאחלות לכל בת שתמצא את המקום שבו נשמתה תרגיש בבית.»
        <footer>— עם אהבה, צוות האתר</footer>
      </blockquote>

      <nav className="aboutCta" aria-label="המשך גלישה">
        <Link to="/seminaries">לגלות מדרשיות</Link>
        <Link to="/qa">שאלות ותשובות</Link>
        <Link to="/">חזרה לדף הבית</Link>
      </nav>
    </div>
  );
}
