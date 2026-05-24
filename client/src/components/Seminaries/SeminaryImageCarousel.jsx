import React, { useEffect, useMemo, useRef } from "react";
import "./SeminaryImageCarousel.css";

/** כמה עותקים של אותה רצף — מבטיח גלילה גם עם מעט תמונות */
const COPIES = 4;

export default function SeminaryImageCarousel({
  images,
  seminaryName,
  onOpenImage,
}) {
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const setWidthRef = useRef(0);
  const jumpingRef = useRef(false);

  const slides = useMemo(
    () =>
      (images ?? [])
        .filter((g) => g?.image)
        .map((g, idx) => {
          const caption = g.description && String(g.description).trim();
          return {
            id: g._id ?? `img-${idx}`,
            src: g.image,
            caption,
            alt: caption || `${seminaryName ?? "מדרשייה"} — תמונה ${idx + 1}`,
            index: idx,
          };
        }),
    [images, seminaryName]
  );

  const count = slides.length;
  const canLoop = count > 1;

  const renderSlides = useMemo(() => {
    if (!canLoop) {
      return slides.map((s) => ({ ...s, renderKey: s.id }));
    }
    const out = [];
    for (let copy = 0; copy < COPIES; copy += 1) {
      slides.forEach((s) => {
        out.push({ ...s, renderKey: `${s.id}-c${copy}` });
      });
    }
    return out;
  }, [slides, canLoop]);

  useEffect(() => {
    if (!canLoop) return undefined;

    let cancelled = false;
    let removeScroll = null;

    const measure = () => {
      const track = trackRef.current;
      if (!track || track.children.length <= count) return 0;
      const w = track.children[count].offsetLeft - track.children[0].offsetLeft;
      if (w > 0) setWidthRef.current = w;
      return w;
    };

    const jump = (nextLeft) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      jumpingRef.current = true;
      viewport.scrollLeft = nextLeft;
      requestAnimationFrame(() => {
        jumpingRef.current = false;
      });
    };

    const attach = () => {
      if (cancelled) return;
      const viewport = viewportRef.current;
      const setWidth = measure();
      if (!viewport || !setWidth) return;

      const max = viewport.scrollWidth - viewport.clientWidth;
      if (max <= 0) return;

      removeScroll?.();

      const start = Math.min(setWidth * 2, max);
      jump(start);

      const onScroll = () => {
        if (jumpingRef.current) return;
        const setW = setWidthRef.current;
        if (!setW) return;

        const maxScroll = viewport.scrollWidth - viewport.clientWidth;
        const x = viewport.scrollLeft;
        const edge = 6;

        if (x >= maxScroll - edge) {
          jump(x - setW);
        } else if (x <= edge) {
          jump(x + setW);
        }
      };

      viewport.addEventListener("scroll", onScroll, { passive: true });
      removeScroll = () => viewport.removeEventListener("scroll", onScroll);
    };

    const boot = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(attach);
      });
    };

    const track = trackRef.current;
    if (!track) {
      boot();
      return () => {
        cancelled = true;
        removeScroll?.();
      };
    }

    const imgs = Array.from(track.querySelectorAll("img"));
    if (!imgs.length) {
      boot();
    } else {
      let pending = imgs.length;
      const done = () => {
        pending -= 1;
        if (pending <= 0) boot();
      };
      imgs.forEach((img) => {
        if (img.complete) done();
        else {
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }
      });
    }

    const fallback = window.setTimeout(attach, 600);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      removeScroll?.();
    };
  }, [canLoop, count, renderSlides]);

  if (!count) return null;

  return (
    <div className="seminaryCarousel">
      <div
        ref={viewportRef}
        className="seminaryCarousel__viewport"
        tabIndex={count > 1 ? 0 : undefined}
        aria-label={`גלריית תמונות — ${count} תמונות, גלילה מחזורית`}
      >
        <div className="seminaryCarousel__track" ref={trackRef}>
          {renderSlides.map((slide) => (
            <button
              type="button"
              key={slide.renderKey}
              className="seminaryCarousel__slide"
              onClick={() => onOpenImage?.(slide.index)}
              aria-label={`הגדלת תמונה ${slide.index + 1} מתוך ${count}`}
            >
              <img
                className="seminaryCarousel__img"
                src={slide.src}
                alt={slide.alt}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
              {slide.caption ? (
                <span className="seminaryCarousel__caption">{slide.caption}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
