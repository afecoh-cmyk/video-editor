import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Line, Path } from 'react-native-svg';
import type { RootStackParamList } from '../navigation';
import {
  addCanvasMarker,
  addCanvasStrokePair,
  convertMarkersToParts,
  deleteProject,
  getCanvas,
  getProject,
  listParts,
  undoCanvasAction,
  updateCanvasStrokePair,
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
type Mode = 'pan' | 'draw' | 'mark' | 'pipe';
type ViewTransform = { scale: number; offsetX: number; offsetY: number };

function pointToSegmentDistance(
  point: CanvasPoint,
  start: CanvasPoint,
  end: CanvasPoint,
  size: { width: number; height: number }
): number {
  const px = point.x * size.width;
  const py = point.y * size.height;
  const ax = start.x * size.width;
  const ay = start.y * size.height;
  const bx = end.x * size.width;
  const by = end.y * size.height;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const ratio =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + ratio * dx), py - (ay + ratio * dy));
}

/** Ramer–Douglas–Peucker: a kézremegést eltávolítja, a valódi sarkokat megtartja. */
function simplifyPipePath(
  points: CanvasPoint[],
  size: { width: number; height: number },
  tolerancePx: number
): CanvasPoint[] {
  if (points.length <= 2) return points;
  let farthestIndex = 0;
  let farthestDistance = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = pointToSegmentDistance(
      points[index],
      points[0],
      points[points.length - 1],
      size
    );
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestIndex = index;
    }
  }
  if (farthestDistance <= tolerancePx) return [points[0], points[points.length - 1]];
  const left = simplifyPipePath(points.slice(0, farthestIndex + 1), size, tolerancePx);
  const right = simplifyPipePath(points.slice(farthestIndex), size, tolerancePx);
  return [...left.slice(0, -1), ...right];
}

function offsetPipe(
  points: CanvasPoint[],
  offsetPx: number,
  size: { width: number; height: number }
): CanvasPoint[] {
  return points.map((point, index) => {
    const before = points[Math.max(0, index - 1)];
    const after = points[Math.min(points.length - 1, index + 1)];
    const dx = (after.x - before.x) * size.width;
    const dy = (after.y - before.y) * size.height;
    const length = Math.hypot(dx, dy) || 1;
    return {
      x: point.x + (-dy / length) * (offsetPx / size.width),
      y: point.y + (dx / length) * (offsetPx / size.height),
    };
  });
}

function makePipePair(
  points: CanvasPoint[],
  size: { width: number; height: number },
  spacingPx = 28
): [CanvasPoint[], CanvasPoint[]] {
  return [
    offsetPipe(points, -spacingPx / 2, size),
    offsetPipe(points, spacingPx / 2, size),
  ];
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Projekt menü"
          hitSlop={12}
          onPress={() => setProjectMenuOpen(true)}
          style={styles.headerMenu}
        >
          <Text selectable={false} style={styles.headerMenuText}>⋮</Text>
        </Pressable>
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
            const dampedRatio = 1 + (rawRatio - 1) * 0.55;
            const scale = Math.max(
              0.8,
              Math.min(2.2, pinch.startScale * dampedRatio)
            );
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
          const cleaned = simplifyPipePath(points, size, 9 / viewRef.current.scale);
          const [vorlauf, ruecklauf] = makePipePair(cleaned, size);
          await addCanvasStrokePair(projectId, vorlauf, ruecklauf);
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
    [beginPinch, load, mode, projectId, screenToWorld, size, updateView]
  );

  const partsById = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);
  const openMarkers = markers.filter((m) => !m.partId);

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
    const dm = Number(diameter);
    const dmTo = Number(diameterTo);
    const needsSecond = kind !== 'muffe';
    if (!Number.isFinite(dm) || dm <= 0 || (needsSecond && (!Number.isFinite(dmTo) || dmTo <= 0))) {
      Alert.alert('Hibás DM', 'Adj meg érvényes átmérőt.');
      return;
    }
    await convertMarkersToParts({
      projectId,
      markerIds: openMarkers.map((marker) => marker.id),
      kind,
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

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ width, height });
  };

  const gridSpacing = 28 * view.scale;
  const symbolScale = Math.max(0.68, Math.min(1.05, Math.sqrt(view.scale) * 0.82));
  const drawingWidth = Math.max(2, Math.min(4.5, 3 * Math.sqrt(view.scale)));
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.toolbar}
      >
        <ModeButton active={mode === 'pan'} label="✋ Mozgat" onPress={() => changeMode('pan')} />
        <ModeButton active={mode === 'draw'} label="✎ Rajz" onPress={() => changeMode('draw')} />
        <ModeButton active={mode === 'mark'} label="＋ X" onPress={() => changeMode('mark')} />
        <ModeButton active={mode === 'pipe'} label="Cső" onPress={() => changeMode('pipe')} />
        <Pressable
          style={[styles.toolButton, openMarkers.length > 0 && styles.batchButton]}
          onPress={openConvert}
        >
          <Text style={[styles.toolText, openMarkers.length > 0 && styles.batchButtonText]}>
            Muff ({openMarkers.length})
          </Text>
        </Pressable>
        <Pressable
          style={styles.toolButton}
          onPress={() => updateView({ scale: 1, offsetX: 0, offsetY: 0 })}
        >
          <Text style={styles.toolText}>1:1</Text>
        </Pressable>
        <Pressable
          style={styles.toolButton}
          onPress={async () => {
            await undoCanvasAction(projectId);
            await load();
          }}
        >
          <Text style={styles.toolText}>↶</Text>
        </Pressable>
      </ScrollView>

      {mode === 'pipe' && selectedPairId ? (
        <View style={styles.spacingBar}>
          <Text style={styles.spacingLabel}>VL–RL távolság</Text>
          <Pressable style={styles.spacingButton} onPress={() => void changePipeSpacing(-4)}>
            <Text style={styles.spacingButtonText}>−</Text>
          </Pressable>
          <Text style={styles.spacingValue}>{pipeSpacing} px</Text>
          <Pressable style={styles.spacingButton} onPress={() => void changePipeSpacing(4)}>
            <Text style={styles.spacingButtonText}>＋</Text>
          </Pressable>
          <Pressable onPress={() => setSelectedPairId(null)}>
            <Text style={styles.spacingDone}>Kész</Text>
          </Pressable>
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
        </Svg>

        {markers.map((marker) => {
          const part = marker.partId ? partsById.get(marker.partId) : null;
          return (
            <View
              key={marker.id}
              style={[
                styles.marker,
                {
                  left: marker.x * size.width * view.scale + view.offsetX - (part ? 26 : 14),
                  top: marker.y * size.height * view.scale + view.offsetY - (part ? 17 : 14),
                },
                part && styles.completedMarker,
                { transform: [{ scale: symbolScale }] },
              ]}
            >
              {part ? (
                <>
                  <Text selectable={false} style={styles.completedType}>{partKindLabel(part.kind)}</Text>
                  <Text selectable={false} style={styles.completedDm}>
                    {formatPartDims(part).replace('DM ', '')}
                  </Text>
                </>
              ) : (
                <Text selectable={false} style={styles.xText}>×</Text>
              )}
            </View>
          );
        })}

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
        <Pressable onPress={() => navigation.navigate('MuffList', { projectId })}>
          <Text style={styles.listLink}>Lista ({parts.length})</Text>
        </Pressable>
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
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                setProjectMenuOpen(false);
                navigation.navigate('ProjectForm', { projectId });
              }}
            >
              <Text style={styles.menuRowText}>Projekt szerkesztése</Text>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={confirmProjectDelete}>
              <Text style={styles.menuDeleteText}>Projekt törlése</Text>
            </Pressable>
            <Pressable style={styles.menuCancel} onPress={() => setProjectMenuOpen(false)}>
              <Text style={styles.menuCancelText}>Mégse</Text>
            </Pressable>
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
              <Pressable style={styles.confirmCancel} onPress={() => setDeleteConfirmOpen(false)}>
                <Text style={styles.confirmCancelText}>Mégse</Text>
              </Pressable>
              <Pressable
                style={styles.confirmDelete}
                onPress={async () => {
                  setDeleteConfirmOpen(false);
                  await deleteProject(projectId);
                  navigation.navigate('ProjectList');
                }}
              >
                <Text style={styles.confirmDeleteText}>Projekt törlése</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.sheetTitle}>{openMarkers.length} aktuális X átalakítása</Text>
            <Text style={styles.sheetHint}>
              Mindegyik jelenlegi X egy darab tétel lesz. Az ezután lerakott X-ek új csoportot alkotnak.
            </Text>

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
              <Text style={styles.saveText}>Átalakítás ({openMarkers.length} db)</Text>
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
    borderRadius: 8,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  completedMarker: {
    width: 52,
    height: 34,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.total,
    backgroundColor: '#eaf8f0',
  },
  xText: { color: colors.danger, fontSize: 22, fontWeight: '900', lineHeight: 24 },
  completedType: { color: colors.total, fontSize: 9, fontWeight: '800' },
  completedDm: { color: colors.ink, fontSize: 10, fontWeight: '800' },
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
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
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
    borderRadius: 16,
    padding: spacing.lg,
  },
  confirmTitle: { color: colors.ink, fontSize: 22, fontWeight: '800' },
  confirmText: { color: colors.muted, fontSize: 15, lineHeight: 21, marginTop: 8 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: spacing.lg },
  confirmCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  confirmCancelText: { color: colors.ink, fontWeight: '800' },
  confirmDelete: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  confirmDeleteText: { color: '#fff', fontWeight: '800' },
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
