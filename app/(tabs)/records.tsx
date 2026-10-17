import { MotiView } from 'moti';
import React, { useMemo, useState } from 'react';
import { ScrollView, Share, Switch, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  Divider,
  EmptyState,
  FadeIn,
  ScreenHeader,
  Tap,
  useTopInset,
} from '@/components/ui';
import { PROFILE } from '@/data/menu';
import { longDate, orderTotals, slotLabel, utensilsLabel } from '@/lib/format';
import { useStore } from '@/store/store';
import { Order } from '@/store/types';
import { colors, radius, space } from '@/theme';

type Period = 'Daily' | 'Weekly' | 'Monthly';
const PERIODS: Period[] = ['Daily', 'Weekly', 'Monthly'];
const DAY = 24 * 3600_000;

function rangeFor(p: Period, now: number) {
  const d = new Date(now);
  const startOfToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (p === 'Daily') return { from: startOfToday, to: startOfToday + DAY, label: 'Today' };
  if (p === 'Weekly') return { from: startOfToday - 6 * DAY, to: startOfToday + DAY, label: 'Last 7 days' };
  const from = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return {
    from,
    to: startOfToday + DAY,
    label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

export default function RecordsScreen() {
  const top = useTopInset();
  const { state, dispatch } = useStore();
  const [period, setPeriod] = useState<Period>('Daily');
  const [segW, setSegW] = useState(0);

  const now = Date.now();
  const range = rangeFor(period, now);

  const orders = useMemo(
    () =>
      state.orders
        .filter((o) => o.status === 'delivered' && o.deliveredAt && o.deliveredAt >= range.from && o.deliveredAt < range.to)
        .sort((a, b) => b.deliveredAt! - a.deliveredAt!),
    [state.orders, range.from, range.to],
  );

  const totals = orders.reduce(
    (a, o) => {
      const t = orderTotals(o);
      return { utensils: a.utensils + t.utensils, kg: a.kg + t.kg, meals: a.meals + t.meals };
    },
    { utensils: 0, kg: 0, meals: 0 },
  );

  const share = async () => {
    const lines = [
      `${PROFILE.hostel} - Surplus food report`,
      `Period: ${range.label}`,
      ``,
      `Orders delivered: ${orders.length}`,
      `Food saved: ${totals.kg.toFixed(1)} kg`,
      `People fed: about ${Math.round(totals.meals)}`,
      ``,
      `Prepared by ${PROFILE.vendor}`,
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // Cancelled.
    }
  };

  const segIdx = PERIODS.indexOf(period);

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: top, paddingHorizontal: space.xl, paddingBottom: space.giant, gap: space.xl }}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Records" />

      <FadeIn delay={60}>
        <View
          onLayout={(e) => setSegW(e.nativeEvent.layout.width)}
          style={{ flexDirection: 'row', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.divider, padding: space.xs }}
        >
          {segW > 0 ? (
            <MotiView
              animate={{ translateX: segIdx * ((segW - space.sm - 2) / 3) }}
              transition={{ type: 'timing', duration: 240 }}
              style={{
                position: 'absolute',
                top: space.xs,
                left: space.xs,
                width: (segW - space.sm - 2) / 3,
                height: space.giant - space.sm,
                borderRadius: radius.pill,
                borderWidth: 2,
                borderColor: colors.accent,
              }}
            />
          ) : null}
          {PERIODS.map((p) => (
            <Tap key={p} onPress={() => setPeriod(p)} containerStyle={{ flex: 1 }} scale={0.98}>
              <View style={{ height: space.giant - space.sm, alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="bodyBold" color={p === period ? colors.accent : colors.textMuted}>
                  {p}
                </AppText>
              </View>
            </Tap>
          ))}
        </View>
      </FadeIn>

      <FadeIn delay={100}>
        <Card style={{ flexDirection: 'row' }}>
          <Metric value={String(orders.length)} label="Orders" />
          <Metric value={totals.kg.toFixed(1)} unit="kg" label="Food saved" />
          <Metric value={String(Math.round(totals.meals))} label="People fed" />
        </Card>
      </FadeIn>

      <FadeIn delay={140}>
        <Button label="Share report with Warden" icon="share-social" onPress={share} />
      </FadeIn>

      <View style={{ gap: space.md }}>
        <AppText variant="title">Completed orders</AppText>
        {orders.length === 0 ? (
          <EmptyState icon="leaf-outline" title="No donations yet" body={`Delivered orders for ${range.label.toLowerCase()} will show here.`} />
        ) : (
          <Card style={{ padding: 0 }}>
            {orders.slice(0, 30).map((o, i) => (
              <View key={o.id}>
                {i > 0 ? <Divider /> : null}
                <HistoryRow order={o} />
              </View>
            ))}
          </Card>
        )}
      </View>

      {__DEV__ ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText variant="caption" color={colors.textMuted}>
            Test: simulate poor network
          </AppText>
          <Switch
            value={state.offline}
            onValueChange={(v) => dispatch({ type: 'SET_OFFLINE', value: v })}
            trackColor={{ true: colors.accent, false: colors.divider }}
            thumbColor={colors.white}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function Metric({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
      <MotiView key={value} from={{ opacity: 0, translateY: 6 }} animate={{ opacity: 1, translateY: 0 }} transition={{ type: 'timing', duration: 300 }}>
        <AppText variant="h1">
          {value}
          {unit ? <AppText variant="bodyBold" color={colors.textMuted}> {unit}</AppText> : null}
        </AppText>
      </MotiView>
      <AppText variant="caption" color={colors.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

function HistoryRow({ order: o }: { order: Order }) {
  const t = orderTotals(o);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg }}>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold">{o.ngo.name}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {longDate(o.deliveredAt!)} · {slotLabel(o.slot)}
        </AppText>
      </View>
      <AppText variant="bodyBold">{utensilsLabel(t.utensils)}</AppText>
    </View>
  );
}
