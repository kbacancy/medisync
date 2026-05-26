import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '../../lib/supabase/client';

const schema = z
  .object({
    full_name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterScreen() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
  });

  const onSubmit = async (data: FormData) => {
    setAuthError(null);

    // Pass full_name + role in user_metadata so the handle_new_user DB trigger
    // creates the profiles row with correct data before any JS code runs.
    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email.trim().toLowerCase(),
      password: data.password,
      options: {
        data: {
          full_name: data.full_name.trim(),
          role: 'patient',
        },
      },
    });

    if (error) {
      setAuthError(error.message);
      return;
    }

    if (signUpData.user) {
      // The trigger may have already created the profile; ignore 23505 conflicts.
      const { error: profileError } = await supabase.from('profiles').insert({
        id: signUpData.user.id,
        email: data.email.trim().toLowerCase(),
        full_name: data.full_name.trim(),
        role: 'patient',
      });

      if (profileError && profileError.code !== '23505') {
        setAuthError('Account created but profile setup failed. Please contact support.');
        return;
      }

      // Create the patients row required for all medical data queries.
      // The patients_self_insert RLS policy allows this for patient-role profiles.
      // Ignore 23505 — a clinician may have already pre-created the row.
      const { error: patientError } = await supabase.from('patients').insert({
        profile_id: signUpData.user.id,
      });

      if (patientError && patientError.code !== '23505') {
        setAuthError('Account created but patient record setup failed. Please contact support.');
        return;
      }
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successEmoji}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Account Created!</Text>
        <Text style={styles.successMsg}>
          Check your email to confirm your account, then sign in.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
          style={styles.signInBtn}
        >
          <Text style={styles.signInBtnText}>Go to Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>M</Text>
          </View>
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.tagline}>Join MediSync as a patient</Text>
        </View>

        <View style={styles.card}>
          {([
            { name: 'full_name', label: 'Full Name', placeholder: 'Jane Smith', keyboard: 'default', capitalize: 'words' },
            { name: 'email', label: 'Email', placeholder: 'you@example.com', keyboard: 'email-address', capitalize: 'none' },
          ] as const).map(({ name, label, placeholder, keyboard, capitalize }) => (
            <View key={name} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors[name] && styles.inputError]}
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={keyboard as any}
                    autoCapitalize={capitalize as any}
                    autoCorrect={false}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting}
                  />
                )}
              />
              {errors[name] && (
                <Text style={styles.errorText}>{errors[name]?.message}</Text>
              )}
            </View>
          ))}

          {([
            { name: 'password' as const, label: 'Password', show: showPass, setShow: setShowPass },
            { name: 'confirm_password' as const, label: 'Confirm Password', show: showConfirm, setShow: setShowConfirm },
          ]).map(({ name, label, show, setShow }) => (
            <View key={name} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <Controller
                control={control}
                name={name}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View style={styles.passwordRow}>
                    <TextInput
                      style={[styles.input, styles.passwordInput, errors[name] && styles.inputError]}
                      placeholder="••••••••"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!show}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isSubmitting}
                    />
                    <TouchableOpacity
                      onPress={() => setShow((v) => !v)}
                      style={styles.eyeBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {show ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors[name] && (
                <Text style={styles.errorText}>{errors[name]?.message}</Text>
              )}
            </View>
          ))}

          {authError && (
            <View style={styles.authErrorBox}>
              <Text style={styles.authErrorText}>{authError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={styles.loginLink}
        >
          <Text style={styles.loginText}>
            Already have an account?{' '}
            <Text style={styles.loginTextBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F4F6F8' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#0D6B5E', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  appName: { fontSize: 24, fontWeight: '800', color: '#111827' },
  tagline: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#111827', backgroundColor: '#F9FAFB', minHeight: 44,
  },
  inputError: { borderColor: '#EF4444' },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  authErrorBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, marginBottom: 16 },
  authErrorText: { color: '#991B1B', fontSize: 13 },
  submitBtn: {
    backgroundColor: '#0D6B5E', borderRadius: 10, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginLink: { alignItems: 'center', marginTop: 20, minHeight: 44, justifyContent: 'center' },
  loginText: { fontSize: 14, color: '#6B7280' },
  loginTextBold: { color: '#0D6B5E', fontWeight: '700' },
  successContainer: {
    flex: 1, backgroundColor: '#F4F6F8', alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  successEmoji: { fontSize: 36, color: '#065F46' },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  successMsg: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  signInBtn: {
    marginTop: 32, backgroundColor: '#0D6B5E', borderRadius: 10,
    paddingHorizontal: 32, paddingVertical: 14, minHeight: 48,
  },
  signInBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
