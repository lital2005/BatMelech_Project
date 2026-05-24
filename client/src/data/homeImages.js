/**
 * תמונות עמוד הבית — תמונות שהועלו על ידי צוות האתר (מקומיות).
 */
const base = `${process.env.PUBLIC_URL || ""}/images/home`;

export const HOME_IMAGES = {
  /* קולאז' ראשי — 3 תמונות */
  heroGirlsGroup: `${base}/hero-girls-group.png`,
  heroRabbi: `${base}/hero-rabbi.png`,
  heroAudience: `${base}/hero-audience.png`,

  /* גלריה */
  galleryKotel: `${base}/gallery-kotel.png`,
  galleryLecture: `${base}/hero-lecture.png`,
  galleryKever: `${base}/gallery-kever.png`,
  galleryTrip: `${base}/hero-trip.png`,
  gallerySefarim: `${base}/hero-sefarim.png`,
};

/** מיקום חיתוך (object-position) */
export const HOME_IMAGE_FOCUS = {
  heroGirlsGroup: "50% 40%",
  heroRabbi: "50% 35%",
  heroAudience: "55% 45%",
  galleryKotel: "50% 55%",
  galleryLecture: "50% 38%",
  galleryKever: "50% 45%",
  galleryTrip: "50% 30%",
  gallerySefarim: "center",
};
