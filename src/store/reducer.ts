import { CATALOG, NGOS, RIDERS, SlotId, SLOTS, getMenu } from '@/data/menu';
import { dateKey, fmtU, orderTotals, plural, slotLabel } from '@/lib/format';
import { AppEvent, Item, Listing, NoSurplusLog, Order, State } from '@/store/types';

const MIN = 60_000;
const HOUR = 60 * MIN;
export const TTL_MS = 2 * HOUR;

/** Simulation timings (compressed so the whole lifecycle can be demoed). */
const SYNC_DELAY = 1_500;
const PHOTO_UPLOAD_DELAY = 4_000;
const FIRST_CLAIM_DELAY = 8_000;
const SECOND_CLAIM_DELAY = 15_000;
const RIDER_ARRIVAL_DELAY = 20_000;
const DELIVERY_DELAY = 15_000;

export type Action =
  | { type: 'HYDRATE'; state: State }
  | { type: 'TICK'; now: number }
  | { type: 'POST_LISTING'; now: number; slot: SlotId; items: Item[]; photoUri?: string }
  | { type: 'LOG_NO_SURPLUS'; now: number; slot: SlotId }
  | { type: 'UNDO_NO_SURPLUS'; dateKey: string; slot: SlotId }
  | { type: 'SET_LISTING_ITEM'; id: string; dishId: string; utensils: number }
  | { type: 'CANCEL_LISTING'; id: string }
  | { type: 'DISPOSE_LISTING'; id: string }
  | { type: 'MARK_PACKED'; id: string; now: number }
  | { type: 'HANDOVER'; id: string; now: number; emptyReturned: boolean; clearedBacklog: boolean }
  | { type: 'SET_ORDER_ITEM'; id: string; dishId: string; utensils: number }
  | { type: 'CANCEL_ORDER'; id: string }
  | { type: 'REASSIGN'; id: string; now: number }
  | { type: 'ADD_CUSTOM_DISH'; entry: State['customDishes'][number] }
  | { type: 'SET_OFFLINE'; value: boolean }
  | { type: 'CLEAR_EVENTS' };

const sum = (items: Item[]) => items.reduce((a, i) => a + i.utensils, 0);

function ev(state: State, title: string, body: string): [AppEvent, number] {
  const seq = state.seq + 1;
  return [{ id: `E${seq}`, title, body }, seq];
}

/** Creates a seeded history so the Records tab is meaningful on first launch. */
export function initialState(now: number): State {
  let r = 7;
  const rand = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const orders: Order[] = [];
  let seq = 0;
  for (let back = 1; back <= 34; back++) {
    const base = now - back * 24 * HOUR;
    const count = rand() < 0.25 ? 0 : rand() < 0.5 ? 1 : 2;
    for (let k = 0; k < count; k++) {
      const slot = SLOTS[Math.floor(rand() * SLOTS.length)];
      const menu = getMenu(slot.id, new Date(base));
      const items: Item[] = menu.slice(0, 1 + Math.floor(rand() * 2)).map((d) => ({
        dishId: d.id,
        name: d.name,
        utensils: [0.5, 1, 1, 2, 3][Math.floor(rand() * 5)],
        kgPerUtensil: d.kgPerUtensil,
        mealsPerUtensil: d.mealsPerUtensil,
      }));
      const d = new Date(base);
      d.setHours(Math.floor(slot.end / 60) + 1, 15, 0, 0);
      const at = d.getTime();
      const ngo = NGOS[Math.floor(rand() * NGOS.length)];
      seq++;
      orders.push({
        id: `H${seq}`,
        listingId: `HL${seq}`,
        dateKey: dateKey(at),
        slot: slot.id,
        createdAt: at - 40 * MIN,
        ngo,
        rider: { name: RIDERS[0].name, phone: RIDERS[0].phone },
        riderEtaAt: at - 30 * MIN,
        riderDelayed: false,
        items,
        status: 'delivered',
        deliveredAt: at,
        emptyReturned: true,
        reassignments: 0,
      });
    }
  }
  return {
    hydrated: true,
    listings: [],
    orders,
    noSurplus: [],
    customDishes: [],
    utensilDeficit: 0,
    offline: false,
    events: [],
    seq: 1000,
  };
}

function createOrder(state: State, l: Listing, now: number): { order?: Order; items: Item[]; seq: number } {
  const partial = l.claimsMade === 0 && sum(l.items) > 1;
  const claimed: Item[] = [];
  const remaining: Item[] = [];
  for (const it of l.items) {
    const take = partial ? Math.min(it.utensils, Math.max(0.5, Math.round(it.utensils) / 2)) : it.utensils;
    const rest = it.utensils - take;
    if (take > 0) claimed.push({ ...it, utensils: take });
    if (rest > 0) remaining.push({ ...it, utensils: rest });
  }
  if (!claimed.length) return { items: l.items, seq: state.seq };
  const seq = state.seq + 1;
  const ngo = NGOS[(seq + l.claimsMade) % NGOS.length];
  const rider = RIDERS[(seq + l.claimsMade) % RIDERS.length];
  const order: Order = {
    id: `O${seq}`,
    listingId: l.id,
    dateKey: l.dateKey,
    slot: l.slot,
    createdAt: now,
    ngo,
    rider: { name: rider.name, phone: rider.phone },
    riderEtaAt: now + rider.etaMin * MIN,
    riderDelayed: rider.delayed,
    items: claimed,
    status: 'packing',
    reassignments: 0,
  };
  return { order, items: remaining, seq };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { ...action.state, hydrated: true, events: [] };

    case 'TICK': {
      if (!state.hydrated) return state;
      const { now } = action;
      let changed = false;
      let s = state;
      const events: AppEvent[] = [];
      const bump = () => {
        s = { ...s, seq: s.seq + 1 };
        return s.seq;
      };

      const listings = s.listings.map((l) => {
        let n = l;
        if (n.status === 'open' || n.status === 'closed') {
          if (!n.synced && !s.offline && now >= n.createdAt + SYNC_DELAY) {
            n = { ...n, synced: true, sentAt: now, nextClaimAt: now + FIRST_CLAIM_DELAY };
          }
          if (n.synced && n.photoUri && !n.photoUploaded && !s.offline && now >= (n.sentAt ?? 0) + PHOTO_UPLOAD_DELAY) {
            n = { ...n, photoUploaded: true };
          }
        }
        if (n.status === 'open' && now >= n.expiresAt) {
          n = { ...n, status: 'expired' };
          events.push({
            id: `E${bump()}`,
            title: `${slotLabel(n.slot)} food expired`,
            body: 'No NGO claimed it in time. Please compost or dispose of it safely.',
          });
        }
        if (n !== l) changed = true;
        return n;
      });
      s = { ...s, listings };

      // NGO claims (simulated marketplace)
      let orders = s.orders;
      s.listings.forEach((l, idx) => {
        if (l.status === 'open' && l.synced && !s.offline && l.nextClaimAt && now >= l.nextClaimAt) {
          const res = createOrder(s, l, now);
          if (!res.order) return;
          s = { ...s, seq: res.seq };
          orders = [res.order, ...orders];
          const left = sum(res.items);
          const nl: Listing = {
            ...l,
            items: res.items,
            claimsMade: l.claimsMade + 1,
            status: left > 0 ? 'open' : 'closed',
            nextClaimAt: left > 0 ? now + SECOND_CLAIM_DELAY : undefined,
          };
          s = { ...s, listings: s.listings.map((x, i) => (i === idx ? nl : x)) };
          const o = res.order;
          events.push({
            id: `E${bump()}`,
            title: `${o.ngo.name} claimed food`,
            body: `Pack ${fmtU(sum(o.items))} ${plural(sum(o.items), 'utensil')} now.${left > 0 ? ` ${fmtU(left)} still open for others.` : ''}`,
          });
          changed = true;
        }
      });

      orders = orders.map((o) => {
        let n = o;
        if (!n.riderArrivedAt && !n.riderDelayed && (n.status === 'packing' || n.status === 'ready') && now >= n.createdAt + RIDER_ARRIVAL_DELAY) {
          n = { ...n, riderArrivedAt: now };
          events.push({ id: `E${bump()}`, title: 'Rider at the gate', body: `${n.rider.name} is here for ${n.ngo.name}.` });
        }
        if (n.status === 'in_transit' && n.pickedUpAt && now >= n.pickedUpAt + DELIVERY_DELAY) {
          n = { ...n, status: 'delivered', deliveredAt: now };
          const t = orderTotals(n);
          events.push({
            id: `E${bump()}`,
            title: 'Food delivered',
            body: `Reached ${n.ngo.name}. About ${Math.round(t.meals)} people will be fed.`,
          });
        }
        if (n !== o) changed = true;
        return n;
      });

      if (!changed) return state;
      return { ...s, orders, events: [...s.events, ...events] };
    }

    case 'POST_LISTING': {
      const seq = state.seq + 1;
      const l: Listing = {
        id: `L${seq}`,
        dateKey: dateKey(action.now),
        slot: action.slot,
        createdAt: action.now,
        expiresAt: action.now + TTL_MS,
        items: action.items,
        status: 'open',
        synced: false,
        photoUri: action.photoUri,
        photoUploaded: false,
        claimsMade: 0,
      };
      return { ...state, seq, listings: [l, ...state.listings] };
    }

    case 'LOG_NO_SURPLUS': {
      const log: NoSurplusLog = { dateKey: dateKey(action.now), slot: action.slot, at: action.now };
      return { ...state, noSurplus: [log, ...state.noSurplus] };
    }

    case 'UNDO_NO_SURPLUS':
      return {
        ...state,
        noSurplus: state.noSurplus.filter((n) => !(n.dateKey === action.dateKey && n.slot === action.slot)),
      };

    case 'SET_LISTING_ITEM': {
      return {
        ...state,
        listings: state.listings.map((l) => {
          if (l.id !== action.id) return l;
          const items = l.items
            .map((i) => (i.dishId === action.dishId ? { ...i, utensils: action.utensils } : i))
            .filter((i) => i.utensils > 0);
          if (!items.length) return { ...l, items, status: l.claimsMade > 0 ? 'closed' : 'cancelled' };
          return { ...l, items };
        }),
      };
    }

    case 'CANCEL_LISTING':
      return {
        ...state,
        listings: state.listings.map((l) =>
          l.id === action.id ? { ...l, status: l.claimsMade > 0 ? 'closed' : 'cancelled', items: [] } : l,
        ),
      };

    case 'DISPOSE_LISTING':
      return {
        ...state,
        listings: state.listings.map((l) => (l.id === action.id ? { ...l, disposed: true } : l)),
      };

    case 'MARK_PACKED':
      return {
        ...state,
        orders: state.orders.map((o) => (o.id === action.id ? { ...o, status: 'ready', readyAt: action.now } : o)),
      };

    case 'HANDOVER': {
      const order = state.orders.find((o) => o.id === action.id);
      if (!order) return state;
      const count = sum(order.items);
      let deficit = state.utensilDeficit;
      if (action.clearedBacklog) deficit = 0;
      if (!action.emptyReturned) deficit += count;
      const events = [...state.events];
      let seq = state.seq;
      if (!action.emptyReturned) {
        seq += 1;
        events.push({
          id: `E${seq}`,
          title: 'Empty utensils missing',
          body: `Logistics told to return ${fmtU(count)} ${plural(count, 'utensil')} on the next pickup.`,
        });
      }
      return {
        ...state,
        seq,
        events,
        utensilDeficit: deficit,
        orders: state.orders.map((o) =>
          o.id === action.id
            ? { ...o, status: 'in_transit', pickedUpAt: action.now, emptyReturned: action.emptyReturned }
            : o,
        ),
      };
    }

    case 'SET_ORDER_ITEM': {
      const order = state.orders.find((o) => o.id === action.id);
      if (!order) return state;
      const items = order.items
        .map((i) => (i.dishId === action.dishId ? { ...i, utensils: action.utensils } : i))
        .filter((i) => i.utensils > 0);
      const [e, seq] = ev(
        state,
        items.length ? 'Order updated' : 'Order cancelled',
        items.length
          ? `${order.ngo.name} and ${order.rider.name} were told the new utensil count.`
          : `${order.ngo.name} and ${order.rider.name} were told it is cancelled.`,
      );
      return {
        ...state,
        seq,
        events: [...state.events, e],
        orders: state.orders.map((o) =>
          o.id === action.id ? { ...o, items, status: items.length ? o.status : 'cancelled' } : o,
        ),
      };
    }

    case 'CANCEL_ORDER': {
      const order = state.orders.find((o) => o.id === action.id);
      if (!order) return state;
      const [e, seq] = ev(state, 'Order cancelled', `${order.ngo.name} and ${order.rider.name} were told.`);
      return {
        ...state,
        seq,
        events: [...state.events, e],
        orders: state.orders.map((o) => (o.id === action.id ? { ...o, status: 'cancelled' } : o)),
      };
    }

    case 'REASSIGN': {
      const seq = state.seq + 1;
      const rider = RIDERS[0];
      const [e, seq2] = ev({ ...state, seq }, 'New rider assigned', `${rider.name} will pick up the order.`);
      return {
        ...state,
        seq: seq2,
        events: [...state.events, e],
        orders: state.orders.map((o) =>
          o.id === action.id
            ? {
                ...o,
                rider: { name: rider.name, phone: rider.phone },
                riderDelayed: false,
                riderArrivedAt: undefined,
                riderEtaAt: action.now + rider.etaMin * MIN,
                createdAt: action.now,
                reassignments: o.reassignments + 1,
              }
            : o,
        ),
      };
    }

    case 'ADD_CUSTOM_DISH':
      return { ...state, customDishes: [...state.customDishes, action.entry] };

    case 'SET_OFFLINE':
      return { ...state, offline: action.value };

    case 'CLEAR_EVENTS':
      return { ...state, events: [] };
  }
}

export { CATALOG };
