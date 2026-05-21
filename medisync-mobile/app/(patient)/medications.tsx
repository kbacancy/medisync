import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Video } from 'lucide-react-native';
import { supabase } from '../../lib/supabase/client';
import {
  PrescriptionWithDispense,
  AdherenceLog,
  TimeOfDay,
  DoseStatus,
} from '../../types';
import { TimeSection } from '../../components/medications/TimeSection';
import { DoseCardSkeleton } from '../../components/ui/LoadingSkeleton';
import {
  requestPermissions,
  registerForPushNotifications,
  scheduleDoseReminder,
} from '../../lib/notifications/push';
import {
  startBottleCapListener,
  stopBottleCapListener,
} from '../../lib/sensors/bottleCap';
import { initSyncQueue } from '../../lib/offline/syncQueue';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIME_SLOTS: { key: TimeOfDay; hours: number[] }[] = [
  { key: 'morning',   hours: [6, 7, 8, 9, 10, 11]     },
  { key: 'afternoon', hours: [12, 13, 14, 15, 16]      },
  { key: 'evening',   hours: [17, 18, 19, 20]          },
  { key: 'bedtime',   hours: [21, 22, 23]              },
];

function greetingFor(name: string): string {
  const h = new Date().getHours();
  const prefix = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${prefix}, ${name.split(' ')[0]}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppointmentBanner {
  id: string;
  doctorName: string;
  status: string;
  room_url?: string;
  room_name?: string;
  scheduled_at: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MedicationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithDispense[]>([]);
  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [activeAppointment, setActiveAppointment] = useState<AppointmentBanner | null>(null);
  const [upcomingAppointment, setUpcomingAppointment] = useState<AppointmentBanner | null>(null);

  const progressWidth = useSharedValue(0);

  const takenCount = logs.filter((l) => l.status === 'taken').length;
  const totalCount = logs.length;

  const progressAnim = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }));

  useEffect(() => {
    if (totalCount > 0) {
      progressWidth.value = withTiming(takenCount / totalCount, { duration: 600 });
    }
  }, [takenCount, totalCount, progressWidth]);

  const loadData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return;

    const userId = sessionData.user.id;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    if (profile) setUserName(profile.full_name);

    const { data: patientRow } = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', userId)
      .single();

    const pid = patientRow?.id ?? userId;
    setPatientId(pid);

    const { data: prescData } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', pid)
      .eq('status', 'active');

    if (prescData) setPrescriptions(prescData);

    const today = new Date().toISOString().split('T')[0];
    const { data: logData } = await supabase
      .from('adherence_logs')
      .select('*')
      .eq('patient_id', pid)
      .gte('scheduled_time', `${today}T00:00:00`)
      .lte('scheduled_time', `${today}T23:59:59`);

    if (logData && logData.length > 0) {
      setLogs(logData);
    } else if (prescData && prescData.length > 0) {
      const generatedLogs = prescData.flatMap((p) => {
        const times: string[] = [];
        const freq = p.frequency?.toLowerCase() ?? '';
        if (freq.includes('once') || freq.includes('daily')) {
          times.push(`${today}T08:00:00`);
        } else if (freq.includes('twice') || freq.includes('bid')) {
          times.push(`${today}T08:00:00`, `${today}T20:00:00`);
        } else if (freq.includes('three') || freq.includes('tid')) {
          times.push(`${today}T08:00:00`, `${today}T14:00:00`, `${today}T20:00:00`);
        } else {
          times.push(`${today}T08:00:00`);
        }
        return times.map((t) => ({
          id: `${p.id}-${t}`,
          patient_id: pid,
          prescription_id: p.id,
          scheduled_time: t,
          status: 'pending' as DoseStatus,
          created_at: new Date().toISOString(),
        }));
      });
      setLogs(generatedLogs);
    }

    // Fetch today's appointments to show banners
    const now = new Date().toISOString();
    const endOfDay = `${today}T23:59:59`;
    const { data: apptData } = await supabase
      .from('appointments')
      .select(`
        id, scheduled_at, status, room_url, room_name,
        clinician:profiles!clinician_id(full_name)
      `)
      .eq('patient_id', pid)
      .gte('scheduled_at', `${today}T00:00:00`)
      .lte('scheduled_at', endOfDay)
      .order('scheduled_at', { ascending: true });

    if (apptData) {
      // Active call — doctor is waiting right now
      const inCallAppt = (apptData as Record<string, unknown>[]).find(
        (a) => a.status === 'in-call'
      );
      if (inCallAppt) {
        const clinician = inCallAppt.clinician as { full_name?: string } | null;
        setActiveAppointment({
          id: inCallAppt.id as string,
          doctorName: clinician?.full_name ?? 'Doctor',
          status: inCallAppt.status as string,
          room_url: inCallAppt.room_url as string | undefined,
          room_name: inCallAppt.room_name as string | undefined,
          scheduled_at: inCallAppt.scheduled_at as string,
        });
      } else {
        setActiveAppointment(null);
      }

      // Upcoming — within next 30 minutes
      const upcoming = (apptData as Record<string, unknown>[]).find((a) => {
        if (a.status !== 'scheduled') return false;
        const minsUntil = Math.floor(
          (new Date(a.scheduled_at as string).getTime() - Date.now()) / 60_000
        );
        return minsUntil >= 0 && minsUntil <= 30;
      });
      if (upcoming) {
        const clinician = upcoming.clinician as { full_name?: string } | null;
        const minsUntil = Math.floor(
          (new Date(upcoming.scheduled_at as string).getTime() - Date.now()) / 60_000
        );
        setUpcomingAppointment({
          id: upcoming.id as string,
          doctorName: clinician?.full_name ?? 'Doctor',
          status: `in ${minsUntil} min`,
          scheduled_at: upcoming.scheduled_at as string,
        });
      } else {
        setUpcomingAppointment(null);
      }
    }
  }, []);

  const handleStatusChange = useCallback(
    async (
      logId: string,
      status: DoseStatus,
      reason?: string,
      snoozeUntil?: string
    ) => {
      setLogs((prev) =>
        prev.map((l) =>
          l.id === logId
            ? {
                ...l,
                status,
                skip_reason: reason ?? l.skip_reason,
                snooze_until: snoozeUntil ?? l.snooze_until,
                taken_at: status === 'taken' ? new Date().toISOString() : l.taken_at,
              }
            : l
        )
      );

      await supabase.from('adherence_logs').upsert({
        id: logId,
        patient_id: patientId,
        status,
        skip_reason: reason,
        snooze_until: snoozeUntil,
        taken_at: status === 'taken' ? new Date().toISOString() : undefined,
        actual_time: status === 'taken' ? new Date().toISOString() : undefined,
      });
    },
    [patientId]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    initSyncQueue().catch(console.error);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  useEffect(() => {
    const setup = async () => {
      const granted = await requestPermissions();
      if (granted && patientId) {
        const { data: sessionData } = await supabase.auth.getUser();
        if (sessionData.user) {
          await registerForPushNotifications(sessionData.user.id);
        }
        for (const presc of prescriptions) {
          const pendingLogs = logs.filter(
            (l) => l.prescription_id === presc.id && l.status === 'pending'
          );
          for (const log of pendingLogs) {
            await scheduleDoseReminder(
              presc.id,
              presc.medication_name,
              new Date(log.scheduled_time)
            ).catch(console.error);
          }
        }
      }
    };
    if (!loading) setup();
  }, [loading, patientId, prescriptions, logs]);

  useEffect(() => {
    if (!patientId || loading) return;

    startBottleCapListener((_prescriptionId) => {
      const pendingLog = logs.find((l) => l.status === 'pending');
      if (!pendingLog) return;

      const presc = prescriptions.find((p) => p.id === pendingLog.prescription_id);
      Alert.alert(
        'Medication detected',
        `Did you take your ${presc?.medication_name ?? 'medication'}?`,
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes, I took it',
            onPress: () => handleStatusChange(pendingLog.id, 'taken'),
          },
        ]
      );
    });

    return () => stopBottleCapListener();
  }, [loading, patientId, logs, prescriptions, handleStatusChange]);

  const logsBySlot = TIME_SLOTS.reduce<Record<TimeOfDay, AdherenceLog[]>>(
    (acc, slot) => {
      acc[slot.key] = logs.filter((l) => {
        const hour = new Date(l.scheduled_time).getHours();
        return slot.hours.includes(hour);
      });
      return acc;
    },
    { morning: [], afternoon: [], evening: [], bedtime: [] }
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D6B5E" />
      }
    >
      {/* Header card */}
      <View style={styles.headerCard}>
        <Text style={styles.greeting}>{greetingFor(userName || 'there')}</Text>
        <Text style={styles.dateLabel}>{todayLabel()}</Text>

        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Today's progress</Text>
            <Text style={styles.progressCount}>
              {takenCount} of {totalCount} doses
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressAnim]} />
          </View>
        </View>
      </View>

      {/* Active call banner — doctor is waiting now */}
      {activeAppointment && activeAppointment.room_url && (
        <TouchableOpacity
          style={styles.activeCallBanner}
          onPress={() =>
            router.push({
              pathname: '/(patient)/call',
              params: {
                appointmentId: activeAppointment.id,
                roomUrl: activeAppointment.room_url ?? '',
                roomName: activeAppointment.room_name ?? '',
                doctorName: activeAppointment.doctorName.replace(/^Dr\.\s*/i, ''),
              },
            })
          }
        >
          <View style={styles.activePulse} />
          <View style={{ flex: 1 }}>
            <Text style={styles.activeBannerTitle}>
              {activeAppointment.doctorName} is waiting
            </Text>
            <Text style={styles.activeBannerSub}>Tap to join your video consultation</Text>
          </View>
          <View style={styles.joinNowBtn}>
            <Video size={14} color="#fff" />
            <Text style={styles.joinNowText}>Join Now</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Upcoming appointment reminder */}
      {!activeAppointment && upcomingAppointment && (
        <View style={styles.upcomingBanner}>
          <Text style={styles.upcomingIcon}>🗓</Text>
          <Text style={styles.upcomingText}>
            Appointment {upcomingAppointment.status} with{' '}
            {upcomingAppointment.doctorName}
          </Text>
        </View>
      )}

      {/* Medication slots */}
      {loading ? (
        <>
          <DoseCardSkeleton />
          <DoseCardSkeleton />
          <DoseCardSkeleton />
        </>
      ) : totalCount === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyTitle}>No medications today</Text>
          <Text style={styles.emptyMsg}>
            You have no active prescriptions scheduled for today.
          </Text>
        </View>
      ) : (
        TIME_SLOTS.map(({ key }) => (
          <TimeSection
            key={key}
            timeOfDay={key}
            logs={logsBySlot[key]}
            prescriptions={prescriptions}
            onStatusChange={handleStatusChange}
          />
        ))
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  headerCard: {
    backgroundColor: '#0D6B5E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  dateLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    marginBottom: 16,
  },
  progressSection: {},
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  progressCount: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  activeCallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D6B5E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  activePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ade80',
  },
  activeBannerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  activeBannerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 1,
  },
  joinNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinNowText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  upcomingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  upcomingIcon: {
    fontSize: 18,
  },
  upcomingText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyMsg: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 6 },
});
