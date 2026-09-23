import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Student } from '../types';
import { Feather, Ionicons } from '@expo/vector-icons';

export const StudentsDirectoryScreen = ({ navigation }: any) => {
  const { colors } = useTheme();

  const [search, setSearch] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  useEffect(() => {
    const loadStudents = async () => {
      const list = await api.getAllStudents();
      setStudents(list);
      setFilteredStudents(list);
    };
    loadStudents();
  }, []);

  useEffect(() => {
    let list = students;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        s => s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q)
      );
    }
    if (selectedBranch !== 'ALL') {
      list = list.filter(s => s.branch.includes(selectedBranch));
    }
    setFilteredStudents(list);
  }, [search, selectedBranch, students]);

  const renderStudentItem = ({ item }: { item: Student }) => {
    const isSafe = item.overallAttendance >= 75;
    const isShortage = item.overallAttendance < 65;

    let badgeBg = colors.successSubtle;
    let badgeColor = colors.success;
    let badgeLabel = 'Safe';

    if (isShortage) {
      badgeBg = colors.dangerSubtle;
      badgeColor = colors.danger;
      badgeLabel = 'Shortage (<65%)';
    } else if (!isSafe) {
      badgeBg = colors.warningSubtle;
      badgeColor = colors.warning;
      badgeLabel = 'Warning';
    }

    return (
      <TouchableOpacity
        style={[styles.studentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => setActiveStudent(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySubtle }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {item.name.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.studentName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.studentRoll, { color: colors.textSecondary }]}>
              {item.roll} • Year {item.year} ({item.branch})
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={[styles.attValue, { color: badgeColor }]}>
            {item.overallAttendance.toFixed(1)}%
          </Text>
          <View style={[styles.statusPill, { backgroundColor: badgeBg }]}>
            <Text style={[styles.statusPillText, { color: badgeColor }]}>{badgeLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.title, { color: colors.text }]}>Students Directory</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {students.length} Enrolled Students in College Database
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by student name or roll number..."
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
      </View>

      {/* List */}
      <FlatList
        data={filteredStudents}
        keyExtractor={item => item.id.toString()}
        renderItem={renderStudentItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={20}
      />

      {/* Student Details Modal */}
      <Modal
        visible={!!activeStudent}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveStudent(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.modalHeading, { color: colors.text }]}>Student Academic Record</Text>
              <TouchableOpacity onPress={() => setActiveStudent(null)} style={{ padding: 4 }}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {activeStudent && (
              <View>
                <View style={styles.modalProfileRow}>
                  <View style={[styles.modalAvatar, { backgroundColor: colors.primary }]}>
                    <Text style={styles.modalAvatarText}>{activeStudent.name.charAt(0)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalName, { color: colors.text }]}>{activeStudent.name}</Text>
                    <Text style={[styles.modalRoll, { color: colors.primary }]}>{activeStudent.roll}</Text>
                    <Text style={[styles.modalBranch, { color: colors.textSecondary }]}>
                      {activeStudent.branch} • Year {activeStudent.year} (Sem {activeStudent.semester})
                    </Text>
                  </View>
                </View>

                {/* Attendance Gauge */}
                <View style={[styles.modalAttCard, { backgroundColor: colors.surfaceSubtle }]}>
                  <View>
                    <Text style={[styles.modalAttLabel, { color: colors.textSecondary }]}>Overall Attendance</Text>
                    <Text
                      style={[
                        styles.modalAttVal,
                        {
                          color:
                            activeStudent.overallAttendance >= 75
                              ? colors.success
                              : activeStudent.overallAttendance >= 65
                              ? colors.warning
                              : colors.danger,
                        },
                      ]}
                    >
                      {activeStudent.overallAttendance.toFixed(1)}%
                    </Text>
                    <Text style={[styles.modalAttClasses, { color: colors.textMuted }]}>
                      {activeStudent.totalPresent} / {activeStudent.totalClasses} Lectures Attended
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      {
                        backgroundColor:
                          activeStudent.overallAttendance >= 75 ? colors.successSubtle : colors.dangerSubtle,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        {
                          color:
                            activeStudent.overallAttendance >= 75 ? colors.success : colors.danger,
                        },
                      ]}
                    >
                      {activeStudent.overallAttendance >= 75 ? 'ELIGIBLE' : 'SHORTAGE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="mail" size={14} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.text }]}>{activeStudent.email}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Feather name="phone" size={14} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.text }]}>{activeStudent.phone}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setActiveStudent(null)}
                >
                  <Text style={styles.closeBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  studentRoll: {
    fontSize: 11,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  attValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
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
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  modalAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '800',
  },
  modalName: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalRoll: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  modalBranch: {
    fontSize: 12,
    marginTop: 2,
  },
  modalAttCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
  },
  modalAttLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalAttVal: {
    fontSize: 24,
    fontWeight: '800',
    marginVertical: 2,
  },
  modalAttClasses: {
    fontSize: 11,
  },
  modalStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  closeBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
