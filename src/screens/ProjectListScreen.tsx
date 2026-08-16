import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FadeIn } from '../components/FadeIn';
import type { RootStackParamList } from '../navigation';
import { listProjects, projectPartTotals, todayIso } from '../storage';
import { formatKindCountLine, type PartKindTotals, type Project } from '../types';
import { colors, radius, shadow, spacing } from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ProjectList'>;

type Row = Project & {
  totals: PartKindTotals;
};

export function ProjectListScreen() {
  const navigation = useNavigation<Nav>();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const projects = await listProjects();
    const withTotals = await Promise.all(
      projects.map(async (p) => ({ ...p, totals: await projectPartTotals(p.id) }))
    );
    setRows(withTotals);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const today = todayIso();

  return (
    <View style={styles.screen}>
      <View style={styles.topActions}>
        <AnimatedPressable
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('DailySummary', { date: today })}
        >
          <Text style={styles.secondaryBtnText}>Napi összesítő</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('ProjectForm', {})}
        >
          <Text style={styles.primaryBtnText}>+ Új projekt</Text>
        </AnimatedPressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : rows.length === 0 ? (
        <FadeIn>
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Még nincs projekt</Text>
            <Text style={styles.emptyBody}>
              Hozz létre egy projektet, majd írd fel gyorsan: Muffe, Reduzir, Abzweig + DM + darabszám.
              Minden adat csak ezen a telefonon marad, nem megy felhőbe.
            </Text>
          </View>
        </FadeIn>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item, index }) => {
            const isToday = item.date === today;
            return (
              <FadeIn delay={Math.min(index, 7) * 45}>
                <AnimatedPressable
                  style={[styles.card, isToday && styles.cardToday]}
                  onPress={() => navigation.navigate('DrawingBoard', { projectId: item.id })}
                  onLongPress={() => navigation.navigate('ProjectForm', { projectId: item.id })}
                >
                  <View style={styles.cardTop}>
                    <Text style={styles.date}>{item.date}</Text>
                    {isToday ? <Text style={styles.badge}>Ma</Text> : null}
                  </View>
                  <Text style={styles.title}>{item.baustellenort || 'Nincs helyszín'}</Text>
                  <Text style={styles.meta}>
                    {item.betreiber || '—'} · {item.verlegefirma || '—'}
                  </Text>
                  <Text style={styles.total}>
                    {item.totals.total} db · {formatKindCountLine(item.totals)}
                  </Text>
                </AnimatedPressable>
              </FadeIn>
            );
          }}
        />
      )}
      <Text style={styles.localNote}>Adatok csak ezen a telefonon · nincs felhő</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  topActions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadow.card,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  secondaryBtnText: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  empty: { marginTop: 48, paddingHorizontal: spacing.md },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  emptyBody: { fontSize: 16, color: colors.muted, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardToday: {
    borderColor: '#E8C4A8',
    backgroundColor: colors.accentSoft,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: colors.muted, fontWeight: '700' },
  badge: {
    backgroundColor: colors.total,
    color: '#fff',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    fontSize: 12,
    fontWeight: '800',
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 6 },
  meta: { color: colors.muted, marginTop: 4 },
  total: { marginTop: 10, color: colors.total, fontWeight: '800' },
  localNote: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 10,
  },
});
