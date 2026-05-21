import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Button } from '../ui/Button';

const REASONS = [
  'Side effects',
  'Out of stock',
  'Feeling better',
  'Forgot',
  'Doctor advised',
  'Other',
];

interface SkipReasonSheetProps {
  visible: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function SkipReasonSheet({
  visible,
  onConfirm,
  onCancel,
}: SkipReasonSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%'], []);
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState('');

  React.useEffect(() => {
    if (visible) {
      setSelected(null);
      setCustom('');
      sheetRef.current?.expand();
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const handleConfirm = () => {
    const reason = selected === 'Other' ? custom.trim() || 'Other' : selected;
    if (!reason) return;
    onConfirm(reason);
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
        <Text style={styles.title}>Why are you skipping?</Text>

        <View style={styles.pillsRow}>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r}
              onPress={() => setSelected(r)}
              style={[styles.pill, selected === r && styles.pillSelected]}
            >
              <Text
                style={[
                  styles.pillText,
                  selected === r && styles.pillTextSelected,
                ]}
              >
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selected === 'Other' && (
          <TextInput
            style={styles.input}
            placeholder="Describe your reason..."
            placeholderTextColor="#9CA3AF"
            value={custom}
            onChangeText={setCustom}
            multiline
          />
        )}

        <View style={styles.actions}>
          <Button
            label="Confirm"
            onPress={handleConfirm}
            variant="primary"
            disabled={!selected}
            style={styles.confirmBtn}
          />
          <Button
            label="Cancel"
            onPress={onCancel}
            variant="ghost"
            style={styles.cancelBtn}
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
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    minHeight: 44,
    justifyContent: 'center',
  },
  pillSelected: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  pillText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  pillTextSelected: {
    color: '#991B1B',
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    marginTop: 24,
    gap: 8,
  },
  confirmBtn: {
    width: '100%',
  },
  cancelBtn: {
    width: '100%',
  },
});
