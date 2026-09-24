import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  Animated,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { api } from '../services/api';
import {
  allFaculties,
  allAllocations,
  allSubjects,
  allStudents,
  getProfessorAllocations,
} from '../services/collegeDatabase';
import { SubjectAttendance, TimetableSlot, Notice, OnlineTest } from '../types';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { AnimatedCard } from '../components/common/AnimatedCard';
import { StatCard } from '../components/common/StatCard';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { StatusBadge } from '../components/common/StatusBadge';

export const HomeScreen = ({ navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { user, role } = useAuth();
  const isStudent = role === 'student';
  const isProf = role === 'professor';
  const isAccountant = role === 'accountant';
  const isAdmin = role === 'admin';
  const isLibrarian = role === 'librarian' || role === 'assistant_librarian';

  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<SubjectAttendance[]>([]);
  const [todayClasses, setTodayClasses] = useState<TimetableSlot[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeTests, setActiveTests] = useState<OnlineTest[]>([]);

  // Accountant Fee State
  const [feeStats, setFeeStats] = useState({
    total_expected: 0,
    total_collected: 0,
    total_pending: 0,
    today_collection: 0,
    defaulters_count: 0,
    collection_rate: 0,
  });

  // Librarian LMS State
  const [libraryStats, setLibraryStats] = useState({
    total_books: 0,
    total_copies: 0,
    available_copies: 0,
    issued_copies: 0,
    overdue_issues: 0,
    issued_today: 0,
    returned_today: 0,
    renewed_today: 0,
    total_outstanding_fines: 0,
    active_members: 0,
  });

  // Staggered Entrance animation values (0ms, 80ms, 160ms, 240ms, 320ms)
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(20)).current;
  const cardsFade = useRef(new Animated.Value(0)).current;
  const cardsSlide = useRef(new Animated.Value(24)).current;
  const sectionsFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 0ms: Header Fade & Slide
    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // 80ms: Cards Slide Upward
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardsFade, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.spring(cardsSlide, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, 80);

    // 240ms: Sections & Portals Fade
    setTimeout(() => {
      Animated.timing(sectionsFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 240);
  }, []);

  // Admin Live State
  const [facultyList, setFacultyList] = useState(allFaculties);
  const [subjectsList, setSubjectsList] = useState(allSubjects);
  const [allotmentsList, setAllotmentsList] = useState(allAllocations);
  const [studentsList, setStudentsList] = useState(allStudents);

  // Dynamic Allocated Subjects for Logged In Professor
  const myFacultyAllocations = useMemo(() => {
    if (!user) return [];
    return getProfessorAllocations(user, allotmentsList);
  }, [user, allotmentsList]);

  // Compute total unique students under this professor's classes
  const myTotalStudentsCount = useMemo(() => {
    if (myFacultyAllocations.length === 0) return 0;
    const branchesAndSems = new Set(
      myFacultyAllocations.map((a) => `${(a.branch || '').toUpperCase()}_${a.semester}`)
    );
    const matchedStudents = studentsList.filter((s) =>
      branchesAndSems.has(`${(s.branch || '').toUpperCase()}_${s.semester}`)
    );
    return matchedStudents.length > 0 ? matchedStudents.length : myFacultyAllocations.length * 45;
  }, [myFacultyAllocations, studentsList]);

  // Modals for Admin Quick Actions
  const [showAddProfModal, setShowAddProfModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // Form states
  const [newProfName, setNewProfName] = useState('');
  const [newProfEmail, setNewProfEmail] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newStudRoll, setNewStudRoll] = useState('');
  const [newStudName, setNewStudName] = useState('');

  const loadDashboardData = async () => {
    try {
      if (isAccountant) {
        const dashRes = await api.getFeeDashboard();
        if (dashRes?.success && dashRes.data) {
          setFeeStats(dashRes.data);
        }
      }
      if (isLibrarian) {
        const libRes = await api.getLibraryDashboard('librarian', undefined, user?.id);
        if (libRes?.success && libRes.metrics) {
          setLibraryStats(libRes.metrics);
        }
      }
      if (isStudent) {
        const attData = await api.getAttendanceSummary(user?.roll);
        setSubjects(attData.subjects);
      }
      const dayClasses = await api.getTimetable(1);
      setTodayClasses(dayClasses.slice(0, 3));

      const noticeData = await api.getNotices();
      setNotices(noticeData.slice(0, 3));

      const testsData = await api.getTests();
      setActiveTests(testsData.filter((t) => t.status === 'available'));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user, role]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Add Professor Handler
  const handleRegisterProfessor = () => {
    if (!newProfName.trim()) {
      Alert.alert('Missing Name', 'Please enter professor full name.');
      return;
    }
    const cleanEmail = newProfEmail.trim() || `${newProfName.toLowerCase().replace(/[^a-z0-9]/g, '')}@college.com`;
    const newProf = {
      id: facultyList.length + 1,
      name: newProfName.trim().toUpperCase(),
      username: newProfName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      email: cleanEmail,
      phone: '+91 98930 11400',
      designation: 'Assistant Professor',
      branches: ['CSE', 'AD'],
      department: 'Computer Science & Engineering',
      assignedSubjects: [],
    };

    setFacultyList([newProf, ...facultyList]);
    setShowAddProfModal(false);
    setNewProfName('');
    setNewProfEmail('');
    Alert.alert(
      'Professor Added Successfully 🎉',
      `${newProf.name} has been added to the faculty list. Total professors: ${facultyList.length + 1}`
    );
  };

  // Add Subject Handler
  const handleRegisterSubject = () => {
    if (!newSubCode.trim() || !newSubName.trim()) {
      Alert.alert('Missing Fields', 'Please enter both subject code and name.');
      return;
    }
    const newSub = {
      id: subjectsList.length + 1,
      code: newSubCode.trim().toUpperCase(),
      name: newSubName.trim(),
      branch: 'CSE',
      semester: 3,
      credits: 4,
      type: 'Theory' as const,
      isActive: true,
    };
    setSubjectsList([newSub, ...subjectsList]);
    setShowAddSubjectModal(false);
    setNewSubCode('');
    setNewSubName('');
    Alert.alert('Course Added ✅', `[${newSub.code}] ${newSub.name} added to available subjects.`);
  };

  // Add Student Handler
  const handleRegisterStudent = () => {
    if (!newStudRoll.trim() || !newStudName.trim()) {
      Alert.alert('Missing Fields', 'Please enter student roll number and full name.');
      return;
    }
    const newStud = {
      id: studentsList.length + 1,
      roll: newStudRoll.trim().toUpperCase(),
      name: newStudName.trim().toUpperCase(),
      branch: 'CSE',
      year: 2,
      semester: 3,
      email: `${newStudRoll.toLowerCase()}@sbitm.edu.in`,
      phone: '+91 94072 00000',
      overallAttendance: 85,
      totalPresent: 41,
      totalClasses: 48,
      academicYear: '2025-2026',
      status: 'active' as const,
    };
    setStudentsList([newStud, ...studentsList]);
    setShowAddStudentModal(false);
    setNewStudRoll('');
    setNewStudName('');
    Alert.alert('Student Enrolled ✅', `${newStud.name} (${newStud.roll}) enrolled successfully.`);
  };

  const getCleanFirstName = (fullName?: string) => {
    if (!fullName) return '';
    const cleaned = fullName.replace(/^(PRO\.|PRO|PROF\.|PROF|DR\.|DR|MR\.|MR|MRS\.|MRS|MS\.|MS)\s*/i, '').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length > 0 && parts[0]) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    }
    return '';
  };

  const displayName = getCleanFirstName(user?.name) || (isAdmin ? 'Admin' : isProf ? 'Professor' : isLibrarian ? 'Librarian' : 'Student');

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        onNotificationPress={() => navigation.navigate('Notices')}
        onProfilePress={() => {
          if (isAdmin) navigation.navigate('AdminProfile');
          else if (isProf) navigation.navigate('ProfProfile');
          else if (isAccountant) navigation.navigate('AccountantProfile');
          else if (isLibrarian) navigation.navigate('LibrarianProfile');
          else navigation.navigate('StudentProfile');
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* =========================================================================
            TOP PERSONALIZED GREETING SECTION (0ms Entry Animation)
            ========================================================================= */}
        <Animated.View
          style={[
            styles.greetingSection,
            {
              opacity: headerFade,
              transform: [{ translateY: headerSlide }],
            },
          ]}
        >
          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greetingTitle, { color: colors.text }]}>
                Good Morning, {displayName} 👋
              </Text>
              <Text style={[styles.greetingSubtitle, { color: colors.textSecondary }]}>
                Here's your college activity for today
              </Text>
            </View>

            <View style={[styles.sessionPill, { backgroundColor: colors.softBlue, borderColor: `${colors.primary}30` }]}>
              <Feather name="calendar" size={11} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.sessionPillText, { color: colors.primary }]}>2026 ODD</Text>
            </View>
          </View>
        </Animated.View>

        {/* =========================================================================
            1. STUDENT PASTEL DASHBOARD (6 COLORFUL KPI CARDS)
            ========================================================================= */}
        {isStudent && (
          <Animated.View style={{ opacity: cardsFade, transform: [{ translateY: cardsSlide }] }}>
            {/* 6 Pastel KPI Cards (2x3 Grid) */}
            <View style={styles.kpiSixGrid}>
              {/* 1. Attendance: Soft Green (#E3F7EC bg, #45B97C accent) */}
              <View style={styles.kpiCol}>
                <StatCard
                  title="Attendance"
                  value={87}
                  suffix="%"
                  subtitle="146/179 Lectures"
                  icon={<Feather name="check-circle" size={18} color={colors.green} />}
                  bgColor={colors.softGreen}
                  accentColor={colors.green}
                  trendText="Safe Zone"
                  trendPositive={true}
                  onPress={() => navigation.navigate('Attendance')}
                />
              </View>

              {/* 2. Today's Classes: Soft Blue (#EAF0FF bg, #5B6CFF accent) */}
              <View style={styles.kpiCol}>
                <StatCard
                  title="Today's Classes"
                  value={todayClasses.length || 3}
                  subtitle="Next: CS303 10:00 AM"
                  icon={<Feather name="clock" size={18} color={colors.primary} />}
                  bgColor={colors.softBlue}
                  accentColor={colors.primary}
                  trendText="Period 2"
                  trendPositive={true}
                  onPress={() => navigation.navigate('Timetable')}
                />
              </View>

              {/* 3. Assignments: Soft Lavender (#EEE9FF bg, #8B7CF6 accent) */}
              <View style={styles.kpiCol}>
                <StatCard
                  title="Assignments"
                  value={4}
                  subtitle="2 Due This Week"
                  icon={<Feather name="file-text" size={18} color={colors.purple} />}
                  bgColor={colors.softLavender}
                  accentColor={colors.purple}
                  trendText="Active"
                  trendPositive={true}
                  onPress={() => navigation.navigate('NotesTab')}
                />
              </View>

              {/* 4. Examinations: Soft Peach (#FFE8DF bg, #F28B75 accent) */}
              <View style={styles.kpiCol}>
                <StatCard
                  title="Examinations"
                  value={1}
                  subtitle="MST-1 on 24 Sep"
                  icon={<MaterialCommunityIcons name="book-clock-outline" size={20} color={colors.coral} />}
                  bgColor={colors.softPeach}
                  accentColor={colors.coral}
                  trendText="Upcoming"
                  trendPositive={false}
                  onPress={() => navigation.navigate('Marks')}
                />
              </View>

              {/* 5. Notices: Soft Yellow (#FFF4D6 bg, #E8A83E accent) */}
              <View style={styles.kpiCol}>
                <StatCard
                  title="Notices"
                  value={notices.length || 3}
                  subtitle="1 Urgent Circular"
                  icon={<Feather name="bell" size={18} color={colors.amber} />}
                  bgColor={colors.softYellow}
                  accentColor={colors.amber}
                  trendText="Alerts"
                  trendPositive={true}
                  onPress={() => navigation.navigate('Notices')}
                />
              </View>

              {/* 6. Results: Soft Cyan (#DDF7F8 bg, #42B8B5 accent) */}
              <View style={styles.kpiCol}>
                <StatCard
                  title="Results (SGPA)"
                  value={8.65}
                  suffix=" SGPA"
                  subtitle="Grade A+ • Rank 4"
                  icon={<Feather name="award" size={18} color={colors.teal} />}
                  bgColor={colors.softCyan}
                  accentColor={colors.teal}
                  trendText="+0.3 vs Sem 2"
                  trendPositive={true}
                  onPress={() => navigation.navigate('Marks')}
                />
              </View>
            </View>

            {/* Quick Services Portals (4 Pastel Cards) */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Student Services & Desks</Text>
                <Text style={[styles.sectionSubHeading, { color: colors.textSecondary }]}>
                  Fee clearance, digital bus pass, study notes & quizzes
                </Text>
              </View>
            </View>

              <View style={styles.portalsTwoGrid}>
                <AnimatedCard
                  containerStyle={styles.portalCol}
                  style={[styles.portalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Fees')}
                >
                  <View style={[styles.portalIconBox, { backgroundColor: colors.softGreen }]}>
                    <Ionicons name="card-outline" size={18} color={colors.green} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.portalTitle, { color: colors.text }]}>Fees & No-Dues</Text>
                    <Text style={[styles.portalSub, { color: colors.textSecondary }]}>Receipt & Dues</Text>
                  </View>
                </AnimatedCard>

                <AnimatedCard
                  containerStyle={styles.portalCol}
                  style={[styles.portalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Transport')}
                >
                  <View style={[styles.portalIconBox, { backgroundColor: colors.softYellow }]}>
                    <MaterialCommunityIcons name="bus-school" size={18} color={colors.amber} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.portalTitle, { color: colors.text }]}>Bus Pass</Text>
                    <Text style={[styles.portalSub, { color: colors.textSecondary }]}>Digital QR Pass</Text>
                  </View>
                </AnimatedCard>

                <AnimatedCard
                  containerStyle={styles.portalCol}
                  style={[styles.portalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Library')}
                >
                  <View style={[styles.portalIconBox, { backgroundColor: colors.softBlue }]}>
                    <Ionicons name="book-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.portalTitle, { color: colors.text }]}>Central Library</Text>
                    <Text style={[styles.portalSub, { color: colors.textSecondary }]}>Books & Dues</Text>
                  </View>
                </AnimatedCard>

                <AnimatedCard
                  containerStyle={styles.portalCol}
                  style={[styles.portalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('TestsTab')}
                >
                  <View style={[styles.portalIconBox, { backgroundColor: colors.softLavender }]}>
                    <MaterialCommunityIcons name="lightning-bolt-outline" size={18} color={colors.purple} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.portalTitle, { color: colors.text }]}>Online Quizzes</Text>
                    <Text style={[styles.portalSub, { color: colors.textSecondary }]}>MCQ Tests</Text>
                  </View>
                </AnimatedCard>

                <AnimatedCard
                  containerStyle={styles.portalCol}
                  style={[styles.portalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('NotesTab')}
                >
                  <View style={[styles.portalIconBox, { backgroundColor: colors.softCyan }]}>
                    <Feather name="book-open" size={17} color={colors.teal} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.portalTitle, { color: colors.text }]}>Study Notes</Text>
                    <Text style={[styles.portalSub, { color: colors.textSecondary }]}>PDF Downloads</Text>
                  </View>
                </AnimatedCard>

                <AnimatedCard
                  containerStyle={styles.portalCol}
                  style={[styles.portalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('Marks')}
                >
                  <View style={[styles.portalIconBox, { backgroundColor: colors.softPeach }]}>
                    <Feather name="award" size={17} color={colors.coral} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.portalTitle, { color: colors.text }]}>MST Results</Text>
                    <Text style={[styles.portalSub, { color: colors.textSecondary }]}>Scores & SGPA</Text>
                  </View>
                </AnimatedCard>
              </View>
          </Animated.View>
        )}

        {/* =========================================================================
            2. PROFESSOR PASTEL DASHBOARD
            ========================================================================= */}
        {isProf && (
          <Animated.View style={{ opacity: cardsFade, transform: [{ translateY: cardsSlide }] }}>
            {/* Professor 4 Pastel KPI Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <StatCard
                  title="Allotted Subjects"
                  value={myFacultyAllocations.length}
                  subtitle="Active Assigned"
                  icon={<Feather name="book" size={18} color={colors.primary} />}
                  bgColor={colors.softBlue}
                  accentColor={colors.primary}
                  trendText="Assigned"
                  trendPositive={true}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Total Students"
                  value={myTotalStudentsCount}
                  subtitle="Across Batches"
                  icon={<Ionicons name="people" size={18} color={colors.green} />}
                  bgColor={colors.softGreen}
                  accentColor={colors.green}
                  trendText="CSE & AD"
                  trendPositive={true}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Today's Classes"
                  value={0}
                  subtitle="Schedule Ready"
                  icon={<Feather name="calendar" size={18} color={colors.amber} />}
                  bgColor={colors.softYellow}
                  accentColor={colors.amber}
                  trendText="Today"
                  trendPositive={true}
                  onPress={() => navigation.navigate('Timetable')}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Online Tests"
                  value={activeTests.length || 2}
                  subtitle="MCQ & Sessional"
                  icon={<MaterialCommunityIcons name="lightning-bolt-outline" size={18} color={colors.purple} />}
                  bgColor={colors.softLavender}
                  accentColor={colors.purple}
                  trendText="Active"
                  trendPositive={true}
                  onPress={() => navigation.navigate('TestsTab')}
                />
              </View>
            </View>

            {/* Quick Actions (6 Pastel Actions in 3 Columns) */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Quick Actions - All Features</Text>
                <Text style={[styles.sectionSubHeading, { color: colors.textSecondary }]}>
                  Exams, study materials, attendance, grading & reports
                </Text>
              </View>
            </View>

            <View style={styles.actionThreeGrid}>
              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.profActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('TestsTab')}
              >
                <View style={[styles.actionBadgeNew, { backgroundColor: colors.coral }]}>
                  <Text style={styles.actionBadgeNewText}>NEW</Text>
                </View>
                <View style={[styles.profActionIconBox, { backgroundColor: colors.softLavender }]}>
                  <Feather name="edit" size={18} color={colors.purple} />
                </View>
                <Text style={[styles.profActionTitle, { color: colors.text }]} numberOfLines={1}>Online Tests</Text>
                <Text style={[styles.profActionSub, { color: colors.textSecondary }]} numberOfLines={1}>Quizzes</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.profActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('NotesTab')}
              >
                <View style={[styles.profActionIconBox, { backgroundColor: colors.softBlue }]}>
                  <Feather name="book-open" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.profActionTitle, { color: colors.text }]} numberOfLines={1}>Study Materials</Text>
                <Text style={[styles.profActionSub, { color: colors.textSecondary }]} numberOfLines={1}>Upload Notes</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.profActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('MarkAttendance')}
              >
                <View style={[styles.profActionIconBox, { backgroundColor: colors.softGreen }]}>
                  <Ionicons name="checkbox-outline" size={19} color={colors.green} />
                </View>
                <Text style={[styles.profActionTitle, { color: colors.text }]} numberOfLines={1}>Attendance</Text>
                <Text style={[styles.profActionSub, { color: colors.textSecondary }]} numberOfLines={1}>Mark Live/Bulk</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.profActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Marks')}
              >
                <View style={[styles.profActionIconBox, { backgroundColor: colors.softYellow }]}>
                  <Feather name="award" size={18} color={colors.amber} />
                </View>
                <Text style={[styles.profActionTitle, { color: colors.text }]} numberOfLines={1}>Marks Entry</Text>
                <Text style={[styles.profActionSub, { color: colors.textSecondary }]} numberOfLines={1}>MST & Labs</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.profActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Reports')}
              >
                <View style={[styles.profActionIconBox, { backgroundColor: colors.softPink }]}>
                  <MaterialCommunityIcons name="chart-pie" size={19} color={colors.pink} />
                </View>
                <Text style={[styles.profActionTitle, { color: colors.text }]} numberOfLines={1}>Reports</Text>
                <Text style={[styles.profActionSub, { color: colors.textSecondary }]} numberOfLines={1}>Excel Sheets</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.profActionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Notices')}
              >
                <View style={[styles.profActionIconBox, { backgroundColor: colors.softPeach }]}>
                  <Feather name="bell" size={18} color={colors.coral} />
                </View>
                <Text style={[styles.profActionTitle, { color: colors.text }]} numberOfLines={1}>Notices</Text>
                <Text style={[styles.profActionSub, { color: colors.textSecondary }]} numberOfLines={1}>Circulars</Text>
              </AnimatedCard>
            </View>

            {/* Allotted Subjects Roster */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>
                  Allotted Courses ({myFacultyAllocations.length})
                </Text>
                <Text style={[styles.sectionSubHeading, { color: colors.textSecondary }]}>
                  Manage attendance, marks, questions & unit notes
                </Text>
              </View>
            </View>

            {myFacultyAllocations.map((alloc) => {
              const subCode = alloc.subjectCode;
              const subName = alloc.subjectName;
              const subBranch = alloc.branch || 'CSE';
              const subSem = alloc.semester || 3;

              return (
                <View
                  key={`${alloc.id}_${subCode}`}
                  style={[styles.profSubjCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.profSubjHeader, { backgroundColor: colors.softBlue }]}>
                    <View>
                      <Text style={[styles.profSubjCodeText, { color: colors.primary }]}>{subCode}</Text>
                      <Text style={[styles.profSubjSemText, { color: colors.textSecondary }]}>
                        Semester {subSem} • {alloc.slotType || 'Theory'}
                      </Text>
                    </View>
                    <View style={[styles.profSubjBranchPill, { backgroundColor: `${colors.primary}20` }]}>
                      <Text style={[styles.profSubjBranchText, { color: colors.primary }]}>{subBranch}</Text>
                    </View>
                  </View>

                  <View style={styles.profSubjBody}>
                    <Text style={[styles.profSubjTitle, { color: colors.text }]}>{subName}</Text>

                    <View style={styles.profSubjActionGrid}>
                      <TouchableOpacity
                        style={[styles.profSubjBtn, { backgroundColor: colors.green }]}
                        onPress={() => navigation.navigate('MarkAttendance', { initialSubjectCode: subCode })}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkbox-outline" size={13} color="#FFFFFF" />
                        <Text style={styles.profSubjBtnText}>Attendance</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.profSubjBtn, { backgroundColor: colors.amber }]}
                        onPress={() => navigation.navigate('Marks', { initialSubject: subCode })}
                        activeOpacity={0.8}
                      >
                        <Feather name="edit-3" size={13} color="#FFFFFF" />
                        <Text style={styles.profSubjBtnText}>Marks Entry</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.profSubjBtn, { backgroundColor: colors.purple }]}
                        onPress={() => navigation.navigate('NotesTab', { initialSubject: subCode })}
                        activeOpacity={0.8}
                      >
                        <Feather name="upload-cloud" size={13} color="#FFFFFF" />
                        <Text style={styles.profSubjBtnText}>Notes</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* =========================================================================
            3. ACCOUNTANT & FEE OFFICER PASTEL DASHBOARD (100% FEE-CENTRIC)
            ========================================================================= */}
        {isAccountant && (
          <Animated.View style={{ opacity: cardsFade, transform: [{ translateY: cardsSlide }] }}>
            {/* 4 Accountant Pastel KPI Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <StatCard
                  title="Fee Collected"
                  value={Math.round(feeStats.total_collected)}
                  prefix="₹"
                  subtitle="Realized Revenue"
                  icon={<Feather name="check-circle" size={18} color={colors.green} />}
                  bgColor={colors.softGreen}
                  accentColor={colors.green}
                  trendText={`${feeStats.collection_rate}% Target`}
                  trendPositive={true}
                  onPress={() => navigation.navigate('Fees')}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Pending Dues"
                  value={Math.round(feeStats.total_pending)}
                  prefix="₹"
                  subtitle="Unpaid Student Fees"
                  icon={<Feather name="clock" size={18} color={colors.coral} />}
                  bgColor={colors.softPeach}
                  accentColor={colors.coral}
                  trendText={`${feeStats.defaulters_count} Defaulters`}
                  trendPositive={false}
                  onPress={() => navigation.navigate('Fees')}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Today's Collection"
                  value={Math.round(feeStats.today_collection || 0)}
                  prefix="₹"
                  subtitle="Counter & Online"
                  icon={<Feather name="activity" size={18} color={colors.purple} />}
                  bgColor={colors.softLavender}
                  accentColor={colors.purple}
                  trendText="Live Sync"
                  trendPositive={true}
                  onPress={() => navigation.navigate('Fees')}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Gross Demand"
                  value={Math.round(feeStats.total_expected)}
                  prefix="₹"
                  subtitle="Annual Expectation"
                  icon={<Feather name="briefcase" size={18} color={colors.primary} />}
                  bgColor={colors.softBlue}
                  accentColor={colors.primary}
                  trendText="185 Students"
                  trendPositive={true}
                  onPress={() => navigation.navigate('Fees')}
                />
              </View>
            </View>

            {/* Accountant Operations 6-Grid */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Accounts & Fee Operations</Text>
                <Text style={[styles.sectionSubHeading, { color: colors.textSecondary }]}>
                  Cashier counter, student roster, discounts & reconciliation
                </Text>
              </View>
            </View>

            <View style={styles.actionThreeGrid}>
              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Fees', { initialTab: 'cashier_desk' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softGreen }]}>
                  <MaterialCommunityIcons name="cash-register" size={17} color={colors.green} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.green }]} numberOfLines={1}>Cashier</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Fast Collect</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Fees', { initialTab: 'approvals' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softYellow }]}>
                  <Feather name="check-square" size={16} color={colors.amber} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.amber }]} numberOfLines={1}>Approvals</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Fee & Bus Q</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Fees', { initialTab: 'schedule' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softBlue }]}>
                  <Feather name="calendar" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.primary }]} numberOfLines={1}>4 Schedules</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Installments</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Transport')}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softCyan }]}>
                  <MaterialCommunityIcons name="bus-school" size={17} color={colors.teal} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.teal }]} numberOfLines={1}>Transport</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Bus Passes</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Fees', { initialTab: 'roster' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softLavender }]}>
                  <Feather name="users" size={16} color={colors.purple} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.purple }]} numberOfLines={1}>Fee Roster</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>All Students</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Fees', { initialTab: 'reports' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softPeach }]}>
                  <Feather name="file-text" size={16} color={colors.coral} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.coral }]} numberOfLines={1}>Daily Report</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Reconciliation</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Library', { initialTab: 'members' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softLavender }]}>
                  <Feather name="book-open" size={16} color={colors.purple} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.purple }]} numberOfLines={1}>Library Dues</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Student Clearance</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Library', { initialTab: 'catalog' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softBlue }]}>
                  <Feather name="maximize" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.primary }]} numberOfLines={1}>Book Scan</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Catalog & Barcode</Text>
              </AnimatedCard>
            </View>
          </Animated.View>
        )}

        {/* =========================================================================
            4. ADMINISTRATOR PASTEL DASHBOARD (SUPER ADMIN ONLY)
            ========================================================================= */}
        {isAdmin && (
          <Animated.View style={{ opacity: cardsFade, transform: [{ translateY: cardsSlide }] }}>
            {/* 4 Admin Pastel KPI Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <StatCard
                  title="Total Faculty"
                  value={facultyList.length}
                  subtitle="Active Professors"
                  icon={<FontAwesome5 name="chalkboard-teacher" size={16} color={colors.primary} />}
                  bgColor={colors.softBlue}
                  accentColor={colors.primary}
                  trendText="18 Faculty"
                  trendPositive={true}
                  onPress={() => navigation.navigate('FacultyDirectory')}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Active Subjects"
                  value={64}
                  subtitle="CSE & AD Modules"
                  icon={<Feather name="book-open" size={18} color={colors.teal} />}
                  bgColor={colors.softCyan}
                  accentColor={colors.teal}
                  trendText="64 Courses"
                  trendPositive={true}
                  onPress={() => navigation.navigate('SubjectAllocation')}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Students Enrolled"
                  value={studentsList.length || 1245}
                  subtitle="CSE & AD Batches"
                  icon={<Ionicons name="people" size={18} color={colors.pink} />}
                  bgColor={colors.softPink}
                  accentColor={colors.pink}
                  trendText="Active"
                  trendPositive={true}
                  onPress={() => navigation.navigate('StudentsDirectory')}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Allocations"
                  value={allotmentsList.length}
                  subtitle="Assigned Courses"
                  icon={<Feather name="layers" size={18} color={colors.green} />}
                  bgColor={colors.softGreen}
                  accentColor={colors.green}
                  trendText="68 Allotted"
                  trendPositive={true}
                  onPress={() => navigation.navigate('SubjectAllocation')}
                />
              </View>
            </View>

            {/* Admin Actions 9-Grid */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Quick Administrative Desks</Text>
                <Text style={[styles.sectionSubHeading, { color: colors.textSecondary }]}>
                  College management portals & fast shortcuts
                </Text>
              </View>
            </View>

            <View style={styles.actionThreeGrid}>
              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Timetable')}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softBlue }]}>
                  <Feather name="calendar" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.text }]} numberOfLines={1}>Timetable</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Schedules</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowAddProfModal(true)}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softLavender }]}>
                  <FontAwesome5 name="user-plus" size={13} color={colors.purple} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.purple }]} numberOfLines={1}>+ Faculty</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Register</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowAddStudentModal(true)}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softGreen }]}>
                  <Ionicons name="person-add-outline" size={15} color={colors.green} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.green }]} numberOfLines={1}>+ Student</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Enrollment</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowAddSubjectModal(true)}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softCyan }]}>
                  <Feather name="book" size={15} color={colors.teal} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.teal }]} numberOfLines={1}>+ Course</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Add subject</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Reports')}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softPink }]}>
                  <MaterialCommunityIcons name="file-chart-outline" size={16} color={colors.pink} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.text }]} numberOfLines={1}>Reports</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Excel sheets</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Fees')}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softYellow }]}>
                  <Ionicons name="card-outline" size={16} color={colors.amber} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.text }]} numberOfLines={1}>Accounts</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Fee Desk</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Library')}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softBlue }]}>
                  <Ionicons name="book-outline" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.primary }]} numberOfLines={1}>Library</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Catalog & Dues</Text>
              </AnimatedCard>
            </View>
          </Animated.View>
        )}

        {/* =========================================================================
            5. LIBRARIAN PASTEL DASHBOARD (100% LMS-CENTRIC)
            ========================================================================= */}
        {isLibrarian && (
          <Animated.View style={{ opacity: cardsFade, transform: [{ translateY: cardsSlide }] }}>
            {/* 4 Librarian Pastel KPI Cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiCol}>
                <StatCard
                  title="Total Books"
                  value={libraryStats.total_books}
                  subtitle={`${libraryStats.total_copies} Physical Copies`}
                  icon={<Feather name="book" size={18} color={colors.primary} />}
                  bgColor={colors.softBlue}
                  accentColor={colors.primary}
                  trendText="In Catalog"
                  trendPositive={true}
                  onPress={() => navigation.navigate('Library', { initialTab: 'catalog' })}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Available Copies"
                  value={libraryStats.available_copies}
                  subtitle="Ready on Shelves"
                  icon={<Feather name="check-circle" size={18} color={colors.green} />}
                  bgColor={colors.softGreen}
                  accentColor={colors.green}
                  trendText="In Library"
                  trendPositive={true}
                  onPress={() => navigation.navigate('Library', { initialTab: 'catalog' })}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Issued Out"
                  value={libraryStats.issued_copies}
                  subtitle={`${libraryStats.active_members} Members`}
                  icon={<MaterialCommunityIcons name="swap-horizontal" size={18} color={colors.purple} />}
                  bgColor={colors.softLavender}
                  accentColor={colors.purple}
                  trendText="Circulation"
                  trendPositive={true}
                  onPress={() => navigation.navigate('Library', { initialTab: 'counter' })}
                />
              </View>

              <View style={styles.kpiCol}>
                <StatCard
                  title="Overdue Books"
                  value={libraryStats.overdue_issues}
                  subtitle={`₹${libraryStats.total_outstanding_fines} Dues`}
                  icon={<Feather name="alert-circle" size={18} color={colors.coral} />}
                  bgColor={colors.softPeach}
                  accentColor={colors.coral}
                  trendText="Pending Return"
                  trendPositive={false}
                  onPress={() => navigation.navigate('Library', { initialTab: 'overdue_fines' })}
                />
              </View>
            </View>

            {/* Librarian Fast Action Banners */}
            <View style={{ gap: 8, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Library', { initialTab: 'barcodes' })}
                activeOpacity={0.88}
                style={[styles.counterQuickBanner, { backgroundColor: colors.purple }]}
              >
                <Ionicons name="barcode" size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.counterBannerTitle}>Generate Book Barcode Stickers 🏷️</Text>
                  <Text style={styles.counterBannerSub}>Generate printable batch barcodes (5, 10, 25, 50, 100) for physical books</Text>
                </View>
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Library', { initialTab: 'counter' })}
                activeOpacity={0.88}
                style={[styles.counterQuickBanner, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="swap-horizontal" size={22} color="#FFFFFF" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.counterBannerTitle}>Open Circulation Counter Desk</Text>
                  <Text style={styles.counterBannerSub}>Issue, return, or renew books with live barcode scanner</Text>
                </View>
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Librarian Operations 6-Grid */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeading, { color: colors.text }]}>Library Circulation & Inventory</Text>
                <Text style={[styles.sectionSubHeading, { color: colors.textSecondary }]}>
                  Counter desk, barcode generator, accession register & fine waivers
                </Text>
              </View>
            </View>

            <View style={styles.actionThreeGrid}>
              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Library', { initialTab: 'barcodes' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softLavender }]}>
                  <Ionicons name="barcode-outline" size={18} color={colors.purple} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.purple }]} numberOfLines={1}>Barcodes</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Generate Stickers</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Library', { initialTab: 'counter' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softGreen }]}>
                  <Ionicons name="swap-horizontal" size={17} color={colors.green} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.green }]} numberOfLines={1}>Counter</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Issue/Return</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Library', { initialTab: 'catalog' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softBlue }]}>
                  <Ionicons name="book-outline" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.primary }]} numberOfLines={1}>Catalog</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Book Titles</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Library', { initialTab: 'members' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softCyan }]}>
                  <Ionicons name="people-outline" size={16} color={colors.teal} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.teal }]} numberOfLines={1}>Members</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Roster & Dues</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Library', { initialTab: 'overdue_fines' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softPeach }]}>
                  <Ionicons name="alert-circle-outline" size={17} color={colors.coral} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.coral }]} numberOfLines={1}>Overdue</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Fine Desk</Text>
              </AnimatedCard>

              <AnimatedCard
                containerStyle={styles.actionCol}
                style={[styles.deskBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Library', { initialTab: 'add_book' })}
              >
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softYellow }]}>
                  <Ionicons name="add-circle-outline" size={17} color={colors.amber} />
                </View>
                <Text style={[styles.deskTitle, { color: colors.amber }]} numberOfLines={1}>+ New Book</Text>
                <Text style={[styles.deskSub, { color: colors.textSecondary }]} numberOfLines={1}>Accession</Text>
              </AnimatedCard>
            </View>
          </Animated.View>
        )}

        {/* =========================================================================
            IMPORTANT NOTICES BROADCAST (Pastel Category Indicators)
            ========================================================================= */}
        <Animated.View style={{ opacity: sectionsFade }}>
          <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
            <View>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>Important Circulars & Notices</Text>
              <Text style={[styles.sectionSubHeading, { color: colors.textSecondary }]}>
                Official college announcements & verified circulars
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Notices')} activeOpacity={0.7}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View All →</Text>
            </TouchableOpacity>
          </View>

          {notices.map((n) => {
            const isUrgent = n.isImportant;
            const accentTint = isUrgent ? colors.coral : colors.primary;
            const bgTint = isUrgent ? colors.softPeach : colors.softBlue;

            return (
              <AnimatedCard
                key={n.id}
                style={[
                  styles.noticeCardItem,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderLeftColor: accentTint,
                  },
                ]}
                onPress={() => navigation.navigate('Notices')}
              >
                <View style={styles.noticeCardTop}>
                  <StatusBadge
                    status={isUrgent ? 'danger' : 'info'}
                    label={isUrgent ? 'URGENT CIRCULAR' : 'ACADEMIC NOTICE'}
                    size="sm"
                  />
                  <Text style={[styles.noticeCardDate, { color: colors.textMuted }]}>{n.createdAt}</Text>
                </View>
                <Text style={[styles.noticeCardTitle, { color: colors.text }]}>{n.title}</Text>
                <Text style={[styles.noticeCardMsg, { color: colors.textSecondary }]} numberOfLines={2}>
                  {n.message}
                </Text>
              </AnimatedCard>
            );
          })}
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* =========================================================================
          ADMIN QUICK ACTION MODALS (+ PROF, + SUBJECT, + STUDENT)
          ========================================================================= */}
      {/* 1. ADD PROFESSOR MODAL */}
      <Modal visible={showAddProfModal} transparent animationType="slide" onRequestClose={() => setShowAddProfModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Register New Professor</Text>
              <TouchableOpacity onPress={() => setShowAddProfModal(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Add faculty member to college roster</Text>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Professor Full Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. DR. RAHUL VERMA"
                placeholderTextColor={colors.textMuted}
                value={newProfName}
                onChangeText={setNewProfName}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Official Email</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. rahulverma@college.com"
                placeholderTextColor={colors.textMuted}
                value={newProfEmail}
                onChangeText={setNewProfEmail}
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity style={[styles.saveModalBtn, { backgroundColor: colors.primary }]} onPress={handleRegisterProfessor} activeOpacity={0.85}>
              <Text style={styles.saveModalBtnText}>Save & Register Faculty</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. ADD SUBJECT MODAL */}
      <Modal visible={showAddSubjectModal} transparent animationType="slide" onRequestClose={() => setShowAddSubjectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Subject Course</Text>
              <TouchableOpacity onPress={() => setShowAddSubjectModal(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Create course code for Semester 3</Text>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Course Code *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. CS305"
                placeholderTextColor={colors.textMuted}
                value={newSubCode}
                onChangeText={setNewSubCode}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Course Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Cloud Computing & Security"
                placeholderTextColor={colors.textMuted}
                value={newSubName}
                onChangeText={setNewSubName}
              />
            </View>

            <TouchableOpacity style={[styles.saveModalBtn, { backgroundColor: colors.primary }]} onPress={handleRegisterSubject} activeOpacity={0.85}>
              <Text style={styles.saveModalBtnText}>Create Course Subject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. ADD STUDENT MODAL */}
      <Modal visible={showAddStudentModal} transparent animationType="slide" onRequestClose={() => setShowAddStudentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Enroll New Student</Text>
              <TouchableOpacity onPress={() => setShowAddStudentModal(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Register student in CSE Department</Text>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Enrollment / Roll No *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. 0545CS231050"
                placeholderTextColor={colors.textMuted}
                value={newStudRoll}
                onChangeText={setNewStudRoll}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Student Full Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. RAHUL SHARMA"
                placeholderTextColor={colors.textMuted}
                value={newStudName}
                onChangeText={setNewStudName}
              />
            </View>

            <TouchableOpacity style={[styles.saveModalBtn, { backgroundColor: colors.primary }]} onPress={handleRegisterStudent} activeOpacity={0.85}>
              <Text style={styles.saveModalBtnText}>Enroll Student Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  greetingSection: {
    marginBottom: 16,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  sessionPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  kpiSixGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 14,
  },
  kpiCol: {
    width: '50%',
    padding: 5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  sectionSubHeading: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  portalsTwoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 14,
  },
  portalCol: {
    width: '50%',
    padding: 5,
  },
  portalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  portalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  portalSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  actionThreeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 16,
  },
  actionCol: {
    width: '33.33%',
    padding: 4,
  },
  profActionCard: {
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionBadgeNew: {
    position: 'absolute',
    top: 5,
    right: 5,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  actionBadgeNewText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '800',
  },
  profActionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  profActionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  profActionSub: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },
  profSubjCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  profSubjHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  profSubjCodeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  profSubjSemText: {
    fontSize: 10,
    fontWeight: '500',
  },
  profSubjBranchPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  profSubjBranchText: {
    fontSize: 10,
    fontWeight: '800',
  },
  profSubjBody: {
    padding: 14,
  },
  profSubjTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  profSubjActionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  profSubjBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  profSubjBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  deskBtn: {
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  deskIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  deskTitle: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  deskSub: {
    fontSize: 9,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },
  noticeCardItem: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: 10,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  noticeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noticeCardDate: {
    fontSize: 10,
    fontWeight: '500',
  },
  noticeCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  noticeCardMsg: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 14,
  },
  modalInputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  saveModalBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveModalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  counterQuickBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  counterBannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  counterBannerSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
});

