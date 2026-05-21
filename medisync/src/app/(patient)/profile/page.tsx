'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Profile, Patient, Prescription } from '@/types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const editProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

type EditProfileValues = z.infer<typeof editProfileSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_PROFILE: Profile = {
  id: 'seed-1',
  email: 'patient@example.com',
  full_name: 'Maria Santos',
  role: 'patient',
  phone: '+1 (555) 123-4567',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SEED_PATIENT: Patient = {
  id: 'seed-1',
  profile_id: 'seed-1',
  date_of_birth: '1985-03-14',
  gender: 'Female',
  blood_type: 'O+',
  blood_pressure: '118/76',
  heart_rate: 72,
  risk_level: 'MODERATE',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SEED_PRESCRIPTIONS: Prescription[] = [
  {
    id: 'rx-1',
    patient_id: 'seed-1',
    clinician_id: 'doc-1',
    medication_name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily',
    days_supply: 30,
    refills: 3,
    start_date: '2024-01-01',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'rx-2',
    patient_id: 'seed-1',
    clinician_id: 'doc-1',
    medication_name: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Once daily',
    days_supply: 30,
    refills: 5,
    start_date: '2024-01-15',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PatientProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>(SEED_PROFILE);
  const [patient, setPatient] = useState<Patient>(SEED_PATIENT);
  const [medications, setMedications] = useState<Prescription[]>(SEED_PRESCRIPTIONS);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditProfileValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { full_name: SEED_PROFILE.full_name, phone: SEED_PROFILE.phone ?? '' },
  });

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const resolvedProfile: Profile = profileData ?? {
        ...SEED_PROFILE,
        id: user.id,
        email: user.email ?? SEED_PROFILE.email,
      };
      setProfile(resolvedProfile);
      reset({ full_name: resolvedProfile.full_name, phone: resolvedProfile.phone ?? '' });

      const { data: patientData } = await supabase
        .from('patients')
        .select('*')
        .eq('profile_id', user.id)
        .single();

      const resolvedPatient: Patient = patientData ?? { ...SEED_PATIENT, profile_id: user.id };
      setPatient(resolvedPatient);

      const { data: rxData } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('patient_id', resolvedPatient.id)
        .eq('status', 'active');

      if (rxData && rxData.length > 0) {
        setMedications(rxData as Prescription[]);
      } else {
        setMedications(SEED_PRESCRIPTIONS);
      }

      setLoading(false);
    };

    load();
  }, [reset]);

  const onSubmit = async (values: EditProfileValues) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: values.full_name, phone: values.phone ?? null })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to update profile. Please try again.');
    } else {
      setProfile((prev) => ({ ...prev, full_name: values.full_name, phone: values.phone }));
      toast.success('Profile updated successfully.');
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const dob = patient.date_of_birth
    ? format(new Date(patient.date_of_birth), 'MMMM d, yyyy')
    : 'Not recorded';

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-24 bg-gray-200 rounded-xl" />
        <div className="h-40 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center gap-3">
        <div className="size-20 rounded-full bg-[#0D6B5E] flex items-center justify-center shrink-0">
          <span className="text-white text-2xl font-bold">{getInitials(profile.full_name)}</span>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-gray-900">{profile.full_name}</p>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-gray-600 justify-center mt-1">
          <span>
            <span className="font-medium text-gray-900">DOB:</span> {dob}
          </span>
          <span>
            <span className="font-medium text-gray-900">Gender:</span> {patient.gender}
          </span>
          {patient.blood_type && (
            <span>
              <span className="font-medium text-gray-900">Blood Type:</span> {patient.blood_type}
            </span>
          )}
        </div>
      </div>

      {/* Vitals card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Vitals</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#F4F6F8] rounded-lg p-3">
            <p className="text-xs text-gray-500">Blood Pressure</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">
              {patient.blood_pressure ?? '—'} <span className="text-xs font-normal text-gray-500">mmHg</span>
            </p>
          </div>
          <div className="bg-[#F4F6F8] rounded-lg p-3">
            <p className="text-xs text-gray-500">Heart Rate</p>
            <p className="text-base font-bold text-gray-900 mt-0.5">
              {patient.heart_rate ?? '—'} <span className="text-xs font-normal text-gray-500">bpm</span>
            </p>
          </div>
        </div>
      </div>

      {/* Active medications */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Active Medications</h3>
        {medications.length === 0 ? (
          <p className="text-sm text-gray-500">No active medications.</p>
        ) : (
          <div className="space-y-2">
            {medications.map((rx) => (
              <div
                key={rx.id}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{rx.medication_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {rx.dosage} · {rx.frequency}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                >
                  Active
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit profile form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Edit Profile</h3>

        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            placeholder="Your full name"
            {...register('full_name')}
            className={errors.full_name ? 'border-red-400' : ''}
          />
          {errors.full_name && (
            <p className="text-xs text-red-500">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            placeholder="+1 (555) 000-0000"
            {...register('phone')}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white"
        >
          {isSubmitting ? 'Saving…' : 'Save Changes'}
        </Button>
      </form>

      {/* Logout */}
      <button
        onClick={handleSignOut}
        className="border border-red-300 text-red-600 hover:bg-red-50 rounded-lg w-full py-2 text-sm font-medium transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
