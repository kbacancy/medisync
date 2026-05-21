import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
  opacity,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
  opacity: Animated.SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(opacity.value, [0, 1], [0.4, 0.9]),
  }));

  return (
    <Animated.View
      style={[
        styles.block,
        { width: width as number, height, borderRadius },
        animatedStyle,
      ]}
    />
  );
}

function usePulse() {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);
  return opacity;
}

export function DoseCardSkeleton() {
  const opacity = usePulse();
  return (
    <View style={styles.doseCard}>
      <SkeletonBlock width={48} height={48} borderRadius={24} opacity={opacity} />
      <View style={styles.doseContent}>
        <SkeletonBlock width={160} height={16} opacity={opacity} />
        <View style={{ height: 6 }} />
        <SkeletonBlock width={100} height={12} opacity={opacity} />
        <View style={{ height: 6 }} />
        <SkeletonBlock width={80} height={12} opacity={opacity} />
      </View>
      <SkeletonBlock width={72} height={36} borderRadius={8} opacity={opacity} />
    </View>
  );
}

export function StatSkeleton() {
  const opacity = usePulse();
  return (
    <View style={styles.stat}>
      <SkeletonBlock width={80} height={80} borderRadius={40} opacity={opacity} />
      <View style={{ height: 12 }} />
      <SkeletonBlock width={120} height={14} opacity={opacity} />
    </View>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  const opacity = usePulse();
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.listItem}>
          <SkeletonBlock width={44} height={44} borderRadius={22} opacity={opacity} />
          <View style={styles.listContent}>
            <SkeletonBlock width={200} height={14} opacity={opacity} />
            <View style={{ height: 6 }} />
            <SkeletonBlock width={140} height={12} opacity={opacity} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: '#E5E7EB',
  },
  doseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 8,
  },
  doseContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  stat: {
    alignItems: 'center',
    padding: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 8,
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
});
