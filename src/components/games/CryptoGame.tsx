import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  RefreshCw,
  Coins,
  Skull,
  Zap,
  Wallet,
  Rocket,
  Flame,
  Crown,
  Sparkles,
  Star,
  Volume2,
  VolumeX
} from "lucide-react";

// Creator codes with higher spike chance
const CREATOR_CODES = ["426671703"];

// Special bonus codes - users who get $10 million bonus
const SPECIAL_BONUS_CODES = ["426671703", "322423534"];
const BONUS_AMOUNT = 10000000; // $10 million
const BONUS_STORAGE_KEY = "crypto-special-bonus-claimed";
const SOUND_ENABLED_KEY = "crypto-sound-enabled";

// Global sound state (will be updated by component)
let globalSoundEnabled = true;

// 24-Hour Major Event Configuration
const EVENT_START_TIME = Date.now(); // Event starts on deployment
const EVENT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const EVENT_STORAGE_KEY = "crypto-major-event-data";

interface CryptoGameProps {
  userCode?: string;
}

interface Crypto {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  isReal: boolean;
  owned: number;
  isCustom?: boolean;
  preEventPrice?: number; // Store price before event started
}

// Track holdings with buy percentage for profit calculation
interface Holding {
  amount: number;
  buyPercentage: number; // The percentage at time of purchase (change24h)
  investedAmount: number; // Total $ invested in this holding
}

interface GameState {
  balance: number;
  cryptos: Crypto[];
  portfolio: { [id: string]: number }; // Legacy - total amount owned
  holdings: { [id: string]: Holding[] }; // New - track each purchase with its buy percentage
  totalInvested: number;
  history: { action: string; timestamp: number }[];
}

interface EventData {
  startTime: number;
  preEventPrices: { [id: string]: number };
  eventActive: boolean;
}

const STORAGE_KEY = "crypto-game-state";

// ===== Numeric safety constants & helpers =====
const MAX_CAP = 1e16; // hard cap for any monetary value (price/balance/value)
const MIN_PRICE = 0.0001;
const MAX_SPIKE_MULT = 1000; // clamp any single spike multiplier
const MAX_PERCENT = 1e6; // clamp percentage display

const safeNumber = (value: any, fallback = 0): number => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") value = value.replace(/,/g, ".").trim();
  const n = Number(value);
  if (!Number.isFinite(n)) {
    console.warn("[CryptoGame] invalid numeric input, using fallback:", value);
    return fallback;
  }
  return n;
};

const cap = (n: number, max = MAX_CAP, min = -MAX_CAP): number => {
  if (!Number.isFinite(n)) return 0;
  if (n > max) {
    console.warn("[CryptoGame] value capped at MAX:", n);
    return max;
  }
  if (n < min) return min;
  return n;
};

const safePrice = (n: number, prev: number = MIN_PRICE): number => {
  if (!Number.isFinite(n)) {
    console.warn("[CryptoGame] non-finite price, reverting to prev:", n);
    return prev;
  }
  return Math.min(MAX_CAP, Math.max(MIN_PRICE, n));
};

const safePercent = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-MAX_PERCENT, Math.min(MAX_PERCENT, n));
};

// Sound effects using Web Audio API
const playEventSound = (type: 'start' | 'surge' | 'massive') => {
  if (!globalSoundEnabled) return; // Check if sound is enabled
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    if (type === 'start') {
      // Epic start sound - rising sweep
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } else if (type === 'surge') {
      // Surge sound - quick ascending
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } else if (type === 'massive') {
      // Massive spike - powerful chord
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1500, audioContext.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
    }
  } catch (e) {
    console.log('Audio not supported');
  }
};

// Top 10 real cryptocurrencies (Hebrew names)
const REAL_CRYPTOS: Omit<Crypto, "id" | "change24h" | "owned">[] = [
  { name: "ביטקוין", symbol: "BTC", price: 95000000, isReal: true },
  { name: "אתריום", symbol: "ETH", price: 3400000, isReal: true },
  { name: "טתר", symbol: "USDT", price: 1, isReal: true },
  { name: "BNB", symbol: "BNB", price: 700, isReal: true },
  { name: "סולנה", symbol: "SOL", price: 180, isReal: true },
  { name: "XRP", symbol: "XRP", price: 2.5, isReal: true },
  { name: "דוג'קוין", symbol: "DOGE", price: 0.35, isReal: true },
  { name: "קרדנו", symbol: "ADA", price: 1.1, isReal: true },
  { name: "אבלנץ'", symbol: "AVAX", price: 40, isReal: true },
  { name: "טרון", symbol: "TRX", price: 0.25, isReal: true },
];

// Fictional cryptocurrencies (90 total with Hebrew names)
const FICTIONAL_CRYPTOS: Omit<Crypto, "id" | "change24h" | "owned">[] = [
  { name: "מטבע הירח", symbol: "MOON", price: 0.0007, isReal: false },
  { name: "כוכב הזהב", symbol: "GSTR", price: 0.001, isReal: false },
  { name: "דרקון דיגיטלי", symbol: "DRGN", price: 0.005, isReal: false },
  { name: "פיניקס קוין", symbol: "PHNX", price: 0.01, isReal: false },
  { name: "נינג'ה טוקן", symbol: "NINJ", price: 0.025, isReal: false },
  { name: "סמוראי", symbol: "SAMR", price: 0.05, isReal: false },
  { name: "אטלנטיס", symbol: "ATLN", price: 0.1, isReal: false },
  { name: "קוסמוס פלוס", symbol: "CSMP", price: 0.15, isReal: false },
  { name: "נבולה", symbol: "NEBL", price: 0.2, isReal: false },
  { name: "קוואנטום", symbol: "QNTM", price: 0.3, isReal: false },
  { name: "מטריקס", symbol: "MTRX", price: 0.5, isReal: false },
  { name: "סייבר", symbol: "CYBR", price: 0.75, isReal: false },
  { name: "האקר", symbol: "HACK", price: 1.0, isReal: false },
  { name: "וירוס", symbol: "VIRS", price: 1.5, isReal: false },
  { name: "פיירוול", symbol: "FRWL", price: 2.0, isReal: false },
  { name: "קריפטון", symbol: "KRPT", price: 2.5, isReal: false },
  { name: "אנומלי", symbol: "ANML", price: 3.0, isReal: false },
  { name: "ספקטרום", symbol: "SPCT", price: 4.0, isReal: false },
  { name: "פאזל", symbol: "PZLE", price: 5.0, isReal: false },
  { name: "לבירינת", symbol: "LBRT", price: 6.0, isReal: false },
  { name: "אוניקס", symbol: "ONYX", price: 7.5, isReal: false },
  { name: "רובי", symbol: "RUBY", price: 10, isReal: false },
  { name: "ספיר", symbol: "SPHR", price: 12, isReal: false },
  { name: "אמרלד", symbol: "EMRL", price: 15, isReal: false },
  { name: "יהלום", symbol: "DIAM", price: 20, isReal: false },
  { name: "פלטינה", symbol: "PLTN", price: 25, isReal: false },
  { name: "טיטניום", symbol: "TITN", price: 30, isReal: false },
  { name: "אורניום", symbol: "URNM", price: 40, isReal: false },
  { name: "פלוטוניום", symbol: "PLUT", price: 50, isReal: false },
  { name: "נפטוניום", symbol: "NPTN", price: 60, isReal: false },
  { name: "גלקסיה", symbol: "GLXY", price: 75, isReal: false },
  { name: "סופרנובה", symbol: "SPNV", price: 100, isReal: false },
  { name: "פולסר", symbol: "PLSR", price: 125, isReal: false },
  { name: "קוואזר", symbol: "QZAR", price: 150, isReal: false },
  { name: "חור שחור", symbol: "BLKH", price: 200, isReal: false },
  { name: "אינפיניטי", symbol: "INFT", price: 250, isReal: false },
  { name: "אטרניטי", symbol: "ETRN", price: 300, isReal: false },
  { name: "דימנשן", symbol: "DMSN", price: 400, isReal: false },
  { name: "פאראלל", symbol: "PRLL", price: 500, isReal: false },
  { name: "מולטיוורס", symbol: "MLTV", price: 600, isReal: false },
  { name: "סינגולריטי", symbol: "SNGL", price: 750, isReal: false },
  { name: "הוריזון", symbol: "HRZN", price: 1000, isReal: false },
  { name: "זניט", symbol: "ZNTH", price: 1250, isReal: false },
  { name: "אפקס", symbol: "APEX", price: 1500, isReal: false },
  { name: "פינקל", symbol: "PNCL", price: 2000, isReal: false },
  { name: "סאמיט", symbol: "SMMT", price: 2500, isReal: false },
  { name: "אקמה", symbol: "ACME", price: 3000, isReal: false },
  { name: "פריים", symbol: "PRME", price: 4000, isReal: false },
  { name: "אלפא", symbol: "ALFA", price: 5000, isReal: false },
  { name: "אומגה", symbol: "OMGA", price: 6000, isReal: false },
  { name: "אלטימט", symbol: "ULTM", price: 7500, isReal: false },
  { name: "סופרים", symbol: "SPRM", price: 10000, isReal: false },
  { name: "מגה", symbol: "MEGA", price: 12500, isReal: false },
  { name: "גיגה", symbol: "GIGA", price: 15000, isReal: false },
  { name: "טרה", symbol: "TERA", price: 20000, isReal: false },
  { name: "פטה", symbol: "PETA", price: 25000, isReal: false },
  { name: "אקסה", symbol: "EXAA", price: 30000, isReal: false },
  { name: "זטה", symbol: "ZETA", price: 40000, isReal: false },
  { name: "יוטה", symbol: "YOTA", price: 50000, isReal: false },
  { name: "ברונטו", symbol: "BRNT", price: 75000, isReal: false },
  { name: "גאופ", symbol: "GEOP", price: 100000, isReal: false },
  { name: "טרדסיליון", symbol: "TRDS", price: 150000, isReal: false },
  { name: "קוואדריליון", symbol: "QUAD", price: 200000, isReal: false },
  { name: "קווינטיליון", symbol: "QUNT", price: 300000, isReal: false },
  { name: "סקסטיליון", symbol: "SXTN", price: 500000, isReal: false },
  { name: "ספטיליון", symbol: "SPTN", price: 750000, isReal: false },
  { name: "אוקטיליון", symbol: "OCTN", price: 1000000, isReal: false },
  { name: "נוניליון", symbol: "NONN", price: 1500000, isReal: false },
  { name: "דסיליון", symbol: "DSCN", price: 2000000, isReal: false },
  { name: "אנדסיליון", symbol: "UNDC", price: 3000000, isReal: false },
  { name: "דואודסיליון", symbol: "DODC", price: 5000000, isReal: false },
  { name: "טרדסיליון", symbol: "TRDC", price: 7500000, isReal: false },
  { name: "קוואטורדסיליון", symbol: "QTDC", price: 10000000, isReal: false },
  { name: "קווינדסיליון", symbol: "QNDC", price: 15000000, isReal: false },
  { name: "סקסדסיליון", symbol: "SXDC", price: 20000000, isReal: false },
  { name: "ספטנדסיליון", symbol: "SPDC", price: 30000000, isReal: false },
  { name: "אוקטודסיליון", symbol: "OCDC", price: 40000000, isReal: false },
  { name: "נובמדסיליון", symbol: "NVDC", price: 50000000, isReal: false },
  { name: "ויגינטיליון", symbol: "VGNT", price: 75000000, isReal: false },
  { name: "גוגול", symbol: "GOGL", price: 100000000, isReal: false },
];

const generateId = () => Math.random().toString(36).substring(2, 9);

const initializeCryptos = (): Crypto[] => {
  const all = [...REAL_CRYPTOS, ...FICTIONAL_CRYPTOS].map(c => ({
    ...c,
    id: generateId(),
    change24h: (Math.random() - 0.5) * 40, // -20% to +20%
    owned: 0,
  }));
  return all.sort((a, b) => a.price - b.price);
};

// Validate & repair a loaded GameState. Returns null if it's irrecoverably broken.
const sanitizeGameState = (raw: any): GameState | null => {
  if (!raw || typeof raw !== "object") return null;
  if (!Array.isArray(raw.cryptos)) return null;

  const cryptos: Crypto[] = raw.cryptos
    .filter((c: any) => c && typeof c.id === "string")
    .map((c: any) => ({
      id: c.id,
      name: String(c.name ?? ""),
      symbol: String(c.symbol ?? ""),
      price: safePrice(safeNumber(c.price, MIN_PRICE), MIN_PRICE),
      change24h: safePercent(safeNumber(c.change24h, 0)),
      isReal: !!c.isReal,
      owned: Math.max(0, Math.min(MAX_CAP, safeNumber(c.owned, 0))),
      isCustom: !!c.isCustom,
      preEventPrice: c.preEventPrice !== undefined ? safePrice(safeNumber(c.preEventPrice, MIN_PRICE), MIN_PRICE) : undefined,
    }));

  const portfolio: { [id: string]: number } = {};
  if (raw.portfolio && typeof raw.portfolio === "object") {
    Object.entries(raw.portfolio).forEach(([k, v]) => {
      const n = safeNumber(v, 0);
      if (n > 0) portfolio[k] = Math.min(MAX_CAP, n);
    });
  }

  const holdings: { [id: string]: Holding[] } = {};
  if (raw.holdings && typeof raw.holdings === "object") {
    Object.entries(raw.holdings).forEach(([k, arr]) => {
      if (!Array.isArray(arr)) return;
      const cleaned = (arr as any[])
        .map((h) => ({
          amount: Math.max(0, Math.min(MAX_CAP, safeNumber(h?.amount, 0))),
          buyPercentage: safePercent(safeNumber(h?.buyPercentage, 0)),
          investedAmount: Math.max(0, Math.min(MAX_CAP, safeNumber(h?.investedAmount, 0))),
        }))
        .filter((h) => h.amount > 0);
      if (cleaned.length > 0) holdings[k] = cleaned;
    });
  }

  const balance = Math.max(0, Math.min(MAX_CAP, safeNumber(raw.balance, 20)));
  const totalInvested = Math.max(0, Math.min(MAX_CAP, safeNumber(raw.totalInvested, 0)));
  const history = Array.isArray(raw.history) ? raw.history.slice(0, 50) : [];

  return { balance, cryptos, portfolio, holdings, totalInvested, history };
};

export const CryptoGame = ({ userCode }: CryptoGameProps) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<Crypto | null>(null);
  const [buyAmount, setBuyAmount] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [sellAmounts, setSellAmounts] = useState<{ [id: string]: string }>({});
  const [newCryptoName, setNewCryptoName] = useState("");
  const [newCryptoAmount, setNewCryptoAmount] = useState("");
  const [newCryptoPrice, setNewCryptoPrice] = useState("");
  const [filter, setFilter] = useState<"all" | "real" | "fictional" | "owned">("all");
  const [spikeAnimation, setSpikeAnimation] = useState<{ id: string; name: string; multiplier: number } | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [surgeAnimation, setSurgeAnimation] = useState<{ name: string; change: number } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY);
    return saved !== 'false'; // Default to true
  });
  const spikeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surgeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSoundPlayedRef = useRef<boolean>(false);
  const { toast } = useToast();

  // Update global sound state when local state changes
  useEffect(() => {
    globalSoundEnabled = soundEnabled;
    localStorage.setItem(SOUND_ENABLED_KEY, soundEnabled.toString());
  }, [soundEnabled]);

  const isCreator = userCode && CREATOR_CODES.includes(userCode);

  // Check if major event is active
  const isEventActive = useMemo(() => {
    if (!eventData) return false;
    const now = Date.now();
    return eventData.eventActive && (now - eventData.startTime) < EVENT_DURATION_MS;
  }, [eventData]);

  // Initialize and manage event data
  useEffect(() => {
    const savedEventData = localStorage.getItem(EVENT_STORAGE_KEY);
    if (savedEventData) {
      try {
        const parsed = JSON.parse(savedEventData) as EventData;
        const now = Date.now();
        // Check if event expired and needs cleanup
        if (now - parsed.startTime >= EVENT_DURATION_MS && parsed.eventActive) {
          // Event just ended - trigger cleanup with guaranteed +1% on next price update
          setEventData({ ...parsed, eventActive: false });
          localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify({ ...parsed, eventActive: false }));
        } else {
          setEventData(parsed);
        }
      } catch (e) {
        console.error("Error loading event data:", e);
      }
    } else {
      // Initialize new event
      const newEventData: EventData = {
        startTime: EVENT_START_TIME,
        preEventPrices: {},
        eventActive: true
      };
      setEventData(newEventData);
      localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(newEventData));
    }
  }, []);

  // Update time remaining countdown
  useEffect(() => {
    if (!eventData || !isEventActive) return;
    
    const updateTimer = () => {
      const elapsed = Date.now() - eventData.startTime;
      const remaining = Math.max(0, EVENT_DURATION_MS - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [eventData, isEventActive]);

  // Play event start sound once
  useEffect(() => {
    if (isEventActive && !eventSoundPlayedRef.current) {
      eventSoundPlayedRef.current = true;
      playEventSound('start');
      toast({
        title: "🔥 אירוע מג'ור התחיל! 🔥",
        description: "24 שעות של הזדמנויות מטורפות!",
      });
    }
  }, [isEventActive, toast]);

  // Load game state from localStorage (with sanitization)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = sanitizeGameState(parsed);
        if (!sanitized) {
          console.warn("[CryptoGame] corrupted state, resetting crypto game only");
          localStorage.removeItem(STORAGE_KEY);
          initializeNewGame();
        } else {
          setGameState(sanitized);
        }
      } catch (e) {
        console.error("Error loading game state:", e);
        localStorage.removeItem(STORAGE_KEY);
        initializeNewGame();
      }
    } else {
      initializeNewGame();
    }
  }, []);

  // Save game state to localStorage
  useEffect(() => {
    if (gameState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    }
  }, [gameState]);

  // Special bonus for specific user codes - $10 million one-time bonus
  useEffect(() => {
    if (!userCode || !gameState) return;
    
    // Check if this user is eligible for the special bonus
    if (SPECIAL_BONUS_CODES.includes(userCode)) {
      const bonusKey = `${BONUS_STORAGE_KEY}-${userCode}`;
      const alreadyClaimed = localStorage.getItem(bonusKey);
      
      if (!alreadyClaimed) {
        // Give the $10 million bonus
        setGameState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            balance: prev.balance + BONUS_AMOUNT,
            history: [
              { action: `🎁 בונוס מיוחד! קיבלת $10,000,000`, timestamp: Date.now() },
              ...prev.history,
            ],
          };
        });
        
        // Mark as claimed so they don't get it again
        localStorage.setItem(bonusKey, 'true');
        
        toast({
          title: "🎉 בונוס מיוחד!",
          description: "קיבלת $10,000,000 כבונוס מיוחד!",
        });
      }
    }
  }, [userCode, gameState !== null]);

  const initializeNewGame = () => {
    setGameState({
      balance: 20,
      cryptos: initializeCryptos(),
      portfolio: {},
      holdings: {}, // Initialize empty holdings
      totalInvested: 0,
      history: [{ action: "משחק התחיל עם $20", timestamp: Date.now() }],
    });
  };

  // Migrate old saves without holdings
  useEffect(() => {
    if (gameState && !gameState.holdings) {
      setGameState(prev => {
        if (!prev) return prev;
        // Create holdings from existing portfolio (assume 0% buy percentage for legacy)
        const migratedHoldings: { [id: string]: Holding[] } = {};
        Object.entries(prev.portfolio).forEach(([id, amount]) => {
          const crypto = prev.cryptos.find(c => c.id === id);
          if (crypto && amount > 0) {
            migratedHoldings[id] = [{
              amount,
              buyPercentage: 0, // Legacy holdings assume neutral buy
              investedAmount: crypto.price * amount
            }];
          }
        });
        return { ...prev, holdings: migratedHoldings };
      });
    }
  }, [gameState]);

  const updatePrices = useCallback(() => {
    if (!gameState) return;

    // Store pre-event prices when event starts
    if (isEventActive && eventData && Object.keys(eventData.preEventPrices).length === 0) {
      const preEventPrices: { [id: string]: number } = {};
      gameState.cryptos.forEach(c => {
        preEventPrices[c.id] = c.price;
      });
      const updatedEventData = { ...eventData, preEventPrices };
      setEventData(updatedEventData);
      localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(updatedEventData));
    }

    // Check if event just ended - apply guaranteed +1% boost
    const now = Date.now();
    const eventJustEnded = eventData && eventData.eventActive && 
      (now - eventData.startTime) >= EVENT_DURATION_MS;

    setGameState(prev => {
      if (!prev) return prev;

      // Check for extreme spike event
      const spikeChance = isCreator ? 0.01 : 0.001; // 1% for creators, 0.1% for regular users
      
      let triggeredSpike: { id: string; name: string; multiplier: number } | null = null;
      let triggeredSurge: { name: string; change: number } | null = null;

      const updatedCryptos = prev.cryptos.map(crypto => {
        const prevPrice = safePrice(crypto.price, MIN_PRICE);

        // If event just ended, guarantee +1% above pre-event price
        if (eventJustEnded && eventData?.preEventPrices[crypto.id]) {
          const preEventPrice = safePrice(eventData.preEventPrices[crypto.id], MIN_PRICE);
          const minEndPrice = preEventPrice * 1.01;
          const finalPrice = safePrice(Math.max(prevPrice, minEndPrice), prevPrice);
          return {
            ...crypto,
            price: finalPrice,
            change24h: safePercent(((finalPrice - prevPrice) / prevPrice) * 100),
          };
        }

        // Check for extreme spike on owned cryptos (clamped to MAX_SPIKE_MULT)
        if ((crypto.owned || 0) > 0 && Math.random() < spikeChance) {
          // Clamp spike so prices cannot blow past MAX_CAP
          const desired = 20000;
          const headroom = prevPrice > 0 ? MAX_CAP / prevPrice : MAX_SPIKE_MULT;
          const spikeMultiplier = Math.max(2, Math.min(MAX_SPIKE_MULT, desired, headroom));
          triggeredSpike = { id: crypto.id, name: crypto.name, multiplier: spikeMultiplier };
          playEventSound('massive');
          const spikedPrice = safePrice(prevPrice * spikeMultiplier, prevPrice);
          return {
            ...crypto,
            price: spikedPrice,
            change24h: safePercent((spikeMultiplier - 1) * 100),
          };
        }

        // MAJOR EVENT BEHAVIOR - significantly boosted gains
        if (isEventActive) {
          const eventVolatility = prevPrice > 10000 ? 0.6 : prevPrice > 100 ? 0.45 : 0.35;
          const eventBias = 0.15;
          const change = (Math.random() - 0.5 + eventBias) * eventVolatility * 2;

          const surgeChance = 0.08;
          const isSurge = Math.random() < surgeChance;

          if (isSurge) {
            const surgeMultiplier = 1 + (Math.random() * 2 + 0.5); // +50% to +250%
            const surgedPrice = safePrice(prevPrice * surgeMultiplier, prevPrice);
            const surgeChange = safePercent(((surgedPrice - prevPrice) / prevPrice) * 100);

            if (surgeChange > 100 && !triggeredSurge) {
              triggeredSurge = { name: crypto.name, change: surgeChange };
              playEventSound('surge');
            }

            return { ...crypto, price: surgedPrice, change24h: surgeChange };
          }

          const crashChance = prevPrice > 50000 ? 0.005 : 0.002;
          const isCrash = Math.random() < crashChance;

          const newPrice = safePrice(prevPrice * (1 + change), prevPrice);
          const finalPrice = isCrash
            ? safePrice(prevPrice * (0.7 + Math.random() * 0.2), prevPrice)
            : newPrice;

          return {
            ...crypto,
            price: finalPrice,
            change24h: safePercent(((finalPrice - prevPrice) / prevPrice) * 100),
          };
        }

        // Normal behavior (outside event)
        const volatility = prevPrice > 10000 ? 0.35 : prevPrice > 100 ? 0.25 : 0.18;
        const bias = 0.02;
        const change = (Math.random() - 0.5 + bias) * volatility * 2;
        const newPrice = safePrice(prevPrice * (1 + change), prevPrice);

        const crashChance = prevPrice > 50000 ? 0.02 : prevPrice > 1000 ? 0.01 : 0.005;
        const isCrash = Math.random() < crashChance;

        const finalPrice = isCrash
          ? safePrice(prevPrice * (0.3 + Math.random() * 0.4), prevPrice)
          : newPrice;

        return {
          ...crypto,
          price: finalPrice,
          change24h: safePercent(((finalPrice - prevPrice) / prevPrice) * 100),
        };
      });

      // Trigger spike animation if one occurred
      if (triggeredSpike) {
        setSpikeAnimation(triggeredSpike);
        if (spikeTimeoutRef.current) {
          clearTimeout(spikeTimeoutRef.current);
        }
        spikeTimeoutRef.current = setTimeout(() => {
          setSpikeAnimation(null);
        }, 5000);
      }

      // Trigger surge animation if one occurred
      if (triggeredSurge) {
        setSurgeAnimation(triggeredSurge);
        if (surgeTimeoutRef.current) {
          clearTimeout(surgeTimeoutRef.current);
        }
        surgeTimeoutRef.current = setTimeout(() => {
          setSurgeAnimation(null);
        }, 2000);
      }

      // Handle event end
      if (eventJustEnded && eventData) {
        const endedEventData = { ...eventData, eventActive: false };
        setEventData(endedEventData);
        localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(endedEventData));
        toast({
          title: "✨ האירוע הסתיים!",
          description: "כל המטבעות סיימו לפחות +1% מעל המחיר ההתחלתי!",
        });
      }

      return {
        ...prev,
        cryptos: updatedCryptos,
        history: triggeredSpike 
          ? [
              { action: `🚀 ספייק קיצוני! ${triggeredSpike.name} עלה ב-+2,000,000%!`, timestamp: Date.now() },
              ...prev.history.slice(0, 49),
            ]
          : triggeredSurge
          ? [
              { action: `🔥 זינוק! ${triggeredSurge.name} עלה ב-+${triggeredSurge.change.toFixed(0)}%!`, timestamp: Date.now() },
              ...prev.history.slice(0, 49),
            ]
          : prev.history,
      };
    });
  }, [gameState, isCreator, isEventActive, eventData, toast]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (spikeTimeoutRef.current) {
        clearTimeout(spikeTimeoutRef.current);
      }
      if (surgeTimeoutRef.current) {
        clearTimeout(surgeTimeoutRef.current);
      }
    };
  }, []);

  // Update prices every 5 seconds
  useEffect(() => {
    const interval = setInterval(updatePrices, 5000);
    return () => clearInterval(interval);
  }, [updatePrices]);

  const buyCrypto = (crypto: Crypto, amountRaw: number) => {
    if (!gameState) return;

    const amount = safeNumber(amountRaw, 0);
    if (amount <= 0 || !Number.isFinite(amount)) {
      toast({ title: "כמות לא תקינה!", variant: "destructive" });
      return;
    }

    const totalCost = safeNumber(crypto.price * amount, 0);
    if (!Number.isFinite(totalCost) || totalCost <= 0 || totalCost > gameState.balance) {
      toast({ title: "אין מספיק כסף!", variant: "destructive" });
      return;
    }

    // Store the current percentage (change24h) as the buy percentage
    const buyPercentage = crypto.change24h;

    setGameState(prev => {
      if (!prev) return prev;

      const newPortfolio = {
        ...prev.portfolio,
        [crypto.id]: (prev.portfolio[crypto.id] || 0) + amount,
      };

      // Add new holding with buy percentage
      const existingHoldings = prev.holdings?.[crypto.id] || [];
      const newHolding: Holding = {
        amount,
        buyPercentage,
        investedAmount: totalCost
      };
      const newHoldings = {
        ...prev.holdings,
        [crypto.id]: [...existingHoldings, newHolding],
      };

      const updatedCryptos = prev.cryptos.map(c =>
        c.id === crypto.id ? { ...c, owned: (c.owned || 0) + amount } : c
      );

      const buyPercentageDisplay = buyPercentage >= 0 ? `+${buyPercentage.toFixed(1)}%` : `${buyPercentage.toFixed(1)}%`;

      return {
        ...prev,
        balance: cap(safeNumber(prev.balance - totalCost, 0), MAX_CAP, 0),
        portfolio: newPortfolio,
        holdings: newHoldings,
        cryptos: updatedCryptos,
        totalInvested: cap(safeNumber(prev.totalInvested + totalCost, 0), MAX_CAP, 0),
        history: [
          { action: `קנית ${amount} ${crypto.name} ב-$${totalCost.toFixed(2)} (${buyPercentageDisplay})`, timestamp: Date.now() },
          ...prev.history.slice(0, 49),
        ],
      };
    });

    const buyPercentageDisplay = buyPercentage >= 0 ? `+${buyPercentage.toFixed(1)}%` : `${buyPercentage.toFixed(1)}%`;
    toast({ title: `קנית ${amount} ${crypto.name} ב-${buyPercentageDisplay}!` });
    setBuyAmount("");
    setSelectedCrypto(null);
  };

  const sellCrypto = (crypto: Crypto, amountRaw: number) => {
    if (!gameState) return;

    const amount = safeNumber(amountRaw, 0);
    if (amount <= 0 || !Number.isFinite(amount)) {
      toast({ title: "כמות לא תקינה!", variant: "destructive" });
      return;
    }

    const owned = safeNumber(gameState.portfolio[crypto.id], 0);
    if (amount > owned) {
      toast({ title: "אין לך מספיק מטבעות!", variant: "destructive" });
      return;
    }

    // Get current sell percentage
    const sellPercentage = crypto.change24h;

    // Calculate profit/loss based on percentage difference (FIFO - First In First Out)
    const holdings = gameState.holdings?.[crypto.id] || [];
    let remainingToSell = amount;
    let totalProfit = 0;
    let totalInvested = 0;
    let weightedBuyPercentage = 0;

    // Process holdings FIFO
    const updatedHoldings: Holding[] = [];
    for (const holding of holdings) {
      if (remainingToSell <= 0) {
        updatedHoldings.push(holding);
        continue;
      }

      const sellFromThis = Math.min(remainingToSell, holding.amount);
      const percentageDiff = sellPercentage - holding.buyPercentage; // Profit % = sell% - buy%
      const holdingInvested = (sellFromThis / holding.amount) * holding.investedAmount;
      const profitFromThis = holdingInvested * (percentageDiff / 100);

      totalProfit += profitFromThis;
      totalInvested += holdingInvested;
      weightedBuyPercentage += holding.buyPercentage * sellFromThis;
      remainingToSell -= sellFromThis;

      // Keep remaining amount in holding
      const remainingInHolding = holding.amount - sellFromThis;
      if (remainingInHolding > 0) {
        updatedHoldings.push({
          ...holding,
          amount: remainingInHolding,
          investedAmount: holding.investedAmount * (remainingInHolding / holding.amount)
        });
      }
    }

    weightedBuyPercentage = amount > 0 ? weightedBuyPercentage / amount : 0;
    const percentageDiff = safePercent(sellPercentage - weightedBuyPercentage);
    const finalValue = Math.max(0, cap(safeNumber(totalInvested + totalProfit, 0), MAX_CAP, 0));

    setGameState(prev => {
      if (!prev) return prev;

      const newOwned = (prev.portfolio[crypto.id] || 0) - amount;
      const newPortfolio = { ...prev.portfolio };
      if (newOwned <= 0) {
        delete newPortfolio[crypto.id];
      } else {
        newPortfolio[crypto.id] = newOwned;
      }

      // Update holdings
      const newHoldings = { ...prev.holdings };
      if (updatedHoldings.length === 0) {
        delete newHoldings[crypto.id];
      } else {
        newHoldings[crypto.id] = updatedHoldings;
      }

      const updatedCryptos = prev.cryptos.map(c =>
        c.id === crypto.id ? { ...c, owned: Math.max(0, (c.owned || 0) - amount) } : c
      );

      // Format profit/loss display
      const profitSign = totalProfit >= 0 ? '+' : '';
      const percentSign = percentageDiff >= 0 ? '+' : '';
      const profitDisplay = `${profitSign}$${Math.abs(totalProfit).toFixed(2)} (${percentSign}${percentageDiff.toFixed(1)}%)`;

      return {
        ...prev,
        balance: cap(safeNumber(prev.balance + finalValue, prev.balance), MAX_CAP, 0),
        portfolio: newPortfolio,
        holdings: newHoldings,
        cryptos: updatedCryptos,
        history: [
          { action: `מכרת ${amount} ${crypto.name} ב-$${finalValue.toFixed(2)} | ${profitDisplay}`, timestamp: Date.now() },
          ...prev.history.slice(0, 49),
        ],
      };
    });

    // Show toast with profit/loss info
    const profitSign = totalProfit >= 0 ? '+' : '';
    const percentSign = percentageDiff >= 0 ? '+' : '';
    const profitColor = totalProfit >= 0 ? 'רווח' : 'הפסד';
    toast({ 
      title: `מכרת ${amount} ${crypto.name}!`,
      description: `${profitColor}: ${profitSign}$${Math.abs(totalProfit).toFixed(2)} (${percentSign}${percentageDiff.toFixed(1)}%)`,
    });
  };

  const createCustomCrypto = () => {
    if (!gameState) return;
    if (!newCryptoName.trim() || !newCryptoAmount || !newCryptoPrice) {
      toast({ title: "מלא את כל השדות!", variant: "destructive" });
      return;
    }

    const amount = safeNumber(newCryptoAmount, 0);
    const pricePerCoin = safeNumber(newCryptoPrice, 0);
    const totalCost = safeNumber(amount * pricePerCoin, 0);

    if (amount <= 0 || pricePerCoin <= 0 || !Number.isFinite(totalCost) || totalCost <= 0) {
      toast({ title: "ערכים לא תקינים!", variant: "destructive" });
      return;
    }
    if (totalCost > gameState.balance) {
      toast({ title: "אין מספיק כסף ליצירת המטבע!", variant: "destructive" });
      return;
    }

    const newCrypto: Crypto = {
      id: generateId(),
      name: newCryptoName.trim(),
      symbol: newCryptoName.trim().substring(0, 4).toUpperCase(),
      price: pricePerCoin,
      change24h: 0,
      isReal: false,
      owned: amount,
      isCustom: true,
    };

    // Custom cryptos start with 0% change (neutral buy)
    const newHolding: Holding = {
      amount,
      buyPercentage: 0,
      investedAmount: totalCost
    };

    setGameState(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        balance: prev.balance - totalCost,
        cryptos: [...prev.cryptos, newCrypto].sort((a, b) => a.price - b.price),
        portfolio: {
          ...prev.portfolio,
          [newCrypto.id]: amount,
        },
        holdings: {
          ...prev.holdings,
          [newCrypto.id]: [newHolding],
        },
        history: [
          { action: `יצרת מטבע חדש: ${newCryptoName} (${amount} מטבעות ב-$${totalCost.toFixed(2)})`, timestamp: Date.now() },
          ...prev.history.slice(0, 49),
        ],
      };
    });

    toast({ title: `המטבע ${newCryptoName} נוצר בהצלחה!` });
    setNewCryptoName("");
    setNewCryptoAmount("");
    setNewCryptoPrice("");
    setShowCreateDialog(false);
  };

  const resetGame = () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את המשחק? כל ההתקדמות תימחק!")) {
      localStorage.removeItem(STORAGE_KEY);
      initializeNewGame();
      toast({ title: "המשחק אופס!" });
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `$${(price / 1000).toFixed(2)}K`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(6)}`;
  };

  // Calculate portfolio value based on percentage-based profit/loss
  const getPortfolioValue = () => {
    if (!gameState) return 0;
    
    let totalValue = 0;
    
    // Calculate value for each holding based on percentage difference
    Object.entries(gameState.holdings || {}).forEach(([id, holdings]) => {
      const crypto = gameState.cryptos.find(c => c.id === id);
      if (!crypto) return;
      
      const currentPercentage = crypto.change24h;
      
      holdings.forEach(holding => {
        // Profit/loss = sell% - buy%
        const percentageDiff = currentPercentage - holding.buyPercentage;
        const profitLoss = holding.investedAmount * (percentageDiff / 100);
        const holdingValue = holding.investedAmount + profitLoss;
        totalValue += Math.max(0, holdingValue); // Prevent negative values
      });
    });
    
    return totalValue;
  };

  // Calculate potential profit/loss for a specific crypto
  const getCryptoProfit = (crypto: Crypto) => {
    if (!gameState || !gameState.holdings) return { profit: 0, percentage: 0, invested: 0 };
    
    const holdings = gameState.holdings[crypto.id] || [];
    if (holdings.length === 0) return { profit: 0, percentage: 0, invested: 0 };
    
    let totalProfit = 0;
    let totalInvested = 0;
    let weightedBuyPercentage = 0;
    let totalAmount = 0;
    
    holdings.forEach(holding => {
      const percentageDiff = crypto.change24h - holding.buyPercentage;
      const profitFromHolding = holding.investedAmount * (percentageDiff / 100);
      totalProfit += profitFromHolding;
      totalInvested += holding.investedAmount;
      weightedBuyPercentage += holding.buyPercentage * holding.amount;
      totalAmount += holding.amount;
    });
    
    const avgBuyPercentage = totalAmount > 0 ? weightedBuyPercentage / totalAmount : 0;
    const percentageDiff = crypto.change24h - avgBuyPercentage;
    
    return { profit: totalProfit, percentage: percentageDiff, invested: totalInvested };
  };

  const filteredCryptos = gameState?.cryptos.filter(crypto => {
    switch (filter) {
      case "real": return crypto.isReal;
      case "fictional": return !crypto.isReal;
      case "owned": return (crypto.owned || 0) > 0;
      default: return true;
    }
  }) || [];

  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const totalValue = gameState.balance + getPortfolioValue();
  const profit = totalValue - 20; // Starting balance is now $20
  const profitPercent = (profit / 20) * 100; // Percentage based on starting balance

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`space-y-6 relative ${isEventActive ? 'min-h-screen' : ''}`} dir="rtl">
      {/* Major Event Dark Overlay & Effects */}
      {isEventActive && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-transparent to-red-900/20" />
          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-orange-400 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                  opacity: 0.3 + Math.random() * 0.5,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Surge Animation */}
      {surgeAnimation && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
          <div className="px-6 py-3 rounded-full bg-gradient-to-r from-orange-600 to-red-600 border-2 border-orange-400 shadow-lg shadow-orange-500/50">
            <div className="flex items-center gap-2 text-white font-bold">
              <Flame className="w-5 h-5 animate-pulse" />
              <span>{surgeAnimation.name}: +{surgeAnimation.change.toFixed(0)}%</span>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Extreme Spike Animation */}
      {spikeAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/30 via-orange-900/20 to-red-900/30 animate-pulse" />
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-400 animate-scale-in relative z-10 shadow-2xl shadow-yellow-500/50">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-transparent animate-pulse" />
            <Rocket className="w-32 h-32 mx-auto text-yellow-400 mb-4 animate-bounce" style={{ filter: 'drop-shadow(0 0 20px rgba(250, 204, 21, 0.8))' }} />
            <h2 className="text-5xl font-bold text-yellow-400 mb-2" style={{ textShadow: '0 0 30px rgba(250, 204, 21, 0.8)' }}>🚀 ספייק קיצוני! 🚀</h2>
            <p className="text-3xl text-yellow-300">{spikeAnimation.name}</p>
            <p className="text-6xl font-bold text-green-400 mt-4" style={{ textShadow: '0 0 30px rgba(34, 197, 94, 0.8)' }}>+2,000,000%</p>
            <p className="text-xl text-muted-foreground mt-2">המטבע שלך זינק לשמיים!</p>
            <div className="mt-4 flex justify-center gap-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-8 h-8 text-yellow-400 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Major Event Banner */}
      {isEventActive && (
        <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-orange-950/90 via-red-950/80 to-amber-950/90 border-2 border-orange-500/50 shadow-lg shadow-orange-500/20 z-10">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-red-500/10 animate-pulse" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500" />
          
          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Flame className="w-8 h-8 text-orange-400 animate-pulse" />
              <Crown className="w-10 h-10 text-yellow-400" style={{ filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.6))' }} />
              <Flame className="w-8 h-8 text-orange-400 animate-pulse" />
            </div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-2">
              🔥 אירוע מג'ור - 24 שעות! 🔥
            </h3>
            <p className="text-orange-200 mb-4 text-lg">רווחים מוגברים, זינוקים מטורפים, סיכוי גבוה לעליות!</p>
            
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black/50 border border-orange-500/50">
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span className="text-2xl font-mono font-bold text-orange-300">{formatTimeRemaining(timeRemaining)}</span>
              <span className="text-orange-400 text-sm">נותרו</span>
            </div>
            
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                <TrendingUp className="w-3 h-3 ml-1" />
                סיכוי רווח גבוה
              </Badge>
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                <Zap className="w-3 h-3 ml-1" />
                זינוקים מטורפים
              </Badge>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                <Star className="w-3 h-3 ml-1" />
                סיום מובטח +1%
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="text-center relative z-10">
        {/* Sound Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="absolute left-0 top-0 text-muted-foreground hover:text-foreground"
          title={soundEnabled ? "השתק צלילים" : "הפעל צלילים"}
        >
          {soundEnabled ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </Button>
        
        <h2 className={`text-3xl font-bold mb-2 flex items-center justify-center gap-2 ${isEventActive ? 'text-orange-400' : 'text-green-500'}`}>
          {isEventActive ? <Flame className="w-8 h-8 animate-pulse" /> : <Zap className="w-8 h-8" />}
          קריפטו־גיים
          {isEventActive ? <Flame className="w-8 h-8 animate-pulse" /> : <Zap className="w-8 h-8" />}
        </h2>
        <p className="text-muted-foreground">סחר במטבעות קריפטו וירטואליים!</p>
        {isCreator && (
          <Badge variant="outline" className="mt-2 border-yellow-500 text-yellow-500">
            יוצר - סיכוי ספייק גבוה יותר
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
        <Card className={`p-4 ${isEventActive ? 'bg-gradient-to-br from-green-900/70 to-green-950/70 border-green-400/50 shadow-lg shadow-green-500/10' : 'bg-gradient-to-br from-green-900/50 to-green-950/50 border-green-500/30'}`}>
          <div className="text-sm text-muted-foreground">יתרה</div>
          <div className="text-2xl font-bold text-green-400">{formatPrice(gameState.balance)}</div>
        </Card>
        <Card className={`p-4 ${isEventActive ? 'bg-gradient-to-br from-blue-900/70 to-blue-950/70 border-blue-400/50 shadow-lg shadow-blue-500/10' : 'bg-gradient-to-br from-blue-900/50 to-blue-950/50 border-blue-500/30'}`}>
          <div className="text-sm text-muted-foreground">ערך תיק</div>
          <div className="text-2xl font-bold text-blue-400">{formatPrice(getPortfolioValue())}</div>
        </Card>
        <Card className={`p-4 ${isEventActive ? 'bg-gradient-to-br from-purple-900/70 to-purple-950/70 border-purple-400/50 shadow-lg shadow-purple-500/10' : 'bg-gradient-to-br from-purple-900/50 to-purple-950/50 border-purple-500/30'}`}>
          <div className="text-sm text-muted-foreground">סה"כ</div>
          <div className="text-2xl font-bold text-purple-400">{formatPrice(totalValue)}</div>
        </Card>
        <Card className={`p-4 ${profit >= 0 
          ? (isEventActive ? 'bg-gradient-to-br from-emerald-900/70 to-emerald-950/70 border-emerald-400/50 shadow-lg shadow-emerald-500/10' : 'bg-gradient-to-br from-emerald-900/50 to-emerald-950/50 border-emerald-500/30')
          : (isEventActive ? 'bg-gradient-to-br from-red-900/70 to-red-950/70 border-red-400/50 shadow-lg shadow-red-500/10' : 'bg-gradient-to-br from-red-900/50 to-red-950/50 border-red-500/30')
        }`}>
          <div className="text-sm text-muted-foreground">רווח/הפסד</div>
          <div className={`text-2xl font-bold flex items-center gap-1 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {profit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 relative z-10">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/20">
              <Plus className="w-4 h-4 ml-2" />
              צור מטבע משלך
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>צור מטבע קריפטו חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">שם המטבע (בעברית)</label>
                <Input
                  value={newCryptoName}
                  onChange={(e) => setNewCryptoName(e.target.value)}
                  placeholder="שם המטבע"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">כמות מטבעות</label>
                <Input
                  type="number"
                  value={newCryptoAmount}
                  onChange={(e) => setNewCryptoAmount(e.target.value)}
                  placeholder="כמות"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">מחיר למטבע ($)</label>
                <Input
                  type="number"
                  value={newCryptoPrice}
                  onChange={(e) => setNewCryptoPrice(e.target.value)}
                  placeholder="מחיר"
                  min="0.0001"
                  step="0.0001"
                />
              </div>
              {newCryptoAmount && newCryptoPrice && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm">עלות כוללת: <strong>{formatPrice(parseFloat(newCryptoAmount) * parseFloat(newCryptoPrice))}</strong></div>
                  <div className="text-xs text-muted-foreground">יתרה נוכחית: {formatPrice(gameState.balance)}</div>
                </div>
              )}
              <Button 
                onClick={createCustomCrypto} 
                className="w-full"
                disabled={!newCryptoName || !newCryptoAmount || !newCryptoPrice || 
                  (parseFloat(newCryptoAmount) * parseFloat(newCryptoPrice)) > gameState.balance}
              >
                <Coins className="w-4 h-4 ml-2" />
                צור מטבע
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sell Portfolio Dialog */}
        <Dialog open={showSellDialog} onOpenChange={(open) => {
          setShowSellDialog(open);
          if (!open) setSellAmounts({});
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20">
              <Wallet className="w-4 h-4 ml-2" />
              מכור מטבעות
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="max-w-md max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                מכור מהתיק שלך
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {gameState.cryptos.filter(c => (c.owned || 0) > 0).length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    אין לך מטבעות למכירה
                  </div>
                ) : (
                  gameState.cryptos
                    .filter(c => (c.owned || 0) > 0)
                    .map(crypto => {
                      const { profit, percentage, invested } = getCryptoProfit(crypto);
                      const profitColor = profit >= 0 ? 'text-green-500' : 'text-red-500';
                      const percentSign = percentage >= 0 ? '+' : '';
                      const profitSign = profit >= 0 ? '+' : '';
                      
                      return (
                        <Card key={crypto.id} className="p-4 border-blue-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-bold">{crypto.name}</span>
                              <span className="text-xs text-muted-foreground mr-2">({crypto.symbol})</span>
                              {crypto.isCustom && <Badge variant="outline" className="text-purple-500 border-purple-500 mr-2">שלי</Badge>}
                            </div>
                            <div className={`text-sm ${crypto.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            ברשותך: <strong>{crypto.owned}</strong> מטבעות
                            <br />
                            השקעה: <strong>{formatPrice(invested)}</strong>
                            <br />
                            <span className={profitColor}>
                              {profit >= 0 ? 'רווח' : 'הפסד'}: <strong>{profitSign}${Math.abs(profit).toFixed(2)} ({percentSign}{percentage.toFixed(1)}%)</strong>
                            </span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Input
                              type="number"
                              placeholder="כמות למכירה"
                              value={sellAmounts[crypto.id] || ""}
                              onChange={(e) => setSellAmounts(prev => ({ ...prev, [crypto.id]: e.target.value }))}
                              min="0.01"
                              max={crypto.owned}
                              step="0.01"
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSellAmounts(prev => ({ ...prev, [crypto.id]: String(crypto.owned) }))}
                            >
                              הכל
                            </Button>
                          </div>
                          {sellAmounts[crypto.id] && parseFloat(sellAmounts[crypto.id]) > 0 && (() => {
                            const sellAmount = parseFloat(sellAmounts[crypto.id]);
                            const ratio = sellAmount / (crypto.owned || 1);
                            const expectedProfit = profit * ratio;
                            const expectedValue = (invested * ratio) + expectedProfit;
                            const expectedProfitSign = expectedProfit >= 0 ? '+' : '';
                            
                            return (
                              <div className={`mt-2 text-sm ${expectedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                תקבל: {formatPrice(expectedValue)} ({expectedProfitSign}${Math.abs(expectedProfit).toFixed(2)})
                              </div>
                            );
                          })()}
                          <Button
                            className={`w-full mt-2 ${profit >= 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                            size="sm"
                            onClick={() => {
                              const amount = parseFloat(sellAmounts[crypto.id] || "0");
                              if (amount > 0 && amount <= (crypto.owned || 0)) {
                                sellCrypto(crypto, amount);
                                setSellAmounts(prev => {
                                  const newAmounts = { ...prev };
                                  delete newAmounts[crypto.id];
                                  return newAmounts;
                                });
                              }
                            }}
                            disabled={!sellAmounts[crypto.id] || parseFloat(sellAmounts[crypto.id]) <= 0 || parseFloat(sellAmounts[crypto.id]) > (crypto.owned || 0)}
                          >
                            {profit >= 0 ? 'מכור ברווח' : 'מכור בהפסד'}
                          </Button>
                        </Card>
                      );
                    })
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Button variant="outline" onClick={resetGame} className="border-red-500/50 text-red-400 hover:bg-red-500/20">
          <Skull className="w-4 h-4 ml-2" />
          אפס משחק
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: "all", label: "הכל" },
          { value: "real", label: "אמיתיים" },
          { value: "fictional", label: "בדיוניים" },
          { value: "owned", label: "שלי" },
        ].map(f => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.value as typeof filter)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Crypto List */}
      <ScrollArea className="h-[400px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCryptos.map((crypto) => (
            <Card
              key={crypto.id}
              className={`p-4 cursor-pointer transition-all hover:scale-[1.02] ${
                crypto.isReal ? 'border-yellow-500/30' : crypto.isCustom ? 'border-purple-500/30' : 'border-green-500/30'
              } ${selectedCrypto?.id === crypto.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedCrypto(crypto)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{crypto.name}</span>
                  {crypto.isReal && <Badge variant="outline" className="text-yellow-500 border-yellow-500">אמיתי</Badge>}
                  {crypto.isCustom && <Badge variant="outline" className="text-purple-500 border-purple-500">שלי</Badge>}
                </div>
                <span className="text-xs text-muted-foreground">{crypto.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{formatPrice(crypto.price)}</span>
                <span className={`text-sm flex items-center gap-1 ${crypto.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {crypto.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                </span>
              </div>
              {(crypto.owned || 0) > 0 && (
                <div className="mt-2 text-sm text-muted-foreground">
                  ברשותך: {crypto.owned} ({formatPrice(crypto.price * (crypto.owned || 0))})
                </div>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Buy/Sell Dialog */}
      {selectedCrypto && (
        <Dialog open={!!selectedCrypto} onOpenChange={() => setSelectedCrypto(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {selectedCrypto.name} ({selectedCrypto.symbol})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{formatPrice(selectedCrypto.price)}</div>
                <div className={`text-sm ${selectedCrypto.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {selectedCrypto.change24h >= 0 ? '+' : ''}{selectedCrypto.change24h.toFixed(2)}%
                </div>
              </div>

              {(selectedCrypto.owned || 0) > 0 && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  ברשותך: <strong>{selectedCrypto.owned}</strong> מטבעות
                  <br />
                  <span className="text-sm text-muted-foreground">
                    שווי: {formatPrice(selectedCrypto.price * (selectedCrypto.owned || 0))}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="כמות"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                />
                {buyAmount && (
                  <div className="text-sm text-muted-foreground text-center">
                    עלות: {formatPrice(selectedCrypto.price * parseFloat(buyAmount || "0"))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => buyCrypto(selectedCrypto, parseFloat(buyAmount || "0"))}
                  disabled={!buyAmount || parseFloat(buyAmount) * selectedCrypto.price > gameState.balance}
                >
                  קנה
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={() => sellCrypto(selectedCrypto, parseFloat(buyAmount || "0"))}
                  disabled={!buyAmount || parseFloat(buyAmount) > (selectedCrypto.owned || 0)}
                >
                  מכור
                </Button>
              </div>

              <div className="flex gap-2 justify-center">
                {[0.25, 0.5, 0.75, 1].map(percent => (
                  <Button
                    key={percent}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const maxCanBuy = gameState.balance / selectedCrypto.price;
                      setBuyAmount((maxCanBuy * percent).toFixed(2));
                    }}
                  >
                    {percent * 100}%
                  </Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Warning */}
      <Card className="p-4 bg-yellow-900/20 border-yellow-500/30">
        <p className="text-center text-sm text-yellow-400">
          ⚠️ זהירות! מחירים גבוהים יותר = רווחים גבוהים יותר אבל גם סיכון גבוה יותר להפסיד הכל!
        </p>
      </Card>
    </div>
  );
};
