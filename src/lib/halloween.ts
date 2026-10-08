// Presentation metadata for the 50 Halloween skins (IDs 101-150).
// Purely visual: prices, tiers, ownership and expiry stay in the database.
import { isSoundEnabled } from "@/lib/sounds";

export type HwFx = "bats" | "fog" | "flame" | "spark" | "smoke" | "web" | "ghost" | "star" | "magic";

export interface HwRarity { key: string; name: string; hue: string; rank: number }
export const HW_RARITIES: HwRarity[] = [
  { key: "common", name: "נפוץ", hue: "30 20% 70%", rank: 1 },
  { key: "rare", name: "נדיר", hue: "200 90% 62%", rank: 2 },
  { key: "epic", name: "אפי", hue: "275 85% 68%", rank: 3 },
  { key: "legendary", name: "אגדי", hue: "32 95% 58%", rank: 4 },
  { key: "mythic", name: "מיתי", hue: "350 90% 62%", rank: 5 },
  { key: "secret", name: "סודי", hue: "150 90% 55%", rank: 6 },
];

const SECRET = new Set([118, 134, 140, 147, 150]);

export const hwRarity = (id: number, tier: number): HwRarity =>
  SECRET.has(id) ? HW_RARITIES[5] : HW_RARITIES[tier <= 2 ? 0 : tier <= 4 ? 1 : tier <= 6 ? 2 : tier <= 8 ? 3 : 4];
export const isSecret = (id: number) => SECRET.has(id);

export interface HwCollection { key: string; name: string; hue: string; ids: number[]; badge: string }
export const HW_COLLECTIONS: HwCollection[] = [
  { key: "pumpkin", name: "קולקציית הדלעות", hue: "28 95% 55%", ids: [101, 128, 129, 136, 141, 149], badge: "אדון השדה" },
  { key: "cursed", name: "הקולקציה המקוללת", hue: "140 80% 50%", ids: [103, 130, 134, 135, 142], badge: "נושא הקללה" },
  { key: "haunted", name: "הקולקציה הרדופה", hue: "190 80% 65%", ids: [102, 111, 115, 126, 133, 139], badge: "צייד רוחות" },
  { key: "witch", name: "קולקציית המכשפות", hue: "280 85% 65%", ids: [104, 107, 116, 118, 120, 132, 146], badge: "מכשף עליון" },
  { key: "night", name: "יצורי הלילה", hue: "220 70% 65%", ids: [105, 106, 114, 117, 122], badge: "בן הלילה" },
  { key: "undead", name: "קולקציית האופל", hue: "0 80% 55%", ids: [108, 112, 121, 123, 124, 125, 127, 138, 145], badge: "שליט האופל" },
  { key: "eternal", name: "קולקציית הנצח", hue: "45 95% 62%", ids: [131, 137, 140, 143, 144, 147, 148, 150], badge: "שומר הנצח" },
];
export const hwCollectionOf = (id: number) => HW_COLLECTIONS.find((c) => c.ids.includes(id));

const FX: HwFx[] = [
  "flame", "ghost", "smoke", "magic", "star", "bats", "magic", "flame", "web", "ghost",
  "bats", "magic", "fog", "star", "ghost", "magic", "bats", "magic", "flame", "magic",
  "bats", "fog", "fog", "spark", "smoke", "ghost", "fog", "flame", "flame", "flame",
  "bats", "star", "ghost", "smoke", "smoke", "flame", "magic", "smoke", "ghost", "spark",
  "flame", "star", "flame", "fog", "bats", "star", "star", "flame", "star", "magic",
];
export const hwFx = (id: number): HwFx => FX[id - 101] ?? "fog";

const LORE = [
  "נדלקת רק כשמישהו שוכח את שיעורי הבית בחושך.",
  "רוח צעירה שעדיין לומדת להפחיד. בינתיים היא בעיקר מצחקקת.",
  "זוהרת בירוק בכל פעם שמישהו משקר במסדרון.",
  "הכובע בחר את בעליו. אף אחד לא בחר את הכובע.",
  "שבע נשמות, שמונה מבחנים, ותמיד נוחת על הרגליים.",
  "עף רק בין חצות לשחר, ותמיד לכיוון הספרייה.",
  "השיקוי בפנים מבעבע מאז 1887. אל תטעמו.",
  "הלהבות לא כבו אפילו בסופה הגדולה ההיא.",
  "טווה רשתות מצל, ולוכד רק את מי שמסתכל ישר אליו.",
  "פעם במאה שנה הפנס מתעורר מתחת לבית הספר הנטוש...",
  "החלונות נדלקים לבד. הדלת נפתחת רק מבפנים.",
  "הרונות משנות את משמעותן בכל ירח מלא.",
  "שומר על השדה, ולפעמים מסובב את הראש כשאף אחד לא רואה.",
  "רואה הכל באור הירח, ולא שוכח אף פרצוף.",
  "החיוך שלה השתנה מאז שהגיעה לעליית הגג.",
  "מראה את העתיד, אבל רק את החלקים המפחידים.",
  "נושא גולגולת קטנה ממקום שאף אחד לא זוכר.",
  "הדף האחרון כתוב בדיו שעדיין לא התייבשה.",
  "כל פנס על הענפים הוא משאלה שלא התגשמה.",
  "בקבוק אחד חסר. אף אחד לא יודע מי לקח אותו.",
  "נלבשה בנשף האחרון של הטירה, ומאז לא הוסרה.",
  "היללה שלו נשמעת שלושה הרים משם.",
  "התחבושות מתהדקות לבד כשמתקרבים.",
  "נתפר מחלקים של סיפורים שלא סופרו עד הסוף.",
  "הלהב לא חותך. הוא רק מזכיר שהזמן עובר.",
  "המנגינה מתנגנת גם כשהמפתח לא סובב.",
  "המכסה סגור. בדרך כלל.",
  "בחצות היא חוזרת להיות דלעת. או שלא.",
  "נשבע להגן על השדה עד הקציר האחרון.",
  "בוערת באש שלא מחממת, ולא נכבית.",
  "הטירה מופיעה רק כשהירח מלא, ונעלמת עם שחר.",
  "המטאטא שלה מהיר יותר מכל רוח.",
  "שקוף כמו ערפל, קר כמו לילה של נובמבר.",
  "ההשתקפות שלך במראה מחייכת רגע אחרייך.",
  "מי שיושב עליו שומע לחישות של מלכים עתיקים.",
  "דוהר בשבילים הריקים, והפנס שלו לא כבה לעולם.",
  "העין נפתחה לפני מאה שנה. היא עדיין מחפשת.",
  "העצמות שלו נאספו מכל אגדה שנשכחה.",
  "הקרוסלה מסתובבת לבד, והסוס הזה תמיד חוזר אחרון.",
  "החול זורם למעלה. אל תשאלו לאן.",
  "שולט בכל שדות הדלעות מאז הסתיו הראשון.",
  "שקופה כקרח, ובתוכה מהבהבת מחשבה ישנה.",
  "קם מאפר של מדורת רפאים, בכל שנה מחדש.",
  "מי ששותה ממנו רואה את העולם דרך ערפל.",
  "הסמל של בית ערפדים שאיש לא העז להזכיר בשמו.",
  "כל אבן בכתר נלקחה מכוכב שנפל.",
  "נוצר ברגע שבו הירח הסתיר את השמש לגמרי.",
  "האש בתוכו היא הפנס הראשון שאי פעם הודלק.",
  "גדלה בשדה שבין הכוכבים.",
  "פועם לאט, ושומר בתוכו את כל ליל האלווין.",
];
export const hwLore = (id: number) => LORE[id - 101] ?? "";

export const FX_LABEL: Record<HwFx, string> = {
  bats: "עטלפים וירח", fog: "ערפל זוחל", flame: "להבות וגיצים", spark: "ניצוצות ברק", smoke: "עשן אפל",
  web: "קורים ועכביש", ghost: "רוחות שקופות", star: "אבק כוכבים", magic: "אנרגיה קסומה",
};

// Local, permanent-per-device UI state (reveal / celebrated collections)
const read = (k: string): number[] | string[] => { try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; } };
const REVEAL_KEY = "hw_revealed_v1";
const DONE_KEY = "hw_collections_done_v1";
export const getRevealed = () => new Set(read(REVEAL_KEY) as number[]);
export const markRevealed = (id: number) => { const s = getRevealed(); s.add(id); localStorage.setItem(REVEAL_KEY, JSON.stringify([...s])); };
export const getCelebrated = () => new Set(read(DONE_KEY) as string[]);
export const markCelebrated = (k: string) => { const s = getCelebrated(); s.add(k); localStorage.setItem(DONE_KEY, JSON.stringify([...s])); };

// Subtle synthesized sounds; respects the app's sound on/off setting.
let ctx: AudioContext | null = null;
export const hwSound = (kind: HwFx | "reveal") => {
  if (!isSoundEnabled()) return;
  try {
    ctx = ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
    const dur = kind === "reveal" ? 1.4 : 0.6;
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (kind === "flame" || kind === "spark" || kind === "smoke") {
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.06 ? 1 : 0.15);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = kind === "smoke" ? 500 : 1800;
      src.connect(f); f.connect(g); src.start(t); src.stop(t + dur);
    } else {
      const o = ctx.createOscillator();
      o.type = kind === "bats" ? "square" : "sine";
      const [a, b] = kind === "reveal" ? [140, 620] : kind === "ghost" || kind === "fog" ? [520, 260] : kind === "bats" ? [1800, 2600] : [660, 990];
      o.frequency.setValueAtTime(a, t);
      o.frequency.exponentialRampToValueAtTime(b, t + dur);
      o.connect(g); o.start(t); o.stop(t + dur);
    }
  } catch { /* audio optional */ }
};
