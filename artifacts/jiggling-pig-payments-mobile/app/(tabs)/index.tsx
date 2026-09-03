import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { useGetStaffPaymentDashboard, useListStaffPayments } from '@workspace/api-client-react';
import { useColors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'pending' },
  { label: 'Captured', value: 'captured' },
  { label: 'Refunded', value: 'refunded' },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  const { data: dashboard, refetch: refetchDashboard, isLoading: isLoadingDashboard, isError: isErrorDashboard } = useGetStaffPaymentDashboard({
    query: { queryKey: ['staff-dashboard'], refetchInterval: 10000 }
  });

  const { data: paymentsRes, refetch: refetchPayments, isFetching: isFetchingPayments, isLoading: isLoadingPayments, isError: isErrorPayments } = useListStaffPayments(
    { status: statusFilter as any, limit: 50 },
    { query: { queryKey: ['staff-payments', statusFilter], refetchInterval: 10000 } }
  );

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchDashboard(), refetchPayments()]);
  };

  const formatMoney = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const renderDashboard = () => {
    if (isLoadingDashboard || !dashboard) {
      return (
        <View style={styles.dashboardLoading}>
          {isErrorDashboard ? (
            <Text style={{ color: colors.danger }}>Failed to load dashboard. Pull to retry.</Text>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
      );
    }
    
    return (
      <View style={styles.dashboardContainer}>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.body }]}>Captured Total</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{formatMoney(dashboard.data.capturedTotal.amountCents)}</Text>
            <Text style={[styles.metricSub, { color: colors.success }]}>{dashboard.data.capturedCount} orders</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.body }]}>Pending Total</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{dashboard.data.pendingCount}</Text>
            <Text style={[styles.metricSub, { color: colors.info }]}>awaiting capture</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUS_FILTERS}
        keyExtractor={(item) => item.label}
        contentContainerStyle={styles.filtersList}
        renderItem={({ item }) => {
          const isActive = statusFilter === item.value;
          return (
            <Pressable
              testID={`filter-chip-${item.value || 'all'}`}
              style={[
                styles.filterChip,
                { 
                  backgroundColor: isActive ? colors.primary : colors.card,
                  borderColor: isActive ? colors.primary : colors.border
                }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStatusFilter(item.value);
              }}
            >
              <Text style={[
                styles.filterText,
                { color: isActive ? colors.white : colors.text }
              ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );

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

  const renderPaymentItem = ({ item }: { item: any }) => {
    const itemsSummary = item.items && item.items.length > 0 
      ? item.items.map((i: any) => `${i.quantity}x ${i.productName}`).join(', ') 
      : null;

    return (
      <Pressable
        testID={`payment-item-${item.id}`}
        style={({ pressed }) => [
          styles.paymentItem,
          { backgroundColor: colors.card, borderColor: colors.border },
          pressed && { opacity: 0.7 }
        ]}
        onPress={() => router.push(`/payment/${item.id}`)}
      >
        <View style={styles.paymentLeft}>
          <View style={styles.orderNumberRow}>
            <Text style={[styles.paymentOrderNumber, { color: colors.text }]}>
              {item.orderNumber || `#${item.orderId.slice(0, 8)}`}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.muted, marginLeft: 8 }]}>
              <Text style={[styles.statusText, { color: colors.text }]}>
                {item.orderStatus?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>
          
          {itemsSummary && (
            <Text style={[styles.paymentItems, { color: colors.body }]} numberOfLines={2}>
              {itemsSummary}
            </Text>
          )}

          <Text style={[styles.paymentTime, { color: colors.mutedForeground, marginTop: 4 }]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {item.customerName ? ` • ${item.customerName}` : ''}
          </Text>
        </View>
        <View style={styles.paymentRight}>
          <Text style={[styles.paymentAmount, { color: colors.text }]}>
            {formatMoney(item.amount.amountCents)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.localStatus) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.localStatus) }]}>
              {item.localStatus.toUpperCase()}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.icon} style={styles.chevron} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={paymentsRes?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderPaymentItem}
        ListHeaderComponent={() => (
          <>
            <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top }]}>
              <Text style={[styles.title, { color: colors.text }]}>Cockpit</Text>
            </View>
            {renderDashboard()}
            {renderFilters()}
          </>
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={
          <RefreshControl
            refreshing={isFetchingPayments && !isLoadingPayments}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {isLoadingPayments ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : isErrorPayments ? (
              <Text style={[styles.emptyText, { color: colors.danger }]}>Failed to load payments.</Text>
            ) : (
              <Text style={[styles.emptyText, { color: colors.body }]}>No payments found.</Text>
            )}
          </View>
        )}
      />
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
    textTransform: 'uppercase',
  },
  dashboardLoading: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashboardContainer: {
    padding: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  metricLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  metricValue: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 24,
    marginBottom: 4,
  },
  metricSub: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 12,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  paymentLeft: {
    flex: 1,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  paymentOrderNumber: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 16,
  },
  paymentItems: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 13,
    marginBottom: 2,
    lineHeight: 18,
  },
  paymentTime: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 12,
  },
  paymentCustomer: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 14,
  },
  paymentRight: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  paymentAmount: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 18,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 10,
  },
  chevron: {
    opacity: 0.5,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 16,
  },
});
