import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import {
  addPart,
  adjustPartCount,
  listParts,
  listProjects,
  todayIso,
} from '../storage';
import {
  COMMON_DIAMETERS,
  formatPartDims,
  partKindLabel,
  type PartEntry,
  type PartKind,
  type Project,
} from '../types';
import { colors, radius, shadow, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'TodayWork'>;

type FastKind = 'muffe' | 'reduzir' | 'abzweig' | 'bogenmuffe' | 'montagemuffe' | 'reduzirmuffe' | 'endmuffe' | 'montageabzweig';

const FAST_KINDS: { id: FastKind; label: string }[] = [
  { id: 'muffe', label: 'Muffe' },
  { id: 'reduzir', label: 'Reduzir' },
  { id: 'abzweig', label: 'Abzweig' },
  { id: 'montagemuffe', label: 'Montagemuffe' },
  { id: 'bogenmuffe', label: 'Bogenmuffe' },
  { id: 'reduzirmuffe', label: 'Reduzirmuffe' },
  { id: 'endmuffe', label: 'Endmuffe' },
  { id: 'montageabzweig', label: 'Montageabzweig' },
];

export function TodayWorkScreen() {
  const navigation = useNavigation<Nav>();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [parts, setParts] = useState<PartEntry[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [kind, setKind] = useState<FastKind>('muffe');
  const [diameter, setDiameter] = useState<number | null>(null);
  const [diameterTo, setDiameterTo] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const today = todayIso();

  const load = useCallback(async () => {
    setLoading(true);
    const all = await listProjects();
    const todays = all.filter((p) => p.date === today && p.status !== 'closed');
    setProjects(todays);

    const nextProjectId =
      activeProjectId && todays.some((p) => p.id === activeProjectId)
        ? activeProjectId
        : todays[0]?.id ?? null;

    setActiveProjectId(nextProjectId);
    setParts(nextProjectId ? await listParts(nextProjectId) : []);
    setLoading(false);
  }, [activeProjectId, today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
  const total = parts.reduce((sum, part) => sum + part.count, 0);
  const recent = [...parts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  const grouped = useMemo(() => {
    const map = new Map<string, PartEntry>();
    for (const part of parts) {
      const key = `${part.kind}-${part.diameterMm}-${part.diameterToMm ?? ''}`;
      const current = map.get(key);
      if (current) current.count += part.count;
      else map.set(key, { ...part });
    }
    return [...map.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.diameterMm - b.diameterMm);
  }, [parts]);

  const chooseProject = async (projectId: string) => {
    setActiveProjectId(projectId);
    setParts(await listParts(projectId));
  };

  const needsSecondDm = kind === 'reduzir' || kind === 'reduzirmuffe' || kind === 'abzweig' || kind === 'montageabzweig';

  const resetFastEntry = () => {
    setKind('muffe');
    setDiameter(null);
    setDiameterTo(null);
  };

  const saveFast = async () => {
    if (!activeProjectId || !diameter || (needsSecondDm && !diameterTo)) return;
    setSaving(true);

    const existing = parts.find(
      (part) =>
        part.kind === kind &&
        part.diameterMm === diameter &&
        (part.diameterToMm ?? null) === (needsSecondDm ? diameterTo : null)
    );

    if (existing) {
      await adjustPartCount(existing.id, 1);
    } else {
      await addPart({
        projectId: activeProjectId,
        kind,
        diameterMm: diameter,
        diameterToMm: needsSecondDm ? diameterTo : null,
        count: 1,
      });
    }

    setParts(await listParts(activeProjectId));
    setSaving(false);
    setPickerOpen(false);
    resetFastEntry();
  };

  const adjust = async (entry: PartEntry, delta: number) => {
    if (!activeProjectId) return;
    const matching = parts.filter(
      (part) =>
        part.kind === entry.kind &&
        part.diameterMm === entry.diameterMm &&
        (part.diameterToMm ?? null) === (entry.diameterToMm ?? null)
    );
    const target = matching.at(-1);
    if (!target) return;
    await adjustPartCount(target.id, delta);
    setParts(await listParts(activeProjectId));
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!activeProject) {
    return (
      <View style={[styles.screen, styles.emptyWrap]}>
        <Text style={styles.eyebrow}>MUFFE PLAN</Text>
        <Text style={styles.emptyTitle}>Nincs aktív Baustelle mára</Text>
        <Text style={styles.emptyBody}>
          Először hozz létre egy mai helyszínt. Utána minden tételt innen, néhány érintéssel tudsz felvinni.
        </Text>
        <Pressable style={styles.primaryAction} onPress={() => navigation.navigate('ProjectForm', {})}>
          <Text style={styles.primaryActionText}>+ Új Baustelle</Text>
        </Pressable>
        <Pressable style={styles.linkAction} onPress={() => navigation.navigate('ProjectList')}>
          <Text style={styles.linkActionText}>Korábbi Baustellék</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>MAI MUNKA · {today}</Text>
            <Text style={styles.siteTitle}>{activeProject.baustellenort || 'Névtelen Baustelle'}</Text>
          </View>
          <View style={styles.totalBubble}>
            <Text style={styles.totalNumber}>{total}</Text>
            <Text style={styles.totalLabel}>db</Text>
          </View>
        </View>

        {projects.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projectChips}>
            {projects.map((project) => (
              <Pressable
                key={project.id}
                onPress={() => void chooseProject(project.id)}
                style={[styles.projectChip, project.id === activeProjectId && styles.projectChipActive]}
              >
                <Text style={[styles.projectChipText, project.id === activeProjectId && styles.projectChipTextActive]}>
                  {project.baustellenort || 'Baustelle'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <Pressable style={styles.addButton} onPress={() => setPickerOpen(true)}>
        <Text style={styles.addButtonPlus}>+</Text>
        <View>
          <Text style={styles.addButtonTitle}>Tétel hozzáadása</Text>
          <Text style={styles.addButtonSub}>Gyors bevitel terepen</Text>
        </View>
      </Pressable>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mai tételek</Text>
        <Pressable onPress={() => navigation.navigate('DailySummary', { date: today })}>
          <Text style={styles.summaryLink}>Napi összesítő</Text>
        </Pressable>
      </View>

      {grouped.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardTitle}>Még nincs felvitt tétel</Text>
          <Text style={styles.emptyCardBody}>Az első muff felviteléhez nyomd meg a nagy + gombot.</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => `${item.kind}-${item.diameterMm}-${item.diameterToMm ?? ''}`}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListHeaderComponent={
            recent.length ? (
              <View style={styles.recentBox}>
                <Text style={styles.recentTitle}>Legutóbbi</Text>
                <Text style={styles.recentLine}>
                  {recent.map((item) => `${partKindLabel(item.kind)} ${formatPartDims(item)}`).join(' · ')}
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowKind}>{partKindLabel(item.kind)}</Text>
                <Text style={styles.rowDims}>{formatPartDims(item)}</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => void adjust(item, -1)}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Text style={styles.rowCount}>{item.count}</Text>
                <Pressable style={styles.stepBtn} onPress={() => void adjust(item, 1)}>
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomSecondary} onPress={() => navigation.navigate('ProjectList')}>
          <Text style={styles.bottomSecondaryText}>Baustellék</Text>
        </Pressable>
        <Pressable style={styles.bottomPrimary} onPress={() => setPickerOpen(true)}>
          <Text style={styles.bottomPrimaryText}>+ Tétel</Text>
        </Pressable>
      </View>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Gyors tétel</Text>
              <Pressable onPress={() => { setPickerOpen(false); resetFastEntry(); }}>
                <Text style={styles.closeText}>Bezárás</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>1. Típus</Text>
              <View style={styles.kindGrid}>
                {FAST_KINDS.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.kindBtn, kind === item.id && styles.kindBtnActive]}
                    onPress={() => {
                      setKind(item.id);
                      setDiameterTo(null);
                    }}
                  >
                    <Text style={[styles.kindBtnText, kind === item.id && styles.kindBtnTextActive]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.inputLabel}>2. {needsSecondDm ? 'Első DM' : 'DM'}</Text>
              <View style={styles.dmGrid}>
                {COMMON_DIAMETERS.map((dm) => (
                  <Pressable
                    key={dm}
                    style={[styles.dmBtn, diameter === dm && styles.dmBtnActive]}
                    onPress={() => setDiameter(dm)}
                  >
                    <Text style={[styles.dmBtnText, diameter === dm && styles.dmBtnTextActive]}>{dm}</Text>
                  </Pressable>
                ))}
              </View>

              {needsSecondDm ? (
                <>
                  <Text style={styles.inputLabel}>3. {kind === 'abzweig' || kind === 'montageabzweig' ? 'Abzweig DM' : 'Második DM'}</Text>
                  <View style={styles.dmGrid}>
                    {COMMON_DIAMETERS.map((dm) => (
                      <Pressable
                        key={dm}
                        style={[styles.dmBtn, diameterTo === dm && styles.dmBtnActive]}
                        onPress={() => setDiameterTo(dm)}
                      >
                        <Text style={[styles.dmBtnText, diameterTo === dm && styles.dmBtnTextActive]}>{dm}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              <Pressable
                disabled={!diameter || (needsSecondDm && !diameterTo) || saving}
                style={[
                  styles.saveBtn,
                  (!diameter || (needsSecondDm && !diameterTo) || saving) && styles.saveBtnDisabled,
                ]}
                onPress={() => void saveFast()}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Mentés…' : '+1 MENTÉS'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, color: colors.muted },
  emptyTitle: { marginTop: 10, fontSize: 28, lineHeight: 34, fontWeight: '900', color: colors.ink },
  emptyBody: { marginTop: 12, fontSize: 16, lineHeight: 23, color: colors.muted },
  primaryAction: { marginTop: 24, minHeight: 58, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  linkAction: { minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  linkActionText: { color: colors.ink, fontWeight: '800' },
  hero: { backgroundColor: colors.ink, borderRadius: radius.lg, padding: spacing.md, ...shadow.bar },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  siteTitle: { marginTop: 5, color: '#fff', fontSize: 22, fontWeight: '900' },
  totalBubble: { minWidth: 76, height: 76, borderRadius: 20, backgroundColor: colors.total, alignItems: 'center', justifyContent: 'center' },
  totalNumber: { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 32 },
  totalLabel: { color: '#D8EEE3', fontSize: 12, fontWeight: '800' },
  projectChips: { gap: 8, paddingTop: 14 },
  projectChip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: '#253249', justifyContent: 'center' },
  projectChipActive: { backgroundColor: colors.accent },
  projectChipText: { color: '#C8D1DC', fontWeight: '800' },
  projectChipTextActive: { color: '#fff' },
  addButton: { marginTop: spacing.md, minHeight: 82, borderRadius: radius.lg, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 14, ...shadow.card },
  addButtonPlus: { color: '#fff', fontSize: 42, fontWeight: '400', lineHeight: 44 },
  addButtonTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  addButtonSub: { marginTop: 2, color: '#FFE3D4', fontWeight: '600' },
  sectionHeader: { marginTop: 20, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  summaryLink: { color: colors.accent, fontWeight: '900' },
  emptyCard: { backgroundColor: colors.surface, padding: 20, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyCardTitle: { color: colors.ink, fontSize: 17, fontWeight: '900' },
  emptyCardBody: { marginTop: 6, color: colors.muted, lineHeight: 21 },
  recentBox: { marginBottom: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.totalSoft },
  recentTitle: { color: colors.total, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  recentLine: { marginTop: 4, color: colors.ink, fontWeight: '700' },
  row: { minHeight: 76, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 9, flexDirection: 'row', alignItems: 'center', ...shadow.card },
  rowKind: { color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  rowDims: { marginTop: 3, color: colors.ink, fontSize: 18, fontWeight: '900' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.ink, fontSize: 28, fontWeight: '700', lineHeight: 30 },
  rowCount: { minWidth: 30, textAlign: 'center', color: colors.total, fontSize: 24, fontWeight: '900' },
  bottomBar: { position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', gap: 10, padding: 8, backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.bar },
  bottomSecondary: { flex: 1, minHeight: 54, borderRadius: radius.md, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  bottomSecondaryText: { color: colors.ink, fontWeight: '900' },
  bottomPrimary: { flex: 1.4, minHeight: 54, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  bottomPrimaryText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(10,16,28,0.42)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: colors.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: spacing.md, paddingBottom: 24 },
  sheetHandle: { width: 48, height: 5, borderRadius: 5, backgroundColor: colors.border, alignSelf: 'center', marginTop: 9, marginBottom: 10 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sheetTitle: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  closeText: { color: colors.muted, fontWeight: '800', paddingVertical: 12 },
  inputLabel: { marginTop: 12, marginBottom: 8, color: colors.ink, fontSize: 14, fontWeight: '900' },
  kindGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kindBtn: { minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  kindBtnActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  kindBtnText: { color: colors.ink, fontWeight: '800' },
  kindBtnTextActive: { color: '#fff' },
  dmGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dmBtn: { width: '22.5%', minHeight: 52, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dmBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dmBtnText: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  dmBtnTextActive: { color: '#fff' },
  saveBtn: { minHeight: 60, marginTop: 22, marginBottom: 18, borderRadius: radius.md, backgroundColor: colors.total, alignItems: 'center', justifyContent: 'center' },
  saveBtnDisabled: { opacity: 0.35 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
});
