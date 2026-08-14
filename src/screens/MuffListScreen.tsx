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
import type { RootStackParamList } from '../navigation';
import {
  addMuff,
  deleteMuff,
  getProject,
  listMuffs,
  updateMuff,
} from '../storage';
import { COMMON_DIAMETERS, type MuffEntry, type Project } from '../types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MuffList'>;

export function MuffListScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const [project, setProject] = useState<Project | null>(null);
  const [muffs, setMuffs] = useState<MuffEntry[]>([]);
  const [diameter, setDiameter] = useState<number>(315);
  const [customDm, setCustomDm] = useState('');
  const [count, setCount] = useState('1');
  const [pressure, setPressure] = useState('');
  const [adding, setAdding] = useState(false);
  const [editTarget, setEditTarget] = useState<MuffEntry | null>(null);
  const [editCount, setEditCount] = useState('');
  const [editPressure, setEditPressure] = useState('');

  const load = useCallback(async () => {
    const p = await getProject(projectId);
    if (!p) {
      Alert.alert('Hiba', 'Projekt nem található');
      navigation.goBack();
      return;
    }
    setProject(p);
    navigation.setOptions({ title: p.baustellenort || 'Muffok' });
    setMuffs(await listMuffs(projectId));
  }, [projectId, navigation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const total = useMemo(() => muffs.reduce((s, m) => s + m.muffCount, 0), [muffs]);

  const resolvedDiameter = customDm.trim() ? Number(customDm) : diameter;

  const onAdd = async () => {
    const muffCount = Number(count);
    if (!Number.isFinite(resolvedDiameter) || resolvedDiameter <= 0) {
      Alert.alert('Hibás DM', 'Adj meg érvényes átmérőt.');
      return;
    }
    if (!Number.isFinite(muffCount) || muffCount <= 0) {
      Alert.alert('Hibás darabszám', 'A Stk. legyen nagyobb mint 0.');
      return;
    }
    const pressureVal = pressure.trim() ? Number(pressure.replace(',', '.')) : null;
    if (pressure.trim() && !Number.isFinite(pressureVal)) {
      Alert.alert('Hibás nyomás', 'A Prüfdruck legyen szám (pl. 0.3).');
      return;
    }

    setAdding(true);
    try {
      await addMuff({
        projectId,
        diameterMm: resolvedDiameter,
        muffCount,
        testPressureBar: pressureVal,
      });
      setCount('1');
      setPressure('');
      setCustomDm('');
      await load();
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (entry: MuffEntry) => {
    setEditTarget(entry);
    setEditCount(String(entry.muffCount));
    setEditPressure(entry.testPressureBar != null ? String(entry.testPressureBar) : '');
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    const muffCount = Number(editCount);
    if (!Number.isFinite(muffCount) || muffCount <= 0) {
      Alert.alert('Hibás darabszám', 'A Stk. legyen nagyobb mint 0.');
      return;
    }
    const pressureVal = editPressure.trim() ? Number(editPressure.replace(',', '.')) : null;
    await updateMuff(editTarget.id, {
      muffCount,
      testPressureBar: pressureVal,
    });
    setEditTarget(null);
    await load();
  };

  const confirmDelete = (entry: MuffEntry) => {
    Alert.alert('Muff törlése', `DM ${entry.diameterMm} · ${entry.muffCount} Stk. törlése?`, [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: async () => {
          await deleteMuff(entry.id);
          await load();
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.summaryBar}>
        <View>
          <Text style={styles.summaryLabel}>{project?.date}</Text>
          <Text style={styles.summaryMeta}>{project?.betreiber || '—'}</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryCount}>{total}</Text>
          <Text style={styles.summaryUnit}>muff összesen</Text>
        </View>
      </View>

      <Pressable
        style={styles.editProject}
        onPress={() => navigation.navigate('ProjectForm', { projectId })}
      >
        <Text style={styles.editProjectText}>Projekt adatok szerkesztése</Text>
      </Pressable>

      <FlatList
        data={muffs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>Még nincs muff. Add hozzá alulról — 30–40 tétel is megy.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => openEdit(item)}
            onLongPress={() => confirmDelete(item)}
          >
            <Text style={styles.rowDm}>DM {item.diameterMm}</Text>
            <View style={styles.rowRight}>
              <Text style={styles.rowCount}>{item.muffCount} Stk.</Text>
              {item.testPressureBar != null ? (
                <Text style={styles.rowPressure}>{item.testPressureBar} Bar</Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />

      <View style={styles.quickAdd}>
        <Text style={styles.quickTitle}>Gyors hozzáadás</Text>
        <View style={styles.chips}>
          {COMMON_DIAMETERS.map((dm) => {
            const active = !customDm && diameter === dm;
            return (
              <Pressable
                key={dm}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  setDiameter(dm);
                  setCustomDm('');
                }}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{dm}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inputsRow}>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Egyedi DM</Text>
            <TextInput
              style={styles.input}
              value={customDm}
              onChangeText={setCustomDm}
              keyboardType="number-pad"
              placeholder="pl. 355"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Stk.</Text>
            <TextInput
              style={styles.input}
              value={count}
              onChangeText={setCount}
              keyboardType="number-pad"
            />
          </View>
          <View style={styles.inputBlock}>
            <Text style={styles.inputLabel}>Bar</Text>
            <TextInput
              style={styles.input}
              value={pressure}
              onChangeText={setPressure}
              keyboardType="decimal-pad"
              placeholder="0.3"
              placeholderTextColor={colors.muted}
            />
          </View>
        </View>

        <Pressable style={[styles.addBtn, adding && { opacity: 0.6 }]} onPress={onAdd} disabled={adding}>
          <Text style={styles.addBtnText}>
            + Hozzáad · DM {Number.isFinite(resolvedDiameter) ? resolvedDiameter : '—'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={Boolean(editTarget)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Szerkesztés · DM {editTarget?.diameterMm}
            </Text>
            <Text style={styles.inputLabel}>Stk.</Text>
            <TextInput
              style={styles.input}
              value={editCount}
              onChangeText={setEditCount}
              keyboardType="number-pad"
            />
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Prüfdruck (Bar)</Text>
            <TextInput
              style={styles.input}
              value={editPressure}
              onChangeText={setEditPressure}
              keyboardType="decimal-pad"
            />
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
  editProject: { paddingHorizontal: spacing.md, paddingVertical: 10 },
  editProjectText: { color: colors.accent, fontWeight: '600' },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: 8 },
  empty: { color: colors.muted, paddingVertical: 24, lineHeight: 22 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowDm: { fontSize: 18, fontWeight: '700', color: colors.ink },
  rowRight: { alignItems: 'flex-end' },
  rowCount: { fontSize: 18, fontWeight: '700', color: colors.total },
  rowPressure: { color: colors.muted, marginTop: 2 },
  quickAdd: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  quickTitle: { fontWeight: '800', fontSize: 16, color: colors.ink, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    backgroundColor: colors.chip,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  chipActive: { backgroundColor: colors.chipActive },
  chipText: { fontWeight: '700', color: colors.ink },
  chipTextActive: { color: colors.chipActiveText },
  inputsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  inputBlock: { flex: 1 },
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
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
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
