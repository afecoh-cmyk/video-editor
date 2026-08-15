import { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  clearInstallPrompt,
  currentAppUrl,
  getInstallPrompt,
  isIosWeb,
  isStandaloneApp,
  subscribeInstallPrompt,
} from '../pwa';
import { colors } from '../theme';

export function InstallButton() {
  const [open, setOpen] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const sync = () => {
      setCanPrompt(getInstallPrompt() != null);
      setInstalled(isStandaloneApp());
    };
    sync();
    return subscribeInstallPrompt(sync);
  }, []);

  if (Platform.OS !== 'web' || installed) return null;

  const url = currentAppUrl();

  const install = async () => {
    const prompt = getInstallPrompt();
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      clearInstallPrompt();
      setCanPrompt(false);
      if (choice.outcome === 'accepted') setOpen(false);
      return;
    }
    if (isIosWeb()) return;
    Alert.alert(
      'Telepítés',
      'A böngésző menüjéből add a kezdőképernyőhöz: menü → Alkalmazás telepítése / Főképernyőhöz adás.'
    );
  };

  const copyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch {
      // fallback below
    }
    Alert.alert('Letöltő link', url);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Alkalmazás letöltése"
        hitSlop={10}
        onPress={() => setOpen(true)}
        style={styles.headerBtn}
      >
        <Text selectable={false} style={styles.headerBtnText}>
          Letöltés
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.card}>
            <Text style={styles.title}>Muffe Plan letöltése</Text>
            <Text style={styles.body}>
              Telepítsd a telefonra: ikon a kezdőképernyőn, offline is megy, nem kell mindig a
              böngészőt keresni.
            </Text>

            {canPrompt ? (
              <Pressable style={styles.primary} onPress={() => void install()}>
                <Text style={styles.primaryText}>Telepítés a telefonra</Text>
              </Pressable>
            ) : isIosWeb() ? (
              <Text style={styles.hint}>
                iPhone: Megosztás gomb → „Főképernyőhöz adás”.
              </Text>
            ) : (
              <Text style={styles.hint}>
                Böngésző menü → Alkalmazás telepítése / Főképernyőhöz adás.
              </Text>
            )}

            <Text style={styles.linkLabel}>Letölthető link</Text>
            <Text selectable style={styles.link}>
              {url}
            </Text>
            <Pressable style={styles.secondary} onPress={() => void copyLink()}>
              <Text style={styles.secondaryText}>{copied ? 'Link másolva' : 'Link másolása'}</Text>
            </Pressable>
            <Pressable style={styles.close} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>Bezárás</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    marginRight: 8,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 18,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 21, marginBottom: 14 },
  hint: { color: colors.ink, fontWeight: '700', marginBottom: 14, lineHeight: 20 },
  linkLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  link: { color: colors.accent, fontWeight: '800', marginBottom: 10 },
  primary: {
    backgroundColor: colors.accent,
    minHeight: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondary: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryText: { color: colors.ink, fontWeight: '800' },
  close: { alignItems: 'center', paddingVertical: 8 },
  closeText: { color: colors.muted, fontWeight: '700' },
});
