import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Platform, TextInput } from 'react-native';
import { useGetStaffOrderDashboard, useListStaffOrders, StaffOrderStatus, getGetStaffOrderDashboardQueryKey, getListStaffOrdersQueryKey } from '@workspace/api-client-react';
import { useColors } from '../../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const STATUS_FILTERS = [
  { label: 'Active', value: undefined },
  { label: 'New', value: StaffOrderStatus.new },
  { label: 'Cooking', value: StaffOrderStatus.processing },
  { label: 'Ready', value: StaffOrderStatus.ready },
  { label: 'Done', value: StaffOrderStatus.picked_up },
];

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<StaffOrderStatus | undefined>(undefined);
  const [search, setSearch] = useState('');

  const { data: dashboard, refetch: refetchDashboard, isLoading: isLoadingDashboard, isError: isErrorDashboard } = useGetStaffOrderDashboard({
    query: { queryKey: getGetStaffOrderDashboardQueryKey(), refetchInterval: 10000 }
  });

  const { data: ordersRes, refetch: refetchOrders, isFetching: isFetchingOrders, isLoading: isLoadingOrders, isError: isErrorOrders } = useListStaffOrders(
    { status: statusFilter, limit: 50, search: search || undefined },
    { query: { queryKey: getListStaffOrdersQueryKey({ status: statusFilter, limit: 50, search: search || undefined }), refetchInterval: 10000 } }
  );

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchDashboard(), refetchOrders()]);
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
          <View style={[styles.metricCard, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Text style={[styles.metricLabel, { color: colors.white }]}>New</Text>
            <Text style={[styles.metricValue, { color: colors.white }]}>{dashboard.data.newCount}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.body }]}>Cooking</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{dashboard.data.processingCount}</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: colors.success, borderColor: colors.success }]}>
            <Text style={[styles.metricLabel, { color: colors.white }]}>Ready</Text>
            <Text style={[styles.metricValue, { color: colors.white }]}>{dashboard.data.readyCount}</Text>
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
              testID={`filter-chip-${item.value || 'active'}`}
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

  const getStatusColor = (status: StaffOrderStatus) => {
    switch (status) {
      case StaffOrderStatus.new: return colors.primary;
      case StaffOrderStatus.processing: return colors.info;
      case StaffOrderStatus.ready: return colors.success;
      case StaffOrderStatus.picked_up: return colors.body;
      default: return colors.body;
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const itemsSummary = item.items && item.items.length > 0 
      ? item.items.map((i: any) => `${i.quantity}x ${i.productName}`).join(', ') 
      : null;

    const statusColor = getStatusColor(item.status);

    return (
      <Pressable
        testID={`order-item-${item.id}`}
        style={({ pressed }) => [
          styles.orderItem,
          { backgroundColor: colors.card, borderColor: statusColor, borderWidth: item.status === StaffOrderStatus.new || item.status === StaffOrderStatus.ready ? 2 : 1 },
          pressed && { opacity: 0.7 }
        ]}
        onPress={() => router.push(`/order/${item.id}`)}
      >
        <View style={styles.orderLeft}>
          <View style={styles.orderNumberRow}>
            <Text style={[styles.orderNumber, { color: colors.text }]}>
              {item.orderNumber || `#${item.id.slice(0, 8)}`}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', marginLeft: 8 }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {item.status.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.customerName, { color: colors.text }]}>
            {item.customerName || 'Walk-in'}
          </Text>

          {itemsSummary && (
            <Text style={[styles.orderItems, { color: colors.body }]} numberOfLines={2}>
              {itemsSummary}
            </Text>
          )}

          <Text style={[styles.orderTime, { color: colors.mutedForeground, marginTop: 4 }]}>
            {new Date(item.orderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.icon} style={styles.chevron} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={ordersRes?.data || []}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        ListHeaderComponent={() => (
          <>
            <View style={[styles.header, { borderBottomColor: colors.border, paddingTop: Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top }]}>
              <Text style={[styles.title, { color: colors.text }]}>Kitchen Queue</Text>
              <View style={[styles.searchContainer, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Ionicons name="search" size={20} color={colors.icon} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search orders..."
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={setSearch}
                  clearButtonMode="while-editing"
                />
              </View>
            </View>
            {renderDashboard()}
            {renderFilters()}
          </>
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={
          <RefreshControl
            refreshing={isFetchingOrders && !isLoadingOrders}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            {isLoadingOrders ? (
              <ActivityIndicator color={colors.primary} size="large" />
            ) : isErrorOrders ? (
              <Text style={[styles.emptyText, { color: colors.danger }]}>Failed to load orders.</Text>
            ) : (
              <Text style={[styles.emptyText, { color: colors.body }]}>No orders found.</Text>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 32,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: 'Barlow_500Medium',
    fontSize: 16,
    height: '100%',
  },
  dashboardLoading: {
    height: 100,
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
    padding: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 14,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 28,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filtersList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 14,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
  },
  orderLeft: {
    flex: 1,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumber: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 20,
  },
  customerName: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  orderItems: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  orderTime: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 12,
  },
  chevron: {
    opacity: 0.5,
    marginLeft: 12,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 16,
  },
});
