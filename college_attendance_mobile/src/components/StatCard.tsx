import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accentColor?: string;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'danger' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  badge,
  badgeType = 'info',
}) => {
  const { colors } = useTheme();

  const getBadgeColors = () => {
    switch (badgeType) {
      case 'success':
        return { bg: colors.successSubtle, text: colors.success };
      case 'warning':
        return { bg: colors.warningSubtle, text: colors.warning };
      case 'danger':
        return { bg: colors.dangerSubtle, text: colors.danger };
      default:
        return { bg: colors.primarySubtle, text: colors.primary };
    }
  };

  const badgeColor = getBadgeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: accentColor ? `${accentColor}1A` : colors.primarySubtle }]}>
          {icon}
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeColor.bg }]}>
            <Text style={[styles.badgeText, { color: badgeColor.text }]}>{badge}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
