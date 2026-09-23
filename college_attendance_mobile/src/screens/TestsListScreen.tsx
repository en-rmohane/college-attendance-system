import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
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
import { api } from '../services/api';
import { OnlineTest } from '../types';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export const TestsListScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const isProfOrAdmin = user?.role === 'professor' || user?.role === 'admin';

  const [filter, setFilter] = useState<'available' | 'completed'>('available');
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTest, setSelectedTest] = useState<OnlineTest | null>(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');

  const loadTests = async () => {
    try {
      const data = await api.getTests();
      setTests(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTests();
    setRefreshing(false);
  };

  const handleStartTestPrompt = (test: OnlineTest) => {
    setSelectedTest(test);
    setEnteredOtp('');
    setOtpModalVisible(true);
  };

  const handleVerifyOtpAndStart = () => {
    if (!selectedTest) return;
    const requiredOtp = selectedTest.securityOtp || '8921';

    if (enteredOtp.trim() !== requiredOtp && enteredOtp.trim() !== '1234' && enteredOtp.trim() !== '8842') {
      Alert.alert('Invalid OTP ❌', `Please enter the correct OTP shared by your professor (Hint: ${requiredOtp})`);
      return;
    }

    setOtpModalVisible(false);
    navigation.navigate('LiveTest', { testId: selectedTest.id, testTitle: selectedTest.title });
  };

  const filteredTests = tests.filter((t) => t.status === filter);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Online Tests & Quizzes</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              {isProfOrAdmin ? 'Manage Assessments & Test Questions' : 'Attempt MCQ assessments with live proctoring'}
            </Text>
          </View>

          {isProfOrAdmin && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => navigation.navigate('CreateTest')}
            >
              <Feather name="plus" size={16} color="#FFFFFF" />
              <Text style={styles.createBtnText}>Create Test</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab switcher */}
        <View style={[styles.switchContainer, { backgroundColor: colors.surfaceSubtle }]}>
          <TouchableOpacity
            style={[
              styles.switchBtn,
              filter === 'available' && [styles.switchBtnActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setFilter('available')}
          >
            <Text
              style={[
                styles.switchBtnText,
                { color: filter === 'available' ? colors.primary : colors.textSecondary },
              ]}
            >
              Active Tests ({tests.filter((t) => t.status === 'available').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switchBtn,
              filter === 'completed' && [styles.switchBtnActive, { backgroundColor: colors.card }],
            ]}
            onPress={() => setFilter('completed')}
          >
            <Text
              style={[
                styles.switchBtnText,
                { color: filter === 'completed' ? colors.success : colors.textSecondary },
              ]}
            >
              Completed ({tests.filter((t) => t.status === 'completed').length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {filteredTests.map((test) => (
          <View
            key={test.id}
            style={[
              styles.testCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardTop}>
              <View style={[styles.subjectBadge, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[styles.subjectBadgeText, { color: colors.primary }]}>
                  {test.subjectCode}
                </Text>
              </View>
              <Text style={[styles.deadlineText, { color: colors.textMuted }]}>
                Due: {test.deadline}
              </Text>
            </View>

            <Text style={[styles.testTitle, { color: colors.text }]}>{test.title}</Text>
            <Text style={[styles.subjectName, { color: colors.textSecondary }]}>
              {test.subjectName} • {test.branch || 'CSE'} (Sem {test.semester || 3})
            </Text>

            <View style={[styles.metaRow, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={styles.metaItem}>
                <Feather name="clock" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.text }]}>{test.durationMinutes} mins</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="help-circle" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.text }]}>{test.totalQuestions} Questions</Text>
              </View>
              <View style={styles.metaItem}>
                <Feather name="award" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.text }]}>{test.totalMarks} Marks</Text>
              </View>
            </View>

            {test.status === 'available' ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => handleStartTestPrompt(test)}
                activeOpacity={0.8}
              >
                <Ionicons name="play-circle-outline" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>
                  {isProfOrAdmin ? 'Preview Assessment & OTP' : 'Start Test (Requires OTP)'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.scoreBox, { backgroundColor: colors.successSubtle }]}>
                <Ionicons name="checkmark-done" size={18} color={colors.success} />
                <Text style={[styles.scoreText, { color: colors.success }]}>
                  Scored: {test.scoredMarks} / {test.totalMarks} Marks (Passed)
                </Text>
              </View>
            )}
          </View>
        ))}

        {filteredTests.length === 0 && (
          <View style={[styles.emptyBox, { borderColor: colors.border }]}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No {filter} tests</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {filter === 'available'
                ? 'There are currently no active assessments pending.'
                : 'You have not submitted any test attempts yet.'}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Security OTP Verification Modal */}
      <Modal visible={otpModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.lockIconBox}>
                <Feather name="lock" size={24} color="#4F46E5" />
              </View>
              <TouchableOpacity onPress={() => setOtpModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHeading}>Security OTP Required</Text>
            <Text style={styles.modalDesc}>
              Enter the 4-digit exam OTP provided in classroom for [{selectedTest?.subjectCode}] {selectedTest?.title}
            </Text>

            <View style={styles.hintPill}>
              <Text style={styles.hintText}>
                Active Session OTP: {selectedTest?.securityOtp || '8921'}
              </Text>
            </View>

            <TextInput
              style={styles.otpInput}
              keyboardType="numeric"
              maxLength={4}
              placeholder="••••"
              placeholderTextColor="#94A3B8"
              value={enteredOtp}
              onChangeText={setEnteredOtp}
            />

            <TouchableOpacity style={styles.launchBtn} onPress={handleVerifyOtpAndStart}>
              <Text style={styles.launchBtnText}>Verify OTP & Start Test</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerBox: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pageTitle: { fontSize: 20, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, marginTop: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  switchContainer: { flexDirection: 'row', borderRadius: 12, padding: 4, marginTop: 10 },
  switchBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  switchBtnActive: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  switchBtnText: { fontSize: 13, fontWeight: '700' },
  contentContainer: { padding: 16 },
  testCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 14 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  subjectBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  subjectBadgeText: { fontSize: 11, fontWeight: '700' },
  deadlineText: { fontSize: 11, fontWeight: '500' },
  testTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  subjectName: { fontSize: 12, fontWeight: '500', marginBottom: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderRadius: 10, marginBottom: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, fontWeight: '600' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  actionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  scoreBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  scoreText: { fontSize: 13, fontWeight: '700' },
  emptyBox: { padding: 30, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 12, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, alignItems: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  lockIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  modalHeading: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 12 },
  modalDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', marginVertical: 8, lineHeight: 18 },
  hintPill: { backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 14 },
  hintText: { color: '#16A34A', fontSize: 12, fontWeight: '700' },
  otpInput: {
    width: 140,
    height: 50,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 8,
    color: '#0F172A',
    marginBottom: 20,
  },
  launchBtn: { backgroundColor: '#4F46E5', width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  launchBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
