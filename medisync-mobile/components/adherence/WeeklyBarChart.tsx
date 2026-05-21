import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Text as SvgText, Line } from 'react-native-svg';

interface DayData {
  day: string;
  taken: number;
  skipped: number;
  missed: number;
}

interface WeeklyBarChartProps {
  data: DayData[];
}

const BAR_COLORS = {
  taken: '#0D6B5E',
  skipped: '#F59E0B',
  missed: '#EF4444',
};

const CHART_HEIGHT = 160;
const LABEL_HEIGHT = 24;
const Y_AXIS_WIDTH = 28;
const BAR_GROUP_GAP = 6;
const BAR_GAP = 2;
const CORNER_RADIUS = 3;

export function WeeklyBarChart({ data }: WeeklyBarChartProps) {
  const screenWidth = Dimensions.get('window').width - 64; // card padding
  const chartWidth = screenWidth - Y_AXIS_WIDTH;
  const totalHeight = CHART_HEIGHT + LABEL_HEIGHT;

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.taken, d.skipped, d.missed]),
    4
  );

  const groupWidth = chartWidth / data.length;
  const barWidth = Math.max(
    4,
    Math.floor((groupWidth - BAR_GROUP_GAP * 2 - BAR_GAP * 2) / 3)
  );

  function barX(groupIdx: number, barIdx: number): number {
    const groupStart = Y_AXIS_WIDTH + groupIdx * groupWidth + BAR_GROUP_GAP;
    return groupStart + barIdx * (barWidth + BAR_GAP);
  }

  function barHeight(value: number): number {
    return (value / maxVal) * CHART_HEIGHT;
  }

  function barY(value: number): number {
    return CHART_HEIGHT - barHeight(value);
  }

  // Y-axis tick values
  const ticks = [0, Math.ceil(maxVal / 2), maxVal];

  return (
    <View style={styles.container}>
      <Svg width={screenWidth} height={totalHeight}>
        {/* Y-axis grid lines & labels */}
        {ticks.map((tick) => {
          const y = CHART_HEIGHT - (tick / maxVal) * CHART_HEIGHT;
          return (
            <React.Fragment key={tick}>
              <Line
                x1={Y_AXIS_WIDTH}
                y1={y}
                x2={screenWidth}
                y2={y}
                stroke="#F3F4F6"
                strokeWidth={1}
              />
              <SvgText
                x={Y_AXIS_WIDTH - 4}
                y={y + 4}
                fontSize={10}
                fill="#9CA3AF"
                textAnchor="end"
              >
                {tick}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Bars */}
        {data.map((d, gi) => {
          const bars = [
            { key: 'taken', value: d.taken, color: BAR_COLORS.taken },
            { key: 'skipped', value: d.skipped, color: BAR_COLORS.skipped },
            { key: 'missed', value: d.missed, color: BAR_COLORS.missed },
          ] as const;

          return (
            <React.Fragment key={gi}>
              {bars.map((bar, bi) => {
                const h = barHeight(bar.value);
                if (h < 1) return null;
                return (
                  <Rect
                    key={bar.key}
                    x={barX(gi, bi)}
                    y={barY(bar.value)}
                    width={barWidth}
                    height={h}
                    fill={bar.color}
                    rx={CORNER_RADIUS}
                    ry={CORNER_RADIUS}
                  />
                );
              })}

              {/* X-axis label */}
              <SvgText
                x={Y_AXIS_WIDTH + gi * groupWidth + groupWidth / 2}
                y={CHART_HEIGHT + 16}
                fontSize={11}
                fill="#6B7280"
                textAnchor="middle"
              >
                {d.day}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>

      <View style={styles.legend}>
        <LegendItem color={BAR_COLORS.taken} label="Taken" />
        <LegendItem color={BAR_COLORS.skipped} label="Skipped" />
        <LegendItem color={BAR_COLORS.missed} label="Missed" />
      </View>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  legend: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
});
