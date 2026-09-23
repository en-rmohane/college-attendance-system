import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SubjectAttendance, AttendanceDayLog } from '../types';
import { Ionicons, Feather } from '@expo/vector-icons';
import { AnimatedCard } from '../components/common/AnimatedCard';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { StatusBadge } from '../components/common/StatusBadge';

export const AttendanceScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'subjects' | 'logs'>('subjects');
  const [subjects, setSubjects] = useState<SubjectAttendance[]>([]);
  const [logs, setLogs] = useState<AttendanceDayLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Animated progress value
  const progressAnim = useRef(new Animated.Value(0)).current;

  const loadAttendance = async () => {
    try {
      const data = await api.getAttendanceSummary(user?.roll);
      setSubjects(data.subjects);
      setLogs(data.recentLogs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadAttendance();
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAttendance();
    setRefreshing(false);
  };

  const overallPercentage = 87;
  const totalClasses = 179;
  const totalPresent = 146;
  const totalAbsent = totalClasses - totalPresent;

  // Get pastel theme per subject name
  const getSubjectColor = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('data') || n.includes('structure')) {
      return { bg: colors.softGreen, accent: colors.green };
    }
    if (n.includes('network') || n.includes('communication')) {
      return { bg: colors.softBlue, accent: colors.primary };
    }
    if (n.includes('operating') || n.includes('system') || n.includes('os')) {
      return { bg: colors.softLavender, accent: colors.purple };
    }
    if (n.includes('dbms') || n.includes('database') || n.includes('data base')) {
      return { bg: colors.softPeach, accent: colors.coral };
    }
    return { bg: colors.softCyan, accent: colors.teal };
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header Card */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle }]}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Attendance Overview</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {user?.branch || 'CSE'} Department • Semester {user?.semester || 3} (Odd)
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= SOFT PASTEL CIRCULAR HERO CARD ================= */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <View style={[styles.eligibilityPill, { backgroundColor: colors.softGreen }]}>
                <Ionicons name="checkmark-circle" size={13} color={colors.green} />
                <Text style={[styles.eligibilityText, { color: colors.green }]}>
                  RGPV 75% CRITERIA SATISFIED
                </Text>
              </View>
              <Text style={[styles.heroHeading, { color: colors.text }]}>
                Overall Attendance
              </Text>
              <Text style={[styles.heroSubtext, { color: colors.textSecondary }]}>
                You can safely skip up to 14 classes without falling below 75%
              </Text>
            </View>

            {/* Circular Progress Gauge */}
            <View style={styles.gaugeContainer}>
              <View style={[styles.gaugeCircle, { borderColor: colors.green, backgroundColor: colors.softGreen }]}>
                <AnimatedCounter
                  value={overallPercentage}
                  suffix="%"
                  style={[styles.gaugeValue, { color: colors.text }]}
                />
                <Text style={[styles.gaugeLabel, { color: colors.green }]}>Aggregate</Text>
              </View>
            </View>
          </View>

          {/* 3 Metric Pills: Present, Absent, Total Classes */}
          <View style={[styles.metricsContainer, { backgroundColor: colors.surfaceSubtle }]}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Attended</Text>
              <AnimatedCounter
                value={totalPresent}
                style={[styles.metricVal, { color: colors.green }]}
              />
              <Text style={[styles.metricUnit, { color: colors.textMuted }]}>Lectures</Text>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Missed</Text>
              <AnimatedCounter
                value={totalAbsent}
                style={[styles.metricVal, { color: colors.coral }]}
              />
              <Text style={[styles.metricUnit, { color: colors.textMuted }]}>Lectures</Text>
            </View>

            <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Conducted</Text>
              <AnimatedCounter
                value={totalClasses}
                style={[styles.metricVal, { color: colors.text }]}
              />
              <Text style={[styles.metricUnit, { color: colors.textMuted }]}>Total Classes</Text>
            </View>
          </View>
        </View>

        {/* ================= TAB SWITCHER ================= */}
        <View style={[styles.tabSwitcher, { backgroundColor: colors.surfaceSubtle }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'subjects' && [styles.tabBtnActive, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab('subjects')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === 'subjects' ? colors.primary : colors.textSecondary }]}>
              Subject Breakdown ({subjects.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'logs' && [styles.tabBtnActive, { backgroundColor: colors.card }]]}
            onPress={() => setActiveTab('logs')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === 'logs' ? colors.primary : colors.textSecondary }]}>
              Daily Attendance Logs
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= SUBJECT-WISE ATTENDANCE CARDS ================= */}
        {activeTab === 'subjects' && (
          <View style={styles.subjectList}>
            {subjects.map((sub) => {
              const theme = getSubjectColor(sub.subjectName);
              const isSafe = sub.percentage >= 75;

              return (
                <AnimatedCard
                  key={sub.subjectId}
                  style={[
                    styles.subjectCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderLeftColor: theme.accent,
                    },
                  ]}
                >
                  <View style={styles.subjectTopRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.codeRow}>
                        <View style={[styles.codeBadge, { backgroundColor: theme.bg }]}>
                          <Text style={[styles.codeText, { color: theme.accent }]}>{sub.subjectCode}</Text>
                        </View>
                        <Text style={[styles.profName, { color: colors.textSecondary }]}>
                          {sub.professorName}
                        </Text>
                      </View>
                      <Text style={[styles.subjectNameText, { color: colors.text }]}>{sub.subjectName}</Text>
                    </View>

                    {/* Percentage Pill */}
                    <View style={[styles.percentagePill, { backgroundColor: theme.bg }]}>
                      <Text style={[styles.percentageVal, { color: theme.accent }]}>{sub.percentage}%</Text>
                    </View>
                  </View>

                  {/* Animated Progress Bar */}
                  <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSubtle }]}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, sub.percentage)}%`,
                          backgroundColor: theme.accent,
                        },
                      ]}
                    />
                  </View>

                  {/* Card Footer Breakdown */}
                  <View style={styles.subjectFooterRow}>
                    <Text style={[styles.footerStat, { color: colors.textSecondary }]}>
                      Attended: <Text style={{ fontWeight: '700', color: colors.text }}>{sub.attendedLectures}</Text> / {sub.totalLectures}
                    </Text>

                    {isSafe ? (
                      <Text style={[styles.safeNote, { color: colors.green }]}>
                        Can skip: {sub.classesCanSkip} {sub.classesCanSkip === 1 ? 'class' : 'classes'}
                      </Text>
                    ) : (
                      <Text style={[styles.warningNote, { color: colors.coral }]}>
                        Need {sub.classesNeededFor75} next classes
                      </Text>
                    )}
                  </View>
                </AnimatedCard>
              );
            })}
          </View>
        )}

        {/* ================= DAILY LOGS ================= */}
        {activeTab === 'logs' && (
          <View style={styles.logsList}>
            {logs.map((log) => (
              <AnimatedCard
                key={log.id}
                style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View
                  style={[
                    styles.logIconBox,
                    {
                      backgroundColor: log.status === 'present' ? colors.softGreen : colors.softPeach,
                    },
                  ]}
                >
                  <Feather
                    name={log.status === 'present' ? 'check' : 'x'}
                    size={16}
                    color={log.status === 'present' ? colors.green : colors.coral}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.logSubject, { color: colors.text }]}>{log.subjectName}</Text>
                  <Text style={[styles.logMeta, { color: colors.textSecondary }]}>
                    Period {log.period} ({log.time}) • {log.date}
                  </Text>
                </View>
                <StatusBadge
                  status={log.status === 'present' ? 'present' : 'absent'}
                  size="sm"
                />
              </AnimatedCard>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerBox: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eligibilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    marginBottom: 6,
  },
  eligibilityText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  heroHeading: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSubtext: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
    marginRight: 10,
    fontWeight: '500',
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  gaugeLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: -2,
  },
  metricsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  metricVal: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  metricUnit: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 28,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subjectList: {
    gap: 12,
  },
  subjectCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  subjectTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  codeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  profName: {
    fontSize: 11,
    fontWeight: '500',
  },
  subjectNameText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  percentagePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  percentageVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  subjectFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerStat: {
    fontSize: 11,
    fontWeight: '500',
  },
  safeNote: {
    fontSize: 11,
    fontWeight: '700',
  },
  warningNote: {
    fontSize: 11,
    fontWeight: '700',
  },
  logsList: {
    gap: 10,
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  logIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logSubject: {
    fontSize: 13,
    fontWeight: '700',
  },
  logMeta: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});
