import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { OnlineTest, TestQuestion } from '../types';
import { api } from '../services/api';
import { Feather, Ionicons } from '@expo/vector-icons';

export const LiveTestScreen = ({ route, navigation }: any) => {
  const { colors } = useTheme();
  const test: OnlineTest = route.params?.test;

  const questions: TestQuestion[] = test?.questions || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState((test?.durationMinutes || 20) * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; percentage: number } | null>(null);

  // Countdown timer
  useEffect(() => {
    if (isSubmitted) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSubmitted]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (qId: number, optionIdx: number) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleSubmitTest = async () => {
    const res = await api.submitTest(test.id, answers);
    setResult(res);
    setIsSubmitted(true);
  };

  const confirmSubmit = () => {
    const answeredCount = Object.keys(answers).length;
    const unanswered = questions.length - answeredCount;

    Alert.alert(
      'Submit Assessment?',
      `You have answered ${answeredCount} of ${questions.length} questions. ${unanswered > 0 ? `(${unanswered} unanswered)` : ''}\nAre you sure you want to finish?`,
      [
        { text: 'Continue Test', style: 'cancel' },
        { text: 'Submit Now', style: 'default', onPress: handleSubmitTest },
      ]
    );
  };

  if (!test || questions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text }}>No test loaded.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Test Header */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={[styles.testHeaderTitle, { color: colors.text }]} numberOfLines={1}>
              {test.title}
            </Text>
            <Text style={[styles.testHeaderSub, { color: colors.textSecondary }]}>
              {test.subjectCode} • {test.totalMarks} Marks
            </Text>
          </View>

          {/* Live Timer Badge */}
          <View
            style={[
              styles.timerBadge,
              {
                backgroundColor: timeLeft < 300 ? colors.dangerSubtle : colors.primarySubtle,
                borderColor: timeLeft < 300 ? colors.danger : colors.primary,
              },
            ]}
          >
            <Feather name="clock" size={14} color={timeLeft < 300 ? colors.danger : colors.primary} />
            <Text
              style={[
                styles.timerText,
                { color: timeLeft < 300 ? colors.danger : colors.primary },
              ]}
            >
              {formatTime(timeLeft)}
            </Text>
          </View>
        </View>

        {/* Question Palette Matrix */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paletteScroll}
        >
          {questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = idx === currentIdx;

            let btnBg = colors.surfaceSubtle;
            let btnBorder = colors.border;
            let textColor = colors.textSecondary;

            if (isCurrent) {
              btnBg = colors.primary;
              btnBorder = colors.primary;
              textColor = '#FFF';
            } else if (isAnswered) {
              btnBg = colors.successSubtle;
              btnBorder = colors.success;
              textColor = colors.success;
            }

            return (
              <TouchableOpacity
                key={q.id}
                style={[
                  styles.paletteBtn,
                  { backgroundColor: btnBg, borderColor: btnBorder },
                ]}
                onPress={() => setCurrentIdx(idx)}
              >
                <Text style={[styles.paletteBtnText, { color: textColor }]}>
                  {idx + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {!isSubmitted ? (
        <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          {/* Question Card */}
          <View style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.questionHeader}>
              <View style={[styles.qNumBadge, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[styles.qNumText, { color: colors.primary }]}>
                  Question {currentIdx + 1} of {questions.length}
                </Text>
              </View>
              <Text style={[styles.markText, { color: colors.textSecondary }]}>
                {test.totalMarks / questions.length} Mark(s)
              </Text>
            </View>

            <Text style={[styles.questionText, { color: colors.text }]}>
              {currentQ.questionText}
            </Text>

            {/* Options List */}
            <View style={styles.optionsList}>
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = answers[currentQ.id] === optIdx;
                return (
                  <TouchableOpacity
                    key={optIdx}
                    style={[
                      styles.optionItem,
                      {
                        backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleSelectOption(currentQ.id, optIdx)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.textMuted,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: isSelected ? colors.text : colors.textSecondary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Navigation Controls */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[
                styles.navBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  opacity: currentIdx === 0 ? 0.4 : 1,
                },
              ]}
              disabled={currentIdx === 0}
              onPress={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
            >
              <Feather name="arrow-left" size={16} color={colors.text} />
              <Text style={[styles.navBtnText, { color: colors.text }]}>Previous</Text>
            </TouchableOpacity>

            {currentIdx < questions.length - 1 ? (
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
              >
                <Text style={[styles.navBtnText, { color: '#FFF' }]}>Next</Text>
                <Feather name="arrow-right" size={16} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: colors.success, borderColor: colors.success }]}
                onPress={confirmSubmit}
              >
                <Text style={[styles.navBtnText, { color: '#FFF' }]}>Submit Test</Text>
                <Feather name="send" size={16} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        /* Results View */
        <ScrollView contentContainerStyle={styles.resultContainer} showsVerticalScrollIndicator={false}>
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.resultIconHalo, { backgroundColor: colors.successSubtle }]}>
              <Feather name="award" size={48} color={colors.success} />
            </View>
            <Text style={[styles.resultTitle, { color: colors.text }]}>Assessment Completed!</Text>
            <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
              Your response has been automatically evaluated and recorded.
            </Text>

            <View style={[styles.scoreBanner, { backgroundColor: colors.surfaceSubtle }]}>
              <View style={styles.scoreMetric}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Your Score</Text>
                <Text style={[styles.metricVal, { color: colors.success }]}>
                  {result?.score} / {result?.total}
                </Text>
              </View>
              <View style={styles.scoreMetric}>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Percentage</Text>
                <Text style={[styles.metricVal, { color: colors.primary }]}>
                  {result?.percentage.toFixed(0)}%
                </Text>
              </View>
            </View>

            {/* Answer Solutions Section */}
            <Text style={[styles.solutionsHeading, { color: colors.text }]}>Answer Key & Explanations</Text>
            {questions.map((q, idx) => {
              const studentAnswerIdx = answers[q.id];
              const isCorrect = studentAnswerIdx === q.correctOptionIndex;

              return (
                <View
                  key={q.id}
                  style={[
                    styles.solutionCard,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: isCorrect ? colors.success : colors.danger,
                    },
                  ]}
                >
                  <View style={styles.solutionHeader}>
                    <Text style={[styles.solutionQNum, { color: colors.text }]}>Q{idx + 1}</Text>
                    <View
                      style={[
                        styles.solutionStatusPill,
                        { backgroundColor: isCorrect ? colors.successSubtle : colors.dangerSubtle },
                      ]}
                    >
                      <Text
                        style={[
                          styles.solutionStatusText,
                          { color: isCorrect ? colors.success : colors.danger },
                        ]}
                      >
                        {isCorrect ? 'Correct (+5)' : 'Incorrect (0)'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.solutionQText, { color: colors.text }]}>{q.questionText}</Text>

                  <Text style={[styles.solutionAnsLabel, { color: colors.textSecondary }]}>
                    Correct Answer: <Text style={{ color: colors.success, fontWeight: '700' }}>{q.options[q.correctOptionIndex || 0]}</Text>
                  </Text>

                  {q.explanation && (
                    <Text style={[styles.solutionExpl, { color: colors.textMuted }]}>
                      💡 {q.explanation}
                    </Text>
                  )}
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.finishBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.finishBtnText}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
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
    marginBottom: 12,
  },
  backBtn: {
    padding: 6,
  },
  testHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  testHeaderSub: {
    fontSize: 12,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '800',
  },
  paletteScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  paletteBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  questionCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  qNumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qNumText: {
    fontSize: 12,
    fontWeight: '700',
  },
  markText: {
    fontSize: 12,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultContainer: {
    padding: 16,
    paddingBottom: 36,
  },
  resultCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  resultIconHalo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreBanner: {
    flexDirection: 'row',
    width: '100%',
    padding: 16,
    borderRadius: 14,
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  scoreMetric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  solutionsHeading: {
    fontSize: 16,
    fontWeight: '700',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  solutionCard: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  solutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  solutionQNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  solutionStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  solutionStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  solutionQText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  solutionAnsLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  solutionExpl: {
    fontSize: 11,
    lineHeight: 16,
  },
  finishBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  finishBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
