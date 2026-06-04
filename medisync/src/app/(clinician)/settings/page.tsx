'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Camera } from 'lucide-react';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(6, 'Required'),
    new_password: z.string().min(8, 'Minimum 8 characters'),
    confirm_password: z.string().min(8, 'Required'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="block text-xs font-medium"
        style={{ color: 'var(--ms-text-secondary)' }}
      >
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs" style={{ color: 'var(--ms-text-tertiary)' }}>
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--ms-critical)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#DC2626', '#D97706', '#3B82F6', '#16A34A'];

  if (!password) return null;

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-colors duration-200"
            style={{
              backgroundColor: i <= score ? colors[score] : 'var(--ms-border)',
            }}
          />
        ))}
      </div>
      <span className="text-xs font-medium" style={{ color: colors[score] }}>
        {labels[score]}
      </span>
    </div>
  );
}

// ─── iOS-style toggle ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        flexShrink: 0,
        width: 51,
        height: 31,
        borderRadius: 9999,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        outline: 'none',
        transition: 'background-color 0.25s ease',
        backgroundColor: checked ? 'var(--ms-primary)' : '#e5e5ea',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 27,
          height: 27,
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 6px rgba(0,0,0,0.28)',
          transition: 'transform 0.25s ease',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          display: 'block',
        }}
      />
    </button>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'notifications' | 'security';

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'security', label: 'Security' },
  ];

  return (
    <div
      className="flex gap-0"
      style={{ borderBottom: '1px solid var(--ms-border)' }}
    >
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="px-4 py-2 text-sm font-medium transition-colors duration-150 relative"
          style={{
            color: active === id ? 'var(--ms-primary)' : 'var(--ms-text-secondary)',
            height: 40,
          }}
        >
          {label}
          {active === id && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
              style={{ backgroundColor: 'var(--ms-primary)' }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="bg-white rounded-xl p-6 space-y-5"
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
    >
      <h3
        className="text-sm font-medium"
        style={{ color: 'var(--ms-text-secondary)' }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({
  userId,
  defaultValues,
  email,
  initialAvatarUrl,
}: {
  userId: string;
  defaultValues: ProfileForm;
  email: string;
  initialAvatarUrl: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({ resolver: zodResolver(profileSchema), defaultValues });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('File must be under 2 MB.'); return; }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Profile photo updated.');
    } catch {
      toast.error('Failed to upload photo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values: ProfileForm) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: values.full_name, phone: values.phone ?? null })
      .eq('id', userId);
    error ? toast.error('Failed to update profile.') : toast.success('Profile updated.');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card title="Personal Information">
        {/* Avatar upload */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative size-[72px] rounded-full flex items-center justify-center shrink-0 cursor-pointer group overflow-hidden"
            style={{
              border: '2px dashed var(--ms-border)',
              backgroundColor: 'var(--ms-surface-raised)',
              color: 'var(--ms-text-tertiary)',
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="size-full object-cover rounded-full" />
            ) : (
              <Camera className="size-6" />
            )}
            <div
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            >
              {uploading ? (
                <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="size-5 text-white" />
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--ms-text-primary)' }}>
              Profile photo
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ms-text-tertiary)' }}>
              JPG, PNG or GIF · max 2 MB
            </p>
          </div>
        </div>

        {/* Name fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" error={errors.full_name?.message}>
            <Input
              placeholder="Your full name"
              {...register('full_name')}
              className={cn('h-9 text-sm', errors.full_name ? 'border-red-400' : '')}
              style={{ borderRadius: 8 }}
            />
          </Field>
          <Field label="Phone Number">
            <Input
              placeholder="+1 (555) 000-0000"
              {...register('phone')}
              className="h-9 text-sm"
              style={{ borderRadius: 8 }}
            />
          </Field>
        </div>

        {/* Email read-only */}
        <Field label="Email Address" hint="Contact support to change your email.">
          <div
            className="h-9 flex items-center gap-2 px-3 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--ms-surface-raised)',
              border: '1px solid var(--ms-border)',
              color: 'var(--ms-text-secondary)',
            }}
          >
            <Lock className="size-3.5 shrink-0" style={{ color: 'var(--ms-text-tertiary)' }} />
            <span className="truncate">{email}</span>
          </div>
        </Field>

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 text-sm font-medium text-white px-4"
            style={{
              backgroundColor: 'var(--ms-primary)',
              borderRadius: 8,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#085e47'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--ms-primary)'; }}
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Card>
    </form>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

type PrefKey =
  | 'email_alerts' | 'push_alerts'
  | 'ddi_warnings' | 'critical_alerts'
  | 'appointment_reminders' | 'schedule_changes'
  | 'system_updates' | 'maintenance';

const notifGroups: {
  heading: string;
  items: { key: PrefKey; label: string; description: string }[];
}[] = [
  {
    heading: 'Clinical',
    items: [
      { key: 'ddi_warnings', label: 'Drug-Drug Interaction Warnings', description: 'Notify on potential drug interaction risks.' },
      { key: 'critical_alerts', label: 'Critical Patient Alerts', description: 'Immediate alerts for patients in critical condition.' },
      { key: 'push_alerts', label: 'Push Notifications', description: 'Real-time device notifications for urgent events.' },
    ],
  },
  {
    heading: 'Scheduling',
    items: [
      { key: 'appointment_reminders', label: 'Appointment Reminders', description: '15-minute reminder before each appointment.' },
      { key: 'schedule_changes', label: 'Schedule Changes', description: 'Notify when appointments are modified or cancelled.' },
      { key: 'email_alerts', label: 'Email Digest', description: 'Daily summary of patient updates via email.' },
    ],
  },
  {
    heading: 'System',
    items: [
      { key: 'system_updates', label: 'Product Updates', description: 'New features and improvements.' },
      { key: 'maintenance', label: 'Maintenance Windows', description: 'Scheduled downtime notifications.' },
    ],
  },
];

const defaultPrefs: Record<PrefKey, boolean> = {
  email_alerts: true,
  push_alerts: true,
  ddi_warnings: true,
  critical_alerts: true,
  appointment_reminders: true,
  schedule_changes: false,
  system_updates: true,
  maintenance: false,
};

function NotificationsTab({ userId }: { userId: string }) {
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>(defaultPrefs);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', userId)
        .single();
      if (data?.notification_prefs) {
        setPrefs({ ...defaultPrefs, ...(data.notification_prefs as Record<PrefKey, boolean>) });
      }
    })();
  }, [userId]);

  const toggle = (key: PrefKey) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const savePrefs = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ notification_prefs: prefs })
      .eq('id', userId);
    setSaving(false);
    error ? toast.error('Failed to save preferences.') : toast.success('Preferences saved.');
  };

  return (
    <div className="space-y-5">
      {notifGroups.map(({ heading, items }) => (
        <Card key={heading} title={heading}>
          <div className="space-y-0">
            {items.map(({ key, label, description }, i) => (
              <div
                key={key}
                className="flex items-center justify-between py-4"
                style={i > 0 ? { borderTop: '1px solid var(--ms-border)' } : undefined}
              >
                <div className="pr-4">
                  <p className="text-sm font-medium" style={{ color: 'var(--ms-text-primary)' }}>
                    {label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ms-text-secondary)' }}>
                    {description}
                  </p>
                </div>
                <Toggle checked={prefs[key]} onChange={() => toggle(key)} />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button
          type="button"
          disabled={saving}
          onClick={savePrefs}
          className="h-9 text-sm font-medium text-white px-4"
          style={{ backgroundColor: 'var(--ms-primary)', borderRadius: 8 }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#085e47'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--ms-primary)'; }}
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </div>
  );
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'Unknown device';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Chromium/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';

  let os = 'Unknown OS';
  if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('iPad')) os = 'iPad';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Windows NT')) os = 'Windows';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} · ${os}`;
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const newPwd = watch('new_password', '');
  const [currentDevice, setCurrentDevice] = useState('');
  const [lastSignIn, setLastSignIn] = useState('');
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    setCurrentDevice(detectDevice());
    (async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user.last_sign_in_at) {
        const d = new Date(session.user.last_sign_in_at);
        setLastSignIn(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }));
      }
    })();
  }, []);

  const onSubmit = async (values: PasswordForm) => {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.new_password });
    error ? toast.error('Failed to update password.') : (toast.success('Password updated.'), reset());
  };

  const revokeOtherSessions = async () => {
    setRevoking(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setRevoking(false);
    error ? toast.error('Failed to revoke sessions.') : toast.success('All other sessions revoked.');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card title="Change Password">
        <Field label="Current Password" error={errors.current_password?.message}>
          <Input
            type="password"
            placeholder="Enter current password"
            {...register('current_password')}
            className={cn('h-9 text-sm', errors.current_password ? 'border-red-400' : '')}
            style={{ borderRadius: 8 }}
          />
        </Field>

        <Field label="New Password" error={errors.new_password?.message}>
          <Input
            type="password"
            placeholder="Minimum 8 characters"
            {...register('new_password')}
            className={cn('h-9 text-sm', errors.new_password ? 'border-red-400' : '')}
            style={{ borderRadius: 8 }}
          />
          <PasswordStrength password={newPwd} />
        </Field>

        <Field label="Confirm New Password" error={errors.confirm_password?.message}>
          <Input
            type="password"
            placeholder="Repeat new password"
            {...register('confirm_password')}
            className={cn('h-9 text-sm', errors.confirm_password ? 'border-red-400' : '')}
            style={{ borderRadius: 8 }}
          />
        </Field>

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-9 text-sm font-medium text-white px-4"
            style={{ backgroundColor: 'var(--ms-primary)', borderRadius: 8 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#085e47'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--ms-primary)'; }}
          >
            {isSubmitting ? 'Updating…' : 'Update password'}
          </Button>
        </div>
      </Card>

      {/* Active sessions */}
      <Card title="Active Sessions">
        <div className="space-y-3">
          {/* Current session — detected dynamically */}
          <div
            className="flex items-center justify-between py-3 rounded-lg px-3"
            style={{ backgroundColor: 'var(--ms-surface-raised)' }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ms-text-primary)' }}>
                {currentDevice || 'Current browser'}
                <span
                  className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--ms-primary-light)', color: 'var(--ms-primary)' }}
                >
                  Current
                </span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ms-text-secondary)' }}>
                {lastSignIn ? `Signed in ${lastSignIn}` : 'Active now'}
              </p>
            </div>
          </div>

          {/* Revoke all other sessions */}
          <div
            className="flex items-center justify-between py-3 rounded-lg px-3"
            style={{ backgroundColor: 'var(--ms-surface-raised)' }}
          >
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ms-text-primary)' }}>
                Other devices
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ms-text-secondary)' }}>
                Sign out of all sessions except this one.
              </p>
            </div>
            <button
              type="button"
              disabled={revoking}
              className="text-xs font-medium transition-colors duration-150 disabled:opacity-50"
              style={{ color: 'var(--ms-critical)' }}
              onClick={revokeOtherSessions}
            >
              {revoking ? 'Revoking…' : 'Revoke all'}
            </button>
          </div>
        </div>
      </Card>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [defaultValues, setDefaultValues] = useState<ProfileForm>({ full_name: '', phone: '' });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email ?? '');
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, avatar_url')
        .eq('id', user.id)
        .single();
      if (profile) {
        setDefaultValues({ full_name: profile.full_name ?? '', phone: profile.phone ?? '' });
        setAvatarUrl(profile.avatar_url ?? '');
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-lg ms-skeleton" />
        <div className="h-10 w-64 rounded-lg ms-skeleton" />
        <div className="h-64 rounded-xl ms-skeleton" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2
          className="font-semibold"
          style={{ fontSize: 22, color: 'var(--ms-text-primary)', letterSpacing: '-0.02em' }}
        >
          Settings
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--ms-text-secondary)' }}>
          Manage your account, preferences, and security.
        </p>
      </div>

      <TabBar active={tab} onChange={setTab} />

      <div className="pt-2">
        {tab === 'profile' && (
          <ProfileTab userId={userId} defaultValues={defaultValues} email={email} initialAvatarUrl={avatarUrl} />
        )}
        {tab === 'notifications' && <NotificationsTab userId={userId} />}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}
