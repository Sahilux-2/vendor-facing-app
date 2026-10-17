import { SlotId, slotById } from '@/data/menu';
import { Order } from '@/store/types';

export const pad = (n: number) => String(n).padStart(2, '0');

export const dateKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** 0.5 -> "0.5", 2 -> "2" */
export const fmtU = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export const utensilsLabel = (n: number) => `${fmtU(n)} ${n === 1 ? 'utensil' : 'utensils'}`;

export function countdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export const orderTotals = (o: Pick<Order, 'items'>) =>
  o.items.reduce(
    (a, i) => ({
      utensils: a.utensils + i.utensils,
      kg: a.kg + i.utensils * i.kgPerUtensil,
      meals: a.meals + i.utensils * i.mealsPerUtensil,
    }),
    { utensils: 0, kg: 0, meals: 0 },
  );

export const slotLabel = (id: SlotId) => slotById(id).label;

export const longDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export const timeOfDay = (ts: number) =>
  new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
