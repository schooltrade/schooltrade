import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TOUR_STORAGE_KEY = "schooltrade_tour_done_v1";

type Step = { target?: string; title: string; body: string; note?: string };

// Guide-only: never navigates, submits forms or enters codes. If a step's
// target isn't on screen, the step is shown as a centered explanation card.
const STEPS: Step[] = [
  { title: "ברוכים הבאים ל-Schooltrade", body: "הקהילה הדיגיטלית של בית הספר: מודעות קנייה ומכירה, משחקים, ספרים, חדשות ועוד. ההדרכה הקצרה הזו תראה לך איך הכול עובד." },
  { target: "school-gate", title: "שלב 1 — קוד בית הספר", body: "זהו השלב הראשון בכניסה. אם יש לך קוד בית ספר, הזן אותו כאן. את הקוד מקבלים מבית הספר בלבד.", note: "ההדרכה לא תזין עבורך קוד ולא תעביר אותך מסך — זהו הסבר בלבד." },
  { target: "auth-form", title: "שלב 2 — התחברות או הרשמה", body: "אם כבר יש לך חשבון, בחר \"התחברות\" והזן את קוד החשבון האישי שלך. משתמש חדש? בחר \"הרשמה\", הזן את שמך והמערכת תיצור עבורך קוד אישי — שמור אותו." },
  { target: "auth-form", title: "לא זוכר את קוד החשבון?", body: "אל תיצור חשבון חדש. בקש ממנהל בית הספר לעזור לך למצוא את הקוד שלך, ומסור לו את שם החשבון שלך." },
  { target: "nav-posts", title: "המודעות שלי", body: "כאן רואים את כל המודעות בבית הספר — אפשר לחפש, למיין, לשמור, לשתף ולהגיב. המודעות שפרסמת מופיעות כאן וניתן לנהל ולמחוק אותן." },
  { target: "nav-create", title: "פרסם מודעה חדשה", body: "רוצה למכור משהו? צלם או העלה תמונה, הוסף תיאור ומחיר, ופרסם. המודעה תופיע מיד לכולם." },
  { target: "nav-games", title: "משחקים", body: "משחקים לימודיים ומשחקי ארקייד עם טבלאות מובילים חיות. כל משחק צובר לך נקודות." },
  { target: "nav-keif", title: "החלף לקיפים", body: "כאן ממירים את הנקודות שצברת במשחקים לקיפים — המטבע של Schooltrade — ורואים את טבלת המובילים." },
  { target: "nav-schoolNews", title: "חדשות בית הספר", body: "עדכונים רשמיים מבית הספר. תקבל התראה כשמתפרסמת ידיעה חדשה." },
  { target: "nav-books", title: "ספרים", body: "ספרייה דיגיטלית לקריאה, וגם מחברת לכתיבת ספרים משלך." },
  { target: "nav-premiumClub", title: "חבר מועדון", body: "חברי מועדון מקבלים גישה למשחקי פרימיום, לבוט Schooltrade, לאווטאר תלת־ממדי ולבונוס כפול בנקודות." },
  { target: "help-button", title: "תמיד אפשר לחזור", body: "כפתור \"הדרכה\" נמצא תמיד למעלה. לחיצה עליו תפתח את ההדרכה מחדש, בלי לשנות שום דבר בחשבון שלך." },
  { title: "הכול מוכן!", body: "זהו, אתה יודע איך Schooltrade עובד. בהצלחה ותהנה!" },
];

const findTarget = (id?: string) => {
  if (!id) return null;
  const root = document.querySelector<HTMLElement>(`[data-tour="${id}"]`);
  if (!root) return null;
  // Full-screen wrappers (e.g. the school-code screen) — spotlight the form inside instead.
  const r0 = root.getBoundingClientRect();
  const el = r0.width === 0 || r0.height === 0 || r0.height > window.innerHeight * 0.9
    ? root.querySelector<HTMLElement>("form") ?? root
    : root;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
};

export const OnboardingTour = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vw, setVw] = useState(() => window.innerWidth);
  const [vh, setVh] = useState(() => window.innerHeight);
  const step = STEPS[index];
  const total = STEPS.length;

  useEffect(() => { if (open) setIndex(0); }, [open]);

  const measure = useCallback(() => {
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    const el = findTarget(step?.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = findTarget(step?.target);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    measure();
    const t = window.setTimeout(measure, 420);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, index, measure, step]);

  const finish = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "1");
    onClose();
  }, [onClose]);

  const next = () => (index < total - 1 ? setIndex(index + 1) : finish());
  const prev = () => index > 0 && setIndex(index - 1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pad = 8;
  const spot = rect && {
    top: rect.top - pad, left: rect.left - pad,
    width: rect.width + pad * 2, height: rect.height + pad * 2,
  };

  const isMobile = vw < 640;
  const cardW = Math.min(380, vw - 24);
  const cardStyle = useMemo<React.CSSProperties>(() => {
    if (isMobile || !spot) {
      if (isMobile) return { left: 12, right: 12, bottom: 12 };
      return { left: (vw - cardW) / 2, top: Math.max(24, vh / 2 - 160), width: cardW };
    }
    const estH = 260;
    const below = spot.top + spot.height + 16;
    const top = below + estH < vh ? below : Math.max(12, spot.top - estH - 16);
    const center = spot.left + spot.width / 2 - cardW / 2;
    const left = Math.min(Math.max(12, center), vw - cardW - 12);
    return { left, top, width: cardW };
  }, [isMobile, spot?.top, spot?.left, spot?.width, spot?.height, vw, vh, cardW]);

  if (!open || !step) return null;

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="הדרכה">
      {/* Dim layer + spotlight */}
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary/80 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ ...spot, boxShadow: "0 0 0 9999px hsl(var(--background) / 0.78), 0 0 32px hsl(var(--primary) / 0.55)" }}
        >
          <span className="absolute inset-0 animate-pulse rounded-xl ring-4 ring-primary/25" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" />
      )}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Card */}
      <div
        key={index}
        className="absolute rounded-2xl border border-border/70 bg-card/95 p-5 shadow-2xl backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] animate-scale-in sm:p-6"
        style={cardStyle}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> הדרכה · <span dir="ltr">{index + 1} / {total}</span>
          </span>
          <button onClick={finish} aria-label="סגור הדרכה" className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-l from-primary to-accent transition-all duration-500" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>

        <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
        {step.target && !spot && (
          <p className="mt-3 rounded-lg border border-border/60 bg-background/40 p-2.5 text-xs leading-5 text-muted-foreground">
            האזור הזה אינו מוצג כרגע במסך שלך — הוא יופיע במקום המתאים באתר.
          </p>
        )}
        {step.note && <p className="mt-3 text-xs leading-5 text-primary/80">{step.note}</p>}

        <div className="mt-5 flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={finish} className="h-11 px-3 text-muted-foreground">
            דלג על ההדרכה
          </Button>
          <div className="mr-auto flex gap-2">
            {index > 0 && (
              <Button variant="outline" size="sm" onClick={prev} className="h-11 gap-1 px-3">
                <ArrowRight className="h-4 w-4" /> חזרה
              </Button>
            )}
            <Button size="sm" onClick={next} className="h-11 gap-1 px-4">
              {index === total - 1 ? "סיום" : <>הבא <ArrowLeft className="h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
