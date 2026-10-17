import { Ionicons } from '@expo/vector-icons';

export type SlotId = 'breakfast' | 'lunch' | 'snacks' | 'dinner';
export type IconName = keyof typeof Ionicons.glyphMap;

export interface Slot {
  id: SlotId;
  label: string;
  icon: IconName;
  /** Minutes from midnight when serving starts / ends. */
  start: number;
  end: number;
}

export const SLOTS: Slot[] = [
  { id: 'breakfast', label: 'Breakfast', icon: 'cafe', start: 7 * 60, end: 9 * 60 + 30 },
  { id: 'lunch', label: 'Lunch', icon: 'restaurant', start: 12 * 60, end: 14 * 60 + 30 },
  { id: 'snacks', label: 'Snacks', icon: 'fast-food', start: 16 * 60 + 30, end: 17 * 60 + 30 },
  { id: 'dinner', label: 'Dinner', icon: 'moon', start: 19 * 60 + 30, end: 22 * 60 },
];

export const slotById = (id: SlotId) => SLOTS.find((s) => s.id === id)!;

/** Picks the most recently started slot, defaulting to Breakfast early in the morning. */
export function currentSlot(date = new Date()): Slot {
  const mins = date.getHours() * 60 + date.getMinutes();
  let picked = SLOTS[0];
  for (const s of SLOTS) if (mins >= s.start) picked = s;
  return picked;
}

export interface Dish {
  id: string;
  name: string;
  icon: IconName;
  /** PLACEHOLDER conversions. Edit these to match the real custom utensil sizes. */
  kgPerUtensil: number;
  mealsPerUtensil: number;
}

export const CATALOG: Record<string, Dish> = {
  poha: { id: 'poha', name: 'Poha', icon: 'nutrition', kgPerUtensil: 4, mealsPerUtensil: 16 },
  upma: { id: 'upma', name: 'Upma', icon: 'nutrition', kgPerUtensil: 4, mealsPerUtensil: 16 },
  idli: { id: 'idli', name: 'Idli Sambar', icon: 'nutrition', kgPerUtensil: 4, mealsPerUtensil: 16 },
  paratha: { id: 'paratha', name: 'Aloo Paratha', icon: 'restaurant', kgPerUtensil: 3, mealsPerUtensil: 12 },
  puri: { id: 'puri', name: 'Puri Sabzi', icon: 'restaurant', kgPerUtensil: 3, mealsPerUtensil: 12 },
  chole: { id: 'chole', name: 'Chole Bhature', icon: 'restaurant', kgPerUtensil: 4, mealsPerUtensil: 12 },
  bread: { id: 'bread', name: 'Bread Butter', icon: 'restaurant', kgPerUtensil: 2, mealsPerUtensil: 12 },
  tea: { id: 'tea', name: 'Tea', icon: 'cafe', kgPerUtensil: 4, mealsPerUtensil: 24 },
  milk: { id: 'milk', name: 'Milk', icon: 'water', kgPerUtensil: 4, mealsPerUtensil: 20 },
  rice: { id: 'rice', name: 'Steamed Rice', icon: 'restaurant', kgPerUtensil: 6, mealsPerUtensil: 20 },
  jeera: { id: 'jeera', name: 'Jeera Rice', icon: 'restaurant', kgPerUtensil: 6, mealsPerUtensil: 20 },
  roti: { id: 'roti', name: 'Roti', icon: 'restaurant', kgPerUtensil: 3, mealsPerUtensil: 16 },
  dal: { id: 'dal', name: 'Dal Tadka', icon: 'water', kgPerUtensil: 5, mealsPerUtensil: 20 },
  rajma: { id: 'rajma', name: 'Rajma', icon: 'water', kgPerUtensil: 5, mealsPerUtensil: 20 },
  paneer: { id: 'paneer', name: 'Paneer Sabzi', icon: 'leaf', kgPerUtensil: 4, mealsPerUtensil: 14 },
  aloogobi: { id: 'aloogobi', name: 'Aloo Gobi', icon: 'leaf', kgPerUtensil: 4, mealsPerUtensil: 14 },
  mixveg: { id: 'mixveg', name: 'Mix Veg', icon: 'leaf', kgPerUtensil: 4, mealsPerUtensil: 14 },
  kadhi: { id: 'kadhi', name: 'Kadhi', icon: 'water', kgPerUtensil: 5, mealsPerUtensil: 20 },
  salad: { id: 'salad', name: 'Salad', icon: 'leaf', kgPerUtensil: 2, mealsPerUtensil: 10 },
  samosa: { id: 'samosa', name: 'Samosa', icon: 'fast-food', kgPerUtensil: 2, mealsPerUtensil: 12 },
  pakora: { id: 'pakora', name: 'Pakora', icon: 'fast-food', kgPerUtensil: 2, mealsPerUtensil: 12 },
  biscuit: { id: 'biscuit', name: 'Biscuits', icon: 'fast-food', kgPerUtensil: 1, mealsPerUtensil: 12 },
  sandwich: { id: 'sandwich', name: 'Veg Sandwich', icon: 'fast-food', kgPerUtensil: 2, mealsPerUtensil: 10 },
  kheer: { id: 'kheer', name: 'Kheer', icon: 'ice-cream', kgPerUtensil: 4, mealsPerUtensil: 20 },
  gulab: { id: 'gulab', name: 'Gulab Jamun', icon: 'ice-cream', kgPerUtensil: 2, mealsPerUtensil: 12 },
  khichdi: { id: 'khichdi', name: 'Khichdi', icon: 'restaurant', kgPerUtensil: 6, mealsPerUtensil: 20 },
  biryani: { id: 'biryani', name: 'Veg Biryani', icon: 'restaurant', kgPerUtensil: 6, mealsPerUtensil: 18 },
  raita: { id: 'raita', name: 'Raita', icon: 'water', kgPerUtensil: 3, mealsPerUtensil: 16 },
};

const D = (...ids: string[]) => ids;

/** Fixed weekly timetable. Index 0 = Sunday, matching Date.getDay(). */
const WEEKLY: Record<SlotId, string[][]> = {
  breakfast: [
    D('chole', 'tea', 'bread'),
    D('poha', 'tea', 'bread'),
    D('upma', 'tea', 'milk'),
    D('paratha', 'tea', 'milk'),
    D('idli', 'tea', 'bread'),
    D('puri', 'tea', 'milk'),
    D('poha', 'paratha', 'tea'),
  ],
  lunch: [
    D('biryani', 'raita', 'salad', 'gulab'),
    D('rice', 'dal', 'aloogobi', 'roti', 'salad'),
    D('rice', 'rajma', 'mixveg', 'roti', 'salad'),
    D('jeera', 'dal', 'paneer', 'roti', 'salad'),
    D('rice', 'kadhi', 'aloogobi', 'roti', 'salad'),
    D('rice', 'chole', 'mixveg', 'roti', 'raita'),
    D('khichdi', 'kadhi', 'roti', 'salad'),
  ],
  snacks: [
    D('samosa', 'tea'),
    D('pakora', 'tea'),
    D('biscuit', 'tea'),
    D('sandwich', 'tea'),
    D('samosa', 'tea'),
    D('pakora', 'tea'),
    D('biscuit', 'milk'),
  ],
  dinner: [
    D('paneer', 'jeera', 'roti', 'kheer'),
    D('rice', 'dal', 'mixveg', 'roti'),
    D('jeera', 'rajma', 'aloogobi', 'roti'),
    D('rice', 'dal', 'paneer', 'roti'),
    D('rice', 'kadhi', 'mixveg', 'roti'),
    D('khichdi', 'dal', 'aloogobi', 'roti'),
    D('biryani', 'raita', 'roti', 'kheer'),
  ],
};

export function getMenu(slot: SlotId, date = new Date()): Dish[] {
  return WEEKLY[slot][date.getDay()].map((id) => CATALOG[id]);
}

/** Quick categories for the "Add Custom Dish" fallback. */
export const CUSTOM_CATEGORIES: { id: string; label: string; icon: IconName; kgPerUtensil: number; mealsPerUtensil: number }[] = [
  { id: 'rice', label: 'Rice', icon: 'restaurant', kgPerUtensil: 6, mealsPerUtensil: 20 },
  { id: 'roti', label: 'Roti', icon: 'restaurant', kgPerUtensil: 3, mealsPerUtensil: 16 },
  { id: 'curry', label: 'Curry', icon: 'water', kgPerUtensil: 5, mealsPerUtensil: 18 },
  { id: 'sabzi', label: 'Sabzi', icon: 'leaf', kgPerUtensil: 4, mealsPerUtensil: 14 },
  { id: 'sweet', label: 'Sweet', icon: 'ice-cream', kgPerUtensil: 3, mealsPerUtensil: 16 },
  { id: 'snack', label: 'Snack', icon: 'fast-food', kgPerUtensil: 2, mealsPerUtensil: 12 },
  { id: 'drink', label: 'Drink', icon: 'cafe', kgPerUtensil: 4, mealsPerUtensil: 24 },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal', kgPerUtensil: 3, mealsPerUtensil: 12 },
];

export const PROFILE = {
  vendor: 'Ramesh Kumar',
  hostel: 'Himalaya Boys Hostel',
  warden: 'Warden',
};

export const NGOS = [
  { name: 'Asha Kiran Foundation', distanceKm: 1.2, recipients: 'Shelter home · 40 residents' },
  { name: 'Roti Bank', distanceKm: 2.4, recipients: 'Street children centre · 60 children' },
  { name: 'Seva Sadan Trust', distanceKm: 3.1, recipients: 'Old-age home · 35 elders' },
];

export const RIDERS = [
  { name: 'Imran S.', phone: '+919876543210', etaMin: 6, delayed: false },
  { name: 'Manoj K.', phone: '+919876543211', etaMin: 8, delayed: false },
  { name: 'Deepak R.', phone: '+919876543212', etaMin: 2, delayed: true },
];
