import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useColors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logout();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top }]}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <View style={styles.content}>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 28,
  },
  content: {
    padding: 16,
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
  },
});
