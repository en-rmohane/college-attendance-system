import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import {
  allFaculties,
  allAllocations,
  allSubjects,
  allStudents,
  initialAcademicSessions,
} from '../services/collegeDatabase';
import { api } from '../services/api';
import { AcademicSessionConfig } from '../types';
import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'professors' | 'allotments' | 'sessions' | 'actions'>(
    'overview'
  );
  const [profSearch, setProfSearch] = useState('');
  const [allotSearch, setAllotSearch] = useState('');

  // Live State for Professors, Subjects, Allotments, Students, and Academic Sessions
  const [facultyList, setFacultyList] = useState(allFaculties);
  const [subjectsList, setSubjectsList] = useState(allSubjects);
  const [allotmentsList, setAllotmentsList] = useState(allAllocations);
  const [studentsList, setStudentsList] = useState(allStudents);
  const [sessionsList, setSessionsList] = useState<AcademicSessionConfig[]>(initialAcademicSessions);

  // Modals for Quick Actions
  const [showAddProfModal, setShowAddProfModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAllotModal, setShowAllotModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademicSessionConfig | null>(null);

  // Edit session form state
  const [editSemType, setEditSemType] = useState<'ODD' | 'EVEN'>('ODD');
  const [editAcadYear, setEditAcadYear] = useState('2025-2026');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editExamDate, setEditExamDate] = useState('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Upcoming' | 'Completed'>('Active');

  // Load sessions from API on load
  React.useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api.getAcademicSessions();
      if (data && data.length > 0) {
        setSessionsList(data);
      }
    } catch (e) {
      console.log('Error loading sessions:', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setTimeout(() => setRefreshing(false), 400);
  };

  // Toggle Semester Type (ODD <-> EVEN) for a single year
  const handleQuickToggleSemType = async (session: AcademicSessionConfig) => {
    const nextType = session.semester_type === 'ODD' ? 'EVEN' : 'ODD';
    const nextSem = (session.year - 1) * 2 + (nextType === 'ODD' ? 1 : 2);
    
    // Quick optimistic update
    const updated = sessionsList.map(s => 
      s.year === session.year 
        ? { ...s, semester_type: nextType, active_semester: nextSem, term_label: `${s.academic_year} (${nextType} Sem - Sem ${nextSem})` } 
        : s
    );
    setSessionsList(updated);

    const res = await api.updateAcademicSession({
      year: session.year,
      branch: session.branch,
      semester_type: nextType,
      active_semester: nextSem,
    });

    if (res?.success) {
      Alert.alert(
        'Semester Switched ✅',
        `Year ${session.year} is now running Semester ${nextSem} (${nextType} Sem).\nAll curriculum, subjects, and student dashboards are synchronized.`
      );
    } else {
      Alert.alert('Update Notice', res?.error || 'Updated locally.');
    }
  };

  // Open Edit Session Modal
  const handleOpenEditSession = (session: AcademicSessionConfig) => {
    setEditingSession(session);
    setEditSemType(session.semester_type);
    setEditAcadYear(session.academic_year);
    setEditStartDate(session.start_date);
    setEditEndDate(session.end_date);
    setEditExamDate(session.exam_start_date || '');
    setEditStatus(session.status);
    setShowEditSessionModal(true);
  };

  // Save Edit Session Changes
  const handleSaveSessionEdit = async () => {
    if (!editingSession) return;
    const nextSem = (editingSession.year - 1) * 2 + (editSemType === 'ODD' ? 1 : 2);
    
    const updatedPayload = {
      year: editingSession.year,
      branch: editingSession.branch,
      semester_type: editSemType,
      active_semester: nextSem,
      academic_year: editAcadYear,
      start_date: editStartDate,
      end_date: editEndDate,
      exam_start_date: editExamDate,
      status: editStatus,
    };

    const res = await api.updateAcademicSession(updatedPayload);
    if (res?.success) {
      const updated = sessionsList.map(s => 
        s.year === editingSession.year 
          ? { 
              ...s, 
              ...updatedPayload, 
              term_label: `${editAcadYear} (${editSemType} Sem - Sem ${nextSem})` 
            } 
          : s
      );
      setSessionsList(updated);
      setShowEditSessionModal(false);
      Alert.alert('Session Config Saved 🎉', `Year ${editingSession.year} timeline & semester parameters updated successfully.`);
    } else {
      Alert.alert('Error', res?.error || 'Failed to save session');
    }
  };

  // Promote all years or single year
  const handlePromoteAll = () => {
    Alert.alert(
      'Semester Transition / Promotion 🚀',
      'Do you want to switch all 4 academic years to their next semester?\n\n• Odd Sem (1, 3, 5, 7) → Even Sem (2, 4, 6, 8)\n• Even Sem (2, 4, 6, 8) → Odd Sem (1, 3, 5, 7)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch All Semesters',
          onPress: async () => {
            const res = await api.promoteAcademicSession();
            if (res?.success) {
              await loadSessions();
              Alert.alert('Promotion Complete ✅', 'All academic years have advanced to their next term.');
            }
          },
        },
      ]
    );
  };

  // New prof form state
  const [newProfName, setNewProfName] = useState('');
  const [newProfEmail, setNewProfEmail] = useState('');

  // New subject form state
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubName, setNewSubName] = useState('');

  // New student form state
  const [newStudRoll, setNewStudRoll] = useState('');
  const [newStudName, setNewStudName] = useState('');

  // Subject Allotment selection
  const [selectedProfName, setSelectedProfName] = useState(facultyList[0]?.name || 'DR.PANKAJ SINGH SISODIYA');
  const [selectedSubCode, setSelectedSubCode] = useState('CS303');

  // 1. ADD PROFESSOR HANDLER
  const handleRegisterProfessor = () => {
    if (!newProfName.trim()) {
      Alert.alert('Missing Name', 'Please enter the professor full name.');
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

  // 2. ADD SUBJECT HANDLER
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

  // 3. ADD STUDENT HANDLER
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
    Alert.alert('Student Enrolled ✅', `${newStud.name} (${newStud.roll}) enrolled in Semester 3.`);
  };

  // 4. ALLOT SUBJECT HANDLER
  const handleAllotSubject = () => {
    const sub = subjectsList.find((s) => s.code === selectedSubCode) || subjectsList[0];
    const newAllot = {
      id: allotmentsList.length + 1,
      professorId: 1,
      professorName: selectedProfName,
      professorUsername: 'faculty',
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      branch: sub.branch,
      semester: sub.semester,
      slotType: (sub.type?.toLowerCase() === 'lab' ? 'lab' : 'theory') as 'theory' | 'lab',
      assignedDate: '2026-09-20',
    };
    setAllotmentsList([newAllot, ...allotmentsList]);
    setShowAllotModal(false);
    Alert.alert('Allotment Successful ✅', `[${sub.code}] ${sub.name} has been assigned to ${selectedProfName}.`);
  };

  // 5. DELETE / REMOVE PROFESSOR HANDLER
  const handleDeleteProfessor = (profId: number, profName: string) => {
    Alert.alert(
      'Remove Professor 🗑️',
      `Are you sure you want to remove ${profName} from the faculty roster?\n\nThis will also unassign all their courses.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Professor',
          style: 'destructive',
          onPress: () => {
            setFacultyList((prev) => prev.filter((f) => f.id !== profId));
            setAllotmentsList((prev) =>
              prev.filter((a) => a.professorName.toLowerCase() !== profName.toLowerCase())
            );
            Alert.alert(
              'Professor Removed ✅',
              `${profName} has been removed from the faculty roster.`
            );
          },
        },
      ]
    );
  };

  // 6. DELETE / UNASSIGN SUBJECT FROM PROFESSOR HANDLER
  const handleDeleteAllotment = (allotmentId: number, subjectCode: string, profName: string) => {
    Alert.alert(
      'Unassign Subject ⚠️',
      `Do you want to unassign course [${subjectCode}] from ${profName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign Course',
          style: 'destructive',
          onPress: () => {
            setAllotmentsList((prev) => prev.filter((a) => a.id !== allotmentId));
            Alert.alert(
              'Subject Unassigned ✅',
              `Course [${subjectCode}] has been unassigned from ${profName}.`
            );
          },
        },
      ]
    );
  };

  const filteredProfs = facultyList.filter((f) =>
    f.name.toLowerCase().includes(profSearch.toLowerCase()) ||
    f.email.toLowerCase().includes(profSearch.toLowerCase())
  );

  const filteredAllotments = allotmentsList.filter((a) =>
    a.professorName.toLowerCase().includes(allotSearch.toLowerCase()) ||
    a.subjectName.toLowerCase().includes(allotSearch.toLowerCase()) ||
    a.subjectCode.toLowerCase().includes(allotSearch.toLowerCase())
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header Box */}
      <View
        style={[
          styles.headerBox,
          { backgroundColor: colors.headerBg, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.sessionBadgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: colors.dangerSubtle }]}>
                <Text style={[styles.roleBadgeText, { color: colors.danger }]}>ADMINISTRATOR (ADMIN)</Text>
              </View>
              <View style={[styles.sessionBadge, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[styles.sessionBadgeText, { color: colors.primary }]}>2026 ODD • Sem 1</Text>
              </View>
            </View>

            <Text style={[styles.adminTitle, { color: colors.text }]}>Admin Dashboard</Text>
            <Text style={[styles.adminSub, { color: colors.textSecondary }]}>
              Welcome back, Administrator! Here's your system overview.
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.actionIconBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
              onPress={toggleTheme}
            >
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={18}
                color={isDark ? '#F59E0B' : '#6366F1'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionIconBtn, { backgroundColor: colors.dangerSubtle, borderColor: colors.border }]}
              onPress={logout}
            >
              <Feather name="log-out" size={17} color={colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          <TouchableOpacity
            style={[
              styles.tabChip,
              {
                backgroundColor: activeTab === 'overview' ? colors.primary : colors.surfaceSubtle,
                borderColor: activeTab === 'overview' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setActiveTab('overview')}
          >
            <Feather name="grid" size={13} color={activeTab === 'overview' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabChipText, { color: activeTab === 'overview' ? '#FFF' : colors.textSecondary }]}>
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              {
                backgroundColor: activeTab === 'professors' ? colors.primary : colors.surfaceSubtle,
                borderColor: activeTab === 'professors' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setActiveTab('professors')}
          >
            <FontAwesome5 name="chalkboard-teacher" size={12} color={activeTab === 'professors' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabChipText, { color: activeTab === 'professors' ? '#FFF' : colors.textSecondary }]}>
              Professors ({facultyList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              {
                backgroundColor: activeTab === 'allotments' ? colors.primary : colors.surfaceSubtle,
                borderColor: activeTab === 'allotments' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setActiveTab('allotments')}
          >
            <Feather name="layers" size={13} color={activeTab === 'allotments' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabChipText, { color: activeTab === 'allotments' ? '#FFF' : colors.textSecondary }]}>
              Subject Allotments ({allotmentsList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              {
                backgroundColor: activeTab === 'sessions' ? colors.primary : colors.surfaceSubtle,
                borderColor: activeTab === 'sessions' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setActiveTab('sessions')}
          >
            <Feather name="calendar" size={13} color={activeTab === 'sessions' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabChipText, { color: activeTab === 'sessions' ? '#FFF' : colors.textSecondary }]}>
              Academic Sessions ({sessionsList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabChip,
              {
                backgroundColor: activeTab === 'actions' ? colors.primary : colors.surfaceSubtle,
                borderColor: activeTab === 'actions' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setActiveTab('actions')}
          >
            <Feather name="zap" size={13} color={activeTab === 'actions' ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.tabChipText, { color: activeTab === 'actions' ? '#FFF' : colors.textSecondary }]}>
              Quick Actions (9)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View>
            {/* 4 Main KPI Cards from Website */}
            <View style={styles.kpiGrid}>
              <TouchableOpacity
                style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setActiveTab('professors')}
                activeOpacity={0.8}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: colors.primarySubtle }]}>
                  <FontAwesome5 name="chalkboard-teacher" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{facultyList.length}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Total Professors</Text>
                <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Active faculty</Text>
              </TouchableOpacity>

              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.kpiIconWrap, { backgroundColor: colors.accentSubtle }]}>
                  <Feather name="book-open" size={18} color={colors.accent} />
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>64</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Active Subjects</Text>
                <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Available</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.kpiIconWrap, { backgroundColor: colors.warningSubtle }]}>
                  <Feather name="file-text" size={18} color={colors.warning} />
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>3</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Total Reports</Text>
                <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Generated</Text>
              </View>

              <TouchableOpacity
                style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setActiveTab('allotments')}
                activeOpacity={0.8}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: colors.successSubtle }]}>
                  <Feather name="layers" size={18} color={colors.success} />
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{allotmentsList.length}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Allotments</Text>
                <Text style={[styles.kpiSub, { color: colors.textMuted }]}>Assignments</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Actions Shortcuts - ALL 9 FROM WEBSITE */}
            <View style={styles.sectionHeaderFlex}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Quick Actions</Text>
              <Text style={[styles.sectionHint, { color: colors.primary }]}>Tap to open / execute</Text>
            </View>

            <View style={styles.actionsPillGrid}>
              {/* 1. Timetable */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Timetable')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionMiniIcon, { backgroundColor: colors.primarySubtle }]}>
                  <Feather name="calendar" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.actionBtnTitle, { color: colors.text }]}>Timetable</Text>
                <Text style={[styles.actionBtnSub, { color: colors.textSecondary }]}>Generate schedules</Text>
              </TouchableOpacity>

              {/* 2. Manage Semester */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setActiveTab('sessions')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionMiniIcon, { backgroundColor: colors.accentSubtle }]}>
                  <Feather name="calendar" size={16} color={colors.accent} />
                </View>
                <Text style={[styles.actionBtnTitle, { color: colors.text }]}>Manage Sessions</Text>
                <Text style={[styles.actionBtnSub, { color: colors.textSecondary }]}>Year-wise timelines</Text>
              </TouchableOpacity>

              {/* 3. Test Management */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('TestsTab')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionMiniIcon, { backgroundColor: colors.warningSubtle }]}>
                  <MaterialCommunityIcons name="lightning-bolt-outline" size={17} color={colors.warning} />
                </View>
                <Text style={[styles.actionBtnTitle, { color: colors.text }]}>Test Management</Text>
                <Text style={[styles.actionBtnSub, { color: colors.textSecondary }]}>Online exams</Text>
              </TouchableOpacity>

              {/* 4. Generate Attendance Reports */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Reports')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionMiniIcon, { backgroundColor: colors.successSubtle }]}>
                  <MaterialCommunityIcons name="file-chart-outline" size={17} color={colors.success} />
                </View>
                <Text style={[styles.actionBtnTitle, { color: colors.text }]}>Generate Reports</Text>
                <Text style={[styles.actionBtnSub, { color: colors.textSecondary }]}>Year, 15d, Custom</Text>
              </TouchableOpacity>

              {/* 5. ADD PROFESSOR (Modal Action) */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}
                onPress={() => setShowAddProfModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionMiniIcon, { backgroundColor: colors.primary }]}>
                  <FontAwesome5 name="user-plus" size={14} color="#FFF" />
                </View>
                <Text style={[styles.actionBtnTitle, { color: colors.primary }]}>+ Add Professor</Text>
                <Text style={[styles.actionBtnSub, { color: colors.textSecondary }]}>New faculty modal</Text>
              </TouchableOpacity>

              {/* 6. ADD SUBJECT (Modal Action) */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.accentSubtle, borderColor: colors.accent }]}
                onPress={() => setShowAddSubjectModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionMiniIcon, { backgroundColor: colors.accent }]}>
                  <Feather name="book" size={16} color="#FFF" />
                </View>
                <Text style={[styles.actionBtnTitle, { color: colors.accent }]}>+ Add Subject</Text>
                <Text style={[styles.actionBtnSub, { color: colors.textSecondary }]}>New course modal</Text>
              </TouchableOpacity>

              {/* 7. ADD STUDENT (Modal Action) */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.successSubtle, borderColor: colors.success }]}
                onPress={() => setShowAddStudentModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionMiniIcon, { backgroundColor: colors.success }]}>
                  <Ionicons name="person-add-outline" size={16} color="#FFF" />
                </View>
                <Text style={[styles.actionBtnTitle, { color: colors.success }]}>+ Add Student</Text>
                <Text style={[styles.actionBtnSub, { color: colors.textSecondary }]}>New student modal</Text>
              </TouchableOpacity>

              {/* 8. Notices */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Notices')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionMiniIcon, { backgroundColor: colors.dangerSubtle }]}>
                  <Feather name="bell" size={16} color={colors.danger} />
                </View>
                <Text style={[styles.actionBtnTitle, { color: colors.text }]}>Notices</Text>
                <Text style={[styles.actionBtnSub, { color: colors.textSecondary }]}>Send alerts</Text>
              </TouchableOpacity>

              {/* 9. Sync Students */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() =>
                  Alert.alert(
                    'Sync Students 🔄',
                    `All ${studentsList.length} student accounts have been synchronized and verified.`
                  )
                }
                activeOpacity={0.7}
              >
                <View style={[styles.actionMiniIcon, { backgroundColor: colors.warningSubtle }]}>
                  <Feather name="refresh-cw" size={16} color={colors.warning} />
                </View>
                <Text style={[styles.actionBtnTitle, { color: colors.text }]}>Sync Students</Text>
                <Text style={[styles.actionBtnSub, { color: colors.textSecondary }]}>Account fix</Text>
              </TouchableOpacity>
            </View>

            {/* ================= SUBJECT ALLOTMENTS PREVIEW CARD ================= */}
            <View style={styles.sectionHeaderFlex}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                  Subject Allotments ({allotmentsList.length})
                </Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Faculty teaching assignments matrix
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[styles.primarySmallBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowAllotModal(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="plus" size={13} color="#FFF" />
                  <Text style={styles.primarySmallBtnText}>+ Allot</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveTab('allotments')}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>View All</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.allotPreviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {allotmentsList.slice(0, 5).map((allot, idx) => (
                <View
                  key={allot.id}
                  style={[
                    styles.allotPreviewRow,
                    { borderBottomColor: idx === 4 ? 'transparent' : colors.border },
                  ]}
                >
                  <View style={[styles.allotIconCircle, { backgroundColor: colors.primarySubtle }]}>
                    <Feather name="layers" size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.allotProfTitle, { color: colors.text }]}>{allot.professorName}</Text>
                    <Text style={[styles.allotCourseSub, { color: colors.textSecondary }]}>
                      [{allot.subjectCode}] {allot.subjectName}
                    </Text>
                  </View>
                  <View style={[styles.semChipSmall, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.semChipTextSmall, { color: colors.textSecondary }]}>
                      Sem {allot.semester}
                    </Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.viewAllAllotBtn, { backgroundColor: colors.surfaceSubtle, borderTopColor: colors.border }]}
                onPress={() => setActiveTab('allotments')}
                activeOpacity={0.7}
              >
                <Text style={[styles.viewAllAllotText, { color: colors.primary }]}>
                  View All {allotmentsList.length} Faculty Allotments →
                </Text>
              </TouchableOpacity>
            </View>

            {/* Today's Attendance Box */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 18 }]}>Today's Attendance</Text>
            <View style={[styles.todayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.todayHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="calendar" size={14} color={colors.primary} />
                  <Text style={[styles.todayDate, { color: colors.text }]}>20 Sep 2026</Text>
                </View>
                <View style={[styles.zeroPill, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={[styles.zeroPillText, { color: colors.textSecondary }]}>0 Classes</Text>
                </View>
              </View>
              <View style={styles.todayBody}>
                <MaterialCommunityIcons name="clock-alert-outline" size={28} color={colors.textMuted} />
                <Text style={[styles.todayTitle, { color: colors.text }]}>No Attendance Today</Text>
                <Text style={[styles.todaySub, { color: colors.textSecondary }]}>
                  No classes have taken attendance yet.
                </Text>
              </View>
            </View>

            {/* Recent Reports */}
            <View style={styles.sectionHeaderFlex}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                  Recent Attendance Reports
                </Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Generated Excel files & logs
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.primarySmallBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigation.navigate('Reports')}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={13} color="#FFF" />
                <Text style={styles.primarySmallBtnText}>+ Generate</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.reportsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { date: '20 Sep 2026', title: 'CSE Year 2 - 15 Days Attendance Report', by: 'Admin', status: 'Generated' },
                { date: '10 Sep 2026', title: 'All Subjects Comprehensive Report', by: 'Admin', status: 'Generated' },
                { date: '25 Nov 2025', title: 'CS303 Subject-wise 30d Sheet', by: 'Faculty', status: 'Generated' },
              ].map((rep, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.reportRow,
                    { borderBottomColor: idx === 2 ? 'transparent' : colors.border },
                  ]}
                  onPress={() => navigation.navigate('Reports')}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.repDate, { color: colors.primary }]}>{rep.date}</Text>
                    <Text style={[styles.repTitle, { color: colors.text }]}>{rep.title}</Text>
                    <Text style={[styles.repBy, { color: colors.textSecondary }]}>Generated By: {rep.by}</Text>
                  </View>
                  <View style={[styles.repStatusPill, { backgroundColor: colors.successSubtle }]}>
                    <Text style={[styles.repStatusText, { color: colors.success }]}>{rep.status}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* TAB 2: PROFESSORS DIRECTORY */}
        {activeTab === 'professors' && (
          <View>
            <View style={styles.sectionTopBar}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Professors ({facultyList.length})</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Faculty contact & active subject allotments
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.primarySmallBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowAddProfModal(true)}
              >
                <Feather name="plus" size={14} color="#FFF" />
                <Text style={styles.primarySmallBtnText}>+ Add Professor</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.searchBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search professor by name or email..."
                placeholderTextColor={colors.textMuted}
                value={profSearch}
                onChangeText={setProfSearch}
              />
            </View>

            {filteredProfs.map((prof) => {
              const profAllotments = allotmentsList.filter(
                (a) => a.professorName.toLowerCase() === prof.name.toLowerCase()
              );

              return (
                <View
                  key={prof.id}
                  style={[styles.profCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.profRow}>
                    <View style={[styles.profAvatar, { backgroundColor: colors.primarySubtle }]}>
                      <Text style={[styles.profAvatarText, { color: colors.primary }]}>
                        {prof.name.replace('DR.', '').replace('PRO.', '').trim().charAt(0)}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[styles.profName, { color: colors.text, flex: 1 }]}>{prof.name}</Text>
                        
                        {/* Delete Professor Button */}
                        <TouchableOpacity
                          style={[styles.trashBtnSmall, { backgroundColor: colors.dangerSubtle }]}
                          onPress={() => handleDeleteProfessor(prof.id, prof.name)}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={13} color={colors.danger} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.deptBadgeRow}>
                        <View style={[styles.deptChip, { backgroundColor: colors.surfaceSubtle }]}>
                          <Text style={[styles.deptChipText, { color: colors.textSecondary }]}>CSE, AD</Text>
                        </View>
                        <Text style={[styles.profEmail, { color: colors.textSecondary }]}>{prof.email}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Allocated Subjects Pill List with (x) unassign button */}
                  <View style={[styles.profAllotSection, { borderTopColor: colors.border }]}>
                    <View style={styles.allotHeaderRow}>
                      <Text style={[styles.allotSectionLabel, { color: colors.textSecondary }]}>
                        Allocated Courses ({profAllotments.length}):
                      </Text>
                      <TouchableOpacity
                        style={[styles.miniAssignBtn, { backgroundColor: colors.primarySubtle }]}
                        onPress={() => {
                          setSelectedProfName(prof.name);
                          setShowAllotModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Feather name="plus" size={11} color={colors.primary} />
                        <Text style={[styles.miniAssignText, { color: colors.primary }]}>+ Assign Course</Text>
                      </TouchableOpacity>
                    </View>

                    {profAllotments.length > 0 ? (
                      <View style={styles.allotChipsWrap}>
                        {profAllotments.map((a) => (
                          <View
                            key={a.id}
                            style={[
                              styles.allotSubjectChip,
                              { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                            ]}
                          >
                            <Text style={[styles.allotSubjectChipText, { color: colors.text }]}>
                              {a.subjectCode} (Sem {a.semester})
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteAllotment(a.id, a.subjectCode, prof.name)}
                              style={styles.unassignChipBtn}
                              activeOpacity={0.7}
                            >
                              <Feather name="x" size={11} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.noAllotHint, { color: colors.textMuted }]}>
                        No courses assigned yet. Tap "+ Assign Course" to allot.
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 3: SUBJECT ALLOTMENTS */}
        {activeTab === 'allotments' && (
          <View>
            <View style={styles.sectionTopBar}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Subject Allotment ({allotmentsList.length})</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Faculty to course assignments matrix
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.primarySmallBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowAllotModal(true)}
              >
                <Feather name="plus" size={14} color="#FFF" />
                <Text style={styles.primarySmallBtnText}>+ Allot Subject</Text>
              </TouchableOpacity>
            </View>

            {/* Search Allotment */}
            <View style={[styles.searchBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by professor, subject code or name..."
                placeholderTextColor={colors.textMuted}
                value={allotSearch}
                onChangeText={setAllotSearch}
              />
            </View>

            {filteredAllotments.map((allot) => (
              <View
                key={allot.id}
                style={[styles.allotCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.allotTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.allotProfName, { color: colors.text }]}>{allot.professorName}</Text>
                    <Text style={[styles.allotBranchText, { color: colors.textSecondary }]}>
                      {allot.branch} Department • Session 2026 ODD
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.semChip, { backgroundColor: colors.primarySubtle }]}>
                      <Text style={[styles.semChipText, { color: colors.primary }]}>Sem {allot.semester}</Text>
                    </View>

                    {/* Unassign / Delete Button */}
                    <TouchableOpacity
                      style={[styles.trashBtnSmall, { backgroundColor: colors.dangerSubtle }]}
                      onPress={() => handleDeleteAllotment(allot.id, allot.subjectCode, allot.professorName)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={13} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.allotBottomRow}>
                  <View style={[styles.codeTag, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.codeTagText, { color: colors.textSecondary }]}>
                      {allot.subjectCode}
                    </Text>
                  </View>
                  <Text style={[styles.allotSubName, { color: colors.textSecondary }]} numberOfLines={1}>
                    {allot.subjectName}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 4: ACADEMIC SESSIONS & YEAR-WISE SEMESTER CONTROLLER */}
        {activeTab === 'sessions' && (
          <View>
            <View style={styles.sectionTopBar}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Academic Sessions ({sessionsList.length})</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Independent semester & timeline control per year
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.primarySmallBtn, { backgroundColor: colors.accent }]}
                onPress={handlePromoteAll}
                activeOpacity={0.8}
              >
                <Feather name="refresh-cw" size={13} color="#FFF" />
                <Text style={styles.primarySmallBtnText}>Promote All</Text>
              </TouchableOpacity>
            </View>

            {/* Explanatory Info Card */}
            <View style={[styles.sessionInfoCard, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Ionicons name="information-circle" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sessionInfoTitle, { color: colors.primary }]}>
                    Staggered Semester Timelines Active
                  </Text>
                  <Text style={[styles.sessionInfoBody, { color: colors.textSecondary }]}>
                    4th Year (Final Year) Odd Sem concludes early in <Text style={{ fontWeight: '700', color: colors.text }}>December</Text> for campus placements, while 1st, 2nd, and 3rd Year Odd Semesters run until examinations in <Text style={{ fontWeight: '700', color: colors.text }}>January</Text>.
                  </Text>
                </View>
              </View>
            </View>

            {/* 4 Academic Year Session Cards */}
            {sessionsList.map((session) => {
              const isYear4 = session.year === 4;
              const nextType = session.semester_type === 'ODD' ? 'EVEN' : 'ODD';
              const nextSem = (session.year - 1) * 2 + (nextType === 'ODD' ? 1 : 2);
              const isOdd = session.semester_type === 'ODD';

              return (
                <View
                  key={`${session.branch}-${session.year}`}
                  style={[
                    styles.sessionYearCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isYear4 ? colors.accent : colors.border,
                      borderWidth: isYear4 ? 1.5 : 1,
                    },
                  ]}
                >
                  {/* Card Header */}
                  <View style={styles.sessionCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={[styles.sessionYearTitle, { color: colors.text }]}>
                          Year {session.year} ({session.year === 1 ? '1st' : session.year === 2 ? '2nd' : session.year === 3 ? '3rd' : '4th'} Year B.Tech)
                        </Text>
                        {isYear4 && (
                          <View style={[styles.gradBadge, { backgroundColor: colors.accentSubtle }]}>
                            <Text style={[styles.gradBadgeText, { color: colors.accent }]}>Final Year</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.sessionDeptSub, { color: colors.textSecondary }]}>
                        {session.branch} • Session {session.academic_year}
                      </Text>
                    </View>

                    {/* Active Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            session.status === 'Active' ? colors.successSubtle : colors.surfaceSubtle,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor:
                              session.status === 'Active' ? colors.success : colors.textMuted,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              session.status === 'Active' ? colors.success : colors.textMuted,
                          },
                        ]}
                      >
                        {session.status}
                      </Text>
                    </View>
                  </View>

                  {/* Active Semester Pill Showcase */}
                  <View style={[styles.activeSemBox, { backgroundColor: colors.surfaceSubtle }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View
                        style={[
                          styles.semTypeIndicator,
                          { backgroundColor: isOdd ? colors.primary : colors.warning },
                        ]}
                      >
                        <Text style={styles.semTypeIndicatorText}>{session.semester_type}</Text>
                      </View>
                      <View>
                        <Text style={[styles.activeSemName, { color: colors.text }]}>
                          Active: Semester {session.active_semester}
                        </Text>
                        <Text style={[styles.activeSemHint, { color: colors.textSecondary }]}>
                          Allotments & dashboards filtered for Sem {session.active_semester}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Timeline Dates Info Grid */}
                  <View style={styles.timelineGrid}>
                    <View style={[styles.timelineCol, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
                      <Text style={[styles.timelineColLabel, { color: colors.textSecondary }]}>Term Start</Text>
                      <Text style={[styles.timelineColValue, { color: colors.text }]}>
                        {session.start_date || '01 Aug 2025'}
                      </Text>
                    </View>

                    <View style={[styles.timelineCol, { borderRightColor: colors.border, borderRightWidth: 1 }]}>
                      <Text style={[styles.timelineColLabel, { color: isYear4 ? colors.accent : colors.textSecondary }]}>
                        {isYear4 ? 'Term End (Dec)' : 'Term End (Jan)'}
                      </Text>
                      <Text style={[styles.timelineColValue, { color: isYear4 ? colors.accent : colors.text, fontWeight: '700' }]}>
                        {session.end_date || (isYear4 ? '15 Dec 2025' : '15 Jan 2026')}
                      </Text>
                    </View>

                    <View style={styles.timelineCol}>
                      <Text style={[styles.timelineColLabel, { color: colors.textSecondary }]}>Exams Window</Text>
                      <Text style={[styles.timelineColValue, { color: colors.text }]}>
                        {session.exam_start_date || (isYear4 ? '20 Dec 2025' : '18 Jan 2026')}
                      </Text>
                    </View>
                  </View>

                  {/* Action Controls Row */}
                  <View style={[styles.sessionActionRow, { borderTopColor: colors.border }]}>
                    {/* 1-Tap Toggle Button */}
                    <TouchableOpacity
                      style={[
                        styles.toggleSemBtn,
                        {
                          backgroundColor: isOdd ? colors.warningSubtle : colors.primarySubtle,
                          borderColor: isOdd ? colors.warning : colors.primary,
                        },
                      ]}
                      onPress={() => handleQuickToggleSemType(session)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name="repeat"
                        size={13}
                        color={isOdd ? colors.warning : colors.primary}
                      />
                      <Text
                        style={[
                          styles.toggleSemBtnText,
                          { color: isOdd ? colors.warning : colors.primary },
                        ]}
                      >
                        Switch to {nextType} Sem (Sem {nextSem})
                      </Text>
                    </TouchableOpacity>

                    {/* Edit Session Parameters Button */}
                    <TouchableOpacity
                      style={[styles.editSessionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                      onPress={() => handleOpenEditSession(session)}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-3" size={13} color={colors.text} />
                      <Text style={[styles.editSessionBtnText, { color: colors.text }]}>Edit Dates</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* TAB 5: QUICK ACTIONS DESK */}
        {activeTab === 'actions' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>All Administrative Actions</Text>

            <View style={styles.actionList}>
              <TouchableOpacity
                style={[styles.actionRowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowAddProfModal(true)}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.primarySubtle }]}>
                  <FontAwesome5 name="user-plus" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionRowTitle, { color: colors.text }]}>+ Add Professor</Text>
                  <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Register new faculty member</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowAddSubjectModal(true)}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.accentSubtle }]}>
                  <Feather name="book" size={16} color={colors.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionRowTitle, { color: colors.text }]}>+ Add Subject</Text>
                  <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Register new course</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowAddStudentModal(true)}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.successSubtle }]}>
                  <Ionicons name="person-add" size={16} color={colors.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionRowTitle, { color: colors.text }]}>+ Add Student</Text>
                  <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Enroll new student</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('Notices')}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.dangerSubtle }]}>
                  <Feather name="bell" size={16} color={colors.danger} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionRowTitle, { color: colors.text }]}>Notices</Text>
                  <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Send broadcast alerts</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionRowCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() =>
                  Alert.alert(
                    'Sync Student Accounts 🔄',
                    `All ${studentsList.length} student accounts have been synchronized with the master database.`
                  )
                }
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.warningSubtle }]}>
                  <Feather name="refresh-cw" size={16} color={colors.warning} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.actionRowTitle, { color: colors.text }]}>Sync Students</Text>
                  <Text style={[styles.actionRowSub, { color: colors.textSecondary }]}>Fix student login accounts</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* 1. ALLOT SUBJECT MODAL */}
      <Modal visible={showAllotModal} transparent animationType="slide" onRequestClose={() => setShowAllotModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Subject Allotment</Text>
              <TouchableOpacity onPress={() => setShowAllotModal(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Assign course teaching responsibility to faculty
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Select Professor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPillScroll}>
              {facultyList.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.selectPill,
                    {
                      backgroundColor: selectedProfName === f.name ? colors.primary : colors.surfaceSubtle,
                      borderColor: selectedProfName === f.name ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedProfName(f.name)}
                >
                  <Text style={[styles.selectPillText, { color: selectedProfName === f.name ? '#FFF' : colors.textSecondary }]}>
                    {f.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>Select Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPillScroll}>
              {subjectsList.slice(0, 15).map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.selectPill,
                    {
                      backgroundColor: selectedSubCode === s.code ? colors.primary : colors.surfaceSubtle,
                      borderColor: selectedSubCode === s.code ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedSubCode(s.code)}
                >
                  <Text style={[styles.selectPillText, { color: selectedSubCode === s.code ? '#FFF' : colors.textSecondary }]}>
                    {s.code} - {s.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]} onPress={handleAllotSubject}>
              <Text style={styles.modalSubmitBtnText}>Save Allotment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. ADD PROFESSOR MODAL */}
      <Modal visible={showAddProfModal} transparent animationType="slide" onRequestClose={() => setShowAddProfModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Professor</Text>
              <TouchableOpacity onPress={() => setShowAddProfModal(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Register a new faculty member into SBITM college records
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Professor Full Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. PRO. VIKRAM SHARMA"
                placeholderTextColor={colors.textMuted}
                value={newProfName}
                onChangeText={setNewProfName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="vikramsharma@college.com"
                placeholderTextColor={colors.textMuted}
                value={newProfEmail}
                onChangeText={setNewProfEmail}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handleRegisterProfessor}
            >
              <Text style={styles.modalSubmitBtnText}>Register Faculty Member</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. ADD SUBJECT MODAL */}
      <Modal visible={showAddSubjectModal} transparent animationType="slide" onRequestClose={() => setShowAddSubjectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Subject / Course</Text>
              <TouchableOpacity onPress={() => setShowAddSubjectModal(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Register a new course into the curriculum
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subject Code</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. CS307"
                placeholderTextColor={colors.textMuted}
                value={newSubCode}
                onChangeText={setNewSubCode}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subject Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Cloud Computing Systems"
                placeholderTextColor={colors.textMuted}
                value={newSubName}
                onChangeText={setNewSubName}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handleRegisterSubject}
            >
              <Text style={styles.modalSubmitBtnText}>Add Course</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4. ADD STUDENT MODAL */}
      <Modal visible={showAddStudentModal} transparent animationType="slide" onRequestClose={() => setShowAddStudentModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Student</Text>
              <TouchableOpacity onPress={() => setShowAddStudentModal(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Enroll a new student into the college database
            </Text>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Enrollment / Roll Number</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. 0545CS231200"
                placeholderTextColor={colors.textMuted}
                value={newStudRoll}
                onChangeText={setNewStudRoll}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Student Full Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. ROHIT VERMA"
                placeholderTextColor={colors.textMuted}
                value={newStudName}
                onChangeText={setNewStudName}
              />
            </View>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handleRegisterStudent}
            >
              <Text style={styles.modalSubmitBtnText}>Enroll Student</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 5. EDIT ACADEMIC SESSION MODAL */}
      <Modal
        visible={showEditSessionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditSessionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Configure Year {editingSession?.year} Session
              </Text>
              <TouchableOpacity onPress={() => setShowEditSessionModal(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Adjust academic calendar, timeline dates, and active semester
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Semester Type Selector (ODD vs EVEN) */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Active Semester Type</Text>
                <View style={styles.semTypeSwitchRow}>
                  <TouchableOpacity
                    style={[
                      styles.semTypeSwitchBtn,
                      {
                        backgroundColor: editSemType === 'ODD' ? colors.primary : colors.surfaceSubtle,
                        borderColor: editSemType === 'ODD' ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setEditSemType('ODD')}
                  >
                    <Text
                      style={[
                        styles.semTypeSwitchText,
                        { color: editSemType === 'ODD' ? '#FFF' : colors.textSecondary },
                      ]}
                    >
                      ODD SEMESTER (Sem {((editingSession?.year || 1) - 1) * 2 + 1})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.semTypeSwitchBtn,
                      {
                        backgroundColor: editSemType === 'EVEN' ? colors.warning : colors.surfaceSubtle,
                        borderColor: editSemType === 'EVEN' ? colors.warning : colors.border,
                      },
                    ]}
                    onPress={() => setEditSemType('EVEN')}
                  >
                    <Text
                      style={[
                        styles.semTypeSwitchText,
                        { color: editSemType === 'EVEN' ? '#FFF' : colors.textSecondary },
                      ]}
                    >
                      EVEN SEMESTER (Sem {((editingSession?.year || 1) - 1) * 2 + 2})
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Academic Year */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Academic Session Year</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 2025-2026"
                  placeholderTextColor={colors.textMuted}
                  value={editAcadYear}
                  onChangeText={setEditAcadYear}
                />
              </View>

              {/* Term Start Date */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Semester Start Date</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 2025-08-01"
                  placeholderTextColor={colors.textMuted}
                  value={editStartDate}
                  onChangeText={setEditStartDate}
                />
              </View>

              {/* Term End Date */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                  Semester End Date {editingSession?.year === 4 ? '(Ends Dec for Final Year)' : '(Ends Jan)'}
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                  placeholder={editingSession?.year === 4 ? 'e.g. 2025-12-15' : 'e.g. 2026-01-15'}
                  placeholderTextColor={colors.textMuted}
                  value={editEndDate}
                  onChangeText={setEditEndDate}
                />
              </View>

              {/* Exam Start Date */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Examination Window Start Date</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
                  placeholder={editingSession?.year === 4 ? 'e.g. 2025-12-20' : 'e.g. 2026-01-18'}
                  placeholderTextColor={colors.textMuted}
                  value={editExamDate}
                  onChangeText={setEditExamDate}
                />
              </View>

              {/* Status */}
              <View style={styles.formGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Session Status</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['Active', 'Upcoming', 'Completed'] as const).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.selectPill,
                        {
                          backgroundColor: editStatus === st ? colors.primary : colors.surfaceSubtle,
                          borderColor: editStatus === st ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setEditStatus(st)}
                    >
                      <Text style={[styles.selectPillText, { color: editStatus === st ? '#FFF' : colors.textSecondary }]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveSessionEdit}
            >
              <Text style={styles.modalSubmitBtnText}>Save & Apply Timeline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sessionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sessionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  adminTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  adminSub: {
    fontSize: 11,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 10,
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionSub: {
    fontSize: 11,
    marginTop: 1,
  },
  sectionTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  primarySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  primarySmallBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  allotPreviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  allotPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  allotIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allotProfTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  allotCourseSub: {
    fontSize: 10,
    marginTop: 1,
  },
  semChipSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  semChipTextSmall: {
    fontSize: 9,
    fontWeight: '700',
  },
  viewAllAllotBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
  },
  viewAllAllotText: {
    fontSize: 11,
    fontWeight: '700',
  },
  todayCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
    paddingBottom: 8,
  },
  todayDate: {
    fontSize: 13,
    fontWeight: '700',
  },
  zeroPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  zeroPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  todayBody: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 4,
  },
  todayTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  todaySub: {
    fontSize: 11,
  },
  reportsCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  repDate: {
    fontSize: 11,
    fontWeight: '700',
  },
  repTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  repBy: {
    fontSize: 11,
    marginTop: 1,
  },
  repStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  repStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  actionsPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  actionMiniIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionBtnSub: {
    fontSize: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
  },
  profCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  profRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  profName: {
    fontSize: 13,
    fontWeight: '800',
  },
  deptBadgeRow: {
    marginVertical: 2,
  },
  deptChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  deptChipText: {
    fontSize: 9,
    fontWeight: '700',
  },
  profEmail: {
    fontSize: 11,
  },
  allotmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  allotmentCount: {
    fontSize: 14,
    fontWeight: '800',
  },
  allotmentLabel: {
    fontSize: 8,
    fontWeight: '700',
  },
  trashBtnSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profAllotSection: {
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 8,
  },
  allotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  allotSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  miniAssignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  miniAssignText: {
    fontSize: 9,
    fontWeight: '700',
  },
  allotChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allotSubjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  allotSubjectChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  unassignChipBtn: {
    padding: 2,
  },
  noAllotHint: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  allotBranchText: {
    fontSize: 10,
    marginTop: 1,
  },
  allotCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  allotTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  allotProfName: {
    fontSize: 13,
    fontWeight: '700',
  },
  semChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  semChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
  allotBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  allotSubName: {
    flex: 1,
    fontSize: 12,
  },
  actionList: {
    gap: 10,
  },
  actionRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionRowSub: {
    fontSize: 11,
    marginTop: 1,
  },
  // Academic Sessions Specific Styles
  sessionInfoCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  sessionInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  sessionInfoBody: {
    fontSize: 11,
    lineHeight: 16,
  },
  sessionYearCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sessionYearTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sessionDeptSub: {
    fontSize: 11,
  },
  gradBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gradBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activeSemBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  semTypeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  semTypeIndicatorText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  activeSemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeSemHint: {
    fontSize: 10,
    marginTop: 1,
  },
  timelineGrid: {
    flexDirection: 'row',
    paddingVertical: 8,
    marginBottom: 10,
  },
  timelineCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  timelineColLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
    textAlign: 'center',
  },
  timelineColValue: {
    fontSize: 11,
    textAlign: 'center',
  },
  sessionActionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  toggleSemBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  toggleSemBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  editSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  editSessionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  semTypeSwitchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  semTypeSwitchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semTypeSwitchText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderWidth: 1,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  modalPillScroll: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 6,
  },
  selectPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  selectPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  modalSubmitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
