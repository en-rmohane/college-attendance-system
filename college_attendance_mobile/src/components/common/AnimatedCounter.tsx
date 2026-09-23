import React, { useEffect, useState, useRef } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: StyleProp<TextStyle>;
  formatCommas?: boolean;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 800,
  prefix = '',
  suffix = '',
  style,
  formatCommas = true,
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<any>(null);

  useEffect(() => {
    let startVal = 0;
    const targetVal = value;
    const startTime = Date.now();
    startTimeRef.current = startTime;

    const updateCounter = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing: easeOutExpo
      const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(startVal + (targetVal - startVal) * easedProgress);

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(updateCounter);
      }
    };

    animFrameRef.current = requestAnimationFrame(updateCounter);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration]);

  const formatted = formatCommas
    ? displayValue.toLocaleString('en-IN')
    : displayValue.toString();

  return (
    <Text style={style}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
};
