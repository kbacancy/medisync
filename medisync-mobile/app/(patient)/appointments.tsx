import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calendar,
  Video,
  User,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppointmentRow {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: 'telehealth' | 'in_person';
  reason: string;
  status: string;
  room_url?: string;
  room_name?: string;
  clinician: {
    full_name: string;
    avatar_url?: string;
  } | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function minutesUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 60_000);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    scheduled: { label: 'Scheduled',  bg: '#EFF6FF', text: '#1D4ED8' },
    'in-call':  { label: 'In Call',   bg: '#F0FDF4', text: '#15803D' },
    completed:  { label: 'Completed', bg: '#F3F4F6', text: '#4B5563' },
    cancelled:  { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626' },
    no_show:    { label: 'No Show',   bg: '#FEF3C7', text: '#92400E' },
  };
  const style = map[status] ?? map.scheduled;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.text }]}>{style.label}</Text>
    </View>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: 'telehealth' | 'in_person' }) {
  return (
    <View style={[styles.badge, type === 'telehealth' ? styles.telehealthBadge : styles.inPersonBadge]}>
      {type === 'telehealth' ? (
        <Video size={10} color="#0D6B5E" />
      ) : (
        <User size={10} color="#6B7280" />
      )}
      <Text style={[styles.badgeText, { color: type === 'telehealth' ? '#0D6B5E' : '#6B7280', marginLeft: 3 }]}>
        {type === 'telehealth' ? 'Telehealth' : 'In Person'}
      </Text>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return;

    const userId = sessionData.user.id;

    // Resolve patient ID
    const { data: patientRow } = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', userId)
      .single();
    if (!patientRow) return;
    const pid = patientRow.id;
    setPatientId(pid);

    const { data } = await supabase
      .from('appointments')
      .select(`
        id,
        scheduled_at,
        duration_minutes,
        type,
        reason,
        status,
        room_url,
        room_name,
        clinician:profiles!clinician_id(full_name, avatar_url)
      `)
      .eq('patient_id', pid)
      .order('scheduled_at', { ascending: false })
      .limit(50);

    if (data) {
      setAppointments(data as AppointmentRow[]);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  }, [loadAppointments]);

  useEffect(() => {
    loadAppointments().finally(() => setLoading(false));
  }, [loadAppointments]);

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!patientId) return;

    const channel = supabase
      .channel('patient-appointments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${patientId}`,
        },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;

          setAppointments((prev) =>
            prev.map((a) =>
              a.id === updated.id
                ? {
                    ...a,
                    status: updated.status as string,
                    room_url: (updated.room_url as string | undefined) ?? a.room_url,
                    room_name: (updated.room_name as string | undefined) ?? a.room_name,
                  }
                : a
            )
          );

          if (updated.status === 'in-call') {
            const appt = appointments.find((a) => a.id === updated.id);
            const drName = appt?.clinician?.full_name ?? 'your doctor';
            Alert.alert(
              'Doctor is Ready',
              `Dr. ${drName} has started your video call. Join now?`,
              [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Join Now',
                  onPress: () =>
                    router.push({
                      pathname: '/(patient)/call',
                      params: {
                        appointmentId: updated.id as string,
                        roomUrl: updated.room_url as string,
                        roomName: updated.room_name as string,
                        doctorName: drName.replace(/^Dr\.\s*/i, ''),
                      },
                    }),
                },
              ]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [patientId, appointments, router]);

  const navigateToCall = useCallback(
    (appt: AppointmentRow) => {
      router.push({
        pathname: '/(patient)/call',
        params: {
          appointmentId: appt.id,
          roomUrl: appt.room_url ?? '',
          roomName: appt.room_name ?? '',
          doctorName: (appt.clinician?.full_name ?? 'Doctor').replace(/^Dr\.\s*/i, ''),
        },
      });
    },
    [router]
  );

  // ── Empty / loading states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centerPage}>
        <Text style={styles.loadingText}>Loading appointments…</Text>
      </View>
    );
  }

  const upcoming = appointments.filter(
    (a) => a.status === 'scheduled' || a.status === 'in-call'
  );
  const past = appointments.filter(
    (a) => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show'
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D6B5E" />
      }
    >
      {/* Active call banner */}
      {appointments.some((a) => a.status === 'in-call') && (
        <View style={styles.activeBanner}>
          <View style={styles.activeDot} />
          <View style={{ flex: 1 }}>
            {appointments
              .filter((a) => a.status === 'in-call')
              .slice(0, 1)
              .map((a) => (
                <Text key={a.id} style={styles.activeBannerText}>
                  Dr. {a.clinician?.full_name ?? 'Your doctor'} is waiting — join now
                </Text>
              ))}
          </View>
          {appointments
            .filter((a) => a.status === 'in-call')
            .slice(0, 1)
            .map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.joinNowBtn}
                onPress={() => navigateToCall(a)}
              >
                <Video size={14} color="#fff" />
                <Text style={styles.joinNowText}>Join</Text>
              </TouchableOpacity>
            ))}
        </View>
      )}

      {/* Section: Upcoming */}
      {upcoming.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Upcoming</Text>
          {upcoming.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              onJoinCall={navigateToCall}
            />
          ))}
        </>
      )}

      {/* Section: Past */}
      {past.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Past Appointments</Text>
          {past.map((appt) => (
            <AppointmentCard key={appt.id} appt={appt} onJoinCall={navigateToCall} />
          ))}
        </>
      )}

      {appointments.length === 0 && (
        <View style={styles.empty}>
          <Calendar size={40} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No appointments</Text>
          <Text style={styles.emptyMsg}>
            Your scheduled appointments will appear here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({
  appt,
  onJoinCall,
}: {
  appt: AppointmentRow;
  onJoinCall: (a: AppointmentRow) => void;
}) {
  const minsUntil = minutesUntil(appt.scheduled_at);
  const isInCall = appt.status === 'in-call';
  const isUpcoming = appt.status === 'scheduled' && minsUntil > 0 && minsUntil <= 30;

  return (
    <View style={[styles.card, isInCall && styles.cardActive]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardDoctor}>
            Dr. {appt.clinician?.full_name ?? 'Unknown Doctor'}
          </Text>
          <View style={styles.cardMeta}>
            <Clock size={11} color="#9CA3AF" />
            <Text style={styles.cardTime}>{formatDateTime(appt.scheduled_at)}</Text>
          </View>
        </View>
        <View style={styles.cardBadges}>
          <TypeBadge type={appt.type} />
          <StatusBadge status={appt.status} />
        </View>
      </View>

      {/* Reason */}
      <Text style={styles.cardReason} numberOfLines={2}>
        {appt.reason}
      </Text>

      {/* Upcoming reminder */}
      {isUpcoming && (
        <View style={styles.upcomingReminder}>
          <Text style={styles.upcomingText}>
            Appointment in {minsUntil} min
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.cardActions}>
        {isInCall && appt.room_url ? (
          <TouchableOpacity
            style={styles.joinCallBtn}
            onPress={() => onJoinCall(appt)}
          >
            <Video size={15} color="#fff" />
            <Text style={styles.joinCallText}>Join Call Now</Text>
          </TouchableOpacity>
        ) : appt.status === 'completed' ? (
          <TouchableOpacity style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>View Notes</Text>
            <ChevronRight size={14} color="#6B7280" />
          </TouchableOpacity>
        ) : appt.status === 'scheduled' ? (
          <TouchableOpacity style={styles.secondaryBtn}>
            <Text style={styles.secondaryBtnText}>Prepare Checklist</Text>
            <ChevronRight size={14} color="#6B7280" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  centerPage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9CA3AF', fontSize: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D6B5E',
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  activeBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  joinNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  joinNowText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardActive: {
    borderWidth: 1.5,
    borderColor: '#0D6B5E',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardDoctor: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardBadges: {
    gap: 4,
    alignItems: 'flex-end',
  },
  cardReason: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  upcomingReminder: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  upcomingText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
  },
  joinCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0D6B5E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  joinCallText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  secondaryBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  telehealthBadge: {
    backgroundColor: '#F0FDF4',
  },
  inPersonBadge: {
    backgroundColor: '#F3F4F6',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMsg: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
