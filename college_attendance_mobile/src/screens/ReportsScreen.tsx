import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Share,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { allStudents, allSubjects, getAdminAnalytics } from '../services/collegeDatabase';

interface GeneratedReportRecord {
  id: string;
  title: string;
  scope: 'year' | 'subject' | 'custom';
  branch: string;
  year: number | string;
  semester: number | string;
  subjectCode: string;
  subjectName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  totalStudents: number;
  avgAttendance: number;
  eligibleCount: number;
  defaulterCount: number;
  fileName: string;
  fileSize: string;
  generatedAt: string;
  generatedBy: string;
  hasFile: boolean;
}

export default function ReportsScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();

  // Active Main Tab: 'generate' | 'reports_list' | 'defaulters'
  const [activeTab, setActiveTab] = useState<'generate' | 'reports_list' | 'defaulters'>('generate');

  // FORM CONTROLS (Exact fields from generate_report.html)
  const [scope, setScope] = useState<'year' | 'subject' | 'custom'>('year');
  const [acadYear, setAcadYear] = useState<number>(2);
  const [branch, setBranch] = useState<string>('CSE');
  const [semester, setSemester] = useState<string>('3');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  // Date Range Controls
  const [startDate, setStartDate] = useState<string>('2026-09-05');
  const [endDate, setEndDate] = useState<string>('2026-09-20');
  const [lastN, setLastN] = useState<string>('15');

  // Report Options Controls
  const [combineWorkbook, setCombineWorkbook] = useState<boolean>(true);
  const [includePercentage, setIncludePercentage] = useState<boolean>(true);

  // Generation & Modal States
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastReport, setLastReport] = useState<GeneratedReportRecord | null>(null);
  const [previewStudents, setPreviewStudents] = useState<any[]>([]);
  const [showResultModal, setShowResultModal] = useState<boolean>(false);
  const [reportToDelete, setReportToDelete] = useState<GeneratedReportRecord | null>(null);

  // Table Search & Filter States (for reports.html tab)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterReportType, setFilterReportType] = useState<string>('all');

  // Saved Reports Database (Matching reports.html)
  const [reportsData, setReportsData] = useState<GeneratedReportRecord[]>([
    {
      id: 'REP-01',
      title: 'CSE 2nd Year Complete Semester Report',
      scope: 'year',
      branch: 'CSE',
      year: 2,
      semester: 3,
      subjectCode: 'ALL',
      subjectName: 'All Subjects (Complete Semester Report)',
      startDate: '2026-09-05',
      endDate: '2026-09-20',
      daysCount: 15,
      totalStudents: 48,
      avgAttendance: 84.6,
      eligibleCount: 42,
      defaulterCount: 6,
      fileName: 'Attendance_CSE_Y2_15Days.xlsx',
      fileSize: '48.2 KB',
      generatedAt: '20-09-2026 21:15',
      generatedBy: 'Administrator',
      hasFile: true,
    },
    {
      id: 'REP-02',
      title: 'Data Structures & Algorithms (CS303)',
      scope: 'subject',
      branch: 'CSE',
      year: 2,
      semester: 3,
      subjectCode: 'CS303',
      subjectName: 'Data Structures & Algorithms',
      startDate: '2026-08-20',
      endDate: '2026-09-20',
      daysCount: 30,
      totalStudents: 48,
      avgAttendance: 88.4,
      eligibleCount: 45,
      defaulterCount: 3,
      fileName: 'Attendance_CS303_30Days.xlsx',
      fileSize: '34.8 KB',
      generatedAt: '15-09-2026 14:30',
      generatedBy: 'Dr. Pankaj Sisodiya',
      hasFile: true,
    },
    {
      id: 'REP-03',
      title: 'AI & Data Science Department - Monthly Report',
      scope: 'custom',
      branch: 'AD',
      year: 2,
      semester: 3,
      subjectCode: 'ALL',
      subjectName: 'All AI & DS Subjects',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      daysCount: 31,
      totalStudents: 32,
      avgAttendance: 81.2,
      eligibleCount: 27,
      defaulterCount: 5,
      fileName: 'Attendance_AD_Aug2026.xlsx',
      fileSize: '41.5 KB',
      generatedAt: '01-09-2026 09:00',
      generatedBy: 'Administrator',
      hasFile: true,
    },
  ]);

  // Helper to set last N days and populate dates (Exact JS from generate_report.html)
  const setLastNDays = (n: number) => {
    setLastN(n.toString());
    const end = new Date('2026-09-20');
    const start = new Date(end);
    start.setDate(end.getDate() - (n - 1));
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    setStartDate(fmt(start));
    setEndDate(fmt(end));
  };

  // Reset Form
  const handleResetForm = () => {
    setScope('year');
    setAcadYear(2);
    setBranch('CSE');
    setSemester('3');
    setSelectedSubjectId('all');
    setLastNDays(15);
    setCombineWorkbook(true);
    setIncludePercentage(true);
    Alert.alert('Form Reset 🔄', 'All fields restored to defaults.');
  };

  // Subjects filtered dynamically
  const filteredSubjects = useMemo(() => {
    return allSubjects.filter((s) => {
      if (branch && branch !== 'ALL' && s.branch !== branch) {
        return false;
      }
      if (semester && semester !== 'all' && s.semester.toString() !== semester) {
        return false;
      }
      return true;
    });
  }, [branch, semester]);

  // Execute Attendance Report Generation
  const handleGenerateReport = () => {
    setIsGenerating(true);

    setTimeout(() => {
      let filtered = allStudents.filter((s) => {
        if (branch && branch !== 'ALL' && s.branch.toUpperCase() !== branch.toUpperCase()) {
          return false;
        }
        if (scope === 'year' && s.year !== acadYear) return false;
        if (semester && semester !== 'all' && s.semester.toString() !== semester) return false;
        return true;
      });

      if (filtered.length === 0) {
        filtered = allStudents.slice(0, 48);
      }

      const days = parseInt(lastN) || 15;
      const totalLectures = Math.max(12, Math.round(days * 1.8));

      const processed = filtered.map((s) => {
        const factor = s.overallAttendance / 100;
        const present = Math.min(totalLectures, Math.round(totalLectures * factor));
        const perc = Math.round((present / totalLectures) * 100);
        return {
          ...s,
          periodPresent: present,
          periodTotal: totalLectures,
          periodPercentage: perc,
          isEligible: perc >= 75,
        };
      });

      const avg = Math.round(
        processed.reduce((acc, curr) => acc + curr.periodPercentage, 0) / (processed.length || 1)
      );
      const eligible = processed.filter((s) => s.isEligible).length;
      const defaulters = processed.length - eligible;

      const subObj = allSubjects.find((s) => s.id.toString() === selectedSubjectId || s.code === selectedSubjectId);
      const subCode = selectedSubjectId === 'all' ? 'ALL' : subObj?.code || 'CS303';
      const subName = selectedSubjectId === 'all' ? 'All Subjects (Complete Semester Report)' : subObj?.name || 'Subject Report';

      const branchLabel = branch === 'ALL' ? 'All' : branch;
      const newRep: GeneratedReportRecord = {
        id: `REP-${(reportsData.length + 1).toString().padStart(2, '0')}`,
        title: `${branchLabel} Year ${acadYear} (Sem ${semester}) - ${days} Days Attendance`,
        scope,
        branch: branchLabel,
        year: acadYear,
        semester,
        subjectCode: subCode,
        subjectName: subName,
        startDate,
        endDate,
        daysCount: days,
        totalStudents: processed.length,
        avgAttendance: avg,
        eligibleCount: eligible,
        defaulterCount: defaulters,
        fileName: `Attendance_${branchLabel}_${subCode}_${days}Days.xlsx`,
        fileSize: `${Math.round(processed.length * 0.95 + 12)} KB`,
        generatedAt: '20-09-2026 21:50',
        generatedBy: 'Administrator',
        hasFile: true,
      };

      setPreviewStudents(processed);
      setLastReport(newRep);
      setReportsData([newRep, ...reportsData]);
      setIsGenerating(false);
      setShowResultModal(true);
    }, 350);
  };

  // Export / Download Excel / Share
  const handleExportReport = async (rep: GeneratedReportRecord, students: any[]) => {
    try {
      const header = `Roll Number,Student Name,Branch,Semester,Classes Attended,Total Classes,Attendance %\n`;
      const rows = students
        .map(
          (s) =>
            `${s.roll},${s.name},${s.branch},Sem ${s.semester},${s.periodPresent || s.totalPresent},${s.periodTotal || s.totalClasses},${s.periodPercentage || s.overallAttendance}%`
        )
        .join('\n');
      await Share.share({
        message: `📊 SBITM BETUL - Attendance Workbook (.xlsx)\nFile: ${rep.fileName}\nTitle: ${rep.title}\nDate Range: ${rep.startDate} to ${rep.endDate} (${rep.daysCount} Days)\nAverage Attendance: ${rep.avgAttendance}%\nTotal Students: ${rep.totalStudents}\n\n${header}${rows}`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  // Delete Report
  const handleDeleteReport = (rep: GeneratedReportRecord) => {
    setReportToDelete(rep);
  };

  const confirmDeleteReport = () => {
    if (reportToDelete) {
      setReportsData((prev) => prev.filter((r) => r.id !== reportToDelete.id));
      setReportToDelete(null);
    }
  };

  const analytics = getAdminAnalytics();
  const allDefaulters = allStudents.filter((s) => s.overallAttendance < 75);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* =========================================================
          TOP HEADER CARD (Perfect Alignment)
          ========================================================= */}
      <View style={[styles.headerWrapper, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={[styles.headerBackBtn, { backgroundColor: colors.surfaceSubtle }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.mainHeaderTitle, { color: colors.text }]}>Attendance Reports</Text>
            <Text style={[styles.mainHeaderSub, { color: colors.textSecondary }]}>
              RGPV Format • Custom, Year-wise & 15 Days Generator
            </Text>
          </View>
        </View>

        {/* Tab Switcher Pills */}
        <View style={[styles.tabSwitcherBox, { backgroundColor: colors.surfaceSubtle }]}>
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'generate' && [styles.tabPillActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('generate')}
            activeOpacity={0.8}
          >
            <Feather
              name="sliders"
              size={13}
              color={activeTab === 'generate' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'generate' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Generate Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'reports_list' && [styles.tabPillActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('reports_list')}
            activeOpacity={0.8}
          >
            <Feather
              name="folder"
              size={13}
              color={activeTab === 'reports_list' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'reports_list' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Archive ({reportsData.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'defaulters' && [styles.tabPillActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('defaulters')}
            activeOpacity={0.8}
          >
            <Feather
              name="alert-circle"
              size={13}
              color={activeTab === 'defaulters' ? '#FFFFFF' : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === 'defaulters' ? '#FFFFFF' : colors.textSecondary },
              ]}
            >
              Defaulters
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* =========================================================
            TAB 1: EXACT GENERATE_REPORT.HTML WEB FORM (ALIGNED)
            ========================================================= */}
        {activeTab === 'generate' && (
          <View>
            {/* SECTION 1: REPORT CONFIGURATION */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primarySubtle }]}>
                  <Feather name="settings" size={15} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.sectionHeadingText, { color: colors.text }]}>Report Configuration</Text>
                  <Text style={[styles.sectionSubText, { color: colors.textSecondary }]}>
                    Choose report scope, academic year & department
                  </Text>
                </View>
              </View>

              {/* Scope Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                Report Scope *
              </Text>
              <View style={styles.scopeRowGrid}>
                {[
                  { key: 'year', label: '📊 Year-wise', desc: 'Full batch report' },
                  { key: 'subject', label: '📚 Subject-wise', desc: 'Course specific' },
                  { key: 'custom', label: '🔧 Custom', desc: 'Custom dates' },
                ].map((s) => {
                  const isSelected = scope === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      style={[
                        styles.scopeItemCard,
                        {
                          backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setScope(s.key as any)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.scopeItemTitle,
                          { color: isSelected ? colors.primary : colors.text },
                        ]}
                      >
                        {s.label}
                      </Text>
                      <Text
                        style={[
                          styles.scopeItemDesc,
                          { color: isSelected ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {s.desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Academic Year Selection */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                Academic Year *
              </Text>
              <View style={styles.gridPillsRow}>
                {[
                  { y: 1, label: '1st Year' },
                  { y: 2, label: '2nd Year' },
                  { y: 3, label: '3rd Year' },
                  { y: 4, label: '4th Year' },
                ].map((item) => {
                  const isSelected = acadYear === item.y;
                  return (
                    <TouchableOpacity
                      key={item.y}
                      style={[
                        styles.yearPillBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setAcadYear(item.y);
                        setSemester((item.y * 2 - 1).toString());
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.yearPillText,
                          { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Branch Selection */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>
                Branch Department
              </Text>
              <View style={styles.branchChoiceRow}>
                {[
                  { key: 'ALL', label: 'All Branches' },
                  { key: 'CSE', label: 'Computer Science (CSE)' },
                  { key: 'AD', label: 'AI & Data Science (AD)' },
                ].map((b) => {
                  const isSelected = branch === b.key;
                  return (
                    <TouchableOpacity
                      key={b.key}
                      style={[
                        styles.branchChoiceBtn,
                        {
                          backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setBranch(b.key)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.branchChoiceText,
                          { color: isSelected ? colors.primary : colors.text },
                        ]}
                      >
                        {b.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* SECTION 2: SEMESTER & SUBJECTS */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primarySubtle }]}>
                  <Feather name="book-open" size={15} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.sectionHeadingText, { color: colors.text }]}>Semester & Subjects</Text>
                  <Text style={[styles.sectionSubText, { color: colors.textSecondary }]}>
                    Select running semester and course modules
                  </Text>
                </View>
              </View>

              {/* Semester Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                Semester Selection
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
                {[
                  { val: 'all', label: 'All Semesters' },
                  { val: '1', label: 'Sem 1' },
                  { val: '2', label: 'Sem 2' },
                  { val: '3', label: 'Sem 3' },
                  { val: '4', label: 'Sem 4' },
                  { val: '5', label: 'Sem 5' },
                  { val: '6', label: 'Sem 6' },
                  { val: '7', label: 'Sem 7' },
                  { val: '8', label: 'Sem 8' },
                ].map((s) => {
                  const isSelected = semester === s.val;
                  return (
                    <TouchableOpacity
                      key={s.val}
                      style={[
                        styles.semPillBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSemester(s.val)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.semPillBtnText,
                          { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Subject Selector */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                Subject Selection
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalRow}>
                <TouchableOpacity
                  style={[
                    styles.subjectPillBtn,
                    {
                      backgroundColor: selectedSubjectId === 'all' ? colors.primary : colors.surfaceSubtle,
                      borderColor: selectedSubjectId === 'all' ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedSubjectId('all')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.subjectPillBtnText,
                      { color: selectedSubjectId === 'all' ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    📋 All Subjects (Complete Semester)
                  </Text>
                </TouchableOpacity>

                {filteredSubjects.map((sub) => {
                  const isSelected = selectedSubjectId === sub.code;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.subjectPillBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedSubjectId(sub.code)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.subjectPillBtnText,
                          { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                        ]}
                      >
                        [{sub.code}] {sub.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* SECTION 3: DATE RANGE & QUICK PRESETS */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primarySubtle }]}>
                  <Feather name="calendar" size={15} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.sectionHeadingText, { color: colors.text }]}>Date Range & Presets</Text>
                  <Text style={[styles.sectionSubText, { color: colors.textSecondary }]}>
                    Quick 15 / 30 Days or custom lecture date period
                  </Text>
                </View>
              </View>

              {/* Quick Period Buttons */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 14 }]}>
                ⚡ Quick Actions (1-Tap Presets)
              </Text>
              <View style={styles.quickPresetRow}>
                {[
                  { n: 15, label: '15 Days', icon: 'calendar' },
                  { n: 30, label: '30 Days', icon: 'clock' },
                  { n: 60, label: '60 Days', icon: 'calendar' },
                ].map((item) => {
                  const isSelected = lastN === item.n.toString();
                  return (
                    <TouchableOpacity
                      key={item.n}
                      style={[
                        styles.presetPill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setLastNDays(item.n)}
                      activeOpacity={0.7}
                    >
                      <Feather
                        name={item.icon as any}
                        size={12}
                        color={isSelected ? '#FFFFFF' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.presetPillText,
                          { color: isSelected ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 2-Column Date Input Row */}
              <View style={styles.dateTwoColRow}>
                <View style={styles.dateCol}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Start Date</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Feather name="calendar" size={14} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.dateTextInput, { color: colors.text }]}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>

                <View style={styles.dateCol}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>End Date</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                    <Feather name="calendar" size={14} color={colors.textSecondary} />
                    <TextInput
                      style={[styles.dateTextInput, { color: colors.text }]}
                      value={endDate}
                      onChangeText={setEndDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* SECTION 4: REPORT OPTIONS */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primarySubtle }]}>
                  <Feather name="check-square" size={15} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.sectionHeadingText, { color: colors.text }]}>Report Options</Text>
                  <Text style={[styles.sectionSubText, { color: colors.textSecondary }]}>
                    Workbook formatting & RGPV calculations
                  </Text>
                </View>
              </View>

              {/* Option Switch 1 */}
              <View style={[styles.switchCardRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>
                    Combine into Single Workbook
                  </Text>
                  <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                    Create multi-sheet Excel file (.xlsx) with all course tabs
                  </Text>
                </View>
                <Switch
                  value={combineWorkbook}
                  onValueChange={setCombineWorkbook}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Option Switch 2 */}
              <View style={styles.switchCardRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>
                    Include Percentage Calculation
                  </Text>
                  <Text style={[styles.switchHint, { color: colors.textSecondary }]}>
                    Calculate % and flag students under 75% detention threshold
                  </Text>
                </View>
                <Switch
                  value={includePercentage}
                  onValueChange={setIncludePercentage}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Pro Tip Info Box */}
            <View style={[styles.proTipBanner, { backgroundColor: colors.primarySubtle, borderColor: colors.primary }]}>
              <Ionicons name="information-circle" size={18} color={colors.primary} />
              <Text style={[styles.proTipBannerText, { color: colors.primary }]}>
                <Text style={{ fontWeight: '800' }}>Pro Tip: </Text>
                Select Academic Year → Choose Semester → Tap 15 Days preset for instant RGPV attendance compilation.
              </Text>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.bottomButtonsRow}>
              <TouchableOpacity
                style={[styles.resetActionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={handleResetForm}
                activeOpacity={0.7}
              >
                <Feather name="rotate-ccw" size={15} color={colors.textSecondary} />
                <Text style={[styles.resetActionText, { color: colors.textSecondary }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.generateActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleGenerateReport}
                disabled={isGenerating}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="file-excel-box" size={20} color="#FFFFFF" />
                <Text style={styles.generateActionText}>
                  {isGenerating ? 'Generating...' : `Generate Report (${lastN || 15} Days)`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* =========================================================
            TAB 2: REPORTS ARCHIVE TABLE (ALIGNED)
            ========================================================= */}
        {activeTab === 'reports_list' && (
          <View>
            {/* Search Box */}
            <View style={[styles.archiveSearchBar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.textSecondary} />
              <TextInput
                style={[styles.archiveSearchInput, { color: colors.text }]}
                placeholder="Search by subject, branch or filename..."
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

            {/* Header */}
            <View style={styles.archiveHeaderRow}>
              <Text style={[styles.sectionHeadingText, { color: colors.text }]}>
                Generated Reports ({reportsData.length})
              </Text>
              <Text style={[styles.sectionSubText, { color: colors.textMuted }]}>Latest First</Text>
            </View>

            {/* Reports Cards */}
            {reportsData
              .filter((r) => {
                if (filterReportType !== 'all' && r.scope !== filterReportType) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return (
                  r.title.toLowerCase().includes(q) ||
                  r.branch.toLowerCase().includes(q) ||
                  r.fileName.toLowerCase().includes(q) ||
                  r.generatedBy.toLowerCase().includes(q)
                );
              })
              .map((rep, idx) => (
                <View
                  key={rep.id}
                  style={[styles.reportItemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.repCardTop}>
                    <View style={[styles.excelBadge, { backgroundColor: '#DCFCE7' }]}>
                      <MaterialCommunityIcons name="file-excel-box" size={22} color="#16A34A" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.repCardTitle, { color: colors.text }]}>{rep.title}</Text>
                      <Text style={[styles.repCardSub, { color: colors.textSecondary }]}>
                        {rep.branch} • Year {rep.year} • Sem {rep.semester}
                      </Text>
                    </View>
                    <View style={[styles.codeBadgeSmall, { backgroundColor: colors.surfaceSubtle }]}>
                      <Text style={[styles.codeBadgeTextSmall, { color: colors.textSecondary }]}>
                        {rep.subjectCode}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.repDetailsBar, { backgroundColor: colors.surfaceSubtle }]}>
                    <View style={styles.detailCol}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date Range</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {rep.startDate.slice(5)} to {rep.endDate.slice(5)} ({rep.daysCount}d)
                      </Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Students</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{rep.totalStudents} Enrolled</Text>
                    </View>
                    <View style={styles.detailCol}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Average</Text>
                      <Text style={[styles.detailValue, { color: colors.primary }]}>{rep.avgAttendance}%</Text>
                    </View>
                  </View>

                  <View style={styles.repCardFooterRow}>
                    <Text style={[styles.repFooterMeta, { color: colors.textMuted }]}>
                      By {rep.generatedBy} • {rep.generatedAt}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={[styles.downloadPillBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleExportReport(rep, allStudents.slice(0, rep.totalStudents))}
                        activeOpacity={0.8}
                      >
                        <Feather name="download" size={12} color="#FFFFFF" />
                        <Text style={styles.downloadPillText}>Download</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.deletePillBtn, { backgroundColor: colors.dangerSubtle }]}
                        onPress={() => handleDeleteReport(rep)}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={13} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}

            {reportsData.length === 0 && (
              <View style={[styles.emptyBoxCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="folder" size={36} color={colors.textMuted} />
                <Text style={[styles.emptyBoxTitle, { color: colors.text }]}>No Reports Found</Text>
                <Text style={[styles.emptyBoxSub, { color: colors.textSecondary }]}>
                  Use the Generate Report tab to create a new attendance sheet.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* =========================================================
            TAB 3: DEFAULTERS & DETENTION RISK (ALIGNED)
            ========================================================= */}
        {activeTab === 'defaulters' && (
          <View>
            <View style={styles.metricGridTwo}>
              <View style={[styles.metricSquare, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.metricSquareLabel, { color: colors.textSecondary }]}>Total Students</Text>
                <Text style={[styles.metricSquareVal, { color: colors.text }]}>{allStudents.length}</Text>
                <Text style={[styles.metricSquareSub, { color: colors.textMuted }]}>Active Roster</Text>
              </View>

              <View style={[styles.metricSquare, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.metricSquareLabel, { color: colors.textSecondary }]}>Campus Average</Text>
                <Text style={[styles.metricSquareVal, { color: colors.primary }]}>{analytics.averageAttendanceRate}%</Text>
                <Text style={[styles.metricSquareSub, { color: colors.textMuted }]}>Target: 75%</Text>
              </View>

              <View style={[styles.metricSquare, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.metricSquareLabel, { color: colors.textSecondary }]}>Eligible (≥75%)</Text>
                <Text style={[styles.metricSquareVal, { color: colors.success }]}>
                  {allStudents.length - allDefaulters.length}
                </Text>
                <Text style={[styles.metricSquareSub, { color: colors.textMuted }]}>Safe for Exams</Text>
              </View>

              <View style={[styles.metricSquare, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.metricSquareLabel, { color: colors.textSecondary }]}>Defaulters (&lt;75%)</Text>
                <Text style={[styles.metricSquareVal, { color: colors.danger }]}>{allDefaulters.length}</Text>
                <Text style={[styles.metricSquareSub, { color: colors.textMuted }]}>Detention Risk</Text>
              </View>
            </View>

            <Text style={[styles.sectionHeadingText, { color: colors.text, marginVertical: 12 }]}>
              Students Below 75% Attendance (Detention Risk)
            </Text>

            {allDefaulters.map((s) => (
              <View
                key={s.id}
                style={[styles.studentDefaulterCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.defaulterTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.defaulterName, { color: colors.text }]}>{s.name}</Text>
                    <Text style={[styles.defaulterRoll, { color: colors.textSecondary }]}>
                      {s.roll} • {s.branch} (Sem {s.semester})
                    </Text>
                  </View>
                  <View style={[styles.defaulterBadge, { backgroundColor: colors.dangerSubtle }]}>
                    <Text style={[styles.defaulterBadgeText, { color: colors.danger }]}>{s.overallAttendance}%</Text>
                  </View>
                </View>
                <Text style={[styles.defaulterNote, { color: colors.warning }]}>
                  Shortage: Needs {Math.ceil((0.75 * 48 - (s.overallAttendance / 100) * 48) / 0.25)} consecutive lectures to reach 75%
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* =========================================================
          LIVE GENERATED REPORT MODAL (PERFECTLY ALIGNED)
          ========================================================= */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContentSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalSheetTitle, { color: colors.text }]}>Generated Attendance Sheet ✅</Text>
                <Text style={[styles.modalSheetSub, { color: colors.textSecondary }]}>
                  {lastReport?.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowResultModal(false)} style={{ padding: 4 }}>
                <Feather name="x" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Summary Metrics Bar */}
            <View style={[styles.modalStatsBar, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={styles.modalStatCol}>
                <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Students</Text>
                <Text style={[styles.modalStatVal, { color: colors.text }]}>{lastReport?.totalStudents}</Text>
              </View>
              <View style={styles.modalStatCol}>
                <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Average</Text>
                <Text style={[styles.modalStatVal, { color: colors.primary }]}>{lastReport?.avgAttendance}%</Text>
              </View>
              <View style={styles.modalStatCol}>
                <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Eligible</Text>
                <Text style={[styles.modalStatVal, { color: colors.success }]}>{lastReport?.eligibleCount}</Text>
              </View>
              <View style={styles.modalStatCol}>
                <Text style={[styles.modalStatLabel, { color: colors.textSecondary }]}>Defaulters</Text>
                <Text style={[styles.modalStatVal, { color: colors.danger }]}>{lastReport?.defaulterCount}</Text>
              </View>
            </View>

            {/* Student Ledger Header */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 12, marginBottom: 6 }]}>
              Student Attendance Ledger ({previewStudents.length} Records)
            </Text>

            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={true}>
              {previewStudents.map((s, idx) => (
                <View
                  key={s.id}
                  style={[
                    styles.ledgerRowItem,
                    { borderBottomColor: colors.border, backgroundColor: idx % 2 === 0 ? 'transparent' : colors.surfaceSubtle },
                  ]}
                >
                  <View style={{ width: 24 }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700' }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 6 }}>
                    <Text style={[styles.ledgerRowName, { color: colors.text }]}>{s.name}</Text>
                    <Text style={[styles.ledgerRowRoll, { color: colors.textSecondary }]}>{s.roll}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                    <Text style={[styles.ledgerRowCount, { color: colors.text }]}>
                      {s.periodPresent}/{s.periodTotal}
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted }}>Lectures</Text>
                  </View>
                  <View
                    style={[
                      styles.ledgerStatusPill,
                      { backgroundColor: s.isEligible ? colors.successSubtle : colors.dangerSubtle },
                    ]}
                  >
                    <Text
                      style={[
                        styles.ledgerStatusText,
                        { color: s.isEligible ? colors.success : colors.danger },
                      ]}
                    >
                      {s.periodPercentage}%
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalOutlineBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={() => {
                  setShowResultModal(false);
                  setActiveTab('reports_list');
                }}
              >
                <Text style={[styles.modalOutlineText, { color: colors.text }]}>View Archive</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalFilledBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (lastReport) {
                    handleExportReport(lastReport, previewStudents);
                  }
                }}
              >
                <Feather name="download" size={14} color="#FFFFFF" />
                <Text style={styles.modalFilledText}>Download Excel (.xlsx)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          DELETE REPORT CONFIRMATION MODAL (IN-APP DIALOG)
          ========================================================= */}
      <Modal
        visible={Boolean(reportToDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setReportToDelete(null)}
      >
        <View style={styles.modalCenterBackdrop}>
          <View style={[styles.confirmDeleteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.deleteAlertIconCircle, { backgroundColor: colors.dangerSubtle }]}>
              <Feather name="trash-2" size={26} color={colors.danger} />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>Delete Archived Report?</Text>
            <Text style={[styles.deleteModalMsg, { color: colors.textSecondary }]}>
              Are you sure you want to delete "{reportToDelete?.title}"? This attendance workbook file will be permanently removed from the archive.
            </Text>
            <View style={styles.deleteModalBtnRow}>
              <TouchableOpacity
                style={[styles.deleteCancelBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={() => setReportToDelete(null)}
                activeOpacity={0.7}
              >
                <Text style={[styles.deleteCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteConfirmBtn, { backgroundColor: colors.danger }]}
                onPress={confirmDeleteReport}
                activeOpacity={0.85}
              >
                <Feather name="trash-2" size={14} color="#FFFFFF" />
                <Text style={styles.deleteConfirmText}>Delete Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  mainHeaderSub: {
    fontSize: 11,
    marginTop: 1,
  },
  tabSwitcherBox: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabPillActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  sectionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    marginBottom: 14,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingText: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  scopeRowGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  scopeItemCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  scopeItemTitle: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  scopeItemDesc: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  gridPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  yearPillBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  yearPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  branchChoiceRow: {
    gap: 6,
  },
  branchChoiceBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  branchChoiceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  horizontalRow: {
    flexDirection: 'row',
  },
  semPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  semPillBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subjectPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  subjectPillBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickPresetRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  presetPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateTwoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateCol: {
    flex: 1,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  dateTextInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  switchCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  switchHint: {
    fontSize: 10,
    marginTop: 2,
  },
  proTipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  proTipBannerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  resetActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  generateActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 2,
  },
  generateActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  archiveSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  archiveSearchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  archiveHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportItemCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  repCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  excelBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repCardTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  repCardSub: {
    fontSize: 10,
    marginTop: 1,
  },
  codeBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '700',
  },
  repDetailsBar: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    justifyContent: 'space-between',
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  repCardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repFooterMeta: {
    fontSize: 10,
    flex: 1,
  },
  downloadPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  downloadPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  deletePillBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBoxCard: {
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  emptyBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyBoxSub: {
    fontSize: 11,
    textAlign: 'center',
  },
  metricGridTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metricSquare: {
    width: '48.5%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricSquareLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricSquareVal: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 2,
  },
  metricSquareSub: {
    fontSize: 10,
  },
  studentDefaulterCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  defaulterTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  defaulterName: {
    fontSize: 13,
    fontWeight: '700',
  },
  defaulterRoll: {
    fontSize: 11,
    marginTop: 1,
  },
  defaulterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  defaulterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  defaulterNote: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContentSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 18,
    maxHeight: '85%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSheetSub: {
    fontSize: 11,
    marginTop: 1,
  },
  modalStatsBar: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  modalStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  modalStatVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 1,
  },
  ledgerRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
  },
  ledgerRowName: {
    fontSize: 12,
    fontWeight: '700',
  },
  ledgerRowRoll: {
    fontSize: 10,
    marginTop: 1,
  },
  ledgerRowCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  ledgerStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  ledgerStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  modalOutlineBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalOutlineText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalFilledBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalFilledText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalCenterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmDeleteCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  deleteAlertIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  deleteModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  deleteModalMsg: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  deleteCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteConfirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
