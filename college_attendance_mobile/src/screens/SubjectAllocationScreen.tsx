import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { allFaculties, allSubjects, initialAcademicSessions } from '../services/collegeDatabase';
import { SubjectAllocation, Faculty, AcademicSessionConfig } from '../types';
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export const SubjectAllocationScreen = ({ navigation }: any) => {
  const { colors } = useTheme();

  const [allocations, setAllocations] = useState<SubjectAllocation[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showAllotModal, setShowAllotModal] = useState(false);
  const [sessionsList, setSessionsList] = useState<AcademicSessionConfig[]>(initialAcademicSessions);
  const [filterActiveSemOnly, setFilterActiveSemOnly] = useState(true);
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | 'ALL'>('ALL');

  // Allot modal state
  const [facultyList] = useState(allFaculties);
  const [subjectsList] = useState(allSubjects);
  const [selectedProfName, setSelectedProfName] = useState(allFaculties[0]?.name || 'DR.PANKAJ SINGH SISODIYA');
  const [selectedSubCode, setSelectedSubCode] = useState('CS303');

  useEffect(() => {
    const load = async () => {
      const data = await api.getSubjectAllocations();
      setAllocations(data);
      try {
        const sessions = await api.getAcademicSessions();
        if (sessions && sessions.length > 0) {
          setSessionsList(sessions);
        }
      } catch (e) {
        console.log('Error loading sessions in SubjectAllocation:', e);
      }
    };
    load();
  }, []);

  const handleUnassign = (id: number, subCode: string, profName: string) => {
    Alert.alert(
      'Unassign Subject ⚠️',
      `Are you sure you want to unassign [${subCode}] from ${profName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: () => {
            setAllocations((prev) => prev.filter((a) => a.id !== id));
            Alert.alert('Subject Unassigned ✅', `[${subCode}] has been unassigned from ${profName}.`);
          },
        },
      ]
    );
  };

  const handleAllotSubject = () => {
    const sub = subjectsList.find((s) => s.code === selectedSubCode) || subjectsList[0];
    const newAllot: SubjectAllocation = {
      id: allocations.length + 100,
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
    setAllocations([newAllot, ...allocations]);
    setShowAllotModal(false);
    Alert.alert('Allotment Successful ✅', `[${sub.code}] ${sub.name} has been assigned to ${selectedProfName}.`);
  };

  const filtered = allocations.filter(a => {
    if (selectedBranch !== 'ALL' && a.branch !== selectedBranch) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.professorName.toLowerCase().includes(q) ||
        a.subjectName.toLowerCase().includes(q) ||
        a.subjectCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group allocations by professor
  const groupedByProf: Record<string, SubjectAllocation[]> = {};
  filtered.forEach(item => {
    if (!groupedByProf[item.professorName]) {
      groupedByProf[item.professorName] = [];
    }
    groupedByProf[item.professorName].push(item);
  });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.title, { color: colors.text }]}>Subject Allocations</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {allocations.length} Active Course Allotments (CSE & AD)
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primarySmallBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAllotModal(true)}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={14} color="#FFF" />
            <Text style={styles.primarySmallBtnText}>+ Allot</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by faculty, subject name or code..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Branch Filter Tabs */}
        <View style={styles.branchRow}>
          {['ALL', 'CSE', 'AD'].map(b => (
            <TouchableOpacity
              key={b}
              style={[
                styles.branchPill,
                {
                  backgroundColor: selectedBranch === b ? colors.primary : colors.surfaceSubtle,
                  borderColor: selectedBranch === b ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedBranch(b)}
            >
              <Text
                style={[
                  styles.branchPillText,
                  { color: selectedBranch === b ? '#FFF' : colors.textSecondary },
                ]}
              >
                {b === 'ALL' ? 'All Branches' : `${b} Department`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {Object.entries(groupedByProf).map(([profName, items]) => (
          <View
            key={profName}
            style={[styles.profSection, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            {/* Professor Header */}
            <View style={styles.profHeaderRow}>
              <View style={[styles.avatarBox, { backgroundColor: colors.primarySubtle }]}>
                <Feather name="user-check" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.profName, { color: colors.text }]}>{profName}</Text>
                <Text style={[styles.profSub, { color: colors.textSecondary }]}>
                  {items.length} Course{items.length > 1 ? 's' : ''} Allocated
                </Text>
              </View>
            </View>

            {/* List of allocated subjects */}
            <View style={styles.subjectList}>
              {items.map(sub => {
                const isLab = sub.slotType === 'lab';
                return (
                  <View
                    key={sub.id}
                    style={[
                      styles.allocationCard,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderLeftColor: isLab ? colors.accent : colors.primary,
                        borderLeftWidth: 3,
                      },
                    ]}
                  >
                    <View style={styles.subTop}>
                      <View style={styles.badgeGroup}>
                        <View style={[styles.codeBadge, { backgroundColor: colors.primarySubtle }]}>
                          <Text style={[styles.codeText, { color: colors.primary }]}>{sub.subjectCode}</Text>
                        </View>
                        <View
                          style={[
                            styles.typeBadge,
                            { backgroundColor: isLab ? colors.accentSubtle : colors.primarySubtle },
                          ]}
                        >
                          {isLab ? (
                            <MaterialCommunityIcons name="flask-outline" size={11} color={colors.accent} />
                          ) : (
                            <Feather name="book-open" size={11} color={colors.primary} />
                          )}
                          <Text
                            style={[
                              styles.typeText,
                              { color: isLab ? colors.accent : colors.primary },
                            ]}
                          >
                            {isLab ? 'Laboratory / Practical' : 'Theory'}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.semBadge, { backgroundColor: colors.card }]}>
                          <Text style={[styles.semText, { color: colors.textSecondary }]}>
                            {sub.branch} • Sem {sub.semester}
                          </Text>
                        </View>

                        {/* Unassign Trash Button */}
                        <TouchableOpacity
                          style={[styles.unassignTrashBtn, { backgroundColor: colors.dangerSubtle }]}
                          onPress={() => handleUnassign(sub.id, sub.subjectCode, profName)}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={12} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text style={[styles.subjectName, { color: colors.text }]}>{sub.subjectName}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {Object.keys(groupedByProf).length === 0 && (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="book" size={36} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Allocations Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              No subject allocations matched your search criteria.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ALLOT SUBJECT MODAL */}
      <Modal visible={showAllotModal} transparent animationType="slide" onRequestClose={() => setShowAllotModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Allot Subject to Faculty</Text>
              <TouchableOpacity onPress={() => setShowAllotModal(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Assign course teaching responsibility (Synced with Academic Sessions)
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Select Professor *</Text>
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

            {/* Year / Semester Filter Pills */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 4 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Select Course by Active Term</Text>
              <TouchableOpacity
                onPress={() => setFilterActiveSemOnly(!filterActiveSemOnly)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Feather name={filterActiveSemOnly ? 'check-circle' : 'circle'} size={12} color={colors.primary} />
                <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>
                  {filterActiveSemOnly ? 'Active Sems Only' : 'All Courses'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Year Filter Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPillScroll}>
              <TouchableOpacity
                style={[
                  styles.selectPill,
                  {
                    backgroundColor: selectedYearFilter === 'ALL' ? colors.primary : colors.surfaceSubtle,
                    borderColor: selectedYearFilter === 'ALL' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedYearFilter('ALL')}
              >
                <Text style={[styles.selectPillText, { color: selectedYearFilter === 'ALL' ? '#FFF' : colors.textSecondary }]}>
                  All Years
                </Text>
              </TouchableOpacity>

              {sessionsList.map((session) => (
                <TouchableOpacity
                  key={session.year}
                  style={[
                    styles.selectPill,
                    {
                      backgroundColor: selectedYearFilter === session.year ? colors.primary : colors.surfaceSubtle,
                      borderColor: selectedYearFilter === session.year ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedYearFilter(session.year)}
                >
                  <Text style={[styles.selectPillText, { color: selectedYearFilter === session.year ? '#FFF' : colors.textSecondary }]}>
                    Yr {session.year} (Sem {session.active_semester})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Filtered Subjects List */}
            {(() => {
              const activeSems = sessionsList.map((s) => s.active_semester);
              const filteredSubs = subjectsList.filter((s) => {
                if (selectedYearFilter !== 'ALL') {
                  const targetSession = sessionsList.find((ses) => ses.year === selectedYearFilter);
                  if (filterActiveSemOnly && targetSession && s.semester !== targetSession.active_semester) {
                    return false;
                  }
                  // Calculate student year from subject semester (1-2: Yr 1, 3-4: Yr 2, 5-6: Yr 3, 7-8: Yr 4)
                  const subYear = Math.ceil(s.semester / 2);
                  if (subYear !== selectedYearFilter) return false;
                } else if (filterActiveSemOnly) {
                  if (!activeSems.includes(s.semester)) return false;
                }
                return true;
              });

              return (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPillScroll}>
                  {filteredSubs.length > 0 ? (
                    filteredSubs.map((s) => (
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
                          [{s.code}] Sem {s.semester} • {s.name}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 6 }}>
                      No subjects available for this filter.
                    </Text>
                  )}
                </ScrollView>
              );
            })()}

            <TouchableOpacity
              style={[styles.saveModalBtn, { backgroundColor: colors.primary }]}
              onPress={handleAllotSubject}
            >
              <Text style={styles.saveModalBtnText}>Confirm Subject Allotment</Text>
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
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  branchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  branchPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  branchPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  profSection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  profHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profName: {
    fontSize: 15,
    fontWeight: '700',
  },
  profSub: {
    fontSize: 11,
    marginTop: 1,
  },
  subjectList: {
    gap: 8,
  },
  allocationCard: {
    padding: 10,
    borderRadius: 10,
  },
  subTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  semBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  semText: {
    fontSize: 10,
    fontWeight: '600',
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyBox: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  primarySmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  primarySmallBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  unassignTrashBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '80%',
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalPillScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  selectPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  selectPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveModalBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  saveModalBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
