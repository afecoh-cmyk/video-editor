import { createElement, type CSSProperties } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COMMON_DIAMETERS } from '../types';
import { colors, radius } from '../theme';

const webSelectStyle: CSSProperties = {
  width: '100%',
  height: 52,
  fontSize: 20,
  fontWeight: 800,
  borderRadius: 14,
  border: '2px solid #C45C26',
  backgroundColor: '#FFF1E6',
  color: '#152033',
  padding: '0 10px',
};

export function DimensionPicker({
  label,
  name,
  value,
  onSelect,
}: {
  label: string;
  name: string;
  value: string;
  onSelect: (dm: string) => void;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'web' ? (
        <View style={styles.webSelectWrap} pointerEvents="auto">
          {createElement(
            'select',
            {
              name,
              value,
              onChange: (event: { target: { value: string } }) => onSelect(event.target.value),
              style: webSelectStyle,
            },
            COMMON_DIAMETERS.map((dm) =>
              createElement('option', { key: dm, value: String(dm) }, `DM ${dm}`)
            )
          )}
        </View>
      ) : (
        <View style={styles.list}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="always">
            {COMMON_DIAMETERS.map((dm) => {
              const selected = value === String(dm);
              return (
                <Pressable
                  key={dm}
                  style={[styles.row, selected && styles.rowActive]}
                  onPress={() => onSelect(String(dm))}
                >
                  <Text style={[styles.rowText, selected && styles.rowTextActive]}>DM {dm}</Text>
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 12 },
  label: { color: colors.ink, fontWeight: '800', marginBottom: 6 },
  webSelectWrap: { height: 52, zIndex: 6 },
  list: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#fff',
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowActive: { backgroundColor: '#fff3e6' },
  rowText: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  rowTextActive: { color: colors.accent, fontWeight: '900' },
  check: { color: colors.accent, fontSize: 20, fontWeight: '900' },
});
