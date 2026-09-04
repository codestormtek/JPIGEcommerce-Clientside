import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Switch, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useColors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getSecureItem, setSecureItem, deleteSecureItem } from '../../lib/secureStorage';
import {
  useRegisterStaffPushToken,
  useUpdateStaffPushToken,
  useDeleteStaffPushToken,
  StaffPushTokenRequestRolePreference
} from '@workspace/api-client-react';

const TOKEN_ID_KEY = 'jiggling_pig_push_token_id';
const ROLE_PREF_KEY = 'jiggling_pig_push_preference';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [rolePreference, setRolePreference] = useState<StaffPushTokenRequestRolePreference | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tokenId, setTokenId] = useState<string | null>(null);

  const registerToken = useRegisterStaffPushToken();
  const updateToken = useUpdateStaffPushToken();
  const deleteToken = useDeleteStaffPushToken();

  useEffect(() => {
    async function loadSettings() {
      const savedTokenId = await getSecureItem(TOKEN_ID_KEY);
      const savedPref = await getSecureItem(ROLE_PREF_KEY) as StaffPushTokenRequestRolePreference | null;

      if (savedTokenId && savedPref) {
        setTokenId(savedTokenId);
        setRolePreference(savedPref);
        setNotificationsEnabled(true);
      }
    }
    loadSettings();
  }, []);

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await logout();
    } catch (e: any) {
      Alert.alert('Logout Failed', e.message || 'Failed to logout. Your notifications are still active.');
    }
  };

  const getPushToken = async () => {
    if (Platform.OS === 'web') return null;
    if (!Device.isDevice) {
      throw new Error('Must use physical device for Push Notifications');
    }
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      throw new Error('Failed to get push token for push notification!');
    }

    const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId || process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;

    if (!projectId) {
      if (Constants.appOwnership === 'expo') {
        throw new Error('Order screens work in Expo Go, but background push notifications require the installable published build (EAS Build).');
      }
      throw new Error('Project ID not configured. Push notifications are unavailable.');
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    return token;
  };

  const toggleNotifications = async (value: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Supported', 'Push notifications are not supported on the web.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsUpdating(true);

    try {
      if (value) {
        const token = await getPushToken();
        if (!token) throw new Error('No token generated');

        const initialPref = rolePreference || 'both';

        const res = await registerToken.mutateAsync({
          data: {
            token,
            rolePreference: initialPref,
            enabled: true
          }
        });

        const newTokenId = res.data.id;
        await setSecureItem(TOKEN_ID_KEY, newTokenId);
        await setSecureItem(ROLE_PREF_KEY, initialPref);

        setTokenId(newTokenId);
        setRolePreference(initialPref);
        setNotificationsEnabled(true);
      } else {
        if (tokenId) {
          await deleteToken.mutateAsync({ tokenId });
        }
        await deleteSecureItem(TOKEN_ID_KEY);
        await deleteSecureItem(ROLE_PREF_KEY);

        setTokenId(null);
        setNotificationsEnabled(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update notification settings');
      setNotificationsEnabled(!value);
    } finally {
      setIsUpdating(false);
    }
  };

  const updatePreference = async (pref: StaffPushTokenRequestRolePreference) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRolePreference(pref);

    if (notificationsEnabled && tokenId) {
      setIsUpdating(true);
      try {
        await updateToken.mutateAsync({
          tokenId,
          data: {
            rolePreference: pref
          }
        });
        await setSecureItem(ROLE_PREF_KEY, pref);
      } catch (e: any) {
        Alert.alert('Error', 'Failed to update preference');
      } finally {
        setIsUpdating(false);
      }
    } else {
      await setSecureItem(ROLE_PREF_KEY, pref);
    }
  };

  const renderRoleOption = (pref: StaffPushTokenRequestRolePreference, label: string, icon: keyof typeof Ionicons.glyphMap) => {
    const isSelected = rolePreference === pref;
    return (
      <Pressable
        style={[
          styles.roleOption,
          { backgroundColor: isSelected ? colors.primary + '20' : colors.background },
          isSelected && { borderColor: colors.primary }
        ]}
        onPress={() => updatePreference(pref)}
        disabled={isUpdating}
      >
        <Ionicons name={icon} size={24} color={isSelected ? colors.primary : colors.icon} />
        <Text style={[styles.roleOptionText, { color: isSelected ? colors.primary : colors.text }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top }]}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <View style={styles.content}>
        <Text style={[styles.sectionHeader, { color: colors.body }]}>ACCOUNT</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.label, { color: colors.body }]}>Logged in as</Text>
              <Text style={[styles.value, { color: colors.text }]}>{user?.firstName} {user?.lastName}</Text>
              <Text style={[styles.subValue, { color: colors.body }]}>{user?.email}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>{user?.role}</Text>
            </View>
          </View>

          <Pressable
            testID="sign-out-button"
            style={({ pressed }) => [styles.logoutButton, pressed && { opacity: 0.7 }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionHeader, { color: colors.body, marginTop: 24 }]}>NOTIFICATIONS</Text>
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.row, { borderBottomColor: notificationsEnabled ? colors.border : 'transparent' }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications" size={24} color={colors.primary} />
              <View style={styles.rowTextContainer}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]}>Receive alerts for new orders</Text>
              </View>
            </View>
            {isUpdating && <ActivityIndicator color={colors.primary} style={{ marginRight: 8 }} />}
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              disabled={isUpdating}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {notificationsEnabled && (
            <View style={styles.rolesContainer}>
              <Text style={[styles.rolesTitle, { color: colors.body }]}>I WANT TO RECEIVE:</Text>
              <View style={styles.rolesGrid}>
                {renderRoleOption('kitchen', 'New Orders', 'flame')}
                {renderRoleOption('cashier', 'Ready Orders', 'bag-check')}
                {renderRoleOption('both', 'All Updates', 'notifications')}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 32,
    textTransform: 'uppercase',
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 1,
  },
  section: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 16,
  },
  rowSubtitle: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 13,
    marginTop: 2,
  },
  label: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 18,
  },
  subValue: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 14,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  roleText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  logoutText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  rolesContainer: {
    padding: 16,
  },
  rolesTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 12,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  rolesGrid: {
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 12,
  },
  roleOptionText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 16,
  },
});
