import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { dailySummary, todayIso, type DiameterSummary, type KindSummary } from '../storage';
import { formatPartDims, partKindLabel, type Project } from '../types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DailySummary'>;

type SummaryState = {
  byKind: KindSummary[];
  byDiameter: DiameterSummary[];
  totalParts: number;
  totalMuffs: number;
  projectCount: number;
  projects: Project[];
};

export function DailySummaryScreen({ route }: Props) {
  const date = route.params?.date ?? todayIso();
  const [data, setData] = useState<SummaryState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setData(await dailySummary(date));
    setLoading(false);
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading || !data) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.heroDate}>{date}</Text>
        <Text style={styles.heroTotal}>{data.totalParts}</Text>
        <Text style={styles.heroUnit}>db összesen · {data.projectCount} projekt</Text>
        <View style={styles.kindBreakdown}>
          {data.byKind.map((k) => (
            <Text key={k.kind} style={styles.kindBreakText}>
              {partKindLabel(k.kind)}: {k.count}
            </Text>
          ))}
        </View>
      </View>

      <Text style={styles.section}>Típus + DM</Text>
      {data.byDiameter.length === 0 ? (
        <Text style={styles.empty}>Erre a napra még nincs tétel.</Text>
      ) : (
        <FlatList
          data={data.byDiameter}
          keyExtractor={(item) => `${item.kind}-${item.diameterMm}-${item.diameterToMm ?? ''}`}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          ListFooterComponent={
            <View style={styles.projectsBox}>
              <Text style={styles.section}>Projektek ma</Text>
              {data.projects.map((p) => (
                <Text key={p.id} style={styles.projectLine}>
                  · {p.baustellenort || 'Névtelen'} ({p.verlegefirma || '—'})
                </Text>
              ))}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View>
                <Text style={styles.kind}>{partKindLabel(item.kind)}</Text>
                <Text style={styles.dm}>{formatPartDims(item)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.count}>{item.count} Stk.</Text>
                <Text style={styles.entries}>{item.entryCount} sor</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center' },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroDate: { color: '#B8C2CC', fontWeight: '600' },
  heroTotal: { color: '#fff', fontSize: 48, fontWeight: '800', marginTop: 4 },
  heroUnit: { color: '#B8C2CC', marginTop: 4 },
  kindBreakdown: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  kindBreakText: { color: '#E8ECF0', fontWeight: '700' },
  section: {
    fontWeight: '800',
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  empty: { color: colors.muted, marginTop: 8 },
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
  kind: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  dm: { fontSize: 17, fontWeight: '700', color: colors.ink, marginTop: 2 },
  rowRight: { alignItems: 'flex-end' },
  count: { fontSize: 18, fontWeight: '800', color: colors.total },
  entries: { color: colors.muted, fontSize: 12, marginTop: 2 },
  projectsBox: { marginTop: spacing.md },
  projectLine: { color: colors.muted, marginBottom: 4, lineHeight: 20 },
});
