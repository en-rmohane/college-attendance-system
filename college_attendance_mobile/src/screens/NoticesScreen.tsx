import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  RefreshControl,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Notice } from '../types';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AnimatedCard } from '../components/common/AnimatedCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';

const CATEGORIES = [
  { id: 'all', label: 'All Notices', icon: 'bell' },
  { id: 'urgent', label: 'Important', icon: 'alert-triangle' },
  { id: 'academic', label: 'Academic', icon: 'book' },
  { id: 'exam', label: 'Exams', icon: 'file-text' },
  { id: 'event', label: 'Events & SIH', icon: 'award' },
  { id: 'general', label: 'General', icon: 'info' },
];

export const NoticesScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { user, role } = useAuth();
  const canPublishNotice = role === 'admin' || role === 'professor';

  const [activeTab, setActiveTab] = useState<'list' | 'publish'>('list');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);

  // Form State for Creating New Notice
  const [title, setTitle] = useState<string>('');
  const [targetAudience, setTargetAudience] = useState<string>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [category, setCategory] = useState<Notice['category']>('academic');
  const [message, setMessage] = useState<string>('');
  const [isImportant, setIsImportant] = useState<boolean>(false);
  const [expiresIn, setExpiresIn] = useState<string>('never');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const loadNotices = async () => {
    try {
      const data = await api.getNotices();
      setNotices(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotices();
    setRefreshing(false);
  };

  const handleResetForm = () => {
    setTitle('');
    setTargetAudience('all');
    setSelectedBranch('ALL');
    setSelectedYear('ALL');
    setCategory('academic');
    setMessage('');
    setIsImportant(false);
    setExpiresIn('never');
  };

  const handlePublishNotice = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Field ⚠️', 'Please enter notice title.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Missing Field ⚠️', 'Please enter detailed notice message.');
      return;
    }

    setIsPublishing(true);
    const creator = user?.name || (user?.role === 'admin' ? 'Administrator' : 'Faculty Member');

    const newNotice: Notice = {
      id: notices.length + 101,
      title: title.trim(),
      message: message.trim(),
      creatorName: creator,
      targetAudience:
        targetAudience === 'all'
          ? 'Everyone'
          : targetAudience === 'students'
          ? 'All Students'
          : targetAudience === 'professors'
          ? 'All Professors'
          : 'Specific Students',
      branch: selectedBranch === 'ALL' ? undefined : selectedBranch,
      year: selectedYear === 'ALL' ? undefined : parseInt(selectedYear),
      isImportant,
      createdAt: 'Just now (20 Sep 2026)',
      expiresAt: expiresIn === '7d' ? '27 Sep 2026' : undefined,
      category: isImportant ? 'urgent' : category,
    };

    try {
      await api.createNotice(newNotice);
      setNotices([newNotice, ...notices]);
      setIsPublishing(false);
      handleResetForm();
      setActiveTab('list');
      Alert.alert(
        'Notice Published 🚀',
        `"${newNotice.title}" has been published to ${newNotice.targetAudience}.`
      );
    } catch (e) {
      setIsPublishing(false);
      Alert.alert('Error', 'Failed to publish notice. Please try again.');
    }
  };

  const handleDeleteNotice = (noticeId: number, noticeTitle: string) => {
    Alert.alert(
      'Delete Notice 🗑️',
      `Are you sure you want to delete "${noticeTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setNotices((prev) => prev.filter((n) => n.id !== noticeId));
            if (activeNotice?.id === noticeId) setActiveNotice(null);
          },
        },
      ]
    );
  };

  const handleShareNotice = async (notice: Notice) => {
    try {
      await Share.share({
        message: `📢 *SBITM NOTICE*\n\n📌 *${notice.title}*\n${notice.message}\n\n👤 *By:* ${notice.creatorName}\n📅 *Date:* ${notice.createdAt}`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  // Get pastel accent color per category
  const getCategoryTheme = (cat: string, isImp: boolean) => {
    if (isImp || cat === 'urgent') {
      return { accent: colors.coral, bg: colors.softPeach, label: 'IMPORTANT' };
    }
    switch (cat) {
      case 'academic':
      case 'exam':
        return { accent: colors.purple, bg: colors.softLavender, label: 'ACADEMIC' };
      case 'event':
        return { accent: colors.pink, bg: colors.softPink, label: 'EVENT' };
      case 'transport':
      case 'fee':
        return { accent: colors.amber, bg: colors.softYellow, label: 'FINANCE' };
      default:
        return { accent: colors.primary, bg: colors.softBlue, label: 'GENERAL' };
    }
  };

  const filteredNotices = notices.filter((n) => {
    if (selectedCategory === 'urgent' && !n.isImportant) return false;
    if (selectedCategory !== 'all' && selectedCategory !== 'urgent' && n.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q) ||
        n.creatorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header Card */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1, marginLeft: navigation.canGoBack() ? 10 : 0 }}>
            <Text style={[styles.title, { color: colors.text }]}>Notices & Circulars</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Official announcements, exam alerts & schedules
            </Text>
          </View>

          {canPublishNotice && (
            <TouchableOpacity
              style={[
                styles.publishToggleBtn,
                { backgroundColor: activeTab === 'publish' ? colors.surfaceSubtle : colors.primary },
              ]}
              onPress={() => setActiveTab(activeTab === 'publish' ? 'list' : 'publish')}
              activeOpacity={0.8}
            >
              <Feather
                name={activeTab === 'publish' ? 'list' : 'plus'}
                size={13}
                color={activeTab === 'publish' ? colors.text : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.publishToggleText,
                  { color: activeTab === 'publish' ? colors.text : '#FFFFFF' },
                ]}
              >
                {activeTab === 'publish' ? 'View' : 'Publish'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Switcher Pills (Only for Faculty / Admin) */}
        {canPublishNotice && (
          <View style={[styles.tabBar, { backgroundColor: colors.surfaceSubtle }]}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'list' && [styles.tabBtnActive, { backgroundColor: colors.card }],
              ]}
              onPress={() => setActiveTab('list')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'list' ? colors.primary : colors.textSecondary },
                ]}
              >
                All Circulars ({notices.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                activeTab === 'publish' && [styles.tabBtnActive, { backgroundColor: colors.card }],
              ]}
              onPress={() => setActiveTab('publish')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === 'publish' ? colors.primary : colors.textSecondary },
                ]}
              >
                + Create Notice
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* CREATE NOTICE FORM (Only for Faculty / Admin) */}
        {canPublishNotice && activeTab === 'publish' && (
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formCardTitle, { color: colors.text }]}>Broadcast Announcement</Text>
            <Text style={[styles.formCardSub, { color: colors.textSecondary }]}>
              Publish a verified notice to students and faculty
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Notice Title *
            </Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Mid-Sem Examination Schedule"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Target Audience
            </Text>
            <View style={styles.audienceGrid}>
              {[
                { key: 'all', label: '👥 Everyone' },
                { key: 'students', label: '🎒 All Students' },
                { key: 'professors', label: '🎓 Professors' },
              ].map((aud) => (
                <TouchableOpacity
                  key={aud.key}
                  style={[
                    styles.audiencePill,
                    {
                      backgroundColor: targetAudience === aud.key ? colors.softBlue : colors.surfaceSubtle,
                      borderColor: targetAudience === aud.key ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setTargetAudience(aud.key)}
                >
                  <Text
                    style={[
                      styles.audiencePillText,
                      { color: targetAudience === aud.key ? colors.primary : colors.text },
                    ]}
                  >
                    {aud.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 14 }]}>
              Notice Message *
            </Text>
            <TextInput
              style={[styles.textAreaInput, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
              placeholder="Write circular details here..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />

            <View style={[styles.importantToggleBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.importantToggleTitle, { color: colors.text }]}>Mark as High Priority</Text>
                <Text style={[styles.importantToggleSub, { color: colors.textSecondary }]}>Highlight with pastel coral alert strip</Text>
              </View>
              <Switch
                value={isImportant}
                onValueChange={setIsImportant}
                trackColor={{ false: colors.border, true: colors.coral }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={[styles.publishSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handlePublishNotice}
              disabled={isPublishing}
              activeOpacity={0.85}
            >
              <Text style={styles.publishSubmitBtnText}>
                {isPublishing ? 'Publishing...' : 'Publish Announcement'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NOTICES LIST */}
        {activeTab === 'list' && (
          <View>
            {/* Search Bar */}
            <View style={[styles.searchBar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Feather name="search" size={15} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search circulars by title, topic..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterRow}>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* List of Pastel Notices */}
            {filteredNotices.map((notice) => {
              const theme = getCategoryTheme(notice.category || 'general', notice.isImportant);

              return (
                <AnimatedCard
                  key={notice.id}
                  style={[
                    styles.noticeCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderLeftColor: theme.accent,
                      borderLeftWidth: 4,
                    },
                  ]}
                  onPress={() => setActiveNotice(notice)}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <StatusBadge
                          status={notice.isImportant ? 'danger' : 'info'}
                          label={theme.label}
                          size="sm"
                        />
                        <Text style={[styles.noticeDate, { color: colors.textMuted }]}>{notice.createdAt}</Text>
                      </View>
                      <Text style={[styles.noticeTitle, { color: colors.text }]}>{notice.title}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.miniActionBtn, { backgroundColor: colors.surfaceSubtle }]}
                      onPress={() => handleShareNotice(notice)}
                      activeOpacity={0.7}
                    >
                      <Feather name="share-2" size={13} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.noticeMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                    {notice.message}
                  </Text>

                  <View style={[styles.noticeMetaBox, { backgroundColor: colors.surfaceSubtle }]}>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      By: <Text style={{ color: colors.text, fontWeight: '600' }}>{notice.creatorName}</Text>
                    </Text>
                    <Text style={[styles.metaText, { color: colors.primary, fontWeight: '600' }]}>
                      {notice.targetAudience}
                    </Text>
                  </View>
                </AnimatedCard>
              );
            })}

            {filteredNotices.length === 0 && (
              <EmptyState
                icon="bell-off"
                title="No Notices Found"
                description="There are no announcements matching your current category filter."
                accentColor={colors.primary}
              />
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* NOTICE POPUP MODAL */}
      <Modal
        visible={!!activeNotice}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveNotice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalTopRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{activeNotice?.title}</Text>
              <TouchableOpacity onPress={() => setActiveNotice(null)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDate, { color: colors.textMuted }]}>
              Published on {activeNotice?.createdAt} by {activeNotice?.creatorName}
            </Text>

            <ScrollView style={{ maxHeight: 260, marginVertical: 14 }}>
              <Text style={[styles.modalMsg, { color: colors.text }]}>{activeNotice?.message}</Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: colors.primary }]}
              onPress={() => setActiveNotice(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.closeModalBtnText}>Done</Text>
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
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  publishToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  publishToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  categoryFilterRow: {
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noticeCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  noticeDate: {
    fontSize: 10,
    fontWeight: '500',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  miniActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeMessage: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    marginBottom: 8,
  },
  noticeMetaBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '500',
  },
  formCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  formCardSub: {
    fontSize: 11,
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  textAreaInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 12,
    height: 90,
  },
  audienceGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  audiencePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  audiencePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  importantToggleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 14,
  },
  importantToggleTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  importantToggleSub: {
    fontSize: 10,
    marginTop: 1,
  },
  publishSubmitBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  publishSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  modalDate: {
    fontSize: 11,
    marginTop: 4,
  },
  modalMsg: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  closeModalBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
