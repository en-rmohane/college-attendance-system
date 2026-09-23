import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SubjectAttendance } from '../types';
import { Ionicons, Feather } from '@expo/vector-icons';

interface AttendanceCardProps {
  item: SubjectAttendance;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({ item }) => {
  const { colors } = useTheme();

  const getStatusConfig = () => {
    if (item.percentage >= 75) {
      return {
        color: colors.success,
        bgColor: colors.successSubtle,
        icon: <Ionicons name="checkmark-circle" size={16} color={colors.success} />,
        label: 'Safe',
        insight: item.classesCanSkip > 0 ? `Can miss ${item.classesCanSkip} lecture${item.classesCanSkip > 1 ? 's' : ''}` : 'On track (75%)',
      };
    } else if (item.percentage >= 65) {
      return {
        color: colors.warning,
        bgColor: colors.warningSubtle,
        icon: <Ionicons name="alert-circle" size={16} color={colors.warning} />,
        label: 'Warning',
        insight: `Attend next ${item.classesNeededFor75} lecture${item.classesNeededFor75 > 1 ? 's' : ''} to reach 75%`,
      };
    } else {
      return {
        color: colors.danger,
        bgColor: colors.dangerSubtle,
        icon: <Ionicons name="close-circle" size={16} color={colors.danger} />,
        label: 'Shortage',
        insight: `Must attend next ${item.classesNeededFor75} lectures urgently`,
      };
    }
  };

  const status = getStatusConfig();
  const progressPercent = Math.min(Math.max(item.percentage, 0), 100);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headerRow}>
        <View style={styles.subjectInfo}>
          <View style={styles.codeRow}>
            <View style={[styles.codeBadge, { backgroundColor: colors.primarySubtle }]}>
              <Text style={[styles.codeText, { color: colors.primary }]}>{item.subjectCode}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
              {status.icon}
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={2}>
            {item.subjectName}
          </Text>
          <View style={styles.facultyRow}>
            <Feather name="user" size={13} color={colors.textSecondary} />
            <Text style={[styles.facultyName, { color: colors.textSecondary }]}>
              {item.professorName}
            </Text>
          </View>
        </View>

        <View style={styles.percentageContainer}>
          <Text style={[styles.percentageValue, { color: status.color }]}>
            {item.percentage.toFixed(1)}%
          </Text>
          <Text style={[styles.lectureCount, { color: colors.textMuted }]}>
            {item.attendedLectures}/{item.totalLectures} Attended
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceSubtle }]}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${progressPercent}%`,
              backgroundColor: status.color,
            },
          ]}
        />
        {/* 75% Target Marker */}
        <View style={[styles.marker75, { backgroundColor: colors.textMuted }]} />
      </View>

      {/* Footer / Smart Insight */}
      <View style={[styles.insightRow, { backgroundColor: colors.surfaceSubtle }]}>
        <Text style={[styles.insightText, { color: status.color }]}>
          💡 {status.insight}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  subjectInfo: {
    flex: 1,
    paddingRight: 10,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 4,
  },
  facultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  facultyName: {
    fontSize: 12,
    fontWeight: '500',
  },
  percentageContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  percentageValue: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  lectureCount: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  marker75: {
    position: 'absolute',
    left: '75%',
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 2,
  },
  insightRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  insightText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
