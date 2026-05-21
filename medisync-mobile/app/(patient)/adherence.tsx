import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { supabase } from '../../lib/supabase/client';
import { AdherenceLog, PDCScore, PrescriptionWithDispense } from '../../types';
import { PDCRing } from '../../components/adherence/PDCRing';
import { WeeklyBarChart } from '../../components/adherence/WeeklyBarChart';
import { AdherenceHeatmap } from '../../components/adherence/AdherenceHeatmap';
import { Card } from '../../components/ui/Card';
import { StatSkeleton } from '../../components/ui/LoadingSkeleton';

function calcPDC(logs: AdherenceLog[]): number {
  if (logs.length === 0) return 0;
  const taken = logs.filter((l) => l.status === 'taken').length;
  return Math.round((taken / logs.length) * 100);
}

function pdcMessage(pdc: number): { text: string; color: string } {
  if (pdc >= 80) return { text: 'Excellent adherence!', color: '#065F46' };
  if (pdc >= 60) return { text: 'Room for improvement', color: '#92400E' };
  return { text: 'Critical — please consult your doctor', color: '#991B1B' };
}

function pdcBg(pdc: number): string {
  if (pdc >= 80) return '#D1FAE5';
  if (pdc >= 60) return '#FEF3C7';
  return '#FEE2E2';
}

function last7DaysData(logs: AdherenceLog[]) {
  const days: { day: string; taken: number; skipped: number; missed: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLogs = logs.filter((l) => l.scheduled_time.startsWith(dateStr));
    days.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3),
      taken: dayLogs.filter((l) => l.status === 'taken').length,
      skipped: dayLogs.filter((l) => l.status === 'skipped').length,
      missed: dayLogs.filter((l) => l.status === 'missed').length,
    });
  }
  return days;
}

function last30HeatmapData(logs: AdherenceLog[]) {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLogs = logs.filter((l) => l.scheduled_time.startsWith(dateStr));
    const status =
      dayLogs.length === 0
        ? 'none'
        : dayLogs.every((l) => l.status === 'taken')
        ? 'taken'
        : dayLogs.some((l) => l.status === 'missed')
        ? 'missed'
        : 'skipped';
    days.push({ date: dateStr, status: status as any });
  }
  return days;
}

export default function AdherenceScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<AdherenceLog[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionWithDispense[]>([]);

  const loadData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return;

    const { data: patientRow } = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', sessionData.user.id)
      .single();
    const pid = patientRow?.id ?? sessionData.user.id;

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [{ data: logData }, { data: prescData }] = await Promise.all([
      supabase
        .from('adherence_logs')
        .select('*')
        .eq('patient_id', pid)
        .gte('scheduled_time', since.toISOString()),
      supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', pid)
        .eq('status', 'active'),
    ]);

    if (logData) setLogs(logData);
    if (prescData) setPrescriptions(prescData);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const overallPDC = calcPDC(logs);
  const { text: pdcText, color: pdcTextColor } = pdcMessage(overallPDC);
  const weeklyData = last7DaysData(logs);
  const heatmapData = last30HeatmapData(logs);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D6B5E" />
      }
    >
      <Text style={styles.screenTitle}>Adherence History</Text>

      {loading ? (
        <StatSkeleton />
      ) : (
        <Card style={styles.pdcCard}>
          <PDCRing pdc={overallPDC} size={180} />
          <Text style={styles.pdcSubtitle}>
            Proportion of Days Covered — Last 30 days
          </Text>
          <View style={[styles.pdcMsgBox, { backgroundColor: pdcBg(overallPDC) }]}>
            <Text style={[styles.pdcMsg, { color: pdcTextColor }]}>{pdcText}</Text>
          </View>
        </Card>
      )}

      <Card style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <WeeklyBarChart data={weeklyData} />
      </Card>

      <Card style={styles.heatmapCard}>
        <Text style={styles.sectionTitle}>30-Day Heatmap</Text>
        <AdherenceHeatmap days={heatmapData} />
      </Card>

      {prescriptions.length > 0 && (
        <View>
          <Text style={styles.sectionTitle}>Per Medication</Text>
          {prescriptions.map((presc) => {
            const prescLogs = logs.filter((l) => l.prescription_id === presc.id);
            const pdc = calcPDC(prescLogs);
            const takenLogs = prescLogs.filter((l) => l.status === 'taken');
            const lastTaken = takenLogs.sort(
              (a, b) =>
                new Date(b.taken_at ?? b.scheduled_time).getTime() -
                new Date(a.taken_at ?? a.scheduled_time).getTime()
            )[0];
            const streak = calcStreak(prescLogs);

            return (
              <Card key={presc.id} style={styles.prescCard}>
                <Text style={styles.prescName}>{presc.medication_name}</Text>
                <Text style={styles.prescDosage}>{presc.dosage}</Text>

                <View style={styles.pdcBarRow}>
                  <Text style={styles.pdcBarLabel}>PDC</Text>
                  <View style={styles.pdcBarTrack}>
                    <View
                      style={[
                        styles.pdcBarFill,
                        {
                          width: `${pdc}%`,
                          backgroundColor:
                            pdc >= 80 ? '#0D6B5E' : pdc >= 60 ? '#F59E0B' : '#EF4444',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.pdcBarPct}>{pdc}%</Text>
                </View>

                <View style={styles.prescMeta}>
                  <Text style={styles.prescMetaText}>🔥 {streak}-day streak</Text>
                  {lastTaken && (
                    <Text style={styles.prescMetaText}>
                      Last taken:{' '}
                      {new Date(
                        lastTaken.taken_at ?? lastTaken.scheduled_time
                      ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function calcStreak(logs: AdherenceLog[]): number {
  const sorted = [...logs]
    .filter((l) => l.status === 'taken')
    .sort(
      (a, b) =>
        new Date(b.scheduled_time).getTime() - new Date(a.scheduled_time).getTime()
    );

  let streak = 0;
  let lastDate: string | null = null;

  for (const log of sorted) {
    const dateStr = log.scheduled_time.split('T')[0];
    if (!lastDate) {
      lastDate = dateStr;
      streak = 1;
    } else {
      const prev = new Date(lastDate);
      prev.setDate(prev.getDate() - 1);
      if (prev.toISOString().split('T')[0] === dateStr) {
        streak++;
        lastDate = dateStr;
      } else {
        break;
      }
    }
  }

  return streak;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  content: { padding: 16, paddingBottom: 32 },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  pdcCard: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 24,
  },
  pdcSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  pdcMsgBox: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pdcMsg: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  chartCard: { marginBottom: 16 },
  heatmapCard: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  prescCard: { marginBottom: 12 },
  prescName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  prescDosage: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  pdcBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  pdcBarLabel: { fontSize: 12, color: '#6B7280', width: 30 },
  pdcBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pdcBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  pdcBarPct: { fontSize: 12, fontWeight: '700', color: '#374151', width: 36 },
  prescMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  prescMetaText: { fontSize: 12, color: '#6B7280' },
});
