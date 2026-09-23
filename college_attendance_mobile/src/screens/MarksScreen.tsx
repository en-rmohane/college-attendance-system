import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  Animated,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { allAllocations, allExamMarks, allStudents, allSubjects, getProfessorAllocations } from '../services/collegeDatabase';

const UPCOMING_EXAMS = [
  {
    id: 'ex1',
    subjectCode: 'CS303',
    subjectName: 'Data Structures & Algorithms',
    date: '15 Oct 2026',
    time: '10:00 AM - 01:00 PM',
    room: 'Hall B-204',
    type: 'Theory (End-Sem)',
    status: 'Scheduled',
  },
  {
    id: 'ex2',
    subjectCode: 'CS304',
    subjectName: 'Digital Systems & Architecture',
    date: '18 Oct 2026',
    time: '10:00 AM - 01:00 PM',
    room: 'Hall B-205',
    type: 'Theory (End-Sem)',
    status: 'Scheduled',
  },
  {
    id: 'ex3',
    subjectCode: 'CS302',
    subjectName: 'Discrete Mathematics',
    date: '21 Oct 2026',
    time: '10:00 AM - 01:00 PM',
    room: 'Hall A-102',
    type: 'Theory (End-Sem)',
    status: 'Scheduled',
  },
  {
    id: 'ex4',
    subjectCode: 'CS305P',
    subjectName: 'Data Structures Lab Viva',
    date: '24 Oct 2026',
    time: '02:00 PM - 05:00 PM',
    room: 'Lab 3 (Ground Floor)',
    type: 'Practical Viva',
    status: 'Scheduled',
  },
];

export default function MarksScreen({ route, navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const isProf = user?.role === 'professor';
  const isAdmin = user?.role === 'admin';

  const initialSubjectParam = route?.params?.initialSubject;

  // 1. Get professor's allocated subjects dynamically
  const myAllocations = React.useMemo(() => {
    if (isAdmin) {
      return allAllocations;
    }
    return getProfessorAllocations(user, allAllocations);
  }, [user, isAdmin]);

  const [activeTab, setActiveTab] = useState<'results' | 'schedule' | 'internals' | 'entry'>(
    isStudent ? 'results' : 'entry'
  );
  const [selectedSubject, setSelectedSubject] = useState(
    initialSubjectParam || myAllocations[0]?.subjectCode || 'CS303'
  );
  const [selectedExamType, setSelectedExamType] = useState<
    'all' | 'mt1' | 'mt2' | 'ut1' | 'ut2' | 'assign' | 'practical'
  >('all');
  const [searchStudentQuery, setSearchStudentQuery] = useState('');

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(15);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: false,
      }),
    ]).start();
  }, [activeTab]);

  // Pre-seed marks for enrolled students
  const [marksState, setMarksState] = useState<
    Record<string, { mt1: string; mt2: string; assign: string; practical: string }>
  >({
    '0545CS231001': { mt1: '18', mt2: '19', assign: '10', practical: '18' },
    '0545CS231002': { mt1: '14', mt2: '15', assign: '8', practical: '15' },
    '0545CS231003': { mt1: '16', mt2: '17', assign: '9', practical: '17' },
    '0545CS231004': { mt1: '15', mt2: '16', assign: '8', practical: '16' },
    '0545CS231005': { mt1: '19', mt2: '18', assign: '10', practical: '19' },
  });

  const studentMarks = allExamMarks;
  const currentAllocation =
    myAllocations.find((a) => a.subjectCode.toUpperCase() === selectedSubject.toUpperCase()) ||
    myAllocations[0];
  const currentSubjectObj =
    allSubjects.find((s) => s.code === selectedSubject) || allSubjects[0];

  // Filter students for the selected subject's branch and semester
  const subjectStudents = React.useMemo(() => {
    if (!currentAllocation) return allStudents.slice(0, 10);
    const targetBranch = currentAllocation.branch;
    const targetSem = currentAllocation.semester;
    const targetYear = Math.ceil(targetSem / 2);

    const enrolled = allStudents.filter(
      (s) =>
        s.branch.toUpperCase() === targetBranch.toUpperCase() &&
        (s.semester === targetSem || s.year === targetYear)
    );
    return enrolled.length > 0 ? enrolled : allStudents.slice(0, 8);
  }, [currentAllocation]);

  // Update selected subject if route param changes
  useEffect(() => {
    if (initialSubjectParam) {
      setSelectedSubject(initialSubjectParam);
    }
  }, [initialSubjectParam]);

  const handleUpdateMark = (
    roll: string,
    field: 'mt1' | 'mt2' | 'assign' | 'practical',
    val: string
  ) => {
    // Numeric limit check
    const num = parseInt(val, 10);
    const maxVal = field === 'assign' ? 10 : 20;
    if (!isNaN(num) && num > maxVal) {
      Alert.alert('Invalid Marks', `Maximum allowable marks for ${field.toUpperCase()} is ${maxVal}.`);
      return;
    }

    setMarksState((prev) => ({
      ...prev,
      [roll]: {
        ...(prev[roll] || { mt1: '15', mt2: '15', assign: '8', practical: '16' }),
        [field]: val,
      },
    }));
  };

  const handleBulkFillDefault = () => {
    const updated: Record<string, { mt1: string; mt2: string; assign: string; practical: string }> = {
      ...marksState,
    };
    subjectStudents.forEach((s, idx) => {
      const base1 = 15 + (idx % 5);
      const base2 = 16 + (idx % 4);
      const baseA = 8 + (idx % 3);
      const baseP = 16 + (idx % 4);
      updated[s.roll] = {
        mt1: String(Math.min(20, base1)),
        mt2: String(Math.min(20, base2)),
        assign: String(Math.min(10, baseA)),
        practical: String(Math.min(20, baseP)),
      };
    });
    setMarksState(updated);
    Alert.alert('Default Marks Populated ✅', `Standard marks filled for ${subjectStudents.length} students.`);
  };

  const handleSaveMarks = () => {
    let totalScore = 0;
    let count = 0;
    let maxScored = 0;

    subjectStudents.forEach((s) => {
      const cur = marksState[s.roll] || { mt1: '15', mt2: '15', assign: '8', practical: '16' };
      const tot =
        (parseInt(cur.mt1, 10) || 0) +
        (parseInt(cur.mt2, 10) || 0) +
        (parseInt(cur.assign, 10) || 0) +
        (parseInt(cur.practical, 10) || 0);
      totalScore += tot;
      count++;
      if (tot > maxScored) maxScored = tot;
    });

    const avg = count > 0 ? (totalScore / count).toFixed(1) : '60.0';

    Alert.alert(
      'Marks Uploaded & Locked Successfully! 🎯',
      `Subject: [${selectedSubject}] ${currentSubjectObj.name}\nBranch: ${currentAllocation?.branch || 'CSE'} Sem ${currentAllocation?.semester || 3} (Year ${Math.ceil((currentAllocation?.semester || 3) / 2)})\n\nTotal Students: ${count}\nClass Average: ${avg} / 70\nHighest Scored: ${maxScored} / 70\nPass Percentage: 100%`,
      [{ text: 'OK' }]
    );
  };

  const handleDownloadAdmitCard = () => {
    Alert.alert(
      'Admit Card Generated 📄',
      `Official RGPV Odd Semester Examination Admit Card for ${user?.name} (${user?.roll || '0545CS231001'}) is verified and ready for download.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share / Print',
          onPress: async () => {
            try {
              await Share.share({
                message: `SBITM Examination Admit Card\nCandidate: ${user?.name} (${user?.roll})\nBranch: ${user?.branch} - Sem ${user?.semester || 3}\nExam Center: SBITM Campus Betul\nStatus: ELIGIBLE (No Dues Cleared)`,
              });
            } catch (e) {
              console.log(e);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* App Bar */}
      <View
        style={[
          styles.headerBox,
          { backgroundColor: colors.headerBg, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isProf ? 'Faculty Marks Portal' : 'Examinations & Results'}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {isProf
                ? 'Student Internal Evaluation & Grade Submission'
                : 'Academic Performance & RGPV Grade Records'}
            </Text>
          </View>
        </View>

        {/* Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          {isStudent ? (
            <>
              <TouchableOpacity
                style={[
                  styles.tabChip,
                  {
                    backgroundColor:
                      activeTab === 'results' ? colors.primary : colors.surfaceSubtle,
                    borderColor: activeTab === 'results' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('results')}
              >
                <Feather
                  name="award"
                  size={14}
                  color={activeTab === 'results' ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: activeTab === 'results' ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  Results & SGPA
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabChip,
                  {
                    backgroundColor:
                      activeTab === 'schedule' ? colors.primary : colors.surfaceSubtle,
                    borderColor: activeTab === 'schedule' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('schedule')}
              >
                <Feather
                  name="calendar"
                  size={14}
                  color={activeTab === 'schedule' ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: activeTab === 'schedule' ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  Exam Schedule & Admit Card
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabChip,
                  {
                    backgroundColor:
                      activeTab === 'internals' ? colors.primary : colors.surfaceSubtle,
                    borderColor: activeTab === 'internals' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('internals')}
              >
                <Feather
                  name="file-text"
                  size={14}
                  color={activeTab === 'internals' ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: activeTab === 'internals' ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  Internal Marks
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.tabChip,
                  {
                    backgroundColor: activeTab === 'entry' ? colors.primary : colors.surfaceSubtle,
                    borderColor: activeTab === 'entry' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('entry')}
              >
                <Feather
                  name="edit-3"
                  size={14}
                  color={activeTab === 'entry' ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: activeTab === 'entry' ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  Enter Class Marks
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabChip,
                  {
                    backgroundColor:
                      activeTab === 'results' ? colors.primary : colors.surfaceSubtle,
                    borderColor: activeTab === 'results' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('results')}
              >
                <Feather
                  name="bar-chart-2"
                  size={14}
                  color={activeTab === 'results' ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: activeTab === 'results' ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  Grade Sheets
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabChip,
                  {
                    backgroundColor:
                      activeTab === 'schedule' ? colors.primary : colors.surfaceSubtle,
                    borderColor: activeTab === 'schedule' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('schedule')}
              >
                <Feather
                  name="calendar"
                  size={14}
                  color={activeTab === 'schedule' ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabChipText,
                    { color: activeTab === 'schedule' ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  Exam Schedule
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {/* TAB 1: RESULTS & SGPA */}
        {activeTab === 'results' && (
          <View>
            {/* GPA Hero Banner Card */}
            <View style={[styles.heroCard, { backgroundColor: '#0F172A', borderColor: '#1E293B' }]}>
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroTag}>
                    {isProf ? 'DEPARTMENT OVERVIEW' : 'SEMESTER 3 PERFORMANCE'}
                  </Text>
                  <Text style={styles.heroScore}>{isProf ? '8.42 AVG' : '8.65 SGPA'}</Text>
                </View>
                <View style={styles.badgePill}>
                  <Text style={styles.badgePillText}>
                    {isProf ? 'CLASS PERFORMANCE: EXCELLENT' : 'GRADE A+ (OUTSTANDING)'}
                  </Text>
                </View>
              </View>

              <View style={styles.heroDivider} />

              <View style={styles.heroStatsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>{isProf ? 'Total Students' : 'Cumulative CGPA'}</Text>
                  <Text style={styles.statVal}>{isProf ? subjectStudents.length : '8.52'}</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>{isProf ? 'Class Pass Rate' : 'Total Credits'}</Text>
                  <Text style={[styles.statVal, { color: '#10B981' }]}>
                    {isProf ? '100%' : '24 / 24'}
                  </Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statLabel}>{isProf ? 'Subject Max' : 'Backlogs'}</Text>
                  <Text style={[styles.statVal, { color: '#38BDF8' }]}>
                    {isProf ? '70 / 70' : '0 Clear'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Subject Results Section */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Course-Wise Grade Breakdown
            </Text>

            {studentMarks.map((m, idx) => {
              const percentage = Math.round(((m.totalMarks || 0) / (m.maxMarks || 70)) * 100);
              return (
                <View
                  key={idx}
                  style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.subName, { color: colors.text }]}>{m.subjectName}</Text>
                      <Text style={[styles.subCode, { color: colors.textSecondary }]}>
                        {m.subjectCode} • Credits: 4
                      </Text>
                    </View>
                    <View style={[styles.gradeCircle, { backgroundColor: colors.primarySubtle }]}>
                      <Text style={[styles.gradeCircleText, { color: colors.primary }]}>{m.grade}</Text>
                    </View>
                  </View>

                  {/* Progress bar performance indicator */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressLabelRow}>
                      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                        Performance Score
                      </Text>
                      <Text style={[styles.progressPercent, { color: colors.primary }]}>
                        {m.totalMarks}/{m.maxMarks || 70} ({percentage}%)
                      </Text>
                    </View>
                    <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceSubtle }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(percentage, 100)}%`,
                            backgroundColor: percentage >= 75 ? colors.success : colors.warning,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Marks grid */}
                  <View style={[styles.marksGrid, { backgroundColor: colors.surfaceSubtle }]}>
                    <View style={styles.mGridCol}>
                      <Text style={[styles.mLabel, { color: colors.textSecondary }]}>MT-1</Text>
                      <Text style={[styles.mValue, { color: colors.text }]}>{m.midTerm1Marks}/20</Text>
                    </View>
                    <View style={styles.mGridCol}>
                      <Text style={[styles.mLabel, { color: colors.textSecondary }]}>MT-2</Text>
                      <Text style={[styles.mValue, { color: colors.text }]}>{m.midTerm2Marks}/20</Text>
                    </View>
                    <View style={styles.mGridCol}>
                      <Text style={[styles.mLabel, { color: colors.textSecondary }]}>Assgn</Text>
                      <Text style={[styles.mValue, { color: colors.text }]}>{m.assignmentMarks}/10</Text>
                    </View>
                    <View style={styles.mGridCol}>
                      <Text style={[styles.mLabel, { color: colors.textSecondary }]}>Pract.</Text>
                      <Text style={[styles.mValue, { color: colors.text }]}>{m.practicalMarks}/20</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 2: UPCOMING EXAM SCHEDULE & ADMIT CARD */}
        {activeTab === 'schedule' && (
          <View>
            {/* Admit Card / Exam Schedule Banner */}
            {isStudent && (
              <View style={[styles.admitCardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.admitRow}>
                  <View style={[styles.admitIconBox, { backgroundColor: colors.primarySubtle }]}>
                    <FontAwesome5 name="id-card" size={24} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.admitTitle, { color: colors.text }]}>
                      Official Exam Admit Card
                    </Text>
                    <Text style={[styles.admitSub, { color: colors.textSecondary }]}>
                      RGPV End-Semester Examination 2026
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.admitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleDownloadAdmitCard}
                  activeOpacity={0.8}
                >
                  <Feather name="download" size={16} color="#FFF" />
                  <Text style={styles.admitBtnText}>Download / Print Hall Ticket</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {isProf ? 'Faculty Examination & Invigilation Duty' : 'Exam Timetable (Timeline)'}
            </Text>

            {UPCOMING_EXAMS.map((exam) => (
              <View
                key={exam.id}
                style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.timelineLeft}>
                  <View style={[styles.dateBox, { backgroundColor: colors.primarySubtle }]}>
                    <Text style={[styles.dateDay, { color: colors.primary }]}>
                      {exam.date.split(' ')[0]}
                    </Text>
                    <Text style={[styles.dateMonth, { color: colors.primary }]}>
                      {exam.date.split(' ')[1]}
                    </Text>
                  </View>
                </View>

                <View style={styles.timelineRight}>
                  <View style={styles.examBadgeRow}>
                    <View style={[styles.codePill, { backgroundColor: colors.surfaceSubtle }]}>
                      <Text style={[styles.codePillText, { color: colors.textSecondary }]}>
                        {exam.subjectCode}
                      </Text>
                    </View>
                    <View style={[styles.typePill, { backgroundColor: colors.accentSubtle }]}>
                      <Text style={[styles.typePillText, { color: colors.accent }]}>{exam.type}</Text>
                    </View>
                  </View>

                  <Text style={[styles.examSubject, { color: colors.text }]}>{exam.subjectName}</Text>

                  <View style={styles.examMetaRow}>
                    <View style={styles.metaItem}>
                      <Feather name="clock" size={12} color={colors.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {exam.time}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Feather name="map-pin" size={12} color={colors.textSecondary} />
                      <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                        {exam.room}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: INTERNAL MARKS */}
        {activeTab === 'internals' && (
          <View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sumRow}>
                <Feather name="check-circle" size={18} color={colors.success} />
                <Text style={[styles.sumTitle, { color: colors.text }]}>Continuous Evaluation Status</Text>
              </View>
              <Text style={[styles.sumText, { color: colors.textSecondary }]}>
                All 2 Mid-Terms and Assignments have been entered and verified by department faculty.
              </Text>
            </View>

            {studentMarks.map((m, idx) => (
              <View
                key={idx}
                style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.subName, { color: colors.text }]}>{m.subjectName}</Text>
                    <Text style={[styles.subCode, { color: colors.textSecondary }]}>
                      {m.subjectCode} • Internal Max: 70
                    </Text>
                  </View>
                  <View style={[styles.gradeCircle, { backgroundColor: colors.successSubtle }]}>
                    <Text style={[styles.gradeCircleText, { color: colors.success }]}>
                      {m.totalMarks}/70
                    </Text>
                  </View>
                </View>

                <View style={[styles.marksGrid, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.mGridCol}>
                    <Text style={[styles.mLabel, { color: colors.textSecondary }]}>Mid-Term 1 (20)</Text>
                    <Text style={[styles.mValue, { color: colors.text }]}>{m.midTerm1Marks}</Text>
                  </View>
                  <View style={styles.mGridCol}>
                    <Text style={[styles.mLabel, { color: colors.textSecondary }]}>Mid-Term 2 (20)</Text>
                    <Text style={[styles.mValue, { color: colors.text }]}>{m.midTerm2Marks}</Text>
                  </View>
                  <View style={styles.mGridCol}>
                    <Text style={[styles.mLabel, { color: colors.textSecondary }]}>Assignment (10)</Text>
                    <Text style={[styles.mValue, { color: colors.text }]}>{m.assignmentMarks}</Text>
                  </View>
                  <View style={styles.mGridCol}>
                    <Text style={[styles.mLabel, { color: colors.textSecondary }]}>Lab / Practical (20)</Text>
                    <Text style={[styles.mValue, { color: colors.text }]}>{m.practicalMarks}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 4: PROFESSOR ENTRY VIEW */}
        {activeTab === 'entry' && (
          <View>
            {/* Header: Allotted Subject Selection */}
            <View style={styles.entryHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 2 }]}>
                  Select Assigned Subject
                </Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Choose subject to grade student internals
                </Text>
              </View>
              <View style={[styles.allocBadge, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[styles.allocCountText, { color: colors.primary }]}>
                  {myAllocations.length} Assigned
                </Text>
              </View>
            </View>

            {/* Subject Selector Ribbon */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subjectPillsContainer}
            >
              {myAllocations.map((alloc) => {
                const isSelected = selectedSubject.toUpperCase() === alloc.subjectCode.toUpperCase();
                return (
                  <TouchableOpacity
                    key={alloc.id}
                    activeOpacity={0.8}
                    style={[
                      styles.subjectPill,
                      {
                        backgroundColor: isSelected ? '#4F46E5' : colors.card,
                        borderColor: isSelected ? '#4F46E5' : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedSubject(alloc.subjectCode)}
                  >
                    <View style={styles.pillTopRow}>
                      <View
                        style={[
                          styles.subjectCodePill,
                          { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.primarySubtle },
                        ]}
                      >
                        <Text
                          style={[
                            styles.subjectPillCode,
                            { color: isSelected ? '#FFF' : '#4F46E5' },
                          ]}
                        >
                          {alloc.subjectCode}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.subjectPillName,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {alloc.subjectName}
                    </Text>
                    <Text
                      style={[
                        styles.subjectPillMeta,
                        { color: isSelected ? '#E0E7FF' : colors.textSecondary },
                      ]}
                    >
                      {alloc.branch} • Sem {alloc.semester}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Assessment Component Filter Pills */}
            <View style={styles.filterSectionHeader}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                COMPONENT FILTER:
              </Text>
              <Text style={[styles.filterTip, { color: colors.textMuted }]}>
                (Highlights active column)
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.examTypeScroll}
            >
              {[
                { id: 'all', label: 'All Components (70)' },
                { id: 'mt1', label: 'Mid-Term 1 (20)' },
                { id: 'mt2', label: 'Mid-Term 2 (20)' },
                { id: 'assign', label: 'Assignment (10)' },
                { id: 'practical', label: 'Lab / Viva (20)' },
              ].map((et) => {
                const isETSelected = selectedExamType === et.id;
                return (
                  <TouchableOpacity
                    key={et.id}
                    activeOpacity={0.75}
                    style={[
                      styles.examTypeChip,
                      {
                        backgroundColor: isETSelected ? colors.primary : colors.card,
                        borderColor: isETSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedExamType(et.id as any)}
                  >
                    <Text
                      style={[
                        styles.examTypeChipText,
                        { color: isETSelected ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {et.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Subject Summary Banner */}
            <View
              style={[
                styles.infoBanner,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={[styles.infoIconBox, { backgroundColor: colors.primarySubtle }]}>
                <Feather name="book-open" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.infoBannerTitle, { color: colors.text }]}>
                  [{selectedSubject}] {currentSubjectObj?.name || 'Assigned Course'}
                </Text>
                <Text style={[styles.infoBannerSub, { color: colors.textSecondary }]}>
                  {currentAllocation?.branch || 'CSE'} • Sem {currentAllocation?.semester || 3} • Max Internal: 70 Marks
                </Text>
              </View>
            </View>

            {/* Search & Bulk Action Tools Row */}
            <View style={styles.toolsRow}>
              <View
                style={[
                  styles.searchBox,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Feather name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search by student name or roll..."
                  placeholderTextColor={colors.textMuted}
                  value={searchStudentQuery}
                  onChangeText={setSearchStudentQuery}
                />
                {searchStudentQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchStudentQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="x" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.bulkFillBtn, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}
                onPress={handleBulkFillDefault}
                activeOpacity={0.8}
              >
                <Feather name="zap" size={14} color={colors.primary} />
                <Text style={[styles.bulkFillText, { color: colors.primary }]}>Fill Defaults</Text>
              </TouchableOpacity>
            </View>

            {/* Students List Count Label */}
            <View style={styles.listMetaRow}>
              <Text style={[styles.listMetaCount, { color: colors.textSecondary }]}>
                STUDENTS ENROLLED ({subjectStudents.length})
              </Text>
              <Text style={[styles.listMetaTip, { color: colors.textMuted }]}>
                Enter raw marks out of each component
              </Text>
            </View>

            {/* Students Marks Input Cards */}
            {subjectStudents
              .filter((s) => {
                if (!searchStudentQuery.trim()) return true;
                const q = searchStudentQuery.toLowerCase();
                return s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q);
              })
              .map((s, index) => {
                const current = marksState[s.roll] || {
                  mt1: '15',
                  mt2: '16',
                  assign: '8',
                  practical: '16',
                };
                const total =
                  (parseInt(current.mt1, 10) || 0) +
                  (parseInt(current.mt2, 10) || 0) +
                  (parseInt(current.assign, 10) || 0) +
                  (parseInt(current.practical, 10) || 0);

                let grade = 'A';
                let gradeBg = '#DCFCE7';
                let gradeColor = '#15803D';
                if (total >= 63) {
                  grade = 'A+';
                  gradeBg = '#DCFCE7';
                  gradeColor = '#15803D';
                } else if (total >= 56) {
                  grade = 'A';
                  gradeBg = '#E0F2FE';
                  gradeColor = '#0369A1';
                } else if (total >= 49) {
                  grade = 'B+';
                  gradeBg = '#FEF3C7';
                  gradeColor = '#B45309';
                } else if (total >= 42) {
                  grade = 'B';
                  gradeBg = '#F3E8FF';
                  gradeColor = '#7E22CE';
                } else if (total >= 35) {
                  grade = 'C';
                  gradeBg = '#FFEDD5';
                  gradeColor = '#C2410C';
                } else {
                  grade = 'F';
                  gradeBg = '#FEE2E2';
                  gradeColor = '#DC2626';
                }

                const initial = s.name ? s.name.charAt(0).toUpperCase() : 'S';

                return (
                  <View
                    key={s.id || s.roll || index}
                    style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    {/* Student Info & Live Score Header */}
                    <View style={styles.studentHeader}>
                      <View style={[styles.avatarCircle, { backgroundColor: colors.primarySubtle }]}>
                        <Text style={[styles.avatarText, { color: colors.primary }]}>{initial}</Text>
                      </View>
                      <View style={styles.studentDetails}>
                        <Text style={[styles.sName, { color: colors.text }]} numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Text style={[styles.sRoll, { color: colors.textSecondary }]}>
                          {s.roll} • {s.branch} Sem {s.semester || currentAllocation?.semester || 3}
                        </Text>
                      </View>

                      <View style={styles.gradeTotalBox}>
                        <View style={[styles.gradeLetterBadge, { backgroundColor: gradeBg }]}>
                          <Text style={[styles.gradeLetterText, { color: gradeColor }]}>
                            {grade}
                          </Text>
                        </View>
                        <View style={[styles.scorePill, { backgroundColor: colors.surfaceSubtle }]}>
                          <Text style={[styles.scoreText, { color: colors.primary }]}>{total}/70</Text>
                        </View>
                      </View>
                    </View>

                    {/* Divider */}
                    <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                    {/* Marks Input Grid (4 Columns aligned evenly) */}
                    <View style={styles.inputsRow}>
                      {/* Mid Term 1 */}
                      <View
                        style={[
                          styles.inputBox,
                          selectedExamType === 'mt1' && styles.inputBoxActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.inputLabel,
                            {
                              color: selectedExamType === 'mt1' ? colors.primary : colors.textSecondary,
                              fontWeight: selectedExamType === 'mt1' ? '800' : '600',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          MT-1 (20)
                        </Text>
                        <TextInput
                          style={[
                            styles.inputField,
                            {
                              backgroundColor: colors.surfaceSubtle,
                              borderColor: selectedExamType === 'mt1' ? colors.primary : colors.border,
                              borderWidth: selectedExamType === 'mt1' ? 1.5 : 1,
                              color: colors.text,
                            },
                          ]}
                          keyboardType="number-pad"
                          maxLength={2}
                          value={current.mt1}
                          onChangeText={(v) => handleUpdateMark(s.roll, 'mt1', v)}
                        />
                      </View>

                      {/* Mid Term 2 */}
                      <View
                        style={[
                          styles.inputBox,
                          selectedExamType === 'mt2' && styles.inputBoxActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.inputLabel,
                            {
                              color: selectedExamType === 'mt2' ? colors.primary : colors.textSecondary,
                              fontWeight: selectedExamType === 'mt2' ? '800' : '600',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          MT-2 (20)
                        </Text>
                        <TextInput
                          style={[
                            styles.inputField,
                            {
                              backgroundColor: colors.surfaceSubtle,
                              borderColor: selectedExamType === 'mt2' ? colors.primary : colors.border,
                              borderWidth: selectedExamType === 'mt2' ? 1.5 : 1,
                              color: colors.text,
                            },
                          ]}
                          keyboardType="number-pad"
                          maxLength={2}
                          value={current.mt2}
                          onChangeText={(v) => handleUpdateMark(s.roll, 'mt2', v)}
                        />
                      </View>

                      {/* Assignment */}
                      <View
                        style={[
                          styles.inputBox,
                          selectedExamType === 'assign' && styles.inputBoxActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.inputLabel,
                            {
                              color: selectedExamType === 'assign' ? colors.primary : colors.textSecondary,
                              fontWeight: selectedExamType === 'assign' ? '800' : '600',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          Assgn (10)
                        </Text>
                        <TextInput
                          style={[
                            styles.inputField,
                            {
                              backgroundColor: colors.surfaceSubtle,
                              borderColor: selectedExamType === 'assign' ? colors.primary : colors.border,
                              borderWidth: selectedExamType === 'assign' ? 1.5 : 1,
                              color: colors.text,
                            },
                          ]}
                          keyboardType="number-pad"
                          maxLength={2}
                          value={current.assign}
                          onChangeText={(v) => handleUpdateMark(s.roll, 'assign', v)}
                        />
                      </View>

                      {/* Practical / Lab */}
                      <View
                        style={[
                          styles.inputBox,
                          selectedExamType === 'practical' && styles.inputBoxActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.inputLabel,
                            {
                              color: selectedExamType === 'practical' ? colors.primary : colors.textSecondary,
                              fontWeight: selectedExamType === 'practical' ? '800' : '600',
                            },
                          ]}
                          numberOfLines={1}
                        >
                          Lab (20)
                        </Text>
                        <TextInput
                          style={[
                            styles.inputField,
                            {
                              backgroundColor: colors.surfaceSubtle,
                              borderColor: selectedExamType === 'practical' ? colors.primary : colors.border,
                              borderWidth: selectedExamType === 'practical' ? 1.5 : 1,
                              color: colors.text,
                            },
                          ]}
                          keyboardType="number-pad"
                          maxLength={2}
                          value={current.practical}
                          onChangeText={(v) => handleUpdateMark(s.roll, 'practical', v)}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}

            {/* Save & Upload Action Button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: '#4F46E5' }]}
              onPress={handleSaveMarks}
              activeOpacity={0.85}
            >
              <Feather name="check-circle" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>
                Save & Lock Marks ({subjectStudents.length} Students)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerBox: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  tabScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.2,
    gap: 6,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentScroll: {
    padding: 16,
    paddingBottom: 130,
  },
  heroCard: {
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroTag: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroScore: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  badgePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgePillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  statVal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSub: {
    fontSize: 11,
    marginTop: 1,
  },
  subjectCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subName: {
    fontSize: 15,
    fontWeight: '700',
  },
  subCode: {
    fontSize: 12,
    marginTop: 2,
  },
  gradeCircle: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeCircleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  marksGrid: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-around',
  },
  mGridCol: {
    alignItems: 'center',
  },
  mLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  mValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  admitCardBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  admitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  admitIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  admitTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  admitSub: {
    fontSize: 12,
    marginTop: 2,
  },
  admitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  admitBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  timelineCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  timelineLeft: {
    marginRight: 12,
  },
  dateBox: {
    width: 50,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timelineRight: {
    flex: 1,
  },
  examBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  codePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  examSubject: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  examMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  sumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sumTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sumText: {
    fontSize: 12,
    lineHeight: 18,
  },
  entryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  allocBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  allocCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subjectPillsContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    paddingRight: 8,
    marginBottom: 14,
  },
  subjectPill: {
    width: 175,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'space-between',
  },
  pillTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  subjectCodePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectPillCode: {
    fontSize: 12,
    fontWeight: '800',
  },
  subjectPillName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  subjectPillMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  filterTip: {
    fontSize: 10,
    fontWeight: '500',
  },
  examTypeScroll: {
    gap: 8,
    paddingVertical: 4,
    paddingBottom: 12,
  },
  examTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  examTypeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoBannerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
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
  bulkFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  bulkFillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  listMetaCount: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  listMetaTip: {
    fontSize: 10,
    fontWeight: '500',
  },
  entryCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
  },
  studentDetails: {
    flex: 1,
  },
  sName: {
    fontSize: 14,
    fontWeight: '700',
  },
  sRoll: {
    fontSize: 11,
    marginTop: 2,
  },
  gradeTotalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gradeLetterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeLetterText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scorePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    marginVertical: 10,
  },
  inputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  inputBox: {
    flex: 1,
    alignItems: 'center',
  },
  inputBoxActive: {
    transform: [{ scale: 1.02 }],
  },
  inputLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  inputField: {
    width: '100%',
    height: 40,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 0,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    marginTop: 16,
    gap: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
