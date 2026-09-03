import { Tabs } from 'expo-router';
// @ts-ignore
import { NativeTabs } from 'expo-router';
import { useColors } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform } from 'react-native';

export default function TabLayout() {
  const colors = useColors();
  const liquidGlass = isLiquidGlassAvailable();
  
  // Use NativeTabs on iOS 26+ if liquid glass is available
  const TabsComponent = (Platform.OS === 'ios' && liquidGlass) ? NativeTabs : Tabs;

  return (
    <TabsComponent
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.icon,
        tabBarStyle: {
          backgroundColor: liquidGlass ? 'transparent' : colors.background,
          borderTopColor: colors.border,
          ...(Platform.OS === 'web' ? { height: 84 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: 'Barlow_600SemiBold',
          fontSize: 12,
        },
      }}
    >
      <TabsComponent.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="stats-chart" size={24} color={color} />,
        }}
      />
      <TabsComponent.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }: { color: string }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />
    </TabsComponent>
  );
}
