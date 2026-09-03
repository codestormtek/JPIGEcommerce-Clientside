import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Switch, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useGetStaffPayment, useCreateStaffPaymentRefund, getGetStaffPaymentQueryKey } from '@workspace/api-client-react';
import { useColors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '../../components/KeyboardAwareScrollViewCompat';
import * as Haptics from 'expo-haptics';
import * as Crypto from 'expo-crypto';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { deleteSecureItem, getSecureItem, setSecureItem } from '../../lib/secureStorage';

export default function RefundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [restoreInventory, setRestoreInventory] = useState(false);
  const [isFullRefund, setIsFullRefund] = useState(false);
  const [refundStatus, setRefundStatus] = useState<'idle' | 'pending' | 'success'>('idle');
  
  // Preserve one idempotency request ID per session/submission/restart
  const [requestId, setRequestId] = useState<string | null>(null);

  React.useEffect(() => {
    async function loadOrInitRequestId() {
      if (!id) return;
      const key = `refund_req_id_${id}`;
      try {
        const existing = await getSecureItem(key);
        if (existing) {
          setRequestId(existing);
        } else {
          const newId = Crypto.randomUUID();
          await setSecureItem(key, newId);
          setRequestId(newId);
        }
      } catch (e) {
        // Fallback for secure store issues
        setRequestId(Crypto.randomUUID());
      }
    }
    loadOrInitRequestId();
  }, [id]);

  const clearRequestId = async () => {
    const key = `refund_req_id_${id}`;
    try {
      await deleteSecureItem(key);
      const newId = Crypto.randomUUID();
      await setSecureItem(key, newId);
      setRequestId(newId);
    } catch (e) {
      setRequestId(Crypto.randomUUID());
    }
  };

  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');

  const { data: paymentRes, isLoading: isLoadingPayment, isError: isErrorPayment, refetch } = useGetStaffPayment(id as string, {
    query: { 
      enabled: !!id, 
      queryKey: getGetStaffPaymentQueryKey(id as string),
      refetchInterval: refundStatus === 'pending' ? 3000 : false
    }
  });

  const createRefund = useCreateStaffPaymentRefund({
    mutation: {
      onSuccess: (data) => {
        const providerStatus = data.data.providerStatus;
        if (providerStatus === 'COMPLETED') {
          clearRequestId();
          queryClient.invalidateQueries({ queryKey: ['staff-payments'] });
          queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
          queryClient.invalidateQueries({ queryKey: [`/api/v1/payments/mobile/${id}`] });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        } else if (providerStatus === 'PENDING') {
          setRefundStatus('pending');
          queryClient.invalidateQueries({ queryKey: [`/api/v1/payments/mobile/${id}`] });
        } else {
          clearRequestId();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Refund Failed', `The refund was rejected or failed (${providerStatus}).`);
        }
      },
      onError: (err: any) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Refund Error', err.message || 'An error occurred processing the refund.');
        setRefundStatus('idle');
      }
    }
  });

  React.useEffect(() => {
    if (refundStatus === 'pending' && paymentRes?.data?.refunds) {
      const currentRefund = paymentRes.data.refunds.find(r => r.requestId === requestId);
      if (currentRefund) {
        if (currentRefund.providerStatus === 'COMPLETED') {
          clearRequestId();
          queryClient.invalidateQueries({ queryKey: ['staff-payments'] });
          queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
          setRefundStatus('success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        } else if (currentRefund.providerStatus === 'FAILED' || currentRefund.providerStatus === 'REJECTED') {
          clearRequestId();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Refund Failed', `The refund was rejected or failed (${currentRefund.providerStatus}).`);
          setRefundStatus('idle');
        }
      }
    }
  }, [refundStatus, paymentRes, requestId]);

  if (isLoadingPayment) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (isErrorPayment || !paymentRes) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', paddingTop: 100 }]}>
        <Text style={{ color: colors.danger, marginBottom: 16 }}>Failed to load payment details.</Text>
        <Pressable 
          style={({ pressed }) => [styles.submitBtn, { backgroundColor: colors.primary, paddingHorizontal: 24 }, pressed && { opacity: 0.8 }]}
          onPress={() => refetch()}
        >
          <Text style={[styles.submitText, { color: colors.white }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (refundStatus === 'pending' || refundStatus === 'success') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={{ color: colors.text, marginTop: 16, fontFamily: 'Barlow_600SemiBold', fontSize: 16 }}>
          Submitted, awaiting Square confirmation...
        </Text>
      </View>
    );
  }

  const payment = paymentRes.data;
  const maxRefundCents = payment.refundableAmount.amountCents;
  
  const handleToggleFullRefund = (val: boolean) => {
    setIsFullRefund(val);
    if (val) {
      setAmountStr((maxRefundCents / 100).toFixed(2));
    } else {
      setAmountStr('');
    }
  };

  const handleRefund = () => {
    if (!amountStr || isNaN(Number(amountStr))) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    const amountCents = Math.round(Number(amountStr) * 100);
    if (amountCents <= 0 || amountCents > maxRefundCents) {
      Alert.alert('Invalid Amount', `Amount must be between $0.01 and $${(maxRefundCents / 100).toFixed(2)}`);
      return;
    }
    if (reason.trim().length < 3) {
      Alert.alert('Reason Required', 'Please provide a valid reason for this refund.');
      return;
    }

    Alert.alert(
      'Confirm Refund',
      `Are you sure you want to refund $${(amountCents / 100).toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Issue Refund', 
          style: 'destructive',
          onPress: () => {
            if (!requestId) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            createRefund.mutate({
              paymentId: id as string,
              data: {
                amountCents,
                reason,
                restoreInventory,
                requestId
              }
            });
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Issue Refund</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        bottomOffset={40}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoLabel, { color: colors.body }]}>Order Total</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>${(payment.amount.amountCents / 100).toFixed(2)}</Text>
          <Text style={[styles.infoSub, { color: colors.primary }]}>
            Available to refund: ${(maxRefundCents / 100).toFixed(2)}
          </Text>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.text }]}>Refund Amount</Text>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: colors.body }]}>Full Refund</Text>
              <Switch 
                testID="full-refund-switch"
                value={isFullRefund} 
                onValueChange={handleToggleFullRefund}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
          
          <View style={[styles.amountInputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.currencySymbol, { color: colors.text }]}>$</Text>
            <TextInput
              testID="refund-amount-input"
              style={[styles.amountInput, { color: colors.text }]}
              value={amountStr}
              onChangeText={(t) => {
                setAmountStr(t);
                setIsFullRefund(false);
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.mutedForeground}
              editable={!createRefund.isPending}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Reason (Required)</Text>
          <TextInput
            testID="refund-reason-input"
            style={[styles.textInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Item missing, customer request"
            placeholderTextColor={colors.mutedForeground}
            editable={!createRefund.isPending}
            maxLength={192}
          />
        </View>

        <View style={[styles.formGroup, styles.switchGroup, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View>
            <Text style={[styles.label, { color: colors.text, marginBottom: 4 }]}>Restore Inventory</Text>
            <Text style={[styles.subLabel, { color: colors.body }]}>Return ALL items in this order to stock</Text>
          </View>
          <Switch 
            testID="restore-inventory-switch"
            value={restoreInventory} 
            onValueChange={setRestoreInventory}
            trackColor={{ true: colors.primary }}
            disabled={createRefund.isPending}
          />
        </View>

        <Pressable 
          testID="process-refund-button"
          style={({ pressed }) => [
            styles.submitBtn, 
            { backgroundColor: colors.danger },
            (pressed || createRefund.isPending || !requestId) && { opacity: 0.7 }
          ]}
          onPress={handleRefund}
          disabled={createRefund.isPending || !requestId}
        >
          {createRefund.isPending || !requestId ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={[styles.submitText, { color: colors.white }]}>Process Refund</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
    marginLeft: -4,
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 18,
    textTransform: 'uppercase',
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 24,
    marginBottom: 4,
  },
  infoSub: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 14,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 64,
  },
  currencySymbol: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 28,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontFamily: 'Barlow_700Bold',
    fontSize: 28,
    height: '100%',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 52,
    fontFamily: 'Barlow_500Medium',
    fontSize: 16,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  subLabel: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 12,
  },
  submitBtn: {
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 18,
    textTransform: 'uppercase',
  }
});
