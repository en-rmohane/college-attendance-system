import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { allAllocations, allStudents, getProfessorAllocations } from '../services/collegeDatabase';
import { Student, SubjectAllocation } from '../types';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export const MarkAttendanceScreen = ({ route, navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const initialSubjectCode = route?.params?.initialSubjectCode;
  const initialPeriod = route?.params?.period;

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // 1. Get allocated subjects strictly for the logged-in professor (or all for admin)
  const myAllocations = useMemo(() => {
    if (isAdmin) {
      return allAllocations;
    }
    return getProfessorAllocations(user, allAllocations);
  }, [user, isAdmin]);

  // Find initial allocation by initialSubjectCode if passed
  const initialAlloc = useMemo(() => {
    if (initialSubjectCode) {
      const found = myAllocations.find(
        (a) => a.subjectCode.toUpperCase() === initialSubjectCode.toUpperCase()
      );
      if (found) return found;
    }
    return myAllocations[0];
  }, [myAllocations, initialSubjectCode]);

  const [selectedAllocationId, setSelectedAllocationId] = useState<number>(
    initialAlloc?.id || 1
  );
  const [selectedPeriod, setSelectedPeriod] = useState<number>(initialPeriod || 1);
  const [searchQuery, setSearchQuery] = useState('');
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [activeDateTab, setActiveDateTab] = useState<'today' | 'yesterday'>('today');

  // Update selection if route params change
  useEffect(() => {
    if (initialSubjectCode) {
      const found = myAllocations.find(
        (a) => a.subjectCode.toUpperCase() === initialSubjectCode.toUpperCase()
      );
      if (found) setSelectedAllocationId(found.id);
    }
    if (initialPeriod) {
      setSelectedPeriod(initialPeriod);
    }
  }, [initialSubjectCode, initialPeriod, myAllocations]);

  // Current selected allocation
  const currentAllocation: SubjectAllocation | undefined =
    myAllocations.find((a) => a.id === selectedAllocationId) || myAllocations[0];

  // 2. Filter students matching the allocated subject's branch, semester, and year
  const classStudents: Student[] = useMemo(() => {
    if (!currentAllocation) return [];

    const targetBranch = currentAllocation.branch;
    const targetSem = currentAllocation.semester; // e.g. 3 (Odd Sem)
    const targetYear = Math.ceil(targetSem / 2); // e.g. Year 2

    return allStudents.filter(
      (s) =>
        s.branch.toUpperCase() === targetBranch.toUpperCase() &&
        (s.semester === targetSem || s.year === targetYear)
    );
  }, [currentAllocation]);

  // Reset attendance map when class changes
  useEffect(() => {
    if (classStudents.length > 0) {
      const initial: Record<string, boolean> = {};
      classStudents.forEach((s) => {
        initial[s.roll] = true; // Default present
      });
      setPresentMap(initial);
    }
  }, [selectedAllocationId, classStudents]);

  // Keep first allocation selected if list changes
  useEffect(() => {
    if (myAllocations.length > 0 && !myAllocations.some((a) => a.id === selectedAllocationId)) {
      setSelectedAllocationId(myAllocations[0].id);
    }
  }, [myAllocations]);

  const toggleStudent = (roll: string) => {
    setPresentMap((prev) => ({
      ...prev,
      [roll]: !prev[roll],
    }));
  };

  const markAll = (status: boolean) => {
    const updated: Record<string, boolean> = {};
    classStudents.forEach((s) => {
      updated[s.roll] = status;
    });
    setPresentMap(updated);
  };

  const handleDateSwitch = (type: 'today' | 'yesterday') => {
    setActiveDateTab(type);
    if (type === 'today') {
      setAttendanceDate(new Date().toISOString().split('T')[0]);
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      setAttendanceDate(d.toISOString().split('T')[0]);
    }
  };

  const filteredClassStudents = classStudents.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q);
  });

  const presentCount = Object.keys(presentMap).filter(
    (roll) => presentMap[roll] && classStudents.some((s) => s.roll === roll)
  ).length;
  const absentCount = classStudents.length - presentCount;

  const handleSaveAttendance = async () => {
    if (!currentAllocation) return;
    setIsSaving(true);
    const presentRolls = Object.keys(presentMap).filter((r) => presentMap[r]);

    const res = await api.markAttendance({
      subjectCode: currentAllocation.subjectCode,
      branch: currentAllocation.branch,
      semester: currentAllocation.semester,
      period: selectedPeriod,
      date: attendanceDate,
      presentRolls,
    });

    setIsSaving(false);
    if (res.success) {
      Alert.alert(
        'Attendance Recorded Successfully! ✅',
        `Course: [${currentAllocation.subjectCode}] ${currentAllocation.subjectName}\nBranch: ${currentAllocation.branch} Department • Sem ${currentAllocation.semester} (Year ${Math.ceil(currentAllocation.semester / 2)})\nPeriod: Period ${selectedPeriod} | Date: ${attendanceDate}\n\nPresent: ${presentCount} Students\nAbsent: ${absentCount} Students (${classStudents.length > 0 ? Math.round((presentCount / classStudents.length) * 100) : 0}% Attendance)`,
        [
          { text: 'Done', onPress: () => navigation.goBack() },
          { text: 'Stay Here', style: 'cancel' },
        ]
      );
    }
  };

  const periods = [
    { id: 1, time: '10:00 - 11:00 AM' },
    { id: 2, time: '11:00 - 12:00 PM' },
    { id: 3, time: '12:00 - 01:00 PM' },
    { id: 4, time: '01:30 - 02:30 PM' },
    { id: 5, time: '02:30 - 03:30 PM' },
    { id: 6, time: '03:30 - 04:30 PM' },
  ];

  const attendancePercentage = classStudents.length > 0 ? Math.round((presentCount / classStudents.length) * 100) : 100;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: colors.text }]}>Mark Class Attendance</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {user?.name || 'Faculty Member'} • Subject & Roster Portal
            </Text>
          </View>
        </View>

        {/* Allocated Subjects Ribbon */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          SELECT ASSIGNED SUBJECT:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subjectRibbon}
        >
          {myAllocations.map((alloc) => {
            const isSelected = alloc.id === selectedAllocationId;
            const yearNum = Math.ceil(alloc.semester / 2);
            return (
              <TouchableOpacity
                key={alloc.id}
                style={[
                  styles.subjectPill,
                  {
                    backgroundColor: isSelected ? '#4F46E5' : colors.card,
                    borderColor: isSelected ? '#4F46E5' : colors.border,
                  },
                ]}
                onPress={() => setSelectedAllocationId(alloc.id)}
                activeOpacity={0.8}
              >
                <View style={styles.pillTop}>
                  <View
                    style={[
                      styles.codePillBadge,
                      { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.primarySubtle },
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillCode,
                        { color: isSelected ? '#FFFFFF' : '#4F46E5' },
                      ]}
                    >
                      {alloc.subjectCode}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#EEF2FF' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        { color: isSelected ? '#FFFFFF' : '#4F46E5' },
                      ]}
                    >
                      {alloc.slotType.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.pillName,
                    { color: isSelected ? '#FFFFFF' : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {alloc.subjectName}
                </Text>

                <Text
                  style={[
                    styles.pillMeta,
                    { color: isSelected ? '#E0E7FF' : colors.textSecondary },
                  ]}
                >
                  {alloc.branch} • Sem {alloc.semester} (Year {yearNum})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Date & Period Controls Bar */}
        <View style={styles.filterControlRow}>
          {/* Date Presets */}
          <View style={[styles.dateSwitchContainer, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.dateSwitchBtn,
                activeDateTab === 'today' && { backgroundColor: colors.primary },
              ]}
              onPress={() => handleDateSwitch('today')}
            >
              <Text
                style={[
                  styles.dateSwitchText,
                  { color: activeDateTab === 'today' ? '#FFF' : colors.textSecondary },
                ]}
              >
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.dateSwitchBtn,
                activeDateTab === 'yesterday' && { backgroundColor: colors.primary },
              ]}
              onPress={() => handleDateSwitch('yesterday')}
            >
              <Text
                style={[
                  styles.dateSwitchText,
                  { color: activeDateTab === 'yesterday' ? '#FFF' : colors.textSecondary },
                ]}
              >
                Yesterday
              </Text>
            </TouchableOpacity>
          </View>

          {/* Period Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodScroll}>
            {periods.map((p) => {
              const isPSelected = selectedPeriod === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.periodPill,
                    {
                      backgroundColor: isPSelected ? '#4F46E5' : colors.card,
                      borderColor: isPSelected ? '#4F46E5' : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedPeriod(p.id)}
                >
                  <Text
                    style={[
                      styles.periodPillText,
                      { color: isPSelected ? '#FFFFFF' : colors.textSecondary, fontWeight: isPSelected ? '800' : '600' },
                    ]}
                  >
                    P{p.id} ({p.time.split(' - ')[0]})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Main Class Roll Sheet */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Class Overview Banner */}
          {currentAllocation && (
            <View style={[styles.classBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.bannerIconBox, { backgroundColor: colors.primarySubtle }]}>
                <Feather name="book-open" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.bannerCourse, { color: colors.text }]}>
                  [{currentAllocation.subjectCode}] {currentAllocation.subjectName}
                </Text>
                <Text style={[styles.bannerSub, { color: colors.textSecondary }]}>
                  {currentAllocation.branch} Department • Semester {currentAllocation.semester} (Year {Math.ceil(currentAllocation.semester / 2)})
                </Text>
              </View>
              <View style={[styles.studentCountBox, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[styles.studentCountVal, { color: colors.primary }]}>{classStudents.length}</Text>
                <Text style={[styles.studentCountLabel, { color: colors.primary }]}>Enrolled</Text>
              </View>
            </View>
          )}

          {/* Action Controls & Search */}
          <View style={styles.controlsRow}>
            <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search student roll / name..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.quickBtns}>
              <TouchableOpacity
                style={[styles.quickBtnAll, { backgroundColor: '#10B981' }]}
                onPress={() => markAll(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={13} color="#FFF" />
                <Text style={styles.quickBtnAllText}>All Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtnNone, { backgroundColor: '#EF4444' }]}
                onPress={() => markAll(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={13} color="#FFF" />
                <Text style={styles.quickBtnNoneText}>All Absent</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Counter Summary Bar */}
          <View style={[styles.summaryBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.badgePill, { backgroundColor: '#DCFCE7', borderColor: '#BBF7D0' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#15803D" />
              <Text style={[styles.presentBadgeText, { color: '#15803D' }]}>Present: {presentCount}</Text>
            </View>

            <View style={[styles.badgePill, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <Ionicons name="close-circle" size={14} color="#DC2626" />
              <Text style={[styles.absentBadgeText, { color: '#DC2626' }]}>Absent: {absentCount}</Text>
            </View>

            <View style={[styles.pctBadgePill, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.pctText, { color: colors.primary }]}>
                {attendancePercentage}% Turnout
              </Text>
            </View>
          </View>

          {/* Students List */}
          {filteredClassStudents.map((student) => {
            const isPresent = Boolean(presentMap[student.roll]);
            const initial = student.name ? student.name.charAt(0).toUpperCase() : 'S';

            return (
              <TouchableOpacity
                key={student.id}
                style={[
                  styles.studentRow,
                  {
                    backgroundColor: isPresent ? (isDark ? 'rgba(16, 185, 129, 0.12)' : '#F0FDF4') : (isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2'),
                    borderColor: isPresent ? '#10B981' : '#EF4444',
                  },
                ]}
                onPress={() => toggleStudent(student.roll)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.studentAvatarBox,
                    { backgroundColor: isPresent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      styles.studentAvatarText,
                      { color: isPresent ? '#10B981' : '#EF4444' },
                    ]}
                  >
                    {initial}
                  </Text>
                </View>

                <View style={styles.studentInfo}>
                  <Text style={[styles.studentName, { color: colors.text }]}>{student.name}</Text>
                  <Text style={[styles.studentRoll, { color: colors.textSecondary }]}>
                    {student.roll} • {student.branch} (Sem {student.semester})
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusToggle,
                    { backgroundColor: isPresent ? '#10B981' : '#EF4444' },
                  ]}
                >
                  <Ionicons
                    name={isPresent ? 'checkmark' : 'close'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.statusToggleText}>
                    {isPresent ? 'PRESENT' : 'ABSENT'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredClassStudents.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="users" size={36} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No students found</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                No students enrolled under {currentAllocation?.branch} Semester {currentAllocation?.semester}.
              </Text>
            </View>
          )}

          {/* Submit Attendance Button */}
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
            onPress={handleSaveAttendance}
            disabled={isSaving || classStudents.length === 0}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Feather name="check-circle" size={18} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>
                  Save Attendance ({presentCount} Present / {absentCount} Absent)
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </Animated.View>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  subjectRibbon: {
    gap: 10,
    paddingBottom: 10,
  },
  subjectPill: {
    width: 210,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  pillTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  codePillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillCode: {
    fontSize: 13,
    fontWeight: '800',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  pillName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  pillMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  dateSwitchContainer: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
  },
  dateSwitchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateSwitchText: {
    fontSize: 11,
    fontWeight: '700',
  },
  periodScroll: {
    gap: 8,
    paddingRight: 10,
  },
  periodPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  periodPillText: {
    fontSize: 11,
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  classBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  bannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerCourse: {
    fontSize: 14,
    fontWeight: '700',
  },
  bannerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  studentCountBox: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  studentCountVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  studentCountLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    marginLeft: 8,
    paddingVertical: 0,
  },
  quickBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  quickBtnAll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  quickBtnAllText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  quickBtnNone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  quickBtnNoneText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  presentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  absentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pctBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pctText: {
    fontSize: 11,
    fontWeight: '800',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  studentAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  studentAvatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  studentRoll: {
    fontSize: 11,
    marginTop: 2,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  statusToggleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: '#4F46E5',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
