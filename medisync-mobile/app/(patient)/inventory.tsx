import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase/client';
import { PrescriptionWithDispense, DispenseRecord } from '../../types';
import { Card } from '../../components/ui/Card';
import { ListSkeleton } from '../../components/ui/LoadingSkeleton';

interface InventoryEntry {
  prescription: PrescriptionWithDispense;
  latestDispense: DispenseRecord | null;
  remaining: number;
  daysRemaining: number;
  isLow: boolean;
  isCritical: boolean;
}

function calcDaysRemaining(
  remaining: number,
  frequency: string
): number {
  const freq = frequency?.toLowerCase() ?? '';
  let dosesPerDay = 1;
  if (freq.includes('twice') || freq.includes('bid')) dosesPerDay = 2;
  else if (freq.includes('three') || freq.includes('tid')) dosesPerDay = 3;
  else if (freq.includes('four') || freq.includes('qid')) dosesPerDay = 4;
  if (dosesPerDay === 0) dosesPerDay = 1;
  return Math.floor(remaining / dosesPerDay);
}

export default function InventoryScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [patientId, setPatientId] = useState<string | null>(null);
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;

  const loadData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return;

    const { data: patientRow } = await supabase
      .from('patients')
      .select('id')
      .eq('profile_id', sessionData.user.id)
      .single();
    const pid = patientRow?.id ?? sessionData.user.id;
    setPatientId(pid);

    const { data: prescData } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', pid)
      .eq('status', 'active');

    if (!prescData) return;

    const entries: InventoryEntry[] = await Promise.all(
      prescData.map(async (presc) => {
        const { data: dispenseData } = await supabase
          .from('dispense_records')
          .select('*')
          .eq('prescription_id', presc.id)
          .order('dispensed_at', { ascending: false })
          .limit(1);

        const latest = dispenseData?.[0] ?? null;
        const remaining = latest?.remaining_count ?? 0;
        const daysRemaining = calcDaysRemaining(remaining, presc.frequency);

        return {
          prescription: presc,
          latestDispense: latest,
          remaining,
          daysRemaining,
          isLow: daysRemaining <= 10,
          isCritical: daysRemaining <= 5,
        };
      })
    );

    setInventory(entries);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleRefillRequest = async (entry: InventoryEntry) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`${apiUrl}/api/v1/pharmacy/dispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prescription_id: entry.prescription.id,
          patient_id: patientId,
          quantity_dispensed: entry.prescription.days_supply * 1,
          days_supply: entry.prescription.days_supply,
          pharmacy_name: 'Patient Request',
        }),
      });

      if (res.ok) {
        Alert.alert('Refill Requested', `Your refill for ${entry.prescription.medication_name} has been submitted.`);
        await loadData();
      } else {
        Alert.alert('Error', 'Could not submit refill request. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again when online.');
    }
  };

  const pillColor = (daysRemaining: number): string => {
    if (daysRemaining > 10) return '#0D6B5E';
    if (daysRemaining > 5) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D6B5E" />
      }
    >
      <Text style={styles.screenTitle}>My Inventory</Text>

      {loading ? (
        <ListSkeleton count={4} />
      ) : inventory.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No medications</Text>
          <Text style={styles.emptyMsg}>
            Your active prescriptions will appear here.
          </Text>
        </View>
      ) : (
        inventory.map((entry) => {
          const total = entry.latestDispense?.quantity_dispensed ?? entry.remaining;
          const safeTotal = Math.max(total, entry.remaining, 1);
          const fillPct = Math.min(entry.remaining / safeTotal, 1);
          const color = pillColor(entry.daysRemaining);

          return (
            <Card key={entry.prescription.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.nameSection}>
                  <Text style={styles.drugName}>
                    {entry.prescription.medication_name}
                  </Text>
                  <Text style={styles.dosage}>{entry.prescription.dosage}</Text>
                </View>
                {entry.isCritical && (
                  <AlertTriangle size={20} color="#EF4444" />
                )}
              </View>

              <View style={styles.pillSection}>
                <View style={styles.pillLabelRow}>
                  <Text style={styles.pillLabel}>
                    {entry.remaining} of {safeTotal} pills remaining
                  </Text>
                  <Text style={[styles.daysLabel, { color }]}>
                    {entry.daysRemaining}d supply
                  </Text>
                </View>
                <View style={styles.pillTrack}>
                  <View
                    style={[
                      styles.pillFill,
                      { width: `${fillPct * 100}%`, backgroundColor: color },
                    ]}
                  />
                </View>
              </View>

              {entry.isLow && (
                <View style={styles.warningBanner}>
                  <AlertTriangle size={14} color="#92400E" />
                  <Text style={styles.warningText}>
                    Low supply — Request refill
                  </Text>
                </View>
              )}

              {entry.isCritical && (
                <TouchableOpacity
                  onPress={() => handleRefillRequest(entry)}
                  style={styles.refillBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.refillBtnText}>
                    Request Refill at Pharmacy
                  </Text>
                </TouchableOpacity>
              )}

              {entry.latestDispense?.pharmacy_name && (
                <Text style={styles.pharmacyLabel}>
                  {entry.latestDispense.pharmacy_name}
                </Text>
              )}
            </Card>
          );
        })
      )}
    </ScrollView>
  );
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
  card: { marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameSection: { flex: 1 },
  drugName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  dosage: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  pillSection: { marginBottom: 8 },
  pillLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  pillLabel: { fontSize: 13, color: '#374151' },
  daysLabel: { fontSize: 13, fontWeight: '700' },
  pillTrack: {
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  pillFill: {
    height: '100%',
    borderRadius: 5,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    fontWeight: '500',
  },
  refillBtn: {
    backgroundColor: '#0D6B5E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    minHeight: 44,
  },
  refillBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  pharmacyLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptyMsg: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 6 },
});
