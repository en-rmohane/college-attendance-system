import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

export default function CreateTestScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const initialSubject = route?.params?.initialSubject || 'CS303';
  const [title, setTitle] = useState('');
  const [subjectCode, setSubjectCode] = useState(initialSubject);
  const [duration, setDuration] = useState('30');
  const [totalMarks, setTotalMarks] = useState('25');
  const [otp, setOtp] = useState('8842');

  const [questions, setQuestions] = useState([
    {
      id: 1,
      questionText: 'What is the time complexity of QuickSort in average case?',
      options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(1)'],
      correctOptionIndex: 1,
      explanation: 'QuickSort divides array using pivot in O(n log n) expected time.',
    },
  ]);

  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctOpt, setCorrectOpt] = useState(0);
  const [explanation, setExplanation] = useState('');

  const handleAddQuestion = () => {
    if (!qText.trim() || !optA.trim() || !optB.trim()) {
      Alert.alert('Missing Fields', 'Please enter question text and at least options A and B.');
      return;
    }

    const newQ = {
      id: questions.length + 1,
      questionText: qText.trim(),
      options: [
        optA.trim(),
        optB.trim(),
        optC.trim() || 'None',
        optD.trim() || 'All of the above',
      ],
      correctOptionIndex: correctOpt,
      explanation: explanation.trim() || 'Standard curriculum question.',
    };

    setQuestions([...questions, newQ]);
    setQText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setExplanation('');
    Alert.alert('Question Added ✅', `Question ${newQ.id} added to the test.`);
  };

  const handlePublishTest = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter test title.');
      return;
    }

    await api.createTest({
      title: title.trim(),
      subjectName: subjectCode === 'CS303' ? 'Data Structures' : 'Database Management',
      subjectCode,
      branch: 'CSE',
      semester: 3,
      durationMinutes: parseInt(duration) || 30,
      totalQuestions: questions.length,
      totalMarks: parseInt(totalMarks) || 25,
      deadline: '2026-11-15 18:00',
      status: 'available',
      securityOtp: otp,
      questions,
    });

    Alert.alert(
      'Test Published! 🎉',
      `Online test "${title}" with security OTP ${otp} is now active for students.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
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
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Create Online Test</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              MCQ Assessment & Secure OTP Proctoring
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* Test Meta Form */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Test Information</Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Test Title</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="e.g., Data Structures Mid-Term Quiz 1"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Subject Code</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={subjectCode}
                onChangeText={setSubjectCode}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Duration (Mins)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                keyboardType="numeric"
                value={duration}
                onChangeText={setDuration}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Total Marks</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                keyboardType="numeric"
                value={totalMarks}
                onChangeText={setTotalMarks}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Exam Security OTP</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                keyboardType="numeric"
                value={otp}
                onChangeText={setOtp}
              />
            </View>
          </View>
        </View>

        {/* Existing Questions Count */}
        <View
          style={[
            styles.qCountBar,
            { backgroundColor: colors.primarySubtle },
          ]}
        >
          <Text style={[styles.qCountText, { color: colors.primary }]}>
            Questions Added: {questions.length}
          </Text>
        </View>

        {/* Question Builder */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            Add Question #{questions.length + 1}
          </Text>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Question Text</Text>
            <TextInput
              style={[
                styles.input,
                {
                  height: 70,
                  textAlignVertical: 'top',
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              multiline
              placeholder="Type question prompt..."
              placeholderTextColor={colors.textMuted}
              value={qText}
              onChangeText={setQText}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Option A</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Option A"
              placeholderTextColor={colors.textMuted}
              value={optA}
              onChangeText={setOptA}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Option B</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Option B"
              placeholderTextColor={colors.textMuted}
              value={optB}
              onChangeText={setOptB}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Option C</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Option C"
              placeholderTextColor={colors.textMuted}
              value={optC}
              onChangeText={setOptC}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Option D</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Option D"
              placeholderTextColor={colors.textMuted}
              value={optD}
              onChangeText={setOptD}
            />
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Correct Option</Text>
          <View style={styles.correctOptRow}>
            {['Option A', 'Option B', 'Option C', 'Option D'].map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optPill,
                  {
                    backgroundColor:
                      correctOpt === idx ? colors.success : colors.surfaceSubtle,
                    borderColor: correctOpt === idx ? colors.success : colors.border,
                  },
                ]}
                onPress={() => setCorrectOpt(idx)}
              >
                <Text
                  style={[
                    styles.optPillText,
                    { color: correctOpt === idx ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.addQBtn, { backgroundColor: colors.primarySubtle }]}
            onPress={handleAddQuestion}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={16} color={colors.primary} />
            <Text style={[styles.addQBtnText, { color: colors.primary }]}>
              Add Question to Test
            </Text>
          </TouchableOpacity>
        </View>

        {/* Publish Action */}
        <TouchableOpacity
          style={[styles.publishBtn, { backgroundColor: colors.primary }]}
          onPress={handlePublishTest}
          activeOpacity={0.8}
        >
          <Feather name="send" size={18} color="#FFFFFF" />
          <Text style={styles.publishBtnText}>Publish Test to Students</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginTop: 1,
  },
  contentScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  qCountBar: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  qCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  correctOptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  optPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  optPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addQBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
  },
  addQBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
