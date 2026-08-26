import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FadeIn } from '../components/FadeIn';
import type { RootStackParamList } from '../navigation';
import { getProject, saveProject, todayIso } from '../storage';
import { colors, radius, shadow, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectForm'>;

export function ProjectFormScreen({ navigation, route }: Props) {
  const projectId = route.params?.projectId;
  const editing = Boolean(projectId);

  const [betreiber, setBetreiber] = useState('');
  const [verlegefirma, setVerlegefirma] = useState('');
  const [baustellenort, setBaustellenort] = useState('');
  const [date, setDate] = useState(todayIso());
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    void (async () => {
      const p = await getProject(projectId);
      if (!p) {
        Alert.alert('Hiba', 'Baustelle nem található');
        navigation.goBack();
        return;
      }
      setBetreiber(p.betreiber);
      setVerlegefirma(p.verlegefirma);
      setBaustellenort(p.baustellenort);
      setDate(p.date);
      setRemarks(p.remarks);
    })();
  }, [projectId, navigation]);

  const onSave = async () => {
    if (!baustellenort.trim()) {
      Alert.alert('Hiányzó adat', 'A Baustellenort (helyszín) kötelező.');
      return;
    }
    setSaving(true);
    try {
      await saveProject({
        id: projectId,
        betreiber,
        verlegefirma,
        baustellenort,
        date,
        remarks,
      });
      if (editing) {
        navigation.goBack();
      } else {
        navigation.replace('TodayWork');
      }
    } catch (e) {
      Alert.alert('Hiba', e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <FadeIn>
        <Text style={styles.helper}>A terepi induláshoz csak a helyszín kötelező. A többi adat később is kitölthető.</Text>
        <Field label="Baustellenort *" value={baustellenort} onChangeText={setBaustellenort} placeholder="pl. Ingolstädter Straße" />
        <Field label="Datum" value={date} onChangeText={setDate} placeholder={todayIso()} autoCapitalize="none" />

        <Text style={styles.optionalTitle}>Opcionális adatok</Text>
        <Field label="Betreiber" value={betreiber} onChangeText={setBetreiber} placeholder="Üzemeltető" />
        <Field label="Verlegefirma" value={verlegefirma} onChangeText={setVerlegefirma} placeholder="Fektető cég" />
        <Field label="Bemerkungen" value={remarks} onChangeText={setRemarks} placeholder="Megjegyzés / Auftrag" multiline />

        <AnimatedPressable
          style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.primaryBtnText}>{editing ? 'Mentés' : 'Baustelle indítása'}</Text>
        </AnimatedPressable>
      </FadeIn>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  helper: { color: colors.muted, lineHeight: 21, marginBottom: spacing.md },
  optionalTitle: { marginTop: spacing.sm, marginBottom: spacing.md, color: colors.ink, fontSize: 16, fontWeight: '900' },
  field: { marginBottom: spacing.md },
  label: { fontWeight: '700', color: colors.ink, marginBottom: 6 },
  input: {
    minHeight: 52,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.ink,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  primaryBtn: {
    minHeight: 58,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadow.card,
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 17 },
});
