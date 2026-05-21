import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Pill, Check, X, Clock } from 'lucide-react-native';
import { AdherenceLog, PrescriptionWithDispense, DoseStatus } from '../../types';
import { SkipReasonSheet } from './SkipReasonSheet';
import { SnoozeSheet } from './SnoozeSheet';
import { queueAction, syncAll } from '../../lib/offline/syncQueue';
import NetInfo from '@react-native-community/netinfo';

const CATEGORY_COLORS: Record<string, string> = {
  cardiovascular: '#3B82F6',
  diabetes: '#8B5CF6',
  respiratory: '#06B6D4',
  pain: '#F97316',
  mental_health: '#EC4899',
  default: '#0D6B5E',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface DoseCardProps {
  prescription: PrescriptionWithDispense;
  log: AdherenceLog;
  onStatusChange: (
    logId: string,
    status: DoseStatus,
    reason?: string,
    snoozeUntil?: string
  ) => void;
}

export function DoseCard({ prescription, log, onStatusChange }: DoseCardProps) {
  const [showSkip, setShowSkip] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const opacity = useSharedValue(1);
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  const categoryColor =
    CATEGORY_COLORS[prescription.medication_category ?? ''] ??
    CATEGORY_COLORS.default;

  const borderColor = {
    taken: '#10B981',
    skipped: '#EF4444',
    snoozed: '#F59E0B',
    missed: '#9CA3AF',
    pending: 'transparent',
    late: '#F59E0B',
  }[log.status];

  async function postDoseLog(
    status: DoseStatus,
    reason?: string,
    snoozeUntil?: string
  ) {
    const payload = {
      log_id: log.id,
      prescription_id: log.prescription_id,
      status,
      skip_reason: reason,
      snooze_until: snoozeUntil,
      taken_at: status === 'taken' ? new Date().toISOString() : undefined,
    };

    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    if (isOnline) {
      try {
        const res = await fetch(`${apiUrl}/api/v1/adherence/log-dose`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Server error');
      } catch {
        await queueAction('log-dose', payload);
      }
    } else {
      await queueAction('log-dose', payload);
    }
  }

  async function handleTake() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    opacity.value = withTiming(0.8, { duration: 150 }, () => {
      opacity.value = withTiming(1, { duration: 150 });
    });
    onStatusChange(log.id, 'taken');
    await postDoseLog('taken');
  }

  function handleSkipConfirm(reason: string) {
    setShowSkip(false);
    onStatusChange(log.id, 'skipped', reason);
    postDoseLog('skipped', reason);
  }

  function handleSnoozeConfirm(snoozeUntil: Date) {
    setShowSnooze(false);
    const iso = snoozeUntil.toISOString();
    onStatusChange(log.id, 'snoozed', undefined, iso);
    postDoseLog('snoozed', undefined, iso);
  }

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(300)}
        style={[styles.card, { borderLeftColor: borderColor }, animStyle]}
      >
        <View style={[styles.iconCircle, { backgroundColor: categoryColor + '20' }]}>
          <Pill size={22} color={categoryColor} />
        </View>

        <View style={styles.info}>
          <Text style={styles.drugName} numberOfLines={1}>
            {prescription.medication_name}
          </Text>
          <Text style={styles.sub}>
            {prescription.dosage} · {prescription.form ?? 'tablet'}
          </Text>
          {prescription.instructions ? (
            <Text style={styles.instructions} numberOfLines={2}>
              {prescription.instructions}
            </Text>
          ) : null}
          <Text style={styles.time}>{formatTime(log.scheduled_time)}</Text>
        </View>

        <View style={styles.actions}>
          {log.status === 'pending' && (
            <>
              <TouchableOpacity
                onPress={handleTake}
                style={[styles.btn, styles.btnTake]}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={styles.btnTakeText}>Take</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSkip(true)}
                style={[styles.btn, styles.btnSkip]}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={styles.btnSkipText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowSnooze(true)}
                style={[styles.btn, styles.btnSnooze]}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Text style={styles.btnSnoozeText}>Snooze</Text>
              </TouchableOpacity>
            </>
          )}

          {log.status === 'taken' && (
            <View style={styles.statusCol}>
              <Check size={20} color="#10B981" />
              <Text style={styles.statusTaken}>
                Taken at {log.taken_at ? formatTime(log.taken_at) : '—'}
              </Text>
            </View>
          )}

          {log.status === 'skipped' && (
            <View style={styles.statusCol}>
              <X size={20} color="#EF4444" />
              <Text style={styles.statusSkipped} numberOfLines={2}>
                {log.skip_reason ?? 'Skipped'}
              </Text>
            </View>
          )}

          {log.status === 'snoozed' && (
            <View style={styles.statusCol}>
              <Clock size={20} color="#F59E0B" />
              <Text style={styles.statusSnoozed}>
                {log.snooze_until ? `Remind at ${formatTime(log.snooze_until)}` : 'Snoozed'}
              </Text>
            </View>
          )}

          {(log.status === 'missed' || log.status === 'late') && (
            <View style={styles.statusCol}>
              <Text style={styles.statusMissed}>Missed</Text>
            </View>
          )}
        </View>
      </Animated.View>

      <SkipReasonSheet
        visible={showSkip}
        onConfirm={handleSkipConfirm}
        onCancel={() => setShowSkip(false)}
      />
      <SnoozeSheet
        visible={showSnooze}
        onConfirm={handleSnoozeConfirm}
        onCancel={() => setShowSnooze(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  drugName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  sub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  instructions: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: '#0D6B5E',
    fontWeight: '600',
    marginTop: 4,
  },
  actions: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  btn: {
    minHeight: 30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  btnTake: {
    backgroundColor: '#0D6B5E',
  },
  btnTakeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  btnSkip: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  btnSkipText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  btnSnooze: {
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  btnSnoozeText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
  },
  statusCol: {
    alignItems: 'center',
    gap: 2,
    maxWidth: 80,
  },
  statusTaken: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusSkipped: {
    fontSize: 11,
    color: '#EF4444',
    textAlign: 'center',
  },
  statusSnoozed: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusMissed: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
});
