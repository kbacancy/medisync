import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import NetInfo from '@react-native-community/netinfo';
import { WifiOff } from 'lucide-react-native';
import { syncAll } from '../../lib/offline/syncQueue';

export function OfflineBanner() {
  const translateY = useSharedValue(-60);
  const isOfflineRef = useRef(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable);
      if (offline && !isOfflineRef.current) {
        isOfflineRef.current = true;
        translateY.value = withTiming(0, { duration: 300 });
      } else if (!offline && isOfflineRef.current) {
        isOfflineRef.current = false;
        translateY.value = withTiming(-60, { duration: 300 });
        syncAll().catch(console.error);
      }
    });
    return unsub;
  }, [translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.banner, animStyle]}>
      <WifiOff size={16} color="#92400E" />
      <Text style={styles.text}>
        You're offline — changes will sync when connected
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#FEF3C7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
});
