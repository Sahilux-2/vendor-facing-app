import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { AnimatePresence, MotiView } from 'moti';
import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, TextInput, View } from 'react-native';
import { LinearTransition } from 'react-native-reanimated';
import {
  AppText,
  Button,
  Card,
  Chip,
  Divider,
  FadeIn,
  Icon,
  ScreenHeader,
  Sheet,
  Stepper,
  Tap,
  useTopInset,
} from '@/components/ui';
import { CUSTOM_CATEGORIES, Dish, SLOTS, SlotId, currentSlot, getMenu, slotById } from '@/data/menu';
import { dateKey, fmtU, longDate, utensilsLabel } from '@/lib/format';
import { useStore } from '@/store/store';
import { Item } from '@/store/types';
import { colors, radius, space } from '@/theme';

const QUICK = [0.5, 1, 2, 3];

export default function LogSurplusScreen() {
  const router = useRouter();
  const top = useTopInset();
  const { state, dispatch } = useStore();
  const [slotId, setSlotId] = useState<SlotId>(() => currentSlot().id);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [photo, setPhoto] = useState<string | undefined>();
  const [customOpen, setCustomOpen] = useState(false);

  const today = dateKey(Date.now());
  const slot = slotById(slotId);

  useEffect(() => setPicked({}), [slotId]);

  const dishes: Dish[] = useMemo(
    () => [
      ...getMenu(slotId),
      ...state.customDishes
        .filter((c) => c.dateKey === today && c.slot === slotId)
        .map((c) => c.dish as Dish),
    ],
    [slotId, state.customDishes, today],
  );

  const noSurplus = state.noSurplus.find((n) => n.dateKey === today && n.slot === slotId);
  const posted = state.listings.find(
    (l) => l.dateKey === today && l.slot === slotId && (l.status === 'open' || l.status === 'closed'),
  );
  const slotDone = (id: SlotId) =>
    state.noSurplus.some((n) => n.dateKey === today && n.slot === id) ||
    state.listings.some((l) => l.dateKey === today && l.slot === id && (l.status === 'open' || l.status === 'closed'));

  const toggle = (id: string) =>
    setPicked((p) => {
      const n = { ...p };
      if (n[id]) delete n[id];
      else n[id] = 1;
      return n;
    });

  const total = Object.values(picked).reduce((a, b) => a + b, 0);
  const count = Object.keys(picked).length;

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      const res = perm.granted
        ? await ImagePicker.launchCameraAsync({ quality: 0.4 })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.4 });
      if (!res.canceled) setPhoto(res.assets[0].uri);
    } catch {
      // Photo is optional, so never block the vendor.
    }
  };

  const broadcast = () => {
    const items: Item[] = dishes
      .filter((d) => picked[d.id])
      .map((d) => ({
        dishId: d.id,
        name: d.name,
        utensils: picked[d.id],
        kgPerUtensil: d.kgPerUtensil,
        mealsPerUtensil: d.mealsPerUtensil,
      }));
    dispatch({ type: 'POST_LISTING', now: Date.now(), slot: slotId, items, photoUri: photo });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setPicked({});
    setPhoto(undefined);
    router.navigate('/orders');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: top, paddingHorizontal: space.xl, paddingBottom: 160, gap: space.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Log Surplus" subtitle={`${longDate(Date.now())} · Any food left over?`} />

        <FadeIn delay={60}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, paddingVertical: space.xs }}>
            {SLOTS.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                icon={slotDone(s.id) ? 'checkmark-circle' : s.icon}
                selected={s.id === slotId}
                onPress={() => setSlotId(s.id)}
              />
            ))}
          </ScrollView>
        </FadeIn>

        {noSurplus || posted ? (
          <FadeIn delay={100}>
            <Card style={{ gap: space.lg, alignItems: 'center', paddingVertical: space.xxxl }}>
              <MotiView from={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 14 }}>
                <Icon name="checkmark-circle" size={48} color={colors.accent} />
              </MotiView>
              <AppText variant="title">{noSurplus ? `No surplus logged` : `${slot.label} surplus posted`}</AppText>
              <AppText variant="body" color={colors.textMuted} style={{ textAlign: 'center' }}>
                {noSurplus
                  ? `Nothing left from ${slot.label}. Thank you!`
                  : 'NGOs nearby can see it now. Track it in Active Orders.'}
              </AppText>
              {noSurplus ? (
                <Button
                  label="Undo"
                  variant="secondary"
                  onPress={() => dispatch({ type: 'UNDO_NO_SURPLUS', dateKey: today, slot: slotId })}
                />
              ) : (
                <Button label="View Active Orders" onPress={() => router.navigate('/orders')} />
              )}
            </Card>
          </FadeIn>
        ) : (
          <>
            <FadeIn delay={100}>
              <Tap
                onPress={() => {
                  dispatch({ type: 'LOG_NO_SURPLUS', now: Date.now(), slot: slotId });
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                }}
              >
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  <Icon name="checkmark-done-circle" size={32} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">No surplus</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      Tap once if all {slot.label.toLowerCase()} food was finished
                    </AppText>
                  </View>
                  <Icon name="chevron-forward" size={20} color={colors.textMuted} />
                </Card>
              </Tap>
            </FadeIn>

            <FadeIn delay={140} style={{ gap: space.md }}>
              <AppText variant="title">Tap dishes with leftover</AppText>
              <MotiView layout={LinearTransition.duration(220)} style={{ gap: space.md }}>
                {dishes.map((d, i) => {
                  const sel = picked[d.id];
                  return (
                    <MotiView key={d.id} layout={LinearTransition.duration(220)}>
                      <Card style={{ padding: 0, borderColor: sel ? colors.accent : colors.divider, borderWidth: sel ? 2 : 1 }}>
                        <Tap onPress={() => toggle(d.id)} scale={0.99}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg }}>
                            <Icon name={d.icon as any} size={28} color={sel ? colors.accent : colors.textMuted} />
                            <AppText variant="bodyBold" style={{ flex: 1 }}>
                              {d.name}
                            </AppText>
                            <MotiView animate={{ scale: sel ? 1 : 0.8, opacity: sel ? 1 : 0.4 }} transition={{ type: 'timing', duration: 160 }}>
                              <Icon name={sel ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={sel ? colors.accent : colors.disabled} />
                            </MotiView>
                          </View>
                        </Tap>
                        <AnimatePresence>
                          {sel ? (
                            <MotiView
                              from={{ opacity: 0, translateY: -8 }}
                              animate={{ opacity: 1, translateY: 0 }}
                              exit={{ opacity: 0, translateY: -8 }}
                              transition={{ type: 'timing', duration: 200 }}
                            >
                              <Divider />
                              <View style={{ padding: space.lg, gap: space.md }}>
                                <AppText variant="caption" color={colors.textMuted}>
                                  How many utensils are filled?
                                </AppText>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                                  {QUICK.map((q) => (
                                    <Chip
                                      key={q}
                                      label={q === 3 ? '3+' : fmtU(q)}
                                      selected={q === 3 ? sel >= 3 : sel === q}
                                      onPress={() => setPicked((p) => ({ ...p, [d.id]: q }))}
                                    />
                                  ))}
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <AppText variant="body" color={colors.textMuted}>
                                    Fine tune
                                  </AppText>
                                  <Stepper value={sel} onChange={(v) => setPicked((p) => ({ ...p, [d.id]: v }))} />
                                </View>
                              </View>
                            </MotiView>
                          ) : null}
                        </AnimatePresence>
                      </Card>
                    </MotiView>
                  );
                })}
              </MotiView>

              <Tap onPress={() => setCustomOpen(true)}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: space.sm,
                    minHeight: 56,
                    borderRadius: radius.lg,
                    borderWidth: 2,
                    borderStyle: 'dashed',
                    borderColor: colors.divider,
                  }}
                >
                  <Icon name="add" size={24} color={colors.accent} />
                  <AppText variant="bodyBold" color={colors.accent}>
                    Add custom dish
                  </AppText>
                </View>
              </Tap>
            </FadeIn>

            <FadeIn delay={180} style={{ gap: space.md }}>
              <AppText variant="title">Photo (optional)</AppText>
              <Tap onPress={takePhoto}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  {photo ? (
                    <Image source={{ uri: photo }} style={{ width: 64, height: 64, borderRadius: radius.md }} />
                  ) : (
                    <Icon name="camera" size={32} color={colors.textMuted} />
                  )}
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyBold">{photo ? 'Retake photo' : 'Take a photo'}</AppText>
                    <AppText variant="caption" color={colors.textMuted}>
                      Helps NGOs trust the food. You can skip this.
                    </AppText>
                  </View>
                </Card>
              </Tap>
            </FadeIn>
          </>
        )}
      </ScrollView>

      <AnimatePresence>
        {!noSurplus && !posted && count > 0 ? (
          <MotiView
            from={{ translateY: 96, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            exit={{ translateY: 96, opacity: 0 }}
            transition={{ type: 'timing', duration: 260 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              padding: space.lg,
              backgroundColor: colors.bg,
              borderTopWidth: 1,
              borderTopColor: colors.divider,
            }}
          >
            <Button
              label={`Broadcast ${utensilsLabel(total)} to NGOs`}
              icon="megaphone"
              onPress={broadcast}
            />
          </MotiView>
        ) : null}
      </AnimatePresence>

      <CustomDishSheet
        visible={customOpen}
        onClose={() => setCustomOpen(false)}
        onAdd={(name, cat) => {
          const id = `custom-${Date.now()}`;
          dispatch({
            type: 'ADD_CUSTOM_DISH',
            entry: {
              dateKey: today,
              slot: slotId,
              dish: { id, name, icon: cat.icon, kgPerUtensil: cat.kgPerUtensil, mealsPerUtensil: cat.mealsPerUtensil },
            },
          });
          setPicked((p) => ({ ...p, [id]: 1 }));
          setCustomOpen(false);
        }}
      />
    </View>
  );
}

function CustomDishSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, cat: (typeof CUSTOM_CATEGORIES)[number]) => void;
}) {
  const [name, setName] = useState('');
  const [catId, setCatId] = useState<string>('other');
  const cat = CUSTOM_CATEGORIES.find((c) => c.id === catId)!;

  useEffect(() => {
    if (visible) {
      setName('');
      setCatId('other');
    }
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose} title="Add custom dish">
      <AppText variant="caption" color={colors.textMuted}>
        Pick a type. Use the mic on your keyboard to say the name.
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {CUSTOM_CATEGORIES.map((c) => (
          <Chip key={c.id} label={c.label} icon={c.icon} selected={c.id === catId} onPress={() => setCatId(c.id)} />
        ))}
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={`Dish name (optional)`}
        placeholderTextColor={colors.textMuted}
        style={{
          minHeight: 56,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.divider,
          paddingHorizontal: space.lg,
          fontFamily: 'SFProRounded-Medium',
          fontSize: 16,
          color: colors.text,
        }}
      />
      <Button label="Add dish" icon="add" onPress={() => onAdd(name.trim() || `Special ${cat.label}`, cat)} />
    </Sheet>
  );
}
