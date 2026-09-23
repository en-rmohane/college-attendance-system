import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { TimetableSlot } from '../types';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface TimetableSlotCardProps {
  slot: TimetableSlot;
  isNow?: boolean;
}

export const TimetableSlotCard: React.FC<TimetableSlotCardProps> = ({ slot, isNow = false }) => {
  const { colors } = useTheme();
  const isLab = slot.slotType === 'lab';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isNow ? colors.primary : colors.border,
          borderLeftColor: isLab ? colors.accent : colors.primary,
          borderLeftWidth: 4,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.periodBadgeRow}>
          <View style={[styles.periodBadge, { backgroundColor: colors.surfaceSubtle }]}>
            <Text style={[styles.periodText, { color: colors.text }]}>Period {slot.periodNumber}</Text>
          </View>

          <View
            style={[
              styles.typeBadge,
              { backgroundColor: isLab ? colors.accentSubtle : colors.primarySubtle },
            ]}
          >
            {isLab ? (
              <MaterialCommunityIcons name="flask-outline" size={13} color={colors.accent} />
            ) : (
              <Feather name="book-open" size={12} color={colors.primary} />
            )}
            <Text
              style={[
                styles.typeText,
                { color: isLab ? colors.accent : colors.primary },
              ]}
            >
              {isLab ? 'Practical / Lab (2h)' : 'Lecture'}
            </Text>
          </View>
        </View>

        {isNow && (
          <View style={[styles.nowBadge, { backgroundColor: colors.successSubtle }]}>
            <Text style={[styles.nowText, { color: colors.success }]}>● ONGOING</Text>
          </View>
        )}
      </View>

      <Text style={[styles.subjectName, { color: colors.text }]}>{slot.subjectName}</Text>
      <Text style={[styles.subjectCode, { color: colors.textSecondary }]}>{slot.subjectCode}</Text>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Feather name="clock" size={13} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{slot.timeSlot}</Text>
        </View>

        <View style={styles.detailItem}>
          <Feather name="map-pin" size={13} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>{slot.roomNumber}</Text>
        </View>

        <View style={styles.detailItem}>
          <Feather name="user" size={13} color={colors.textSecondary} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
            {slot.facultyName}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  periodBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '700',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subjectCode: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    marginBottom: 10,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
