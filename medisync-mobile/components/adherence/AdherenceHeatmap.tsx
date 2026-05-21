import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { DoseStatus } from '../../types';

interface HeatmapDay {
  date: string;
  status: DoseStatus | 'none';
}

interface AdherenceHeatmapProps {
  days: HeatmapDay[];
}

const STATUS_COLOR: Record<DoseStatus | 'none', string> = {
  taken: '#0D6B5E',
  missed: '#EF4444',
  skipped: '#F59E0B',
  snoozed: '#F59E0B',
  pending: '#E5E7EB',
  late: '#F59E0B',
  none: '#E5E7EB',
};

function chunkIntoWeeks(days: HeatmapDay[]): HeatmapDay[][] {
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

function monthLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' });
}

export function AdherenceHeatmap({ days }: AdherenceHeatmapProps) {
  const weeks = chunkIntoWeeks(days);

  return (
    <View style={styles.wrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={styles.grid}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekCol}>
                <Text style={styles.monthLabel}>
                  {wi === 0 || monthLabel(week[0].date) !== monthLabel(weeks[wi - 1]?.[0]?.date ?? '')
                    ? monthLabel(week[0].date)
                    : ''}
                </Text>
                {week.map((day, di) => {
                  const dayNum = new Date(day.date).getDate();
                  const bgColor = STATUS_COLOR[day.status];
                  const isDark = day.status === 'taken' || day.status === 'missed';
                  return (
                    <View
                      key={di}
                      style={[styles.square, { backgroundColor: bgColor }]}
                    >
                      <Text
                        style={[styles.dayNum, { color: isDark ? '#fff' : '#6B7280' }]}
                      >
                        {dayNum}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.legend}>
            <LegendSquare color="#0D6B5E" label="Taken" />
            <LegendSquare color="#EF4444" label="Missed" />
            <LegendSquare color="#F59E0B" label="Skipped" />
            <LegendSquare color="#E5E7EB" label="None" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function LegendSquare({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSquare, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    gap: 4,
  },
  weekCol: {
    gap: 4,
  },
  monthLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    height: 14,
    textAlign: 'center',
  },
  square: {
    width: 32,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 10,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingLeft: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSquare: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
});
