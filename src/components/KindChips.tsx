import { StyleSheet, Text, View } from 'react-native';
import {
  KIND_GROUPS,
  PART_KINDS,
  type PartKind,
} from '../types';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './AnimatedPressable';

export function KindChips({
  value,
  onChange,
  compact = false,
}: {
  value: PartKind;
  onChange: (kind: PartKind) => void;
  compact?: boolean;
}) {
  return (
    <View style={styles.wrap}>
      {KIND_GROUPS.map((group) => (
        <View key={group.id} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          <View style={styles.row}>
            {group.kinds.map((id) => {
              const meta = PART_KINDS.find((k) => k.id === id);
              if (!meta) return null;
              const active = value === id;
              return (
                <AnimatedPressable
                  key={id}
                  style={[styles.chip, group.kinds.length > 3 && styles.chipWide, active && styles.chipActive]}
                  onPress={() => onChange(id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                    {compact ? meta.short : meta.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10, gap: 8 },
  group: { gap: 6 },
  groupLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 72,
    backgroundColor: colors.chip,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  chipWide: { flexBasis: '47%', flexGrow: 1 },
  chipActive: { backgroundColor: colors.accent },
  chipText: { fontWeight: '800', color: colors.ink, fontSize: 13 },
  chipTextActive: { color: '#fff' },
});
