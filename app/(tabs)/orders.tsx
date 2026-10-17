import * as Haptics from 'expo-haptics';
import { AnimatePresence, MotiView } from 'moti';
import React, { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { LinearTransition } from 'react-native-reanimated';
import {
  AppText,
  Button,
  Card,
  Divider,
  EmptyState,
  FadeIn,
  Icon,
  ScreenHeader,
  Sheet,
  Stepper,
  Tag,
  Tap,
  useTopInset,
} from '@/components/ui';
import { countdown, fmtU, orderTotals, plural, slotLabel, utensilsLabel } from '@/lib/format';
import { useNow, useStore } from '@/store/store';
import { Listing, Order, OrderStatus } from '@/store/types';
import { colors, radius, space } from '@/theme';

const STEPS: { id: OrderStatus; label: string }[] = [
  { id: 'packing', label: 'Pack' },
  { id: 'ready', label: 'Ready' },
  { id: 'in_transit', label: 'On the way' },
];

export default function ActiveOrdersScreen() {
  const top = useTopInset();
  const { state, dispatch } = useStore();
  const [handover, setHandover] = useState<Order | null>(null);
  const [reduce, setReduce] = useState<string | null>(null);

  const listings = state.listings.filter((l) => l.status === 'open' || (l.status === 'expired' && !l.disposed));
  const active = state.orders.filter((o) => o.status === 'packing' || o.status === 'ready' || o.status === 'in_transit');
  const delivered = state.orders
    .filter((o) => o.status === 'delivered' && o.deliveredAt && Date.now() - o.deliveredAt < 6 * 3600_000 && o.id.startsWith('O'))
    .slice(0, 3);
  const empty = !listings.length && !active.length && !delivered.length;
  const reduceOrder = state.orders.find((o) => o.id === reduce) ?? null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: top, paddingHorizontal: space.xl, paddingBottom: space.giant, gap: space.xl }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Active Orders" />

        {state.utensilDeficit > 0 ? (
          <FadeIn>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Icon name="alert-circle" size={28} color={colors.warning} />
              <AppText variant="bodyBold" color={colors.warning} style={{ flex: 1 }}>
                {utensilsLabel(state.utensilDeficit)} owed by logistics
              </AppText>
            </Card>
          </FadeIn>
        ) : null}

        {empty ? (
          <EmptyState icon="cube-outline" title="No active orders" body="Log leftover food in the first tab and it will show up here." />
        ) : null}

        <MotiView layout={LinearTransition.duration(220)} style={{ gap: space.lg }}>
          <AnimatePresence>
            {listings.map((l) => (
              <MotiView
                key={l.id}
                layout={LinearTransition.duration(220)}
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -8 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <ListingCard listing={l} />
              </MotiView>
            ))}
            {active.map((o) => (
              <MotiView
                key={o.id}
                layout={LinearTransition.duration(220)}
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -8 }}
                transition={{ type: 'timing', duration: 280 }}
              >
                <OrderCard order={o} onHandover={() => setHandover(o)} onReduce={() => setReduce(o.id)} />
              </MotiView>
            ))}
          </AnimatePresence>
        </MotiView>

        {delivered.length ? (
          <View style={{ gap: space.md }}>
            <AppText variant="title">Delivered</AppText>
            {delivered.map((o) => (
              <FadeIn key={o.id}>
                <DeliveredCard order={o} />
              </FadeIn>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <HandoverSheet order={handover} deficit={state.utensilDeficit} onClose={() => setHandover(null)} />
      <ReduceSheet order={reduceOrder} onClose={() => setReduce(null)} />
    </View>
  );
}

// ---------- Broadcast / waiting ----------
function ListingCard({ listing: l }: { listing: Listing }) {
  const now = useNow();
  const { dispatch } = useStore();
  const expired = l.status === 'expired';
  const left = l.expiresAt - now;
  const urgent = left < 15 * 60_000;
  const [editing, setEditing] = useState(false);

  if (expired) {
    return (
      <Card style={{ gap: space.md, borderColor: colors.danger }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Icon name="time" size={24} color={colors.danger} />
          <AppText variant="title" color={colors.danger}>
            {slotLabel(l.slot)} food expired
          </AppText>
        </View>
        <AppText variant="body" color={colors.textMuted}>
          Not safe to eat now. Please compost or dispose of {l.items.map((i) => `${fmtU(i.utensils)} ${i.name}`).join(', ')}.
        </AppText>
        <Button label="Done, disposed safely" icon="checkmark" variant="secondary" onPress={() => dispatch({ type: 'DISPOSE_LISTING', id: l.id })} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <PulseDot />
        <AppText variant="title">{slotLabel(l.slot)} · Waiting for NGOs</AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Icon name="timer" size={20} color={urgent ? colors.danger : colors.textMuted} />
        <AppText variant="bodyBold" color={urgent ? colors.danger : colors.text}>
          {countdown(left)} left
        </AppText>
      </View>

      <Divider />

      <View style={{ gap: space.sm }}>
        {l.items.map((i) => (
          <View key={i.dishId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: space.giant }}>
            <AppText variant="bodyBold" style={{ flex: 1 }}>
              {i.name}
            </AppText>
            {editing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Stepper value={i.utensils} onChange={(v) => dispatch({ type: 'SET_LISTING_ITEM', id: l.id, dishId: i.dishId, utensils: v })} />
                <Tap onPress={() => dispatch({ type: 'SET_LISTING_ITEM', id: l.id, dishId: i.dishId, utensils: 0 })}>
                  <Icon name="trash" size={24} color={colors.danger} />
                </Tap>
              </View>
            ) : (
              <AppText variant="body" color={colors.textMuted}>
                {utensilsLabel(i.utensils)}
              </AppText>
            )}
          </View>
        ))}
      </View>

      {!l.synced ? (
        <Tag icon="cloud-offline" color={colors.warning} label="Saved on phone. Sending when network is back" />
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          label={editing ? 'Done' : 'Reduce'}
          icon={editing ? 'checkmark' : 'create'}
          onPress={() => setEditing((e) => !e)}
        />
        <Button style={{ flex: 1 }} variant="danger" label="Cancel" icon="close" onPress={() => dispatch({ type: 'CANCEL_LISTING', id: l.id })} />
      </View>
    </Card>
  );
}

function PulseDot() {
  return (
    <View style={{ width: space.xl, height: space.xl, alignItems: 'center', justifyContent: 'center' }}>
      <MotiView
        from={{ scale: 0.6, opacity: 0.5 }}
        animate={{ scale: 1.4, opacity: 0 }}
        transition={{ type: 'timing', duration: 1400, loop: true }}
        style={{ position: 'absolute', width: space.lg, height: space.lg, borderRadius: radius.md, borderWidth: 2, borderColor: colors.accent }}
      />
      <View style={{ width: space.sm, height: space.sm, borderRadius: space.xs, backgroundColor: colors.accent }} />
    </View>
  );
}

// ---------- Order ----------
function Progress({ status }: { status: OrderStatus }) {
  const idx = STEPS.findIndex((s) => s.id === status);
  return (
    <View style={{ flexDirection: 'row', gap: space.xs }}>
      {STEPS.map((s, i) => (
        <View key={s.id} style={{ flex: 1, gap: space.xs }}>
          <MotiView
            animate={{ backgroundColor: i <= idx ? colors.accent : colors.divider }}
            transition={{ type: 'timing', duration: 400 }}
            style={{ height: space.xs, borderRadius: 2 }}
          />
          <AppText variant="captionBold" color={i <= idx ? colors.accent : colors.textMuted}>
            {s.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function OrderCard({ order: o, onHandover, onReduce }: { order: Order; onHandover: () => void; onReduce: () => void }) {
  const now = useNow();
  const { dispatch } = useStore();
  const total = orderTotals(o).utensils;
  const mins = Math.max(0, Math.ceil((o.riderEtaAt - now) / 60_000));
  const late = !o.riderArrivedAt && now > o.riderEtaAt && o.status !== 'in_transit';
  const call = () => Linking.openURL(`tel:${o.rider.phone}`).catch(() => {});

  return (
    <Card style={{ gap: space.md }}>
      <Progress status={o.status} />

      <View>
        <AppText variant="title">{o.ngo.name}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {o.ngo.distanceKm} km away · {o.ngo.recipients}
        </AppText>
      </View>

      <Divider />

      {o.status === 'in_transit' ? (
        <MotiView
          from={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ type: 'timing', duration: 900, loop: true }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}
        >
          <Icon name="bicycle" size={24} color={colors.accent} />
          <AppText variant="bodyBold" color={colors.accent} style={{ flex: 1 }}>
            {o.rider.name} is taking {utensilsLabel(total)}
          </AppText>
        </MotiView>
      ) : (
        <View style={{ gap: space.sm }}>
          {o.items.map((i) => (
            <View key={i.dishId} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="bodyBold">{i.name}</AppText>
              <AppText variant="bodyBold" color={colors.accent}>
                {utensilsLabel(i.utensils)}
              </AppText>
            </View>
          ))}
        </View>
      )}

      {o.status !== 'in_transit' ? (
        <>
      <Divider />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Icon name="person-circle" size={32} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyBold">{o.rider.name}</AppText>
          <AppText variant="caption" color={late ? colors.danger : colors.textMuted}>
            {o.riderArrivedAt ? 'At the gate' : late ? 'Running late' : `Arriving in ${mins} min`}
          </AppText>
        </View>
        <Tap onPress={call}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.xs,
              minHeight: space.giant,
              paddingHorizontal: space.lg,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.divider,
            }}
          >
            <Icon name="call" size={20} color={colors.accent} />
            <AppText variant="bodyBold" color={colors.accent}>
              Call
            </AppText>
          </View>
        </Tap>
      </View>
        </>
      ) : null}

      {late ? (
        <Button label="Request another rider" icon="swap-horizontal" variant="secondary" onPress={() => dispatch({ type: 'REASSIGN', id: o.id, now: Date.now() })} />
      ) : null}

      {o.status === 'packing' ? (
        <View style={{ gap: space.sm }}>
          <Button
            label="Packed & ready for pickup"
            icon="cube"
            onPress={() => {
              dispatch({ type: 'MARK_PACKED', id: o.id, now: Date.now() });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }}
          />
          <OrderEditRow onReduce={onReduce} onCancel={() => dispatch({ type: 'CANCEL_ORDER', id: o.id })} />
        </View>
      ) : null}

      {o.status === 'ready' ? (
        <View style={{ gap: space.sm }}>
          <Button label={`Hand over ${fmtU(total)} ${plural(total, 'utensil')}`} icon="swap-horizontal" onPress={onHandover} />
          <OrderEditRow onReduce={onReduce} onCancel={() => dispatch({ type: 'CANCEL_ORDER', id: o.id })} />
        </View>
      ) : null}
    </Card>
  );
}

function OrderEditRow({ onReduce, onCancel }: { onReduce: () => void; onCancel: () => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Button style={{ flex: 1 }} variant="ghost" label="Reduce amount" onPress={onReduce} />
      <Button style={{ flex: 1 }} variant="ghost" label="Cancel order" onPress={onCancel} />
    </View>
  );
}

function DeliveredCard({ order: o }: { order: Order }) {
  const t = orderTotals(o);
  return (
    <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <MotiView from={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
        <Icon name="checkmark-circle" size={32} color={colors.accent} />
      </MotiView>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold">Delivered to {o.ngo.name}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          About {Math.round(t.meals)} people fed
        </AppText>
      </View>
    </Card>
  );
}

// ---------- Handover & utensil swap ----------
function HandoverSheet({ order, deficit, onClose }: { order: Order | null; deficit: number; onClose: () => void }) {
  const { dispatch } = useStore();
  const [backlog, setBacklog] = useState(false);
  const [last, setLast] = useState<Order | null>(null);
  if (order && order !== last) {
    setLast(order);
    setBacklog(false);
  }
  const o = order ?? last;
  const count = o ? orderTotals(o).utensils : 0;

  const confirm = (emptyReturned: boolean) => {
    if (!o) return;
    dispatch({ type: 'HANDOVER', id: o.id, now: Date.now(), emptyReturned, clearedBacklog: backlog && emptyReturned });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onClose();
  };

  return (
    <Sheet visible={!!order} onClose={onClose} title="Handover & swap">
      <AppText variant="body" color={colors.textMuted}>
        Give {fmtU(count)} filled {plural(count, 'utensil')} to {o?.rider.name}. Take the same number of clean empty ones back.
      </AppText>
      {deficit > 0 ? (
        <Tap onPress={() => setBacklog((b) => !b)} scale={0.99}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: space.giant }}>
            <Icon name={backlog ? 'checkbox' : 'square-outline'} size={28} color={backlog ? colors.accent : colors.textMuted} />
            <AppText variant="body" style={{ flex: 1 }}>
              Rider also returned the {utensilsLabel(deficit)} owed earlier
            </AppText>
          </View>
        </Tap>
      ) : null}
      <Button label={`Got ${fmtU(count)} empty ${plural(count, 'utensil')} back`} icon="checkmark-circle" onPress={() => confirm(true)} />
      <Button label="Empty utensils NOT returned" icon="alert-circle" variant="danger" onPress={() => confirm(false)} />
    </Sheet>
  );
}

// ---------- Reduce amount ----------
function ReduceSheet({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const { dispatch } = useStore();
  return (
    <Sheet visible={!!order} onClose={onClose} title="Reduce amount">
      <AppText variant="body" color={colors.textMuted}>
        Less food left? Change it here. {order?.ngo.name} and the rider are told straight away.
      </AppText>
      {order?.items.map((i) => (
        <View key={i.dishId} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="bodyBold" style={{ flex: 1 }}>
            {i.name}
          </AppText>
          <Stepper
            value={i.utensils}
            max={i.utensils}
            onChange={(v) => dispatch({ type: 'SET_ORDER_ITEM', id: order.id, dishId: i.dishId, utensils: v })}
          />
          <View style={{ width: space.sm }} />
          <Tap onPress={() => dispatch({ type: 'SET_ORDER_ITEM', id: order.id, dishId: i.dishId, utensils: 0 })}>
            <Icon name="trash" size={24} color={colors.danger} />
          </Tap>
        </View>
      ))}
      <Button label="Done" onPress={onClose} />
    </Sheet>
  );
}
