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
  Icon,
  ScreenHeader,
  Tap,
  useTopInset,
} from '@/components/ui';
import { PROFILE } from '@/data/menu';
import { dateKey, fmtU, longDate, orderTotals, slotLabel, timeOfDay, utensilsLabel } from '@/lib/format';
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
  const noSurplusCount = state.noSurplus.filter((n) => n.at >= range.from && n.at < range.to).length;

  const bars = useMemo(() => buildBars(period, orders, range.from, now), [period, orders, range.from, now]);
  const maxBar = Math.max(1, ...bars.map((b) => b.value));

  const share = async () => {
    const lines = [
      `${PROFILE.hostel} - Surplus food report`,
      `Period: ${range.label}`,
      ``,
      `Orders delivered: ${orders.length}`,
      `Food saved: ${totals.kg.toFixed(1)} kg (${fmtU(totals.utensils)} utensils)`,
      `People fed: about ${Math.round(totals.meals)}`,
      `Meals with no surplus: ${noSurplusCount}`,
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
      <ScreenHeader title="Records" subtitle={`${PROFILE.hostel} · ${range.label}`} />

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
        <Card style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row' }}>
            <Metric icon="cube" value={String(orders.length)} label="Orders" />
            <Metric icon="scale" value={totals.kg.toFixed(1)} unit="kg" label="Food saved" />
            <Metric icon="people" value={String(Math.round(totals.meals))} label="People fed" />
          </View>
          <Divider />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="caption" color={colors.textMuted}>
              {utensilsLabel(totals.utensils)} donated
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {noSurplusCount} meals with no surplus
            </AppText>
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={140}>
        <Card style={{ gap: space.md }}>
          <AppText variant="bodyBold">Utensils donated</AppText>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, height: 128 }}>
            {bars.map((b, i) => (
              <View key={`${period}-${b.label}`} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: space.xs, height: '100%' }}>
                <MotiView
                  from={{ height: 0 }}
                  animate={{ height: Math.max(4, (b.value / maxBar) * 96) }}
                  transition={{ type: 'timing', duration: 500, delay: i * 30 }}
                  style={{ width: '60%', maxWidth: space.xxl, borderRadius: 4, backgroundColor: b.value ? colors.accent : colors.divider }}
                />
                <AppText variant="captionBold" color={colors.textMuted}>
                  {b.label}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={180}>
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

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Icon name="cloud-offline" size={24} color={colors.textMuted} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyBold">Demo: poor network</AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Posts are saved on the phone and sent when it is off.
          </AppText>
        </View>
        <Switch
          value={state.offline}
          onValueChange={(v) => dispatch({ type: 'SET_OFFLINE', value: v })}
          trackColor={{ true: colors.accent, false: colors.divider }}
          thumbColor={colors.white}
        />
      </Card>
    </ScrollView>
  );
}

function Metric({ icon, value, unit, label }: { icon: React.ComponentProps<typeof Icon>['name']; value: string; unit?: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
      <Icon name={icon} size={24} color={colors.accent} />
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
      <Icon name="checkmark-circle" size={24} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold">{o.ngo.name}</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {longDate(o.deliveredAt!)} · {timeOfDay(o.deliveredAt!)} · {slotLabel(o.slot)}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {o.items.map((i) => i.name).join(', ')}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <AppText variant="bodyBold">{t.kg.toFixed(1)} kg</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {Math.round(t.meals)} fed
        </AppText>
      </View>
    </View>
  );
}

function buildBars(period: Period, orders: Order[], from: number, now: number) {
  const u = (o: Order) => orderTotals(o).utensils;
  if (period === 'Daily') {
    return (['breakfast', 'lunch', 'snacks', 'dinner'] as const).map((s) => ({
      label: slotLabel(s).slice(0, 3),
      value: orders.filter((o) => o.slot === s).reduce((a, o) => a + u(o), 0),
    }));
  }
  if (period === 'Weekly') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = from + i * DAY;
      const key = dateKey(d);
      return {
        label: new Date(d).toLocaleDateString('en-IN', { weekday: 'narrow' }),
        value: orders.filter((o) => dateKey(o.deliveredAt!) === key).reduce((a, o) => a + u(o), 0),
      };
    });
  }
  const weeks = Math.ceil(new Date(new Date(now).getFullYear(), new Date(now).getMonth() + 1, 0).getDate() / 7);
  return Array.from({ length: weeks }, (_, w) => ({
    label: `W${w + 1}`,
    value: orders
      .filter((o) => Math.floor((new Date(o.deliveredAt!).getDate() - 1) / 7) === w)
      .reduce((a, o) => a + u(o), 0),
  }));
}
