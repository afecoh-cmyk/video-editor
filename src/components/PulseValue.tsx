import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type TextStyle } from 'react-native';

/** Rövid scale-pulse, ha a megjelenített érték változik (+/− visszajelzés). */
export function PulseValue({
  value,
  style,
  children,
}: {
  value: string | number;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.setValue(1);
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.18,
        useNativeDriver: true,
        speed: 48,
        bounciness: 8,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 28,
        bounciness: 4,
      }),
    ]).start();
  }, [value, scale]);

  return (
    <Animated.Text style={[style, { transform: [{ scale }] }]}>
      {children ?? value}
    </Animated.Text>
  );
}
