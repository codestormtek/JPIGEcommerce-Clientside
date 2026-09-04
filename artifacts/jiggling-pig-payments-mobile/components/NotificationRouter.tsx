import { useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { getSecureItem, setSecureItem } from '../lib/secureStorage';

const LAST_HANDLED_RESPONSE_KEY = 'jiggling_pig_last_notification_response';

type PendingNotification = {
  orderId: string;
  responseId: string;
};

export function NotificationRouter() {
  const { user, isLoading } = useAuth();
  const [pending, setPending] = useState<PendingNotification | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkColdStart = async () => {
      try {
        const response = await Notifications.getLastNotificationResponseAsync();
        const orderId = response?.notification?.request?.content?.data?.orderId;
        const responseId = response?.notification?.request?.identifier;
        const lastHandledResponseId = await getSecureItem(LAST_HANDLED_RESPONSE_KEY);
        if (isMounted && orderId && responseId && responseId !== lastHandledResponseId) {
          setPending({ orderId: String(orderId), responseId });
        }
      } catch {
        // Ignore errors checking last notification
      }
    };

    checkColdStart();

    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const orderId = response?.notification?.request?.content?.data?.orderId;
      const responseId = response?.notification?.request?.identifier;
      if (orderId && responseId) {
        setPending({ orderId: String(orderId), responseId });
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (isLoading || user?.role !== 'admin' || !pending) return;

    const { orderId, responseId } = pending;
    setPending(null);

    if (/^[a-zA-Z0-9-]{10,}$/.test(orderId)) {
      void setSecureItem(LAST_HANDLED_RESPONSE_KEY, responseId);
      router.push(`/order/${orderId}`);
    }
  }, [isLoading, pending, user]);

  return null;
}
