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
  price: number;
}

const UNITS: [number, string][] = [
  [1e24, "ספטיליון"],
  [1e21, "סקסטיליון"],
  [1e18, "קווינטיליון"],
  [1e15, "קוודריליון"],
  [1e12, "טריליון"],
  [1e9, "מיליארד"],
  [1e6, "מיליון"],
];

export const formatKeif = (n: number) => {
  const v = Number(n) || 0;
  for (const [u, label] of UNITS) {
    if (v >= u) return `${(v / u).toLocaleString("he-IL", { maximumFractionDigits: 2 })} ${label}`;
  }
  return Math.floor(v).toLocaleString("he-IL");
};
