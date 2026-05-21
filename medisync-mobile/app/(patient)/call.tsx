import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import {
  requestCameraPermissionsAsync,
  requestMicrophonePermissionsAsync,
} from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  ArrowLeft,
  Loader,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type CallState = 'permissions' | 'connecting' | 'waiting' | 'live' | 'reconnecting' | 'ended' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export default function CallScreen() {
  useKeepAwake();

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    appointmentId: string;
    roomUrl: string;
    roomName: string;
    doctorName: string;
  }>();

  const { appointmentId, roomUrl, roomName, doctorName } = params;

  const [callState, setCallState] = useState<CallState>('permissions');
  const [elapsed, setElapsed] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [remoteParticipant, setRemoteParticipant] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [localParticipant, setLocalParticipant] = useState<any>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Draggable local PiP
  const pipOffsetX = useSharedValue(0);
  const pipOffsetY = useSharedValue(0);
  const pipStartX = useSharedValue(0);
  const pipStartY = useSharedValue(0);

  const pipGesture = Gesture.Pan()
    .onStart(() => {
      pipStartX.value = pipOffsetX.value;
      pipStartY.value = pipOffsetY.value;
    })
    .onUpdate((e) => {
      pipOffsetX.value = pipStartX.value + e.translationX;
      pipOffsetY.value = pipStartY.value + e.translationY;
    })
    .onEnd(() => {
      pipOffsetX.value = withSpring(pipOffsetX.value);
      pipOffsetY.value = withSpring(pipOffsetY.value);
    });

  const pipAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: pipOffsetX.value },
      { translateY: pipOffsetY.value },
    ],
  }));

  // ── Request permissions + initialise call ──────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1. Camera + microphone permissions
        const [cam, mic] = await Promise.all([
          requestCameraPermissionsAsync(),
          requestMicrophonePermissionsAsync(),
        ]);

        if (!cam.granted || !mic.granted) {
          Alert.alert(
            'Permissions Required',
            'Camera and microphone access are required for video calls. Please enable them in Settings.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }

        if (cancelled) return;
        setCallState('connecting');

        // 2. Get the patient's user ID and fetch a token
        const { data: sessionData } = await supabase.auth.getUser();
        const userId = sessionData.user?.id;
        if (!userId) {
          throw new Error('Not authenticated');
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', userId)
          .single();
        const userName = profileData?.full_name ?? 'Patient';

        const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
        const tokenRes = await fetch(`${apiUrl}/api/telehealth/get-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName,
            userId,
            userName,
            isOwner: false,
          }),
        });
        if (!tokenRes.ok) throw new Error('Failed to get meeting token');
        const { token } = await tokenRes.json();

        if (cancelled) return;

        // 3. Initialise Daily.co call object — skip when using the dev mock
        if (roomUrl?.startsWith('https://mock.daily.co/')) {
          setCallState('waiting');
          return;
        }

        const DailyIframe = (await import('@daily-co/react-native-daily-js')).default;
        if (cancelled) return;

        const co = DailyIframe.createCallObject();
        coRef.current = co;

        // ── Events ────────────────────────────────────────────────────────
        co.on('joined-meeting', () => {
          if (cancelled) return;
          setCallState('waiting');
          const local = co.participants()?.local;
          if (local) setLocalParticipant(local);
        });

        co.on('participant-joined', (evt: { participant: Record<string, unknown> }) => {
          if (cancelled || evt?.participant?.local) return;
          setRemoteParticipant(evt.participant);
          setCallState('live');
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
          }
        });

        co.on('participant-updated', (evt: { participant: Record<string, unknown> }) => {
          if (cancelled) return;
          const p = evt?.participant;
          if (!p) return;
          if (p.local) {
            setLocalParticipant({ ...p });
          } else {
            setRemoteParticipant({ ...p });
          }
        });

        co.on('participant-left', (evt: { participant: Record<string, unknown> }) => {
          if (cancelled || evt?.participant?.local) return;
          setRemoteParticipant(null);
          setCallState('waiting');
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        });

        co.on('call-instance-destroyed', () => {
          if (cancelled) return;
          setCallState('ended');
        });

        co.on('error', (evt: { errorMsg?: string }) => {
          if (cancelled) return;
          setCallState('error');
          setErrorMsg(evt?.errorMsg ?? 'An error occurred during the call');
        });

        await co.join({ url: roomUrl, token });
      } catch (err) {
        if (cancelled) return;
        setCallState('error');
        setErrorMsg(err instanceof Error ? err.message : 'Failed to connect');
      }
    }

    init();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      coRef.current?.destroy();
      coRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Controls ───────────────────────────────────────────────────────────────

  const toggleMic = useCallback(() => {
    const co = coRef.current;
    if (!co) return;
    const next = !micOn;
    co.setLocalAudio(next);
    setMicOn(next);
  }, [micOn]);

  const toggleCamera = useCallback(() => {
    const co = coRef.current;
    if (!co) return;
    const next = !cameraOn;
    co.setLocalVideo(next);
    setCameraOn(next);
  }, [cameraOn]);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn((v) => !v);
    // Audio output routing is platform-specific; handled natively by Daily
  }, []);

  const handleEndCall = useCallback(async () => {
    try {
      await coRef.current?.leave();
    } catch {
      // ignore
    }
    setCallState('ended');
  }, []);

  const handleBack = useCallback(() => {
    if (callState === 'live' || callState === 'waiting') {
      Alert.alert(
        'Leave Call?',
        'Are you sure you want to leave this video call?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: handleEndCall },
        ]
      );
    } else {
      router.back();
    }
  }, [callState, handleEndCall, router]);

  // ── Call ended screen ──────────────────────────────────────────────────────

  if (callState === 'ended') {
    return (
      <View style={[styles.root, styles.centeredContent]}>
        <StatusBar style="light" hidden />
        <View style={styles.endedIcon}>
          <PhoneOff size={32} color="#fff" />
        </View>
        <Text style={styles.endedTitle}>Call ended</Text>
        <Text style={styles.endedSubtitle}>
          Your consultation with Dr. {doctorName} is complete
        </Text>
        <TouchableOpacity
          style={styles.returnBtn}
          onPress={() => router.replace('/(patient)/appointments')}
        >
          <Text style={styles.returnBtnText}>Return to Appointments</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Error screen ───────────────────────────────────────────────────────────

  if (callState === 'error') {
    return (
      <View style={[styles.root, styles.centeredContent]}>
        <StatusBar style="light" hidden />
        <View style={styles.errorIcon}>
          <Text style={styles.errorBang}>!</Text>
        </View>
        <Text style={styles.errorTitle}>Connection failed</Text>
        <Text style={styles.errorMsg}>{errorMsg}</Text>
        <TouchableOpacity style={styles.returnBtn} onPress={() => router.back()}>
          <Text style={styles.returnBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main call screen ───────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DailyMediaView = coRef.current
    ? require('@daily-co/react-native-daily-js').DailyMediaView
    : null;

  const remoteVideoTrack =
    remoteParticipant?.tracks?.video?.persistentTrack ?? null;
  const remoteAudioTrack =
    remoteParticipant?.tracks?.audio?.persistentTrack ?? null;
  const localVideoTrack =
    localParticipant?.tracks?.video?.persistentTrack ?? null;

  function formatTime(s: number) {
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />

      {/* Remote video — full screen */}
      {callState === 'live' && DailyMediaView && remoteVideoTrack ? (
        <DailyMediaView
          videoTrack={remoteVideoTrack}
          audioTrack={remoteAudioTrack}
          style={StyleSheet.absoluteFill}
          objectFit="cover"
          mirror={false}
          zOrder={0}
        />
      ) : (
        /* Waiting / connecting overlay */
        <View style={[StyleSheet.absoluteFill, styles.waitingOverlay]}>
          <View style={styles.doctorAvatarRing}>
            <View style={styles.doctorAvatar}>
              <Text style={styles.doctorInitials}>
                {doctorName
                  ?.split(' ')
                  .map((w: string) => w[0])
                  .slice(0, 2)
                  .join('') ?? 'DR'}
              </Text>
            </View>
          </View>
          {callState === 'connecting' || callState === 'permissions' ? (
            <>
              <Loader size={20} color="rgba(255,255,255,0.5)" />
              <Text style={styles.waitingText}>
                Connecting to Dr. {doctorName}
                {'.'.repeat(1 + (elapsed % 3))}
              </Text>
            </>
          ) : (
            <Text style={styles.waitingText}>
              Waiting for Dr. {doctorName} to join…
            </Text>
          )}
        </View>
      )}

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.doctorNameText}>Dr. {doctorName}</Text>
          {callState === 'live' && (
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTimer}>{formatTime(elapsed)}</Text>
            </View>
          )}
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Local PiP — draggable, bottom-right */}
      <GestureDetector gesture={pipGesture}>
        <Animated.View
          style={[
            styles.localPip,
            { bottom: insets.bottom + 104, right: 16 },
            pipAnimStyle,
          ]}
        >
          {DailyMediaView && localVideoTrack && cameraOn ? (
            <DailyMediaView
              videoTrack={localVideoTrack}
              audioTrack={null}
              style={{ flex: 1 }}
              objectFit="cover"
              mirror
              zOrder={1}
            />
          ) : (
            <View style={styles.localPipOff}>
              <VideoOff size={16} color="rgba(255,255,255,0.4)" />
            </View>
          )}
        </Animated.View>
      </GestureDetector>

      {/* Control bar */}
      <View style={[styles.controlBar, { paddingBottom: insets.bottom + 16 }]}>
        {/* Mic */}
        <TouchableOpacity
          onPress={toggleMic}
          style={[styles.ctrlBtn, !micOn && styles.ctrlBtnRed]}
        >
          {micOn ? (
            <Mic size={22} color="#fff" />
          ) : (
            <MicOff size={22} color="#fff" />
          )}
        </TouchableOpacity>

        {/* Camera */}
        <TouchableOpacity
          onPress={toggleCamera}
          style={[styles.ctrlBtn, !cameraOn && styles.ctrlBtnRed]}
        >
          {cameraOn ? (
            <VideoIcon size={22} color="#fff" />
          ) : (
            <VideoOff size={22} color="#fff" />
          )}
        </TouchableOpacity>

        {/* End call */}
        <TouchableOpacity onPress={handleEndCall} style={styles.endCallBtn}>
          <PhoneOff size={26} color="#fff" />
        </TouchableOpacity>

        {/* Speaker */}
        <TouchableOpacity
          onPress={toggleSpeaker}
          style={[styles.ctrlBtn, !speakerOn && styles.ctrlBtnRed]}
        >
          {speakerOn ? (
            <Volume2 size={22} color="#fff" />
          ) : (
            <VolumeX size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a2332',
  },
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  waitingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a2332',
    gap: 16,
  },
  doctorAvatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  doctorAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doctorInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  waitingText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topCenter: {
    flex: 1,
    alignItems: 'center',
  },
  doctorNameText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  liveTimer: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  localPip: {
    position: 'absolute',
    width: 90,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: '#374151',
    zIndex: 20,
  },
  localPipOff: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
  },
  controlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBtnRed: {
    backgroundColor: 'rgba(239,68,68,0.75)',
  },
  endCallBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  endedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  endedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  endedSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  returnBtn: {
    backgroundColor: '#0D6B5E',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  returnBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorBang: {
    fontSize: 36,
    fontWeight: '900',
    color: '#f87171',
    lineHeight: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  errorMsg: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
});
