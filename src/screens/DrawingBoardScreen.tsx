import { useCallback, useMemo, useRef, useState, Fragment } from 'react';
import {
  Alert,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Line, Path } from 'react-native-svg';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { DimensionPicker } from '../components/DimensionPicker';
import { InstallButton } from '../components/InstallButton';
import { KindChips } from '../components/KindChips';
import type { RootStackParamList } from '../navigation';
import {
  makePipePair,
  resolveDrawnStroke,
  simplifyPipePath,
  snapPipePathAngles,
} from '../pipeGeometry';
import { layoutCanvasMarkers } from '../markerLayout';
import {
  addCanvasMarker,
  addCanvasStrokePair,
  convertMarkersToParts,
  deleteProject,
  extendCanvasStrokePair,
  getCanvas,
  getProject,
  listParts,
  undoCanvasAction,
  updateCanvasStrokePair,
} from '../storage';
import {
  formatKindDims,
  kindNeedsSecondDm,
  kindPrimaryDmLabel,
  kindSecondDmLabel,
  partKindLabel,
  type CanvasMarker,
  type CanvasPoint,
  type CanvasStroke,
  type PartEntry,
  type PartKind,
} from '../types';
import { colors, radius, shadow, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DrawingBoard'>;
type Mode = 'pan' | 'draw' | 'mark' | 'pipe';
type ViewTransform = { scale: number; offsetX: number; offsetY: number };

const MIN_SCALE = 0.35;
const MAX_SCALE = 6;

function clampScale(scale: number): number {
  return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

export function DrawingBoardScreen({ navigation, route }: Props) {
  const { projectId } = route.params;
  const [mode, setMode] = useState<Mode>('pan');
  const [markers, setMarkers] = useState<CanvasMarker[]>([]);
  const [strokes, setStrokes] = useState<CanvasStroke[]>([]);
  const [parts, setParts] = useState<PartEntry[]>([]);
  const [draftPoints, setDraftPoints] = useState<CanvasPoint[]>([]);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);
  const [pipeSpacing, setPipeSpacing] = useState(28);
  const [kind, setKind] = useState<PartKind>('muffe');
  const [diameter, setDiameter] = useState('315');
  const [diameterTo, setDiameterTo] = useState('250');
  const diameterRef = useRef(diameter);
  const diameterToRef = useRef(diameterTo);
  const kindRef = useRef(kind);
  diameterRef.current = diameter;
  diameterToRef.current = diameterTo;
  kindRef.current = kind;
  const [view, setView] = useState<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const drawingRef = useRef<CanvasPoint[]>([]);
  const markerTapRef = useRef<{
    x: number;
    y: number;
    moved: boolean;
    startedAt: number;
  } | null>(null);
  const pipeTapRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const panDragRef = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const markerPlacementRef = useRef<(x: number, y: number) => Promise<void>>(async () => {});
  const openConvertRef = useRef<() => void>(() => {});
  const pipeSelectionRef = useRef<(x: number, y: number) => void>(() => {});
  const suppressTapUntilRef = useRef(0);
  const lastMarkerAtRef = useRef(0);
  const viewRef = useRef(view);
  const pinchRef = useRef<{
    distance: number;
    startScale: number;
    worldX: number;
    worldY: number;
  } | null>(null);

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
    navigation.setOptions({
      title: project.baustellenort || 'Rajzlap',
      headerRight: () => (
        <View style={styles.headerRight}>
          <InstallButton />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Projekt menü"
            hitSlop={12}
            onPress={() => setProjectMenuOpen(true)}
            style={styles.headerMenu}
          >
            <Text selectable={false} style={styles.headerMenuText}>⋮</Text>
          </Pressable>
        </View>
      ),
    });
    setMarkers(canvas.markers);
    setStrokes(canvas.strokes);
    setParts(projectParts);
  }, [navigation, projectId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const screenToWorld = useCallback(
    (x: number, y: number): CanvasPoint => ({
      x: (x - viewRef.current.offsetX) / (viewRef.current.scale * size.width),
      y: (y - viewRef.current.offsetY) / (viewRef.current.scale * size.height),
    }),
    [size]
  );

  const updateView = useCallback((next: ViewTransform) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const beginPinch = useCallback(
    (touches: readonly { locationX: number; locationY: number }[]) => {
      if (touches.length < 2) return;
      const [a, b] = touches;
      const midX = (a.locationX + b.locationX) / 2;
      const midY = (a.locationY + b.locationY) / 2;
      pinchRef.current = {
        distance: Math.hypot(b.locationX - a.locationX, b.locationY - a.locationY),
        startScale: viewRef.current.scale,
        worldX: (midX - viewRef.current.offsetX) / viewRef.current.scale,
        worldY: (midY - viewRef.current.offsetY) / viewRef.current.scale,
      };
      markerTapRef.current = null;
      pipeTapRef.current = null;
      panDragRef.current = null;
      suppressTapUntilRef.current = Date.now() + 400;
      drawingRef.current = [];
      setDraftPoints([]);
    },
    []
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponderCapture: (event) => event.nativeEvent.touches.length >= 2,
        onMoveShouldSetPanResponderCapture: (event) =>
          event.nativeEvent.touches.length >= 2 || pinchRef.current != null,
        onStartShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length >= 2 ||
          mode === 'draw' ||
          mode === 'mark' ||
          mode === 'pipe' ||
          mode === 'pan',
        onMoveShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length >= 2 ||
          mode === 'draw' ||
          mode === 'mark' ||
          mode === 'pipe' ||
          mode === 'pan',
        onPanResponderGrant: (event) => {
          if (event.nativeEvent.touches.length >= 2) {
            beginPinch(event.nativeEvent.touches);
            return;
          }
          if (mode === 'pan') {
            panDragRef.current = {
              x: event.nativeEvent.locationX,
              y: event.nativeEvent.locationY,
              offsetX: viewRef.current.offsetX,
              offsetY: viewRef.current.offsetY,
            };
            return;
          }
          if (mode === 'mark') {
            markerTapRef.current = {
              x: event.nativeEvent.locationX,
              y: event.nativeEvent.locationY,
              moved: false,
              startedAt: Date.now(),
            };
            return;
          }
          if (mode === 'pipe') {
            pipeTapRef.current = {
              x: event.nativeEvent.locationX,
              y: event.nativeEvent.locationY,
              moved: false,
            };
            return;
          }
          if (mode !== 'draw') return;
          const { locationX, locationY } = event.nativeEvent;
          const first = screenToWorld(locationX, locationY);
          drawingRef.current = [first];
          setDraftPoints([first]);
        },
        onPanResponderMove: (event) => {
          const touches = event.nativeEvent.touches;
          if (touches.length >= 2) {
            if (!pinchRef.current) beginPinch(touches);
            const pinch = pinchRef.current;
            if (!pinch) return;
            const [a, b] = touches;
            const midX = (a.locationX + b.locationX) / 2;
            const midY = (a.locationY + b.locationY) / 2;
            const distance = Math.hypot(b.locationX - a.locationX, b.locationY - a.locationY);
            const rawRatio = distance / Math.max(1, pinch.distance);
            const dampedRatio = 1 + (rawRatio - 1) * 0.88;
            const scale = clampScale(pinch.startScale * dampedRatio);
            updateView({
              scale,
              offsetX: midX - pinch.worldX * scale,
              offsetY: midY - pinch.worldY * scale,
            });
            return;
          }
          if (mode === 'pan' && panDragRef.current) {
            updateView({
              scale: viewRef.current.scale,
              offsetX:
                panDragRef.current.offsetX +
                (event.nativeEvent.locationX - panDragRef.current.x),
              offsetY:
                panDragRef.current.offsetY +
                (event.nativeEvent.locationY - panDragRef.current.y),
            });
            return;
          }
          if (mode === 'mark' && markerTapRef.current) {
            const movement = Math.hypot(
              event.nativeEvent.locationX - markerTapRef.current.x,
              event.nativeEvent.locationY - markerTapRef.current.y
            );
            if (movement > 10) markerTapRef.current.moved = true;
            return;
          }
          if (mode === 'pipe' && pipeTapRef.current) {
            const movement = Math.hypot(
              event.nativeEvent.locationX - pipeTapRef.current.x,
              event.nativeEvent.locationY - pipeTapRef.current.y
            );
            if (movement > 10) pipeTapRef.current.moved = true;
            return;
          }
          if (pinchRef.current || mode !== 'draw') return;
          const { locationX, locationY } = event.nativeEvent;
          const next = screenToWorld(locationX, locationY);
          drawingRef.current = [...drawingRef.current, next];
          setDraftPoints(drawingRef.current);
        },
        onPanResponderRelease: async () => {
          if (pinchRef.current) {
            pinchRef.current = null;
            drawingRef.current = [];
            setDraftPoints([]);
            return;
          }
          if (mode === 'pan') {
            panDragRef.current = null;
            return;
          }
          if (mode === 'mark') {
            const tap = markerTapRef.current;
            markerTapRef.current = null;
            if (tap && !tap.moved && Date.now() >= suppressTapUntilRef.current) {
              if (Date.now() - tap.startedAt >= 550) openConvertRef.current();
              else await markerPlacementRef.current(tap.x, tap.y);
            }
            return;
          }
          if (mode === 'pipe') {
            const tap = pipeTapRef.current;
            pipeTapRef.current = null;
            if (tap && !tap.moved && Date.now() >= suppressTapUntilRef.current) {
              pipeSelectionRef.current(tap.x, tap.y);
            }
            return;
          }
          const points = drawingRef.current;
          drawingRef.current = [];
          setDraftPoints([]);
          const simplified = simplifyPipePath(points, size, 9 / viewRef.current.scale);
          const cleaned = snapPipePathAngles(simplified, size);
          if (cleaned.length < 2) return;
          const resolved = resolveDrawnStroke(cleaned, strokes, size, viewRef.current.scale);
          if (!resolved) return;
          if (resolved.action === 'extend') {
            await extendCanvasStrokePair(resolved.pairId, resolved.vorlauf, resolved.ruecklauf);
          } else {
            await addCanvasStrokePair(projectId, resolved.vorlauf, resolved.ruecklauf);
          }
          await load();
        },
        onPanResponderTerminate: () => {
          pinchRef.current = null;
          markerTapRef.current = null;
          pipeTapRef.current = null;
          panDragRef.current = null;
          drawingRef.current = [];
          setDraftPoints([]);
        },
      }),
    [beginPinch, load, mode, projectId, screenToWorld, size, strokes, updateView]
  );

  const partsById = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  const openMarkers = markers.filter((m) => !m.partId);
  const laidOutMarkers = useMemo(
    () => layoutCanvasMarkers(markers, strokes, partsById, size, view),
    [markers, strokes, partsById, size, view]
  );

  const pathFor = (points: CanvasPoint[]) =>
    points
      .map((point, index) => {
        const x = Math.round(point.x * size.width * view.scale + view.offsetX);
        const y = Math.round(point.y * size.height * view.scale + view.offsetY);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');

  const nearestPointOnPipe = (screenX: number, screenY: number) => {
    let best: {
      point: CanvasPoint;
      distance: number;
      strokeId: string;
      pairId?: string;
    } | null = null;
    for (const stroke of strokes) {
      for (let index = 1; index < stroke.points.length; index += 1) {
        const worldA = stroke.points[index - 1];
        const worldB = stroke.points[index];
        const ax = worldA.x * size.width * view.scale + view.offsetX;
        const ay = worldA.y * size.height * view.scale + view.offsetY;
        const bx = worldB.x * size.width * view.scale + view.offsetX;
        const by = worldB.y * size.height * view.scale + view.offsetY;
        const dx = bx - ax;
        const dy = by - ay;
        const lengthSquared = dx * dx + dy * dy;
        const ratio =
          lengthSquared === 0
            ? 0
            : Math.max(
                0,
                Math.min(1, ((screenX - ax) * dx + (screenY - ay) * dy) / lengthSquared)
              );
        const closestX = ax + ratio * dx;
        const closestY = ay + ratio * dy;
        const distance = Math.hypot(screenX - closestX, screenY - closestY);
        if (!best || distance < best.distance) {
          best = {
            distance,
            strokeId: stroke.id,
            pairId: stroke.pairId,
            point: {
              x: worldA.x + ratio * (worldB.x - worldA.x),
              y: worldA.y + ratio * (worldB.y - worldA.y),
            },
          };
        }
      }
    }
    return best;
  };

  const placeMarkerAt = async (screenX: number, screenY: number) => {
    if (Date.now() - lastMarkerAtRef.current < 300) return;
    const hit = nearestPointOnPipe(screenX, screenY);
    // CSS/web képernyőn 1 mm ≈ 3,78 px; legfeljebb kb. 3 mm-es vonalközelség.
    if (!hit || hit.distance > 12) {
      Alert.alert(
        'Nincs csővonal elég közel',
        'Az X csak a vonaltól legfeljebb kb. 3 mm-re érzékelhető.'
      );
      return;
    }
    await addCanvasMarker(projectId, hit.point, hit.strokeId);
    lastMarkerAtRef.current = Date.now();
    await load();
  };
  markerPlacementRef.current = placeMarkerAt;

  const selectPipeAt = (screenX: number, screenY: number) => {
    const hit = nearestPointOnPipe(screenX, screenY);
    if (!hit || hit.distance > 28 || !hit.pairId) {
      Alert.alert('Nincs cső kijelölve', 'Koppints közelebb a VL vagy RL vonalhoz.');
      return;
    }
    const pair = strokes.filter((stroke) => stroke.pairId === hit.pairId);
    const vl = pair.find((stroke) => stroke.pipeKind === 'vorlauf');
    const rl = pair.find((stroke) => stroke.pipeKind === 'ruecklauf');
    if (!vl || !rl || !vl.points[0] || !rl.points[0]) return;
    const spacing = Math.hypot(
      (vl.points[0].x - rl.points[0].x) * size.width,
      (vl.points[0].y - rl.points[0].y) * size.height
    );
    setSelectedPairId(hit.pairId);
    setPipeSpacing(Math.round(spacing));
  };
  pipeSelectionRef.current = selectPipeAt;

  const changePipeSpacing = async (delta: number) => {
    if (!selectedPairId) return;
    const pair = strokes.filter((stroke) => stroke.pairId === selectedPairId);
    const vl = pair.find((stroke) => stroke.pipeKind === 'vorlauf');
    const rl = pair.find((stroke) => stroke.pipeKind === 'ruecklauf');
    if (!vl || !rl) return;
    const count = Math.min(vl.points.length, rl.points.length);
    const center = Array.from({ length: count }, (_, index) => ({
      x: (vl.points[index].x + rl.points[index].x) / 2,
      y: (vl.points[index].y + rl.points[index].y) / 2,
    }));
    const nextSpacing = Math.max(12, Math.min(80, pipeSpacing + delta));
    const [nextVl, nextRl] = makePipePair(center, size, nextSpacing);
    await updateCanvasStrokePair(selectedPairId, nextVl, nextRl);
    setPipeSpacing(nextSpacing);
    await load();
  };

  const openConvert = () => {
    if (openMarkers.length === 0) {
      Alert.alert('Nincs új X', 'Először tegyél le X-eket az aktuális muff-csoporthoz.');
      return;
    }
    setModalOpen(true);
  };
  openConvertRef.current = openConvert;

  const saveConversion = async () => {
    const dm = Number(diameterRef.current);
    const dmTo = Number(diameterToRef.current);
    const nextKind = kindRef.current;
    const needsSecond = kindNeedsSecondDm(nextKind);
    if (!Number.isFinite(dm) || dm <= 0 || (needsSecond && (!Number.isFinite(dmTo) || dmTo <= 0))) {
      Alert.alert('Hibás DM', 'Adj meg érvényes átmérőt.');
      return;
    }
    await convertMarkersToParts({
      projectId,
      markerIds: openMarkers.map((marker) => marker.id),
      kind: nextKind,
      diameterMm: dm,
      diameterToMm: needsSecond ? dmTo : null,
    });
    setModalOpen(false);
    await load();
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    if (next !== 'pipe') setSelectedPairId(null);
  };

  const zoomBy = (factor: number) => {
    const current = viewRef.current;
    const next = clampScale(current.scale * factor);
    const centerX = size.width / 2;
    const centerY = size.height / 2;
    const worldX = (centerX - current.offsetX) / current.scale;
    const worldY = (centerY - current.offsetY) / current.scale;
    updateView({
      scale: next,
      offsetX: centerX - worldX * next,
      offsetY: centerY - worldY * next,
    });
  };

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ width, height });
  };

  const gridSpacing = 28 * view.scale;
  const symbolScale = Math.max(0.68, Math.min(1.05, Math.sqrt(view.scale) * 0.82));
  const drawingWidth = Math.max(2, Math.min(7, 3 * Math.sqrt(view.scale)));
  const gridStartX = ((view.offsetX % gridSpacing) + gridSpacing) % gridSpacing;
  const gridStartY = ((view.offsetY % gridSpacing) + gridSpacing) % gridSpacing;
  const gridX = Array.from(
    { length: Math.ceil(size.width / gridSpacing) + 1 },
    (_, index) => gridStartX + index * gridSpacing
  );
  const gridY = Array.from(
    { length: Math.ceil(size.height / gridSpacing) + 1 },
    (_, index) => gridStartY + index * gridSpacing
  );
  const draftPair = draftPoints.length ? makePipePair(draftPoints, size) : null;

  const confirmProjectDelete = () => {
    setProjectMenuOpen(false);
    setDeleteConfirmOpen(true);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <ModeButton active={mode === 'pan'} label="✋" onPress={() => changeMode('pan')} />
        <ModeButton active={mode === 'draw'} label="✎" onPress={() => changeMode('draw')} />
        <ModeButton active={mode === 'mark'} label="＋ X" onPress={() => changeMode('mark')} />
        <ModeButton active={mode === 'pipe'} label="║" onPress={() => changeMode('pipe')} />
        <AnimatedPressable
          style={[styles.toolButton, openMarkers.length > 0 && styles.batchButton]}
          onPress={openConvert}
        >
          <Text style={[styles.toolText, openMarkers.length > 0 && styles.batchButtonText]}>
            M {openMarkers.length}
          </Text>
        </AnimatedPressable>
        <AnimatedPressable style={[styles.toolButton, styles.toolButtonCompact]} onPress={() => zoomBy(1 / 1.4)}>
          <Text style={styles.toolText}>−</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.toolButton, styles.toolButtonCompact]}
          onPress={() => updateView({ scale: 1, offsetX: 0, offsetY: 0 })}
        >
          <Text style={styles.toolText}>
            {Math.abs(view.scale - 1) < 0.05 ? '1:1' : `${view.scale.toFixed(1)}×`}
          </Text>
        </AnimatedPressable>
        <AnimatedPressable style={[styles.toolButton, styles.toolButtonCompact]} onPress={() => zoomBy(1.4)}>
          <Text style={styles.toolText}>＋</Text>
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.toolButton}
          onPress={async () => {
            await undoCanvasAction(projectId);
            await load();
          }}
        >
          <Text style={styles.toolText}>↶</Text>
        </AnimatedPressable>
      </View>

      {mode === 'pipe' && selectedPairId ? (
        <View style={styles.spacingBar}>
          <Text style={styles.spacingLabel}>VL–RL távolság</Text>
          <AnimatedPressable style={styles.spacingButton} onPress={() => void changePipeSpacing(-4)}>
            <Text style={styles.spacingButtonText}>−</Text>
          </AnimatedPressable>
          <Text style={styles.spacingValue}>{pipeSpacing} px</Text>
          <AnimatedPressable style={styles.spacingButton} onPress={() => void changePipeSpacing(4)}>
            <Text style={styles.spacingButtonText}>＋</Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => setSelectedPairId(null)}>
            <Text style={styles.spacingDone}>Kész</Text>
          </AnimatedPressable>
        </View>
      ) : null}

      <View
        style={[styles.canvas, webGestureLock]}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          {gridX.map((x, index) => (
            <Line
              key={`gx-${index}`}
              x1={x}
              y1={0}
              x2={x}
              y2={size.height}
              stroke="#dce5e9"
              strokeWidth={1}
            />
          ))}
          {gridY.map((y, index) => (
            <Line
              key={`gy-${index}`}
              x1={0}
              y1={y}
              x2={size.width}
              y2={y}
              stroke="#dce5e9"
              strokeWidth={1}
            />
          ))}
          {[
            ...strokes,
            ...(draftPair
              ? [
                  {
                    id: 'draft-vl',
                    points: draftPair[0],
                    pipeKind: 'vorlauf' as const,
                    pairId: undefined,
                  },
                  {
                    id: 'draft-rl',
                    points: draftPair[1],
                    pipeKind: 'ruecklauf' as const,
                    pairId: undefined,
                  },
                ]
              : []),
          ].map((stroke) => (
              <Path
                key={stroke.id}
                d={pathFor(stroke.points)}
                stroke={stroke.pairId === selectedPairId ? colors.accent : '#154d78'}
                strokeWidth={stroke.pairId === selectedPairId ? drawingWidth + 2 : drawingWidth}
                strokeDasharray={
                  stroke.pipeKind === 'ruecklauf'
                    ? `${12 * symbolScale} ${10 * symbolScale}`
                    : undefined
                }
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          {laidOutMarkers
            .filter((item) => item.caption)
            .map((item) => (
              <Line
                key={`lead-${item.id}`}
                x1={item.pipeX}
                y1={item.pipeY}
                x2={item.labelX + item.width / 2}
                y2={item.labelY + item.height / 2}
                stroke={colors.total}
                strokeWidth={1}
                opacity={0.4}
              />
            ))}
        </Svg>

        {laidOutMarkers.map((item) => (
          <Fragment key={item.id}>
            <View
              pointerEvents="none"
              style={[
                styles.pipeTick,
                item.caption ? styles.pipeTickDone : styles.pipeTickOpen,
                { left: item.pipeX - 5, top: item.pipeY - 5 },
              ]}
            />
            {item.caption ? (
              <View
                pointerEvents="none"
                style={[
                  styles.completedMarker,
                  {
                    left: item.labelX,
                    top: item.labelY,
                    width: item.width,
                    height: item.height,
                  },
                ]}
              >
                <Text selectable={false} numberOfLines={1} style={styles.completedCaption}>
                  {item.caption}
                </Text>
              </View>
            ) : null}
          </Fragment>
        ))}

        {markers.length === 0 && strokes.length === 0 ? (
          <View pointerEvents="none" style={styles.help}>
            <Text selectable={false} style={styles.helpTitle}>Rajzold fel a szakaszt</Text>
            <Text selectable={false} style={styles.helpText}>
              Egy vonalat rajzolj: a folytonos VL és a szaggatott RL automatikusan együtt készül.
              Ezután kapcsold be a „＋ X” módot.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.status}>
        <Text style={styles.statusText}>
          {mode === 'pan'
            ? 'Mozgatás mód · egy ujjal húzd a papírt'
            : mode === 'draw'
              ? 'Rajz mód · a lap rögzítve marad az ujjad alatt'
            : mode === 'mark'
              ? `${openMarkers.length} aktuális X · hosszan nyomd vagy Muff (${openMarkers.length})`
              : selectedPairId
                ? 'Cső kijelölve · állítsd a VL–RL távolságot'
                : 'Cső mód · koppints egy vonalpárra'}
        </Text>
        <AnimatedPressable onPress={() => navigation.navigate('MuffList', { projectId })}>
          <Text style={styles.listLink}>Lista ({parts.length})</Text>
        </AnimatedPressable>
      </View>

      <Modal
        visible={projectMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setProjectMenuOpen(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setProjectMenuOpen(false)}>
          <View style={styles.projectMenu}>
            <Text style={styles.projectMenuTitle}>Projekt menü</Text>
            <AnimatedPressable
              style={styles.menuRow}
              onPress={() => {
                setProjectMenuOpen(false);
                navigation.navigate('ProjectForm', { projectId });
              }}
            >
              <Text style={styles.menuRowText}>Projekt szerkesztése</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.menuRow} onPress={confirmProjectDelete}>
              <Text style={styles.menuDeleteText}>Projekt törlése</Text>
            </AnimatedPressable>
            <AnimatedPressable style={styles.menuCancel} onPress={() => setProjectMenuOpen(false)}>
              <Text style={styles.menuCancelText}>Mégse</Text>
            </AnimatedPressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={deleteConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmOpen(false)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Projekt törlése?</Text>
            <Text style={styles.confirmText}>
              A projekt, a teljes rajz és az összes muff végleg törlődik.
            </Text>
            <View style={styles.confirmActions}>
              <AnimatedPressable style={styles.confirmCancel} onPress={() => setDeleteConfirmOpen(false)}>
                <Text style={styles.confirmCancelText}>Mégse</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={styles.confirmDelete}
                onPress={async () => {
                  setDeleteConfirmOpen(false);
                  await deleteProject(projectId);
                  navigation.navigate('ProjectList');
                }}
              >
                <Text style={styles.confirmDeleteText}>Projekt törlése</Text>
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>

      {modalOpen ? (
        <View style={styles.convertOverlay} pointerEvents="box-none">
          <Pressable style={styles.backdropDismiss} onPress={() => setModalOpen(false)} />
          <View style={styles.sheet} pointerEvents="auto">
            <View style={styles.sheetHandle} />
            <ScrollView
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              style={styles.sheetScroll}
            >
              <Text style={styles.sheetTitle}>{openMarkers.length} aktuális X átalakítása</Text>
              <View style={styles.selectedSummary}>
                <Text style={styles.selectedSummaryLabel}>Kijelölt X mérete</Text>
                <Text style={styles.selectedSummaryValue}>
                  {partKindLabel(kind)} · {formatKindDims(kind, diameter, diameterTo)}
                </Text>
              </View>

              <KindChips value={kind} onChange={setKind} />

              <DimensionPicker
                name="dm-primary"
                label={kindPrimaryDmLabel(kind)}
                value={diameter}
                onSelect={setDiameter}
              />

              {kindNeedsSecondDm(kind) ? (
                <DimensionPicker
                  name="dm-secondary"
                  label={kindSecondDmLabel(kind)}
                  value={diameterTo}
                  onSelect={setDiameterTo}
                />
              ) : null}

              <AnimatedPressable style={styles.saveButton} onPress={saveConversion}>
                <Text style={styles.saveText}>
                  Átalakítás · {partKindLabel(kind)} · {formatKindDims(kind, diameter, diameterTo)} ·{' '}
                  {openMarkers.length} db
                </Text>
              </AnimatedPressable>
            </ScrollView>
          </View>
        </View>
      ) : null}
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
    <AnimatedPressable style={[styles.toolButton, active && styles.toolButtonActive]} onPress={onPress}>
      <Text style={[styles.toolText, active && styles.toolTextActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

const webGestureLock =
  Platform.OS === 'web'
    ? ({
        touchAction: 'none',
        overscrollBehavior: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      } as never)
    : undefined;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#dfe5e8' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerMenu: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMenuText: { color: '#fff', fontSize: 27, fontWeight: '800', lineHeight: 28 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 5,
    padding: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadow.bar,
  },
  toolButton: {
    width: 40,
    height: 36,
    paddingHorizontal: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolButtonCompact: { width: 30 },
  toolButtonActive: { backgroundColor: colors.accent },
  toolText: { color: colors.ink, fontWeight: '800', fontSize: 13 },
  toolTextActive: { color: '#fff' },
  batchButton: { backgroundColor: colors.total },
  batchButtonText: { color: '#fff' },
  spacingBar: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff3e6',
    borderBottomWidth: 1,
    borderBottomColor: '#f0c08d',
  },
  spacingLabel: { flex: 1, color: colors.ink, fontWeight: '800', fontSize: 13 },
  spacingButton: {
    width: 38,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacingButtonText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  spacingValue: { minWidth: 50, textAlign: 'center', color: colors.ink, fontWeight: '800' },
  spacingDone: { color: colors.total, fontWeight: '800', padding: 8 },
  canvas: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 6,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#c6d0d5',
    ...shadow.card,
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
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pipeTick: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  pipeTickOpen: { backgroundColor: colors.danger },
  pipeTickDone: { backgroundColor: colors.total },
  completedMarker: {
    position: 'absolute',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.total,
    backgroundColor: 'rgba(234,248,240,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  completedCaption: { color: colors.ink, fontSize: 10, fontWeight: '800', lineHeight: 12 },
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
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 58,
    paddingRight: 10,
  },
  projectMenu: {
    width: 250,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 8,
    ...shadow.bar,
  },
  projectMenuTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuRow: { paddingHorizontal: 12, paddingVertical: 14, borderRadius: 8 },
  menuRowText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  menuDeleteText: { color: colors.danger, fontSize: 16, fontWeight: '800' },
  menuCancel: { paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center' },
  menuCancelText: { color: colors.muted, fontWeight: '700' },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadow.bar,
  },
  confirmTitle: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  confirmText: { color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 8 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  confirmCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  confirmCancelText: { color: colors.ink, fontWeight: '800' },
  confirmDelete: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  confirmDeleteText: { color: '#fff', fontWeight: '800' },
  convertOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 20,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
    zIndex: 2,
    ...shadow.bar,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: 10,
  },
  sheetScroll: { maxHeight: 520 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginBottom: 10 },
  selectedSummary: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  selectedSummaryLabel: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  selectedSummaryValue: { color: colors.ink, fontSize: 20, fontWeight: '900' },
  sheetHint: { color: colors.muted, marginTop: 4, marginBottom: spacing.md },
  chips: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.ink, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  label: { color: colors.ink, fontWeight: '800', marginBottom: 7 },
  dimensionBlock: { marginBottom: spacing.md },
  dimensionField: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dimensionFieldOpen: { borderColor: colors.accent, backgroundColor: '#fff3e6' },
  dimensionValue: { color: colors.ink, fontSize: 22, fontWeight: '900' },
  dimensionArrow: { color: colors.muted, fontSize: 22, fontWeight: '800' },
  dimensionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '82%',
  },
  dimensionList: {
    maxHeight: 220,
    marginTop: -8,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dimensionRow: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dimensionRowActive: { backgroundColor: '#fff3e6' },
  dimensionRowText: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  dimensionRowTextActive: { color: colors.accent, fontWeight: '900' },
  dimensionCheck: { color: colors.accent, fontSize: 20, fontWeight: '900' },
  saveButton: {
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: radius.md,
    alignItems: 'center',
    ...shadow.card,
  },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
