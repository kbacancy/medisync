import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Button } from '../ui/Button';

const SNOOZE_OPTIONS = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '60 min' },
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface SnoozeSheetProps {
  visible: boolean;
  onConfirm: (snoozeUntil: Date) => void;
  onCancel: () => void;
}

export function SnoozeSheet({ visible, onConfirm, onCancel }: SnoozeSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%'], []);
  const [selected, setSelected] = useState<number | null>(null);

  React.useEffect(() => {
    if (visible) {
      setSelected(null);
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleConfirm = () => {
    if (selected === null) return;
    const snoozeUntil = new Date();
    snoozeUntil.setMinutes(snoozeUntil.getMinutes() + selected);
    onConfirm(snoozeUntil);
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        onPress={onCancel}
      />
    ),
    [onCancel]
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onCancel}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.indicator}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Snooze reminder</Text>

        <View style={styles.options}>
          {SNOOZE_OPTIONS.map(({ minutes, label }) => {
            const snoozeTime = new Date();
            snoozeTime.setMinutes(snoozeTime.getMinutes() + minutes);

            return (
              <TouchableOpacity
                key={minutes}
                onPress={() => setSelected(minutes)}
                style={[
                  styles.option,
                  selected === minutes && styles.optionSelected,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    selected === minutes && styles.optionLabelSelected,
                  ]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.optionTime,
                    selected === minutes && styles.optionTimeSelected,
                  ]}
                >
                  Remind at {formatTime(snoozeTime)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actions}>
          <Button
            label="Set Reminder"
            onPress={handleConfirm}
            variant="primary"
            disabled={selected === null}
            style={{ width: '100%' }}
          />
          <Button
            label="Cancel"
            onPress={onCancel}
            variant="ghost"
            style={{ width: '100%' }}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: '#D1D5DB',
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  options: {
    gap: 10,
  },
  option: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#fff',
    minHeight: 44,
  },
  optionSelected: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  optionLabelSelected: {
    color: '#92400E',
  },
  optionTime: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  optionTimeSelected: {
    color: '#B45309',
  },
  actions: {
    marginTop: 20,
    gap: 8,
  },
});
