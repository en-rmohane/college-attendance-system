import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export type BadgeStatus =
  | 'present'
  | 'absent'
  | 'leave'
  | 'pending'
  | 'approved'
  | 'completed'
  | 'upcoming'
  | 'danger';

interface StatusBadgeProps {
  status: BadgeStatus | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  style,
}) => {
  const { colors } = useTheme();

  const getTheme = () => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'present':
      case 'approved':
      case 'completed':
      case 'paid':
      case 'active':
        return {
          bg: colors.softGreen,
          text: colors.green,
          dot: colors.green,
          defaultLabel: label || 'PRESENT',
        };
      case 'absent':
      case 'danger':
      case 'rejected':
      case 'defaulter':
        return {
          bg: colors.softPeach,
          text: colors.coral,
          dot: colors.coral,
          defaultLabel: label || 'ABSENT',
        };
      case 'pending':
      case 'warning':
      case 'unpaid':
        return {
          bg: colors.softYellow,
          text: colors.amber,
          dot: colors.amber,
          defaultLabel: label || 'PENDING',
        };
      case 'leave':
      case 'info':
      case 'upcoming':
        return {
          bg: colors.softLavender,
          text: colors.purple,
          dot: colors.purple,
          defaultLabel: label || 'UPCOMING',
        };
      default:
        return {
          bg: colors.softBlue,
          text: colors.primary,
          dot: colors.primary,
          defaultLabel: label || status.toUpperCase(),
        };
    }
  };

  const current = getTheme();
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: current.bg,
          paddingVertical: isSm ? 2 : isLg ? 6 : 4,
          paddingHorizontal: isSm ? 6 : isLg ? 12 : 8,
        },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: current.dot }]} />
      <Text
        style={[
          styles.text,
          {
            color: current.text,
            fontSize: isSm ? 9 : isLg ? 12 : 10,
          },
        ]}
      >
        {label || current.defaultLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
