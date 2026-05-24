import { useCallback, useRef, useState } from "react";

function getRecognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function stopMediaStream(stream) {
  if (!stream?.getTracks) return;
  stream.getTracks().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  });
}

/**
 * דיבור→טקסט בעברית (Web Speech API).
 * שומרים על זרם מיקרופון פתוח במהלך ההקלטה (לא סוגרים מיד אחרי הרשאה).
 * עצירה עם stop() בלבד כדי לא לבטל תוצאות סופיות.
 */
export function useHebrewSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState(null);
  const [interimPreview, setInterimPreview] = useState("");
  const recRef = useRef(null);
  const micStreamRef = useRef(null);
  const sessionActiveRef = useRef(false);
  const onTextRef = useRef(null);
  const interimTextRef = useRef("");

  const supported = typeof window !== "undefined" && Boolean(getRecognitionCtor());

  const flushInterimToText = useCallback(() => {
    const t = interimTextRef.current.trim();
    if (t && onTextRef.current) onTextRef.current(t);
    interimTextRef.current = "";
    setInterimPreview("");
  }, []);

  const stopMicStream = useCallback(() => {
    stopMediaStream(micStreamRef.current);
    micStreamRef.current = null;
  }, []);

  const hardKillRecognition = useCallback(() => {
    const rec = recRef.current;
    recRef.current = null;
    try {
      rec?.abort?.();
    } catch {
      /* ignore */
    }
    try {
      rec?.stop?.();
    } catch {
      /* ignore */
    }
  }, []);

  const stop = useCallback(() => {
    sessionActiveRef.current = false;
    if (!recRef.current) {
      flushInterimToText();
      stopMicStream();
      setListening(false);
      setInterimPreview("");
      return;
    }
    try {
      recRef.current.stop();
    } catch {
      hardKillRecognition();
      flushInterimToText();
      stopMicStream();
      setListening(false);
    }
  }, [flushInterimToText, hardKillRecognition, stopMicStream]);

  const attachHandlers = useCallback(
    (rec, onText) => {
      rec.onstart = () => setListening(true);

      rec.onerror = (e) => {
        const code = e?.error || "";
        if (code === "aborted") return;
        sessionActiveRef.current = false;
        setListening(false);
        interimTextRef.current = "";
        setInterimPreview("");
        const map = {
          "not-allowed":
            "הדפדפן חסם גישה למיקרופון — לחצי על סמל המנעול בשורת הכתובת ובחרי לאשר מיקרופון לאתר זה.",
          "no-speech":
            "לא זוהה דיבור — דברי בקול רם מיד אחרי הלחיצה על המיקרופון, או נסי שוב.",
          network:
            "בעיית רשת בשירות הדיבור — ודאי חיבור לאינטרנט (Chrome שולח את ההקלטה לעיבוד בענן).",
          "audio-capture": "לא נמצא מיקרופון או שהוא תפוס על ידי אפליקציה אחרת.",
          "service-not-allowed": "שירות הדיבור לא זמין — נסי Chrome או Edge מעודכנים.",
        };
        setSpeechError(map[code] || `שגיאת הקלטה (${code || "לא ידוע"})`);
        recRef.current = null;
        stopMediaStream(micStreamRef.current);
        micStreamRef.current = null;
      };

      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const row = event.results[i];
          const piece = String(row[0]?.transcript ?? "").trim();
          if (!piece) continue;
          if (row.isFinal) {
            onText(piece);
            interimTextRef.current = "";
            setInterimPreview("");
          } else {
            interim += (interim ? " " : "") + piece;
          }
        }
        if (interim) {
          interimTextRef.current = interim;
          setInterimPreview(interim);
        }
      };

      rec.onend = () => {
        if (recRef.current !== rec) return;

        if (!sessionActiveRef.current) {
          flushInterimToText();
          stopMediaStream(micStreamRef.current);
          micStreamRef.current = null;
          setListening(false);
          recRef.current = null;
          return;
        }

        window.setTimeout(() => {
          if (!sessionActiveRef.current || recRef.current !== rec) return;
          try {
            rec.start();
          } catch {
            sessionActiveRef.current = false;
            flushInterimToText();
            stopMediaStream(micStreamRef.current);
            micStreamRef.current = null;
            setListening(false);
            recRef.current = null;
            setSpeechError("ההקלטה נעצרה — לחצי שוב על המיקרופון.");
          }
        }, 80);
      };
    },
    [flushInterimToText]
  );

  const start = useCallback(
    async (onText) => {
      const Ctor = getRecognitionCtor();
      if (!Ctor) {
        setSpeechError(
          "הדפדפן לא תומך בהמרת דיבור לטקסט. נסי Google Chrome או Microsoft Edge (במחשב)."
        );
        return;
      }

      if (typeof window !== "undefined" && window.isSecureContext === false) {
        setSpeechError(
          "המרת דיבור דורשת HTTPS (או localhost). פתחי את האתר בכתובת מאובטחת."
        );
        return;
      }

      hardKillRecognition();
      sessionActiveRef.current = false;
      flushInterimToText();
      stopMicStream();

      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
            },
          });
          micStreamRef.current = stream;
        } catch {
          setSpeechError(
            "לא ניתן לגשת למיקרופון — אשרי בהגדרות הדפדפן וב‑Windows (הגדרות → פרטיות ואבטחה → מיקרופון)."
          );
          return;
        }
      }

      onTextRef.current = onText;
      sessionActiveRef.current = true;
      setSpeechError(null);
      interimTextRef.current = "";
      setInterimPreview("");

      const rec = new Ctor();
      rec.lang = "he-IL";
      rec.interimResults = true;
      rec.continuous = true;
      rec.maxAlternatives = 1;

      attachHandlers(rec, onText);

      recRef.current = rec;
      try {
        rec.start();
      } catch {
        sessionActiveRef.current = false;
        setListening(false);
        recRef.current = null;
        stopMicStream();
        setSpeechError("לא ניתן להתחיל הקלטה — נסי לרענן את הדף.");
      }
    },
    [attachHandlers, flushInterimToText, hardKillRecognition, stopMicStream]
  );

  const toggle = useCallback(
    async (onText) => {
      if (sessionActiveRef.current) {
        stop();
        return;
      }
      await start(onText);
    },
    [start, stop]
  );

  return {
    listening,
    speechError,
    interimPreview,
    start,
    toggle,
    stop,
    supported,
    clearSpeechError: () => setSpeechError(null),
  };
}
