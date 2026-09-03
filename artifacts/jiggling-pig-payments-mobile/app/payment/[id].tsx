import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useGetStaffPayment, useCancelStaffPayment, getGetStaffPaymentQueryKey } from '@workspace/api-client-react';
import { useColors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

export default function PaymentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: paymentRes, isLoading, isError, refetch } = useGetStaffPayment(id as string, {
    query: { 
      enabled: !!id, 
      queryKey: getGetStaffPaymentQueryKey(id as string),
      // Only poll if it's in a non-terminal state (like pending) or if there is a pending refund
      refetchInterval: (query) => {
        const data = query.state.data?.data;
        if (!data) return false;
        const status = data.localStatus;
        const hasPendingRefund = data.refunds?.some((r: any) => r.providerStatus === 'PENDING');
        return (status === 'pending' || status === 'authorized' || hasPendingRefund) ? 5000 : false;
      }
    }
  });

  const cancelMutation = useCancelStaffPayment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['staff-payments'] });
        queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
        queryClient.invalidateQueries({ queryKey: [`/api/v1/payments/mobile/${id}`] });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Payment canceled successfully.');
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', err.message || 'Failed to cancel payment.');
      }
    }
  });

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError || !paymentRes) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.danger, marginBottom: 16 }}>Failed to load payment details.</Text>
        <Pressable 
          style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.primary, paddingHorizontal: 24 }, pressed && { opacity: 0.8 }]}
          onPress={() => refetch()}
        >
          <Text style={[styles.actionText, { color: colors.white }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const payment = paymentRes.data;

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'captured': return colors.success;
      case 'pending': return colors.info;
      case 'failed': return colors.danger;
      case 'canceled': return colors.body;
      case 'refunded': return colors.danger;
      case 'partially_refunded': return colors.primary;
      default: return colors.body;
    }
  };

  const handleReceipt = async () => {
    if (payment.receiptUrl) {
      await WebBrowser.openBrowserAsync(payment.receiptUrl);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this payment? This action cannot be undone.',
      [
        { text: 'No, Keep It', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            cancelMutation.mutate({ paymentId: id as string });
          }
        }
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40, padding: 16 }}
    >
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <Text style={[styles.orderNumber, { color: colors.text }]}>
            {payment.orderNumber || `#${payment.orderId.slice(0, 8)}`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.localStatus) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(payment.localStatus) }]}>
                {payment.localStatus.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
              <Text style={[styles.statusText, { color: colors.text }]}>
                {payment.orderStatus?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatMoney(payment.amount.amountCents)}
        </Text>

        <Text style={[styles.date, { color: colors.body }]}>
          {new Date(payment.createdAt).toLocaleString()}
        </Text>
      </View>

      {(payment.customerName || payment.customerPhone) && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer Info</Text>
          {payment.customerName && (
            <Text style={[styles.customerText, { color: colors.body }]}>{payment.customerName}</Text>
          )}
          {payment.customerPhone && (
            <Text style={[styles.customerText, { color: colors.body }]}>{payment.customerPhone}</Text>
          )}
        </View>
      )}

      {payment.items && payment.items.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Items</Text>
          {payment.items.map((item, idx) => (
            <View key={idx} style={[styles.itemRow, idx > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
              <Text style={[styles.itemQty, { color: colors.primary }]}>{item.quantity}x</Text>
              <View style={styles.itemDetails}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.productName}</Text>
                {item.selectedSides && (
                  <Text style={[styles.itemSides, { color: colors.body }]}>Sides: {item.selectedSides}</Text>
                )}
                {item.options && item.options.length > 0 && (
                  <Text style={[styles.itemOptions, { color: colors.mutedForeground }]}>
                    {item.options.join(', ')}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {payment.refunds && payment.refunds.length > 0 && (
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Refund History</Text>
          {payment.refunds.map((refund) => (
            <View key={refund.id} style={[styles.refundRow, { borderTopColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.refundReason, { color: colors.text }]}>{refund.reason}</Text>
                <Text style={[styles.refundDate, { color: colors.body }]}>
                  {new Date(refund.createdAt).toLocaleDateString()} - {refund.providerStatus}
                  {refund.inventoryRestored ? ' • Inventory Restored' : ''}
                </Text>
              </View>
              <Text style={[styles.refundAmount, { color: colors.danger }]}>
                -{formatMoney(refund.amount.amountCents)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        {payment.receiptUrl && (
          <Pressable 
            testID="view-receipt-button"
            style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.info }, pressed && { opacity: 0.8 }]}
            onPress={handleReceipt}
          >
            <Ionicons name="receipt-outline" size={20} color={colors.white} />
            <Text style={[styles.actionText, { color: colors.white }]}>View Receipt</Text>
          </Pressable>
        )}

        {payment.canRefund && (
          <Pressable 
            testID="issue-refund-button"
            style={({ pressed }) => [styles.actionButton, { backgroundColor: colors.primary }, pressed && { opacity: 0.8 }]}
            onPress={() => router.push(`/refund/${payment.id}`)}
          >
            <Ionicons name="return-up-back-outline" size={20} color={colors.white} />
            <Text style={[styles.actionText, { color: colors.white }]}>Issue Refund</Text>
          </Pressable>
        )}

        {payment.canCancel && (
          <Pressable 
            testID="cancel-payment-button"
            style={({ pressed }) => [
              styles.actionButton, 
              { backgroundColor: colors.danger, opacity: cancelMutation.isPending ? 0.5 : (pressed ? 0.8 : 1) }
            ]}
            onPress={handleCancel}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={20} color={colors.white} />
                <Text style={[styles.actionText, { color: colors.white }]}>Cancel Payment</Text>
              </>
            )}
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  headerCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumber: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 12,
  },
  amount: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 36,
    marginBottom: 8,
  },
  date: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 14,
  },
  section: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  customerText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 16,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  itemQty: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 16,
    width: 32,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 16,
    marginBottom: 2,
  },
  itemSides: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 14,
    marginBottom: 2,
  },
  itemOptions: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 13,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  refundReason: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  refundDate: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 12,
  },
  refundAmount: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 16,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
});
