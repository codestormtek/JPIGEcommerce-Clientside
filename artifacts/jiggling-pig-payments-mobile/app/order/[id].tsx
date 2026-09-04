import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { 
  useGetStaffOrder, 
  useStartStaffOrder, 
  useMarkStaffOrderReady, 
  useMarkStaffOrderPickedUp, 
  StaffOrderStatus,
  getGetStaffOrderDashboardQueryKey,
  getListStaffOrdersQueryKey,
  getGetStaffOrderQueryKey
} from '@workspace/api-client-react';
import { useColors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: orderRes, isLoading, isError, refetch } = useGetStaffOrder(id!, {
    query: {
      enabled: !!id,
      queryKey: getGetStaffOrderQueryKey(id!),
    }
  });

  const startOrder = useStartStaffOrder();
  const markReady = useMarkStaffOrderReady();
  const markPickedUp = useMarkStaffOrderPickedUp();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: getListStaffOrdersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStaffOrderDashboardQueryKey() });
    if (id) {
      queryClient.invalidateQueries({ queryKey: getGetStaffOrderQueryKey(id) });
    }
  };

  const handleAction = (
    action: string, 
    mutation: typeof startOrder.mutateAsync, 
    successMessage: string,
    hapticType: Haptics.NotificationFeedbackType
  ) => {
    Alert.alert(
      `Confirm ${action}`,
      `Are you sure you want to mark this order as ${action}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          style: 'default',
          onPress: async () => {
            try {
              await mutation({ orderId: id! });
              Haptics.notificationAsync(hapticType);
              invalidateQueries();
              if (action === 'Picked Up') {
                router.back();
              }
            } catch (e: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert('Error', e.message || 'Failed to update order status');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !orderRes) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Failed to load order</Text>
        <Pressable 
          style={[styles.retryButton, { backgroundColor: colors.primary }]} 
          onPress={() => refetch()}
        >
          <Text style={[styles.retryText, { color: colors.white }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const order = orderRes.data;
  const isActionLoading = startOrder.isPending || markReady.isPending || markPickedUp.isPending;

  const renderActionButtons = () => {
    if (order.status === StaffOrderStatus.new) {
      return (
        <Pressable 
          style={({ pressed }) => [
            styles.actionButton, 
            { backgroundColor: colors.info },
            pressed && { opacity: 0.8 },
            isActionLoading && { opacity: 0.5 }
          ]}
          disabled={isActionLoading}
          onPress={() => handleAction('Cooking', startOrder.mutateAsync, 'Order started', Haptics.NotificationFeedbackType.Success)}
        >
          {isActionLoading ? <ActivityIndicator color={colors.white} /> : (
            <>
              <Ionicons name="flame" size={24} color={colors.white} />
              <Text style={[styles.actionButtonText, { color: colors.white }]}>START ORDER</Text>
            </>
          )}
        </Pressable>
      );
    }

    if (order.status === StaffOrderStatus.processing) {
      return (
        <Pressable 
          style={({ pressed }) => [
            styles.actionButton, 
            { backgroundColor: colors.success },
            pressed && { opacity: 0.8 },
            isActionLoading && { opacity: 0.5 }
          ]}
          disabled={isActionLoading}
          onPress={() => handleAction('Ready', markReady.mutateAsync, 'Order ready', Haptics.NotificationFeedbackType.Success)}
        >
          {isActionLoading ? <ActivityIndicator color={colors.white} /> : (
            <>
              <Ionicons name="checkmark-circle" size={24} color={colors.white} />
              <Text style={[styles.actionButtonText, { color: colors.white }]}>MARK READY</Text>
            </>
          )}
        </Pressable>
      );
    }

    if (order.status === StaffOrderStatus.ready) {
      return (
        <Pressable 
          style={({ pressed }) => [
            styles.actionButton, 
            { backgroundColor: colors.text },
            pressed && { opacity: 0.8 },
            isActionLoading && { opacity: 0.5 }
          ]}
          disabled={isActionLoading}
          onPress={() => handleAction('Picked Up', markPickedUp.mutateAsync, 'Order picked up', Haptics.NotificationFeedbackType.Success)}
        >
          {isActionLoading ? <ActivityIndicator color={colors.white} /> : (
            <>
              <Ionicons name="bag-check" size={24} color={colors.white} />
              <Text style={[styles.actionButtonText, { color: colors.white }]}>PICKED UP</Text>
            </>
          )}
        </Pressable>
      );
    }

    return null;
  };

  const getStatusColor = (status: StaffOrderStatus) => {
    switch (status) {
      case StaffOrderStatus.new: return colors.primary;
      case StaffOrderStatus.processing: return colors.info;
      case StaffOrderStatus.ready: return colors.success;
      case StaffOrderStatus.picked_up: return colors.body;
      default: return colors.body;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: order.orderNumber || `#${order.id.slice(0, 8)}`,
          headerTitleStyle: { fontFamily: 'Barlow_700Bold' },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }} 
      />
      
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <View style={styles.header}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {order.status.toUpperCase().replace('_', ' ')}
            </Text>
          </View>
          <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
            {new Date(order.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {(order.customerName || order.customerPhone || order.customerEmail) && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.body }]}>CUSTOMER</Text>
            {order.customerName && <Text style={[styles.customerName, { color: colors.text }]}>{order.customerName}</Text>}
            {order.customerPhone && <Text style={[styles.customerDetail, { color: colors.text }]}>{order.customerPhone}</Text>}
            {order.customerEmail && <Text style={[styles.customerDetail, { color: colors.text }]}>{order.customerEmail}</Text>}
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.body }]}>ITEMS</Text>
          {order.items.map((item, index) => (
            <View key={item.id} style={[styles.itemRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.itemQuantity}>
                <Text style={[styles.quantityText, { color: colors.text }]}>{item.quantity}x</Text>
              </View>
              <View style={styles.itemDetails}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.productName}</Text>
                {item.selectedSides && (
                  <Text style={[styles.itemOption, { color: colors.body }]}>Sides: {item.selectedSides}</Text>
                )}
                {item.options?.length > 0 && item.options.map((opt, i) => (
                  <Text key={i} style={[styles.itemOption, { color: colors.body }]}>{opt}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        {order.specialInstructions && (
          <View style={[styles.section, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.body }]}>SPECIAL INSTRUCTIONS</Text>
            <Text style={[styles.instructionsText, { color: colors.text }]}>{order.specialInstructions}</Text>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.body }]}>TOTAL</Text>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Paid via {order.payment.provider}</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>
              ${(order.total.amountCents / 100).toFixed(2)}
            </Text>
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: colors.body, marginLeft: 16 }]}>HISTORY</Text>
          {order.history.map((hist, index) => (
            <View key={hist.id} style={styles.historyRow}>
              <View style={[styles.historyDot, { backgroundColor: colors.border }]} />
              <View style={styles.historyContent}>
                <Text style={[styles.historyStatus, { color: colors.text }]}>{hist.status.toUpperCase()}</Text>
                <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>
                  {new Date(hist.changedAt).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {renderActionButtons() && (
        <View style={[styles.actionContainer, { paddingBottom: Math.max(insets.bottom, 16), backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {renderActionButtons()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 14,
  },
  timeText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 14,
  },
  section: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 1,
  },
  customerName: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 20,
    marginBottom: 4,
  },
  customerDetail: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 16,
    marginBottom: 2,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  itemQuantity: {
    marginRight: 12,
  },
  quantityText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 18,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 18,
    marginBottom: 4,
  },
  itemOption: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 14,
    marginTop: 2,
  },
  instructionsText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 16,
    fontStyle: 'italic',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 16,
  },
  totalAmount: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 24,
  },
  historySection: {
    marginTop: 8,
    marginBottom: 24,
  },
  historyRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 14,
  },
  historyTime: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 20,
    letterSpacing: 1,
  },
});
