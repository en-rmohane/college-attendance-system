import React, { useRef } from 'react';
import {
  Animated,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  GestureResponderEvent,
} from 'react-native';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
  activeOpacity?: number;
  scaleTo?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  containerStyle,
  onPress,
  activeOpacity = 0.85,
  scaleTo = 0.97,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleTo,
      useNativeDriver: false,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: false,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={!onPress}
      style={containerStyle}
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

