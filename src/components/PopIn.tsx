import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

/** Mount-kor rövid pop (X marker, új sor). */
export function PopIn({
  children,
  style,
  delay = 0,
  pointerEvents,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  pointerEvents?: ViewProps['pointerEvents'];
}) {
  const scale = useRef(new Animated.Value(0.55)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 22,
          bounciness: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]),
    ]);
    anim.start();
    return () => anim.stop();
  }, [delay, opacity, scale]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }], pointerEvents }]}>
      {children}
    </Animated.View>
  );
}
