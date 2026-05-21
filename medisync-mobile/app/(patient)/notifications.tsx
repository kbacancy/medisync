import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AlertTriangle, AlertCircle, Info, Bell } from 'lucide-react-native';
import { supabase } from '../../lib/supabase/client';
import { CareAlert } from '../../types';
import { useNotificationStore } from '../../store/notificationStore';

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function SeverityIcon({ severity }: { severity: CareAlert['severity'] }) {
  switch (severity) {
    case 'critical':
    case 'high':
      return <AlertTriangle size={20} color="#EF4444" />;
    case 'moderate':
      return <AlertCircle size={20} color="#F59E0B" />;
    default:
      return <Info size={20} color="#3B82F6" />;
  }
}

export default function NotificationsScreen() {
  const { alerts, setAlerts, markAllRead, addAlert, resetUnread } =
    useNotificationStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [patientId, setPatientId] = React.useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return;

    const { data: patientRow } = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', sessionData.user.id)
      .single();
    const pid = patientRow?.id ?? sessionData.user.id;
    setPatientId(pid);

    const { data } = await supabase
      .from('care_alerts')
      .select('*')
      .eq('patient_id', pid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setAlerts(data);
  }, [setAlerts]);

  useFocusEffect(
    useCallback(() => {
      loadAlerts();
      // Mark all as read when screen comes into focus
      if (patientId) {
        supabase
          .from('care_alerts')
          .update({ is_read: true })
          .eq('patient_id', patientId)
          .eq('is_read', false)
          .then(() => {
            markAllRead();
            resetUnread();
          });
      }
    }, [loadAlerts, patientId, markAllRead, resetUnread])
  );

  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel(`care_alerts_${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'care_alerts',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          addAlert(payload.new as CareAlert);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, addAlert]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  }, [loadAlerts]);

  const handleMarkAllRead = async () => {
    if (!patientId) return;
    await supabase
      .from('care_alerts')
      .update({ is_read: true })
      .eq('patient_id', patientId);
    markAllRead();
    resetUnread();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D6B5E" />
      }
    >
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>Notifications</Text>
        {alerts.some((a) => !a.is_read) && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <Bell size={48} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyMsg}>Care alerts will appear here.</Text>
        </View>
      ) : (
        alerts.map((alert) => (
          <View
            key={alert.id}
            style={[
              styles.alertCard,
              !alert.is_read ? styles.alertUnread : styles.alertRead,
            ]}
          >
            <View style={styles.alertIcon}>
              <SeverityIcon severity={alert.severity} />
            </View>
            <View style={styles.alertBody}>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>{timeAgo(alert.created_at)}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  content: { padding: 16, paddingBottom: 32 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  markAllBtn: {
    minHeight: 44,
    justifyContent: 'center',
  },
  markAllText: {
    color: '#0D6B5E',
    fontSize: 14,
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  alertUnread: {
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#0D6B5E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  alertRead: {
    backgroundColor: '#F9FAFB',
  },
  alertIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  alertBody: { flex: 1 },
  alertMessage: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    fontWeight: '500',
  },
  alertTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  emptyMsg: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
