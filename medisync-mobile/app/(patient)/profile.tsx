import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase/client';
import { Profile, Patient, Prescription } from '../../types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { cancelAllReminders } from '../../lib/notifications/push';

interface PatientData {
  profile: Profile;
  patient: Patient | null;
  prescriptionCount: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<PatientData | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [pushEnabled, setPushEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return;

    const userId = sessionData.user.id;

    const [{ data: profile }, { data: patient }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('patients').select('*').eq('profile_id', userId).single(),
    ]);

    // prescriptions.patient_id is a FK to patients.id, not auth.uid()
    const patientRecordId = patient?.id;
    const { data: prescriptions } = patientRecordId
      ? await supabase
          .from('prescriptions')
          .select('id')
          .eq('patient_id', patientRecordId)
          .eq('status', 'active')
      : { data: [] };

    if (profile) {
      setData({
        profile,
        patient: patient ?? null,
        prescriptionCount: prescriptions?.length ?? 0,
      });
      setEditName(profile.full_name);
      setEditPhone(profile.phone ?? '');
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const { data: sessionData } = await supabase.auth.getUser();
    if (!sessionData.user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName.trim(),
        phone: editPhone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionData.user.id);

    setSaving(false);
    if (!error) {
      setEditMode(false);
      await loadData();
    } else {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await cancelAllReminders();
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const initials = data?.profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0D6B5E" />
      }
    >
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#0D6B5E" size="large" />
        </View>
      ) : !data ? (
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Could not load profile</Text>
          <Text style={styles.errorMsg}>
            Pull down to retry, or sign out and sign back in.
          </Text>
          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.signOutBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            {editMode ? (
              <TextInput
                style={styles.nameInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full name"
              />
            ) : (
              <Text style={styles.name}>{data.profile.full_name}</Text>
            )}
            <Text style={styles.email}>{data.profile.email}</Text>
            <Badge label="Patient" variant="info" />
          </View>

          <Card style={styles.infoCard}>
            <Text style={styles.cardTitle}>Personal Information</Text>

            <InfoRow
              label="Date of Birth"
              value={
                data.patient?.date_of_birth
                  ? new Date(data.patient.date_of_birth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Not set'
              }
            />
            <InfoRow
              label="Gender"
              value={data.patient?.gender ?? 'Not set'}
            />
            <InfoRow
              label="Blood Type"
              value={data.patient?.blood_type ?? 'Not set'}
            />
            {editMode ? (
              <View style={styles.editField}>
                <Text style={styles.infoLabel}>Phone</Text>
                <TextInput
                  style={styles.editInput}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
              </View>
            ) : (
              <InfoRow label="Phone" value={data.profile.phone ?? 'Not set'} />
            )}
          </Card>

          {data.patient && (
            <Card style={styles.vitalsCard}>
              <Text style={styles.cardTitle}>Vitals</Text>
              <View style={styles.vitalsRow}>
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>Blood Pressure</Text>
                  <Text style={styles.vitalValue}>
                    {data.patient.blood_pressure ?? '—'}
                  </Text>
                </View>
                <View style={styles.vitalDivider} />
                <View style={styles.vitalItem}>
                  <Text style={styles.vitalLabel}>Heart Rate</Text>
                  <Text style={styles.vitalValue}>
                    {data.patient.heart_rate ? `${data.patient.heart_rate} bpm` : '—'}
                  </Text>
                </View>
              </View>
            </Card>
          )}

          <Card style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{data.prescriptionCount}</Text>
              <Text style={styles.statLabel}>Active Medications</Text>
            </View>
          </Card>

          <Card style={styles.settingsCard}>
            <Text style={styles.cardTitle}>Preferences</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ true: '#0D6B5E', false: '#D1D5DB' }}
                thumbColor="#fff"
              />
            </View>
          </Card>

          {editMode ? (
            <View style={styles.editActions}>
              <Button
                label="Save Changes"
                onPress={handleSave}
                variant="primary"
                loading={saving}
                style={{ flex: 1 }}
              />
              <Button
                label="Cancel"
                onPress={() => setEditMode(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
            </View>
          ) : (
            <Button
              label="Edit Profile"
              onPress={() => setEditMode(true)}
              variant="outline"
              style={styles.editBtn}
            />
          )}

          <TouchableOpacity
            onPress={handleSignOut}
            style={styles.signOutBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  content: { padding: 16, paddingBottom: 48 },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  errorState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
  },
  errorMsg: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0D6B5E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  nameInput: {
    borderWidth: 1.5,
    borderColor: '#0D6B5E',
    borderRadius: 10,
    padding: 10,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 200,
    color: '#111827',
  },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  email: { fontSize: 14, color: '#6B7280' },
  infoCard: { marginBottom: 12 },
  vitalsCard: { marginBottom: 12 },
  statsCard: { marginBottom: 12 },
  settingsCard: { marginBottom: 16 },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  editField: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    color: '#111827',
    marginTop: 4,
  },
  vitalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  vitalItem: { alignItems: 'center', flex: 1 },
  vitalDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  vitalLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  vitalValue: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statItem: { alignItems: 'center' },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0D6B5E',
  },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  settingLabel: { fontSize: 14, color: '#111827' },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  editBtn: { marginBottom: 12 },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
