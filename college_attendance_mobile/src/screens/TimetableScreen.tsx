import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { TimetableSlot } from '../types';
import { allAllocations, getProfessorAllocations } from '../services/collegeDatabase';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AnimatedCard } from '../components/common/AnimatedCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';

const DAYS = [
  { dayOfWeek: 1, label: 'MON', full: 'Monday' },
  { dayOfWeek: 2, label: 'TUE', full: 'Tuesday' },
  { dayOfWeek: 3, label: 'WED', full: 'Wednesday' },
  { dayOfWeek: 4, label: 'THU', full: 'Thursday' },
  { dayOfWeek: 5, label: 'FRI', full: 'Friday' },
  { dayOfWeek: 6, label: 'SAT', full: 'Saturday' },
];

export const TimetableScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const isProf = user?.role === 'professor';
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [allWeekSlots, setAllWeekSlots] = useState<TimetableSlot[]>([]);

  const loadTimetable = async (day: number) => {
    try {
      const data = await api.getTimetable(day, selectedBranch);

      let filtered = data;

      if (isProf && user) {
        const userNorm = (user.name || '').toLowerCase().replace(/(pro\.|pro|prof\.|prof|dr\.|dr)/gi, '').replace(/[^a-z0-9]/g, '');
        const userUsername = (user.username || '').toLowerCase();

        const profAllocations = getProfessorAllocations(user, allAllocations);
        const allocatedSubjectCodes = profAllocations.map((a) => a.subjectCode.toUpperCase());

        filtered = data.filter((s) => {
          const sFacultyNorm = (s.facultyName || '').toLowerCase().replace(/(pro\.|pro|prof\.|prof|dr\.|dr)/gi, '').replace(/[^a-z0-9]/g, '');
          const isNameMatch =
            (userNorm.length >= 4 && (sFacultyNorm === userNorm || sFacultyNorm.includes(userNorm) || userNorm.includes(sFacultyNorm))) ||
            (userUsername && sFacultyNorm.includes(userUsername));

          const isSubjectMatch = allocatedSubjectCodes.includes(s.subjectCode.toUpperCase());

          return isNameMatch || isSubjectMatch;
        });

        if (filtered.length === 0 && profAllocations.length > 0) {
          filtered = data.filter((s) => allocatedSubjectCodes.includes(s.subjectCode.toUpperCase()));
        }
      } else if (isStudent) {
        const studentBranch = (user?.branch || 'CSE').toUpperCase();
        const studentSem = user?.semester || 3;
        const studentYear = user?.year || Math.ceil(studentSem / 2);

        filtered = data.filter((s) => {
          const sBranch = (s.branch || '').toUpperCase();
          const branchMatch =
            !s.branch ||
            sBranch === studentBranch ||
            (studentBranch === 'CSE' && (sBranch.includes('COMPUTER') || sBranch.includes('CSE'))) ||
            (studentBranch === 'AD' && (sBranch.includes('ARTIFICIAL') || sBranch.includes('AD') || sBranch.includes('DATA')));

          const semMatch = s.semester ? s.semester === studentSem : (s.year ? s.year === studentYear : true);

          return branchMatch && semMatch;
        });

        if (filtered.length === 0) {
          filtered = data.filter((s) => {
            const sBranch = (s.branch || '').toUpperCase();
            return (
              !s.branch ||
              sBranch === studentBranch ||
              (studentBranch === 'CSE' && sBranch.includes('CSE')) ||
              (studentBranch === 'AD' && sBranch.includes('AD'))
            );
          });
        }
      } else if (isAdmin && selectedBranch !== 'ALL') {
        filtered = data.filter((s) => !s.branch || s.branch === selectedBranch);
      }

      filtered.sort((a, b) => a.periodNumber - b.periodNumber);
      setSlots(filtered);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const loadAllWeek = async () => {
      try {
        const allSlots = await api.getTimetable();
        if (isProf && user) {
          const userNorm = (user.name || '').toLowerCase().replace(/(pro\.|pro|prof\.|prof|dr\.|dr)/gi, '').replace(/[^a-z0-9]/g, '');
          const userUsername = (user.username || '').toLowerCase();
          const profAllocations = getProfessorAllocations(user, allAllocations);
          const allocatedSubjectCodes = profAllocations.map((a) => a.subjectCode.toUpperCase());

          const profWeekSlots = allSlots.filter((s) => {
            const sFacultyNorm = (s.facultyName || '').toLowerCase().replace(/(pro\.|pro|prof\.|prof|dr\.|dr)/gi, '').replace(/[^a-z0-9]/g, '');
            const isNameMatch =
              (userNorm.length >= 4 && (sFacultyNorm === userNorm || sFacultyNorm.includes(userNorm) || userNorm.includes(sFacultyNorm))) ||
              (userUsername && sFacultyNorm.includes(userUsername));
            return isNameMatch || allocatedSubjectCodes.includes(s.subjectCode.toUpperCase());
          });
          setAllWeekSlots(profWeekSlots);
        }
      } catch (err) {
        console.log(err);
      }
    };
    loadAllWeek();
  }, [user, isProf]);

  useEffect(() => {
    loadTimetable(selectedDay);
  }, [selectedDay, selectedBranch, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTimetable(selectedDay);
    setRefreshing(false);
  };

  const selectedDayObj = DAYS.find((d) => d.dayOfWeek === selectedDay);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top App Bar with Soft Blue Theme */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>
              {isProf ? 'Teaching Schedule' : isAdmin ? 'Campus Timetable' : 'Class Timetable'}
            </Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              {isProf
                ? `${user?.name || 'Faculty Member'} • ${user?.department || 'CSE Department'}`
                : `${user?.branch || 'CSE'} Department • Semester ${user?.semester || 3} (Year 2)`}
            </Text>
          </View>

          <View style={[styles.sessionBadge, { backgroundColor: colors.softBlue }]}>
            <Text style={[styles.sessionBadgeText, { color: colors.primary }]}>2026-27 ODD</Text>
          </View>
        </View>

        {/* Horizontal Day Tabs (MON | TUE | WED | THU | FRI | SAT) with Soft Blue / Indigo Pill */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayTabsContainer}
        >
          {DAYS.map((day) => {
            const isSelected = day.dayOfWeek === selectedDay;
            return (
              <TouchableOpacity
                key={day.dayOfWeek}
                style={[
                  styles.dayTab,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedDay(day.dayOfWeek)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayTabText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Timetable Cards */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.daySummaryHeader}>
          <View>
            <Text style={[styles.dayHeading, { color: colors.text }]}>
              {selectedDayObj?.full} Schedule
            </Text>
            <Text style={[styles.daySubCount, { color: colors.textSecondary }]}>
              {slots.length} {slots.length === 1 ? 'Period' : 'Periods'} scheduled for today
            </Text>
          </View>

          {isProf && (
            <TouchableOpacity
              style={[styles.quickMarkHeaderBtn, { backgroundColor: colors.softGreen }]}
              onPress={() => navigation?.navigate('MarkAttendance')}
              activeOpacity={0.8}
            >
              <Feather name="check-square" size={13} color={colors.green} />
              <Text style={[styles.quickMarkHeaderBtnText, { color: colors.green }]}>Attendance Desk</Text>
            </TouchableOpacity>
          )}
        </View>

        {slots.length > 0 ? (
          <View style={styles.slotsList}>
            {slots.map((slot, index) => {
              const isCurrentClass = index === 0;
              const isLab = slot.slotType === 'lab';

              return (
                <AnimatedCard
                  key={slot.id}
                  style={[
                    styles.classCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isCurrentClass ? colors.primary : colors.border,
                      borderLeftColor: isLab ? colors.amber : colors.primary,
                      borderLeftWidth: 4,
                    },
                  ]}
                >
                  {/* Card Top Ribbon */}
                  <View style={styles.cardHeader}>
                    <View style={styles.timeWrapper}>
                      <Feather name="clock" size={13} color={colors.primary} />
                      <Text style={[styles.timeText, { color: colors.text }]}>
                        {slot.timeSlot}
                      </Text>
                    </View>

                    <View style={styles.headerBadgesRow}>
                      <View style={[styles.periodBadge, { backgroundColor: colors.surfaceSubtle }]}>
                        <Text style={[styles.periodBadgeText, { color: colors.textSecondary }]}>
                          Period {slot.periodNumber}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.slotTypeBadge,
                          {
                            backgroundColor: isLab ? colors.softYellow : colors.softBlue,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotTypeText,
                            {
                              color: isLab ? colors.amber : colors.primary,
                            },
                          ]}
                        >
                          {isLab ? 'LAB SESSION' : 'THEORY'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Subject Name & Code */}
                  <Text style={[styles.subjectName, { color: colors.text }]}>
                    [{slot.subjectCode}] {slot.subjectName}
                  </Text>

                  {/* Room, Branch & Semester Details */}
                  <View style={styles.cardMetaRow}>
                    <View style={styles.metaBadge}>
                      <Feather name="map-pin" size={12} color={colors.teal} />
                      <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>
                        {slot.roomNumber || 'Room 204'}
                      </Text>
                    </View>

                    <View style={styles.metaBadge}>
                      <Feather name="layers" size={12} color={colors.purple} />
                      <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>
                        {slot.branch || 'CSE'} • Sem {slot.semester || 3}
                      </Text>
                    </View>

                    {!isProf && (
                      <View style={styles.metaBadge}>
                        <Feather name="user" size={12} color={colors.coral} />
                        <Text style={[styles.metaBadgeText, { color: colors.textSecondary }]}>
                          {slot.facultyName || 'Faculty Member'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Faculty Quick Controls */}
                  {isProf && (
                    <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                        onPress={() =>
                          navigation?.navigate('MarkAttendance', {
                            initialSubjectCode: slot.subjectCode,
                            period: slot.periodNumber,
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <Feather name="check-circle" size={12} color="#FFFFFF" />
                        <Text style={styles.actionBtnText}>Take Attendance</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtnSecondary, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                        onPress={() =>
                          navigation?.navigate('Marks', {
                            initialSubject: slot.subjectCode,
                          })
                        }
                        activeOpacity={0.8}
                      >
                        <Feather name="edit-2" size={12} color={colors.text} />
                        <Text style={[styles.actionBtnSecText, { color: colors.text }]}>Marks</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </AnimatedCard>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="calendar"
            title={`No classes on ${selectedDayObj?.full}`}
            description={
              isProf
                ? `You have no lectures scheduled on ${selectedDayObj?.full}.`
                : `There are no classes scheduled for ${selectedDayObj?.full}.`
            }
            accentColor={colors.primary}
          />
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
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  sessionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dayTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTabText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  daySummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayHeading: {
    fontSize: 15,
    fontWeight: '800',
  },
  daySubCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  slotsList: {
    gap: 12,
  },
  classCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  periodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  periodBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  slotTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  slotTypeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnSecText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quickMarkHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  quickMarkHeaderBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
