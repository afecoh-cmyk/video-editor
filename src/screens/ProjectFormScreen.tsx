import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation';
import { deleteProject, getProject, saveProject, todayIso } from '../storage';
import { colors, spacing } from '../theme';

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
        Alert.alert('Hiba', 'Projekt nem található');
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
      const project = await saveProject({
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
        navigation.replace('DrawingBoard', { projectId: project.id });
      }
    } catch (e) {
      Alert.alert('Hiba', e instanceof Error ? e.message : 'Mentés sikertelen');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!projectId) return;
    Alert.alert('Projekt törlése', 'Biztosan törlöd a projektet és az összes muffot?', [
      { text: 'Mégse', style: 'cancel' },
      {
        text: 'Törlés',
        style: 'destructive',
        onPress: async () => {
          await deleteProject(projectId);
          navigation.navigate('ProjectList');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="Baustellenort" value={baustellenort} onChangeText={setBaustellenort} placeholder="pl. Wernher-Von-Braun Str." />
      <Field label="Betreiber" value={betreiber} onChangeText={setBetreiber} placeholder="Üzemeltető" />
      <Field label="Verlegefirma" value={verlegefirma} onChangeText={setVerlegefirma} placeholder="Fektető cég" />
      <Field label="Datum (ÉÉÉÉ-HH-NN)" value={date} onChangeText={setDate} placeholder={todayIso()} autoCapitalize="none" />
      <Field label="Bemerkungen" value={remarks} onChangeText={setRemarks} placeholder="Megjegyzés" multiline />

      <Pressable style={[styles.primaryBtn, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
        <Text style={styles.primaryBtnText}>{editing ? 'Mentés' : 'Mentés és muffok'}</Text>
      </Pressable>

      {editing ? (
        <Pressable style={styles.dangerBtn} onPress={onDelete}>
          <Text style={styles.dangerBtnText}>Projekt törlése</Text>
        </Pressable>
      ) : null}
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
  field: { marginBottom: spacing.md },
  label: { fontWeight: '700', color: colors.ink, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  dangerBtn: { paddingVertical: 16, alignItems: 'center', marginTop: spacing.md },
  dangerBtnText: { color: colors.danger, fontWeight: '700' },
});
