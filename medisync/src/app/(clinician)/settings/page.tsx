'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(6, 'Password must be at least 6 characters'),
    new_password: z.string().min(8, 'New password must be at least 8 characters'),
    confirm_password: z.string().min(8, 'Confirm password must be at least 8 characters'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── Toggle Switch ────────────────────────────────────────────────────────────

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none',
        checked ? 'bg-[#0D6B5E]' : 'bg-gray-200'
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          'pointer-events-none inline-block size-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

interface ProfileTabProps {
  userId: string;
  defaultValues: ProfileFormValues;
}

function ProfileTab({ userId, defaultValues }: ProfileTabProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  const onSubmit = async (values: ProfileFormValues) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: values.full_name, phone: values.phone ?? null })
      .eq('id', userId);

    if (error) {
      toast.error('Failed to update profile. Please try again.');
    } else {
      toast.success('Profile updated successfully.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>

        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input
            id="full_name"
            placeholder="Enter your full name"
            {...register('full_name')}
            className={errors.full_name ? 'border-red-400' : ''}
          />
          {errors.full_name && (
            <p className="text-sm text-red-500">{errors.full_name.message}</p>
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

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white"
          >
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    email_alerts: true,
    push_alerts: true,
    ddi_warnings: true,
    critical_alerts: true,
  });

  const togglePref = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    toast.success('Preferences saved');
  };

  const rows: { key: keyof typeof prefs; label: string; description: string }[] = [
    { key: 'email_alerts', label: 'Email Alerts', description: 'Receive patient updates and summaries via email.' },
    { key: 'push_alerts', label: 'Push Notifications', description: 'Get real-time alerts on your device.' },
    { key: 'ddi_warnings', label: 'Drug-Drug Interaction Warnings', description: 'Be notified of potential drug interaction risks.' },
    { key: 'critical_alerts', label: 'Critical Patient Alerts', description: 'Immediate alerts for patients in critical condition.' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h3 className="text-base font-semibold text-gray-900">Notification Preferences</h3>

        <div className="space-y-4 divide-y divide-gray-100">
          {rows.map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between pt-4 first:pt-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <ToggleSwitch
                checked={prefs[key]}
                onChange={() => togglePref(key)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleSave}
            className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white"
          >
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (values: PasswordFormValues) => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.new_password });

    if (error) {
      toast.error('Failed to update password. Please try again.');
    } else {
      toast.success('Password updated successfully.');
      reset();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <h3 className="text-base font-semibold text-gray-900">Change Password</h3>

        <div className="space-y-2">
          <Label htmlFor="current_password">Current Password</Label>
          <Input
            id="current_password"
            type="password"
            placeholder="Enter current password"
            {...register('current_password')}
            className={errors.current_password ? 'border-red-400' : ''}
          />
          {errors.current_password && (
            <p className="text-sm text-red-500">{errors.current_password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="new_password">New Password</Label>
          <Input
            id="new_password"
            type="password"
            placeholder="Enter new password (min 8 characters)"
            {...register('new_password')}
            className={errors.new_password ? 'border-red-400' : ''}
          />
          {errors.new_password && (
            <p className="text-sm text-red-500">{errors.new_password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm New Password</Label>
          <Input
            id="confirm_password"
            type="password"
            placeholder="Confirm new password"
            {...register('confirm_password')}
            className={errors.confirm_password ? 'border-red-400' : ''}
          />
          {errors.confirm_password && (
            <p className="text-sm text-red-500">{errors.confirm_password.message}</p>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#0D6B5E] hover:bg-[#0a5a4e] text-white"
          >
            {isSubmitting ? 'Updating…' : 'Update Password'}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [userId, setUserId] = useState<string>('');
  const [defaultValues, setDefaultValues] = useState<ProfileFormValues>({
    full_name: '',
    phone: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .single();

      if (profile) {
        setDefaultValues({
          full_name: profile.full_name ?? '',
          phone: profile.phone ?? '',
        });
      }
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-md" />
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Manage your account and preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab userId={userId} defaultValues={defaultValues} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
