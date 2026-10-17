import { SlotId } from '@/data/menu';

export interface Item {
  dishId: string;
  name: string;
  /** Utensils still in play (unclaimed for listings, to-pack for orders). */
  utensils: number;
  kgPerUtensil: number;
  mealsPerUtensil: number;
}

export type ListingStatus = 'open' | 'closed' | 'expired' | 'cancelled';

export interface Listing {
  id: string;
  dateKey: string;
  slot: SlotId;
  createdAt: number;
  /** 2-hour food-safety TTL. */
  expiresAt: number;
  /** Utensils not yet claimed by any NGO. */
  items: Item[];
  status: ListingStatus;
  /** Offline-first: text payload is "synced" first, photo uploads later. */
  synced: boolean;
  sentAt?: number;
  photoUri?: string;
  photoUploaded: boolean;
  nextClaimAt?: number;
  claimsMade: number;
  disposed?: boolean;
}

export type OrderStatus = 'packing' | 'ready' | 'in_transit' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  listingId: string;
  dateKey: string;
  slot: SlotId;
  createdAt: number;
  ngo: { name: string; distanceKm: number; recipients: string };
  rider: { name: string; phone: string };
  riderEtaAt: number;
  riderDelayed: boolean;
  riderArrivedAt?: number;
  items: Item[];
  status: OrderStatus;
  readyAt?: number;
  pickedUpAt?: number;
  deliveredAt?: number;
  emptyReturned?: boolean;
  reassignments: number;
}

export interface NoSurplusLog {
  dateKey: string;
  slot: SlotId;
  at: number;
}

export interface CustomDish {
  dateKey: string;
  slot: SlotId;
  dish: { id: string; name: string; icon: string; kgPerUtensil: number; mealsPerUtensil: number };
}

export interface AppEvent {
  id: string;
  title: string;
  body: string;
}

export interface State {
  hydrated: boolean;
  listings: Listing[];
  orders: Order[];
  noSurplus: NoSurplusLog[];
  customDishes: CustomDish[];
  /** Net empty utensils the logistics partner still owes the kitchen. */
  utensilDeficit: number;
  /** Demo switch that simulates a poor network in the kitchen. */
  offline: boolean;
  events: AppEvent[];
  seq: number;
}
