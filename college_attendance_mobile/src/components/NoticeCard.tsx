import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Notice } from '../types';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';

interface NoticeCardProps {
  notice: Notice;
  onPress?: () => void;
}

export const NoticeCard: React.FC<NoticeCardProps> = ({ notice, onPress }) => {
  const { colors } = useTheme();

  const getCategoryColor = () => {
    switch (notice.category) {
      case 'exam':
        return colors.danger;
      case 'event':
        return colors.accent;
      case 'transport':
        return colors.warning;
      case 'academic':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const categoryColor = getCategoryColor();

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: notice.isImportant ? colors.danger : colors.border,
          borderWidth: notice.isImportant ? 1.5 : 1,
        },
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.topRow}>
        <View style={styles.badgesGroup}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: `${categoryColor}18` },
            ]}
          >
            <Text style={[styles.categoryText, { color: categoryColor }]}>
              {notice.category.toUpperCase()}
            </Text>
          </View>

          {notice.isImportant && (
            <View style={[styles.urgentBadge, { backgroundColor: colors.dangerSubtle }]}>
              <Ionicons name="alert-circle" size={12} color={colors.danger} />
              <Text style={[styles.urgentText, { color: colors.danger }]}>URGENT</Text>
            </View>
          )}
        </View>

        <View style={styles.dateRow}>
          <Feather name="calendar" size={12} color={colors.textMuted} />
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{notice.createdAt}</Text>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {notice.title}
      </Text>

      <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
        {notice.message}
      </Text>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.authorRow}>
          <MaterialIcons name="verified-user" size={13} color={colors.textMuted} />
          <Text style={[styles.authorText, { color: colors.textMuted }]}>
            Issued by: {notice.creatorName}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authorText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
