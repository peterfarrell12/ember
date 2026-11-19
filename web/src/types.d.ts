// Shapes of the app's main data, for the editor and for `npm run typecheck`.
// These describe what the prototype already stores (see docs/DATA_MODEL.md); they change nothing at runtime.
// Files opt in to checking with `// @ts-check` on their first line.

/** Where a figure came from. Decides the badge shown beside it (Label, Estimate, Recalled ...). */
type SourceCode = string;

/** A household measure for a food: label and its weight in grams (or volume in ml for drinks). */
type Portion = [label: string, grams: number];

/** A row of foods-generic.json (USDA). All figures per 100 g. */
type GenericRow = [
  name: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  fibre: number,
  sugars: number,
  saturates: number,
  sodium_mg: number,
  portions: Portion[],
  source: SourceCode,
];

/** A row of foods-brands.json and foods-brands-more.json (Open Food Facts). Per 100 g or 100 ml. Negative means unknown. */
type BrandRow = [
  name: string,
  brand: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  fibre: number,
  sugars: number,
  saturates: number,
  salt_g: number,
  serving_g: number,
  pack_g: number,
  barcode: string,
  popularity: number,
];

/** A food as the app handles it once a row, a custom food or a Claude answer has been read. Figures per 100 g or ml. */
interface Food {
  id?: string;
  /** name */ n: string;
  /** brand */ b?: string;
  /** kcal */ k: number;
  /** protein g */ p: number;
  /** carbs g */ c: number;
  /** fat g */ f: number;
  /** fibre g */ fi?: number | null;
  /** sugars g */ su?: number | null;
  /** saturates g */ sf?: number | null;
  /** sodium mg */ na?: number | null;
  ports?: Portion[];
  src: SourceCode;
  /** barcode */ code?: string;
  /** true when the weight is not known, so amounts are counted in servings only */ nog?: boolean;
  /** forces liquid (ml) or solid (g) */ liq?: boolean;
  /** last unit, quantity and servings used, when remembered */ lu?: string;
  lq?: number;
  ls?: number;
  [extra: string]: any;
}

/** One choice in a food's unit list, built by unitsFor(). */
interface Unit {
  /** label shown in the list */ l: string;
  /** short label stored on the entry */ short: string;
  /** grams (or ml) in one of this unit */ g: number;
  /** true for the plain g or ml unit */ base?: boolean;
  /** 'g' or 'ml' */ bw?: string;
  /** 'raw' for weighed-before-cooking, 'conv' for convert-from units (kg, oz, pints ...) */ alt?: string;
  /** cooked-weight yield for an alt 'raw' unit */ y?: number;
}

/** A diary entry: a food at a chosen amount. Nutrition figures are for that amount. */
interface Entry {
  id: string;
  /** name */ n: string;
  /** brand */ b?: string;
  /** grams or ml; 0 when unknown */ g: number;
  k: number;
  p: number;
  c: number;
  f: number;
  fi?: number;
  su?: number;
  sf?: number;
  na?: number;
  /** meal key */ m: string;
  /** display label for the amount */ u: string;
  /** serving size, in units of `us` */ q?: number;
  /** unit short label */ us?: string;
  /** number of servings */ sv?: number;
  src: SourceCode;
  /** time logged */ t?: number | string;
  ports?: Portion[];
  /** id of the food it came from */ fid?: string;
  /** caffeine link */ cf?: any;
  via?: string;
  liq?: boolean;
  nog?: boolean;
  [extra: string]: any;
}

/** One day's document (`days/<YYYY-MM-DD>`). */
interface Day {
  date: string;
  /** entries */ e: Entry[];
  /** water ml */ w: number;
  /** exercise */ x: any[];
  /** quests */ q: Record<string, any>;
  /** caffeine drinks */ cf: any[];
  chest: number;
  done: number;
  zone: number;
  xp: number;
  lx: number;
  wx: number;
  [extra: string]: any;
}

/** The kinds of per-user document Store reads and writes. */
type StoreKind =
  'profile' | 'days' | 'meta' | 'foods' | 'recipes' | 'programs' | 'sessions' | 'photos' | 'clphotos' | 'cl';

/** What the prototype was given by the Claude page runtime. Each of these is replaced in a later phase. */
interface Window {
  claude?: { use(name: 'db' | 'user' | 'sample' | 'dictation' | 'tts' | 'assets' | 'mcp'): Promise<any> };
  EmberDebug?: Record<string, Function>;
  ZXing?: any;
  fflate?: any;
}

declare const __APP_VERSION__: string;
declare const __FOOD_FILES__: { gen: string; br: string; more: string };
