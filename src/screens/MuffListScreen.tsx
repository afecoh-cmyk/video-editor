import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DimensionPicker } from '../components/DimensionPicker';
import type { RootStackParamList } from '../navigation';
import {
  addPart,
  adjustPartCount,
  deletePart,
  getProject,
  listParts,
  updatePart,
} from '../storage';
import {
  formatKindDims,
  formatPartDims,
  PART_KINDS,
  partKindLabel,
  type PartEntry,
  type PartKind,
  type Project,
} from '../types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MuffList'>;

export function MuffListScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [parts, setParts] = useState<PartEntry[]>([]);
  const [kind, setKind] = useState<PartKind>('muffe');
  const [diameter, setDiameter] = useState(315);
  const [diameterTo, setDiameterTo] = useState(250);
  const [customDm, setCustomDm] = useState('');
  const [customDmTo, setCustomDmTo] = useState('');
  const [count, setCount] = useState(1);
  const [adding, setAdding] = useState(false);
  const [editTarget, setEditTarget] = useState<PartEntry | null>(null);
  const [editKind, setEditKind] = useState<PartKind>('muffe');
  const [editDm, setEditDm] = useState('');
  const [editDmTo, setEditDmTo] = useState('');
  const [editCount, setEditCount] = useState('');

  const needsSecondDm = kind === 'reduzir' || kind === 'abzweig';

  const load = useCallback(async () => {
    const p = await getProject(projectId);
    if (!p) {
      Alert.alert('Hiba', 'Projekt nem található');
      navigation.goBack();
      return;
    }
    setProject(p);
    navigation.setOptions({ title: p.baustellenort || 'Tételek' });
    setParts(await listParts(projectId));
  }, [projectId, navigation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const totals = useMemo(() => {
    const t = { total: 0, muffe: 0, reduzir: 0, abzweig: 0 };
    for (const p of parts) {
      t.total += p.count;
      t[p.kind] += p.count;
    }
    return t;
  }, [parts]);

  const resolvedDm = customDm.trim() ? Number(customDm) : diameter;
  const resolvedDmTo = customDmTo.trim() ? Number(customDmTo) : diameterTo;

  const onAdd = async () => {
    if (!Number.isFinite(resolvedDm) || resolvedDm <= 0) {
      Alert.alert('Hibás DM', 'Adj meg érvényes átmérőt.');
      return;
    }
    if (needsSecondDm && (!Number.isFinite(resolvedDmTo) || resolvedDmTo <= 0)) {
      Alert.alert('Hibás 2. DM', kind === 'reduzir' ? 'Add meg a cél DM-et (→).' : 'Add meg az Abzweig DM-et.');
      return;
    }
    if (count <= 0) {
      Alert.alert('Hibás darabszám', 'A Stk. legyen legalább 1.');
      return;
    }

    setAdding(true);
    try {
      await addPart({
        projectId,
        kind,
        diameterMm: resolvedDm,
        diameterToMm: needsSecondDm ? resolvedDmTo : null,
        count,
      });
      setCount(1);
      setCustomDm('');
      setCustomDmTo('');
      await load();
    } finally {
      setAdding(false);
    }
  };

  const bump = async (entry: PartEntry, delta: number) => {
    await adjustPartCount(entry.id, delta);
    await load();
  };

  const openEdit = (entry: PartEntry) => {
    setEditTarget(entry);
    setEditKind(entry.kind);
    setEditDm(String(entry.diameterMm));
    setEditDmTo(entry.diameterToMm != null ? String(entry.diameterToMm) : '');
    setEditCount(String(entry.count));
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const dm = Number(editDm);
    const dmTo = editDmTo.trim() ? Number(editDmTo) : null;
    const c = Number(editCount);
    const needTo = editKind === 'reduzir' || editKind === 'abzweig';
    if (!Number.isFinite(dm) || dm <= 0) {
      Alert.alert('Hibás DM', 'Adj meg érvényes átmérőt.');
      return;
    }
    if (needTo && (dmTo == null || !Number.isFinite(dmTo) || dmTo <= 0)) {
      Alert.alert('Hibás 2. DM', 'Add meg a második dimenziót.');
      return;
    }
    if (!Number.isFinite(c) || c <= 0) {
      Alert.alert('Hibás darabszám', 'A Stk. legyen nagyobb mint 0.');
      return;
    }
    await updatePart(editTarget.id, {
      kind: editKind,
      diameterMm: dm,
      diameterToMm: needTo ? dmTo : null,
      count: c,
    });
    setEditTarget(null);
    await load();
  };

  const confirmDelete = (entry: PartEntry) => {
    Alert.alert(
      'Tétel törlése',
      `${partKindLabel(entry.kind)} · ${formatPartDims(entry)} · ${entry.count} Stk.?`,
      [
        { text: 'Mégse', style: 'cancel' },
        {
          text: 'Törlés',
          style: 'destructive',
          onPress: async () => {
            await deletePart(entry.id);
            await load();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.summaryBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>{project?.date}</Text>
          <Text style={styles.summaryMeta} numberOfLines={1}>
            M {totals.muffe} · R {totals.reduzir} · A {totals.abzweig}
          </Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryCount}>{totals.total}</Text>
          <Text style={styles.summaryUnit}>db összesen</Text>
        </View>
      </View>

      <Pressable
        style={styles.editProject}
        onPress={() => navigation.navigate('ProjectForm', { projectId })}
      >
        <Text style={styles.editProjectText}>Projekt adatok</Text>
      </Pressable>

      <FlatList
        data={parts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Még nincs tétel. Alul: típus → DM → darabszám → hozzáad. A listán +/−-kal gyorsan módosíthatsz.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable style={styles.rowMain} onPress={() => openEdit(item)} onLongPress={() => confirmDelete(item)}>
              <Text style={styles.rowKind}>{partKindLabel(item.kind)}</Text>
              <Text style={styles.rowDm}>{formatPartDims(item)}</Text>
            </Pressable>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => void bump(item, -1)}>
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Pressable onPress={() => openEdit(item)}>
                <Text style={styles.rowCount}>{item.count}</Text>
              </Pressable>
              <Pressable style={styles.stepBtn} onPress={() => void bump(item, 1)}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <View style={styles.quickAdd}>
        <Text style={styles.quickTitle}>Gyors felírás</Text>

        <View style={styles.kindRow}>
          {PART_KINDS.map((k) => {
            const active = kind === k.id;
            return (
              <Pressable
                key={k.id}
                style={[styles.kindChip, active && styles.kindChipActive]}
                onPress={() => setKind(k.id)}
              >
                <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>{k.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <DimensionPicker
          name="list-dm-primary"
          label={needsSecondDm ? (kind === 'reduzir' ? 'DM von' : 'Haupt DM') : 'DM'}
          value={String(diameter)}
          onSelect={(dm) => {
            setDiameter(Number(dm));
            setCustomDm('');
          }}
        />

        {needsSecondDm ? (
          <DimensionPicker
            name="list-dm-secondary"
            label={kind === 'reduzir' ? 'DM bis (→)' : 'Abzweig DM'}
            value={String(diameterTo)}
            onSelect={(dm) => {
              setDiameterTo(Number(dm));
              setCustomDmTo('');
            }}
          />
        ) : null}

        <View style={styles.inputsRow}>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Egyedi DM</Text>
            <TextInput
              style={styles.input}
              value={customDm}
              onChangeText={setCustomDm}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={colors.muted}
            />
          </View>
          {needsSecondDm ? (
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Egyedi 2. DM</Text>
              <TextInput
                style={styles.input}
                value={customDmTo}
                onChangeText={setCustomDmTo}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={colors.muted}
              />
            </View>
          ) : null}
          <View style={styles.inputBlockNarrow}>
            <Text style={styles.inputLabel}>Stk.</Text>
            <View style={styles.countStepper}>
              <Pressable style={styles.stepBtn} onPress={() => setCount((c) => Math.max(1, c - 1))}>
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.countValue}>{count}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setCount((c) => c + 1)}>
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Pressable style={[styles.addBtn, adding && { opacity: 0.6 }]} onPress={onAdd} disabled={adding}>
          <Text style={styles.addBtnText}>
            + {partKindLabel(kind)} ·{' '}
            {formatKindDims(
              kind,
              Number.isFinite(resolvedDm) ? resolvedDm : '—',
              Number.isFinite(resolvedDmTo) ? resolvedDmTo : '—'
            )}{' '}
            · {count} Stk.
          </Text>
        </Pressable>
      </View>

      <Modal visible={Boolean(editTarget)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Szerkesztés</Text>
            <View style={styles.kindRow}>
              {PART_KINDS.map((k) => {
                const active = editKind === k.id;
                return (
                  <Pressable
                    key={k.id}
                    style={[styles.kindChip, active && styles.kindChipActive]}
                    onPress={() => setEditKind(k.id)}
                  >
                    <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>{k.short}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.inputLabel}>DM</Text>
            <TextInput style={styles.input} value={editDm} onChangeText={setEditDm} keyboardType="number-pad" />
            {editKind === 'reduzir' || editKind === 'abzweig' ? (
              <>
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                  {editKind === 'reduzir' ? 'DM bis' : 'Abzweig DM'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={editDmTo}
                  onChangeText={setEditDmTo}
                  keyboardType="number-pad"
                />
              </>
            ) : null}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Stk.</Text>
            <TextInput style={styles.input} value={editCount} onChangeText={setEditCount} keyboardType="number-pad" />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondary} onPress={() => setEditTarget(null)}>
                <Text style={styles.modalSecondaryText}>Mégse</Text>
              </Pressable>
              <Pressable style={styles.modalPrimary} onPress={saveEdit}>
                <Text style={styles.modalPrimaryText}>Mentés</Text>
              </Pressable>
            </View>
            {editTarget ? (
              <Pressable
                style={{ marginTop: 12, alignItems: 'center' }}
                onPress={() => {
                  const t = editTarget;
                  setEditTarget(null);
                  confirmDelete(t);
                }}
              >
                <Text style={{ color: colors.danger, fontWeight: '700' }}>Törlés</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  summaryBar: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { color: '#fff', fontWeight: '700', fontSize: 16 },
  summaryMeta: { color: '#B8C2CC', marginTop: 2 },
  summaryRight: { alignItems: 'flex-end' },
  summaryCount: { color: '#fff', fontSize: 32, fontWeight: '800', lineHeight: 36 },
  summaryUnit: { color: '#B8C2CC', fontSize: 12 },
  editProject: { paddingHorizontal: spacing.md, paddingVertical: 8 },
  editProjectText: { color: colors.accent, fontWeight: '600' },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: 8 },
  empty: { color: colors.muted, paddingVertical: 20, lineHeight: 22 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowMain: { flex: 1 },
  rowKind: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  rowDm: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, fontWeight: '700', color: colors.ink, lineHeight: 24 },
  rowCount: { minWidth: 36, textAlign: 'center', fontSize: 20, fontWeight: '800', color: colors.total },
  quickAdd: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  quickTitle: { fontWeight: '800', fontSize: 16, color: colors.ink, marginBottom: 8 },
  kindRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  kindChip: {
    flex: 1,
    backgroundColor: colors.chip,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  kindChipActive: { backgroundColor: colors.accent },
  kindChipText: { fontWeight: '800', color: colors.ink },
  kindChipTextActive: { color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipActive: { backgroundColor: colors.chipActive },
  chipText: { fontWeight: '700', color: colors.ink },
  chipTextActive: { color: colors.chipActiveText },
  inputsRow: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'flex-end' },
  inputBlock: { flex: 1 },
  inputBlockNarrow: { width: 130 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: '#F7F9FB',
  },
  countStepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countValue: { minWidth: 28, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.ink },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12, color: colors.ink },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  modalSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryText: { fontWeight: '700', color: colors.ink },
  modalPrimary: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryText: { fontWeight: '700', color: '#fff' },
});
