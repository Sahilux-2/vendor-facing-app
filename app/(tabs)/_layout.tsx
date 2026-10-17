import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { fonts, colors, shadow } from '@/theme';
import { useStore } from '@/store/store';

type Name = keyof typeof Ionicons.glyphMap;

const icon = (active: Name, inactive: Name) =>
  function TabIcon({ color, focused }: { color: any; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} size={28} color={color} />;
  };

export default function TabsLayout() {
  const { state } = useStore();
  const needsAction = state.orders.filter((o) => o.status === 'packing' || o.status === 'ready').length;
  const live = state.listings.filter((l) => l.status === 'open' || (l.status === 'expired' && !l.disposed)).length;
  const badge = needsAction + live;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          height: 80,
          paddingTop: 8,
          paddingBottom: 12,
          ...shadow,
        },
        tabBarBadgeStyle: { fontFamily: fonts.bold, fontSize: 12, backgroundColor: colors.accent },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Log Surplus', tabBarIcon: icon('add-circle', 'add-circle-outline') }} />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Active Orders',
          tabBarIcon: icon('cube', 'cube-outline'),
          tabBarBadge: badge > 0 ? badge : undefined,
        }}
      />
      <Tabs.Screen name="records" options={{ title: 'Records', tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
    </Tabs>
  );
}
