import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '../navigation';
import {
  addCanvasMarker,
  addCanvasStroke,
  convertMarkersToParts,
  getCanvas,
  getProject,
  listParts,
  undoCanvasAction,
} from '../storage';
import {
  COMMON_DIAMETERS,
  PART_KINDS,
  formatPartDims,
  partKindLabel,
  type CanvasMarker,
  type CanvasPoint,
  type CanvasStroke,
  type PartEntry,
  type PartKind,
} from '../types';
import { colors, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DrawingBoard'>;
type Mode = 'draw' | 'mark' | 'select';

export function DrawingBoardScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const [mode, setMode] = useState<Mode>('draw');
  const [markers, setMarkers] = useState<CanvasMarker[]>([]);
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [parts, setParts] = useState<PartEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draftPoints, setDraftPoints] = useState<CanvasPoint[]>([]);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [kind, setKind] = useState<PartKind>('muffe');
  const [diameter, setDiameter] = useState('315');
  const [diameterTo, setDiameterTo] = useState('250');
  const drawingRef = useRef<CanvasPoint[]>([]);

  const load = useCallback(async () => {
    const [project, canvas, projectParts] = await Promise.all([
      getProject(projectId),
      getCanvas(projectId),
      listParts(projectId),
    ]);
    if (!project) {
      Alert.alert('Hiba', 'Projekt nem található');
      navigation.goBack();
      return;
    }
    navigation.setOptions({ title: project.baustellenort || 'Rajzlap' });
    setMarkers(canvas.markers);
    setStrokes(canvas.strokes);
    setParts(projectParts);
  }, [navigation, projectId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const normalize = useCallback(
    (x: number, y: number): CanvasPoint => ({
      x: Math.max(0, Math.min(1, x / size.width)),
      y: Math.max(0, Math.min(1, y / size.height)),
    }),
    [size]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => mode === 'draw',
        onMoveShouldSetPanResponder: () => mode === 'draw',
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          const first = normalize(locationX, locationY);
          drawingRef.current = [first];
          setDraftPoints([first]);
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          const next = normalize(locationX, locationY);
          drawingRef.current = [...drawingRef.current, next];
          setDraftPoints(drawingRef.current);
        },
        onPanResponderRelease: async () => {
          const points = drawingRef.current;
          drawingRef.current = [];
          setDraftPoints([]);
          await addCanvasStroke(projectId, points);
          await load();
        },
        onPanResponderTerminate: () => {
          drawingRef.current = [];
          setDraftPoints([]);
        },
      }),
    [load, mode, normalize, projectId]
  );

  const partsById = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  const openMarkers = markers.filter((m) => !m.partId);

  const pathFor = (points: CanvasPoint[]) =>
    points
      .map((point, index) => {
        const x = Math.round(point.x * size.width);
        const y = Math.round(point.y * size.height);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

  const onCanvasPress = async (event: GestureResponderEvent) => {
    if (mode !== 'mark') return;
    const { locationX, locationY } = event.nativeEvent;
    await addCanvasMarker(projectId, normalize(locationX, locationY));
    await load();
  };

  const toggleMarker = (marker: CanvasMarker) => {
    if (mode !== 'select' || marker.partId) return;
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(marker.id)) next.delete(marker.id);
      else next.add(marker.id);
      return next;
    });
  };

  const openConvert = () => {
    if (mode !== 'select') return;
    if (selected.size === 0) {
      Alert.alert('Nincs kijelölés', 'Koppints egyenként az átalakítandó X-ekre.');
      return;
    }
    setModalOpen(true);
  };

  const saveConversion = async () => {
    const dm = Number(diameter);
    const dmTo = Number(diameterTo);
    const needsSecond = kind !== 'muffe';
    if (!Number.isFinite(dm) || dm <= 0 || (needsSecond && (!Number.isFinite(dmTo) || dmTo <= 0))) {
      Alert.alert('Hibás DM', 'Adj meg érvényes átmérőt.');
      return;
    }
    await convertMarkersToParts({
      projectId,
      markerIds: [...selected],
      kind,
      diameterMm: dm,
      diameterToMm: needsSecond ? dmTo : null,
    });
    setSelected(new Set());
    setModalOpen(false);
    await load();
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    if (next !== 'select') setSelected(new Set());
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ width, height });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <ModeButton active={mode === 'draw'} label="✎ Rajz" onPress={() => changeMode('draw')} />
        <ModeButton active={mode === 'mark'} label="＋ X" onPress={() => changeMode('mark')} />
        <ModeButton
          active={mode === 'select'}
          label={`Kijelöl${selected.size ? ` (${selected.size})` : ''}`}
          onPress={() => changeMode('select')}
        />
        <Pressable
          style={styles.toolButton}
          onPress={async () => {
            await undoCanvasAction(projectId);
            setSelected(new Set());
            await load();
          }}
        >
          <Text style={styles.toolText}>↶</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.canvas}
        onLayout={onLayout}
        onPress={onCanvasPress}
        onLongPress={openConvert}
        delayLongPress={550}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          {[...strokes, ...(draftPoints.length ? [{ id: 'draft', points: draftPoints }] : [])].map(
            (stroke) => (
              <Path
                key={stroke.id}
                d={pathFor(stroke.points)}
                stroke={colors.ink}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )
          )}
        </Svg>

        {markers.map((marker) => {
          const part = marker.partId ? partsById.get(marker.partId) : null;
          const isSelected = selected.has(marker.id);
          return (
            <Pressable
              key={marker.id}
              style={[
                styles.marker,
                {
                  left: marker.x * size.width - (part ? 32 : 20),
                  top: marker.y * size.height - 20,
                },
                part && styles.completedMarker,
                isSelected && styles.selectedMarker,
              ]}
              onPress={(event) => {
                event.stopPropagation();
                toggleMarker(marker);
              }}
            >
              {part ? (
                <>
                  <Text style={styles.completedType}>{partKindLabel(part.kind)}</Text>
                  <Text style={styles.completedDm}>{formatPartDims(part).replace('DM ', '')}</Text>
                </>
              ) : (
                <Text style={styles.xText}>×</Text>
              )}
            </Pressable>
          );
        })}

        {markers.length === 0 && strokes.length === 0 ? (
          <View pointerEvents="none" style={styles.help}>
            <Text style={styles.helpTitle}>Rajzold fel a szakaszt</Text>
            <Text style={styles.helpText}>
              Rajz mód: húzd az ujjad. Kapcsold be a „＋ X” módot, majd koppints minden nyitott
              muff helyére.
            </Text>
          </View>
        ) : null}
      </Pressable>

      <View style={styles.status}>
        <Text style={styles.statusText}>
          {mode === 'draw'
            ? 'Rajz mód aktív'
            : mode === 'mark'
              ? 'X mód aktív — koppints a muffok helyére'
              : selected.size
                ? `${selected.size} X kijelölve — nyomd hosszan a rajzlapot`
                : 'Koppints egyenként az X-ekre'}
        </Text>
        <Pressable onPress={() => navigation.navigate('MuffList', { projectId })}>
          <Text style={styles.listLink}>Lista ({parts.length})</Text>
        </Pressable>
      </View>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>{selected.size} X átalakítása</Text>
            <Text style={styles.sheetHint}>Mindegyik kijelölt X egy darab tétel lesz.</Text>

            <View style={styles.chips}>
              {PART_KINDS.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.chip, kind === item.id && styles.chipActive]}
                  onPress={() => setKind(item.id)}
                >
                  <Text style={[styles.chipText, kind === item.id && styles.chipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{kind === 'abzweig' ? 'Haupt DM' : 'DM'}</Text>
            <View style={styles.dmChips}>
              {COMMON_DIAMETERS.map((dm) => (
                <Pressable
                  key={dm}
                  style={[styles.dmChip, diameter === String(dm) && styles.dmChipActive]}
                  onPress={() => setDiameter(String(dm))}
                >
                  <Text style={styles.dmChipText}>{dm}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={diameter}
              onChangeText={setDiameter}
              placeholder="Egyedi DM"
            />

            {kind !== 'muffe' ? (
              <>
                <Text style={styles.label}>{kind === 'reduzir' ? 'Cél DM' : 'Abzweig DM'}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={diameterTo}
                  onChangeText={setDiameterTo}
                  placeholder="Második DM"
                />
              </>
            ) : null}

            <Pressable style={styles.saveButton} onPress={saveConversion}>
              <Text style={styles.saveText}>Átalakítás ({selected.size} db)</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ModeButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.toolButton, active && styles.toolButtonActive]} onPress={onPress}>
      <Text style={[styles.toolText, active && styles.toolTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#dfe5e8' },
  toolbar: {
    flexDirection: 'row',
    gap: 6,
    padding: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonActive: { backgroundColor: colors.accent },
  toolText: { color: colors.ink, fontWeight: '700' },
  toolTextActive: { color: '#fff' },
  canvas: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 6,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#c6d0d5',
  },
  help: {
    position: 'absolute',
    left: 30,
    right: 30,
    top: '38%',
    alignItems: 'center',
  },
  helpTitle: { fontSize: 21, fontWeight: '800', color: '#8b989e', marginBottom: 8 },
  helpText: { color: '#9ba6ab', textAlign: 'center', fontSize: 15, lineHeight: 21 },
  marker: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedMarker: {
    borderColor: colors.accent,
    backgroundColor: '#fff3e6',
    transform: [{ scale: 1.15 }],
  },
  completedMarker: {
    width: 64,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.total,
    backgroundColor: '#eaf8f0',
  },
  xText: { color: colors.danger, fontSize: 32, fontWeight: '900', lineHeight: 34 },
  completedType: { color: colors.total, fontSize: 10, fontWeight: '800' },
  completedDm: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  status: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.ink,
  },
  statusText: { flex: 1, color: '#fff', fontWeight: '600', fontSize: 13 },
  listLink: { color: '#ffb66d', fontWeight: '800', marginLeft: 10 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
  },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: colors.ink },
  sheetHint: { color: colors.muted, marginTop: 4, marginBottom: spacing.md },
  chips: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.ink, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  label: { color: colors.ink, fontWeight: '800', marginBottom: 7 },
  dmChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  dmChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.bg,
  },
  dmChipActive: { backgroundColor: '#ffd3a6' },
  dmChipText: { color: colors.ink, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 17,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
