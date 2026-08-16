import { Tabs } from 'expo-router';
import { CreditCard, User, Users } from 'lucide-react-native';

import { s } from '@/theme/scale';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.bodySemi,
          fontSize: s(9),
          marginTop: s(2),
        },
        tabBarItemStyle: {
          paddingVertical: s(2),
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.tabBarBorder,
          height: s(52),
          paddingBottom: s(6),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Clientes',
          tabBarIcon: ({ focused }) => (
            <Users
              size={s(18)}
              color={focused ? colors.lime : colors.textMuted}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="subscription"
        options={{
          title: 'Suscripción',
          tabBarIcon: ({ focused }) => (
            <CreditCard
              size={s(18)}
              color={focused ? colors.lime : colors.textMuted}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <User
              size={s(18)}
              color={focused ? colors.lime : colors.textMuted}
              strokeWidth={focused ? 2.5 : 2}
            />
          ),
        }}
      />
    </Tabs>
  );
}

