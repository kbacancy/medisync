import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { AdherenceLog, PrescriptionWithDispense, TimeOfDay, DoseStatus } from '../../types';
import { DoseCard } from './DoseCard';
import { Badge } from '../ui/Badge';

const SECTION_META: Record<
  TimeOfDay,
  { emoji: string; label: string; range: string }
> = {
  morning: { emoji: '🌅', label: 'Morning', range: '6 AM – 12 PM' },
  afternoon: { emoji: '☀️', label: 'Afternoon', range: '12 PM – 5 PM' },
  evening: { emoji: '🌙', label: 'Evening', range: '5 PM – 9 PM' },
  bedtime: { emoji: '🌛', label: 'Bedtime', range: '9 PM – 12 AM' },
};

interface TimeSectionProps {
  timeOfDay: TimeOfDay;
  logs: AdherenceLog[];
  prescriptions: PrescriptionWithDispense[];
  onStatusChange: (
    logId: string,
    status: DoseStatus,
    reason?: string,
    snoozeUntil?: string
  ) => void;
}

export function TimeSection({
  timeOfDay,
  logs,
  prescriptions,
  onStatusChange,
}: TimeSectionProps) {
  const meta = SECTION_META[timeOfDay];

  if (logs.length === 0) return null;

  const allDone = logs.every((l) => l.status === 'taken');
  const prescMap = Object.fromEntries(prescriptions.map((p) => [p.id, p]));

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>{meta.emoji}</Text>
          <View>
            <Text style={styles.label}>{meta.label}</Text>
            <Text style={styles.range}>{meta.range}</Text>
          </View>
        </View>
        <Badge
          label={`${logs.length} medication${logs.length > 1 ? 's' : ''}`}
          variant="neutral"
        />
      </View>

      {allDone ? (
        <View style={styles.allDone}>
          <Check size={16} color="#10B981" />
          <Text style={styles.allDoneText}>All done!</Text>
        </View>
      ) : (
        logs.map((log) => {
          const prescription = prescMap[log.prescription_id];
          if (!prescription) return null;
          return (
            <DoseCard
              key={log.id}
              prescription={prescription}
              log={log}
              onStatusChange={onStatusChange}
            />
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emoji: {
    fontSize: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  range: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  allDone: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  allDoneText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 14,
  },
  empty: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
