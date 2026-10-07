// Visual metadata for the 10 skin rarity tiers. Prices/names live in the database.
export interface TierMeta {
  tier: number;
  name: string;
  hue: number; // base hue for the tier
}

export const TIERS: TierMeta[] = [
  { tier: 1, name: "רגיל", hue: 210 },
  { tier: 2, name: "לא שכיח", hue: 150 },
  { tier: 3, name: "נדיר", hue: 200 },
  { tier: 4, name: "אפי", hue: 270 },
  { tier: 5, name: "אגדי", hue: 38 },
  { tier: 6, name: "מיתי", hue: 345 },
  { tier: 7, name: "אולטרה מיתי", hue: 185 },
  { tier: 8, name: "אלוהי", hue: 48 },
  { tier: 9, name: "שמימי", hue: 230 },
  { tier: 10, name: "היפר מיתי", hue: 300 },
];

export const tierMeta = (tier: number) => TIERS[Math.min(Math.max(tier, 1), 10) - 1];

export interface SkinRow {
  id: number;
  name: string;
  tier: number;
  price: string; // exact integer string from the database
  category?: string;
  available_until?: string | null;
}

// Exact big-integer helpers (no floating point for Keif amounts)
export const toBig = (v: string | number | null | undefined): bigint => {
  try {
    const t = String(v ?? "0").split(".")[0].replace(/[^\d-]/g, "");
    return t && t !== "-" ? BigInt(t) : 0n;
  } catch { return 0n; }
};

/** Full exact number with thousands separators */
export const formatKeifExact = (v: string | number | null | undefined) =>
  toBig(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

const UNITS: [bigint, string][] = [
  [10n ** 24n, "ספטיליון"],
  [10n ** 21n, "סקסטיליון"],
  [10n ** 18n, "קווינטיליון"],
  [10n ** 15n, "קוודריליון"],
  [10n ** 12n, "טריליון"],
  [10n ** 9n, "מיליארד"],
  [10n ** 6n, "מיליון"],
];

/** Compact display, e.g. "4 ספטיליון" — computed with bigint, exact to 2 decimals */
export const formatKeif = (v: string | number | null | undefined) => {
  const n = toBig(v);
  for (const [u, label] of UNITS) {
    if (n >= u) {
      const whole = n / u;
      const frac = ((n % u) * 100n) / u;
      const f = frac === 0n ? "" : "." + frac.toString().padStart(2, "0").replace(/0$/, "");
      return `${formatKeifExact(whole.toString())}${f} ${label}`;
    }
  }
  return formatKeifExact(n.toString());
};
