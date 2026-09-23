import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AnimatedCard } from './AnimatedCard';
import { AnimatedCounter } from './AnimatedCounter';
import { useTheme } from '../../context/ThemeContext';

interface StatCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  subtitle: string;
  icon: React.ReactNode;
  bgColor: string;
  accentColor: string;
  trendText?: string;
  trendPositive?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  subtitle,
  icon,
  bgColor,
  accentColor,
  trendText,
  trendPositive = true,
  onPress,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <AnimatedCard
      onPress={onPress}
      style={[
        styles.cardContainer,
        {
          backgroundColor: bgColor,
          borderColor: accentColor ? `${accentColor}30` : colors.border,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: `${accentColor}25` }]}>
          {icon}
        </View>
        {trendText ? (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor: trendPositive
                  ? `${colors.green}20`
                  : `${colors.coral}20`,
              },
            ]}
          >
            <Text
              style={[
                styles.trendText,
                { color: trendPositive ? colors.green : colors.coral },
              ]}
            >
              {trendText}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>

      <AnimatedCounter
        value={value}
        prefix={prefix}
        suffix={suffix}
        style={[styles.value, { color: colors.text }]}
      />

      <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
        {subtitle}
      </Text>
    </AnimatedCard>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
});
