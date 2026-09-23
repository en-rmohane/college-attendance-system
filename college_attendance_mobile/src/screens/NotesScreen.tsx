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
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StudyNote } from '../types';

const SUBJECT_FILTERS = [
  { code: 'ALL', label: 'All Subjects' },
  { code: 'CS-601', label: 'Networks (CS-601)' },
  { code: 'CS-602', label: 'DBMS (CS-602)' },
  { code: 'CS-603', label: 'ML & AI (CS-603)' },
  { code: 'CS-604', label: 'OS (CS-604)' },
  { code: 'CS-605', label: 'Cloud (CS-605)' },
  { code: 'CS-303', label: 'Data Structures (CS-303)' },
];

const AVAILABLE_SUBJECTS = [
  { code: 'CS-602', name: 'Database Management Systems', semester: 6, branch: 'CSE' },
  { code: 'CS-601', name: 'Computer Networks', semester: 6, branch: 'CSE' },
  { code: 'CS-603', name: 'Machine Learning & AI', semester: 6, branch: 'CSE' },
  { code: 'CS-604', name: 'Operating Systems', semester: 6, branch: 'CSE' },
  { code: 'CS-605', name: 'Cloud Computing', semester: 6, branch: 'CSE' },
  { code: 'CS-303', name: 'Data Structures & Algorithms', semester: 3, branch: 'CSE' },
  { code: 'AD-303', name: 'Artificial Intelligence Basics', semester: 3, branch: 'AD' },
];

const FILE_TYPE_PRESETS = [
  { ext: 'PDF', name: 'Lecture Notes (PDF)', icon: 'file-text', color: '#EF4444' },
  { ext: 'PPTX', name: 'Presentation (PPT)', icon: 'file', color: '#F59E0B' },
  { ext: 'DOCX', name: 'Lab Manual (DOC)', icon: 'file-text', color: '#3B82F6' },
  { ext: 'ZIP', name: 'Question Bank (ZIP)', icon: 'archive', color: '#8B5CF6' },
];

export const NotesScreen = ({ route, navigation }: any) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const isFacultyOrAdmin = user?.role === 'professor' || user?.role === 'admin';

  const initialSubjectParam = route?.params?.initialSubject;

  const [selectedSubject, setSelectedSubject] = useState(initialSubjectParam || 'ALL');
  const [activeTab, setActiveTab] = useState<'all' | 'my_uploads'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadedMap, setDownloadedMap] = useState<Record<number, boolean>>({});

  // Upload Modal State
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [selectedSubjectCode, setSelectedSubjectCode] = useState(initialSubjectParam || 'CS303');
  const [noteDescription, setNoteDescription] = useState('');
  const [fileType, setFileType] = useState('PDF');
  const [customFileName, setCustomFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSubjectParam) {
      setSelectedSubject(initialSubjectParam);
      setSelectedSubjectCode(initialSubjectParam);
    }
  }, [initialSubjectParam]);

  const loadNotes = async () => {
    try {
      const data = await api.getNotes(selectedSubject);
      setNotes(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [selectedSubject]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotes();
    setRefreshing(false);
  };

  const handleDownload = (note: StudyNote) => {
    setDownloadedMap((prev) => ({ ...prev, [note.id]: true }));
    Alert.alert(
      'Document Downloaded 📥',
      `"${note.fileName}" (${note.fileSize}) has been saved to your device and is ready for offline revision.`
    );
  };

  const handleDeleteNote = (note: StudyNote) => {
    Alert.alert(
      'Delete Study Material ⚠️',
      `Are you sure you want to remove "${note.title}"? Students will no longer be able to download this file.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Material',
          style: 'destructive',
          onPress: async () => {
            await api.deleteNote(note.id);
            setNotes((prev) => prev.filter((n) => n.id !== note.id));
            Alert.alert('Deleted ✅', `Study material "${note.title}" has been deleted.`);
          },
        },
      ]
    );
  };

  const handleUploadSubmit = async () => {
    if (!noteTitle.trim()) {
      Alert.alert('Required Field', 'Please enter a title for this study material.');
      return;
    }

    setIsSubmitting(true);
    try {
      const subjectObj = AVAILABLE_SUBJECTS.find((s) => s.code === selectedSubjectCode) || AVAILABLE_SUBJECTS[0];
      const fileNameFinal = customFileName.trim()
        ? `${customFileName.replace(/[^a-zA-Z0-9_-]/g, '_')}.${fileType.toLowerCase()}`
        : `${selectedSubjectCode}_${noteTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.${fileType.toLowerCase()}`;

      const newNote = await api.uploadNote({
        title: noteTitle.trim(),
        subjectCode: subjectObj.code,
        subjectName: subjectObj.name,
        branch: subjectObj.branch,
        semester: subjectObj.semester,
        professorName: user?.name || 'Dr. Pankaj Sisodiya',
        description: noteDescription.trim() || 'Comprehensive unit lecture notes and practice sessional problems.',
        fileName: fileNameFinal,
        fileSize: `${(2.4 + Math.random() * 3.5).toFixed(1)} MB`,
        uploadedAt: 'Today',
      });

      setNotes((prev) => [newNote, ...prev]);
      setUploadModalVisible(false);
      setNoteTitle('');
      setNoteDescription('');
      setCustomFileName('');

      Alert.alert(
        'Study Material Uploaded! 🚀',
        `"${newNote.title}" has been published for ${newNote.subjectCode} (${newNote.branch} Sem ${newNote.semester}).`
      );
    } catch (err) {
      Alert.alert('Upload Failed', 'An error occurred while uploading. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter notes by search and tab
  const filteredNotes = notes.filter((n) => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        n.title.toLowerCase().includes(q) ||
        n.subjectCode.toLowerCase().includes(q) ||
        n.subjectName.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q) ||
        n.professorName.toLowerCase().includes(q);
      if (!match) return false;
    }

    // My uploads tab filter for faculty
    if (activeTab === 'my_uploads' && user?.name) {
      return n.professorName.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]);
    }

    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.headerTopRow}>
          {navigation?.canGoBack?.() && (
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>
          )}

          <View style={{ flex: 1, marginLeft: navigation?.canGoBack?.() ? 10 : 0 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.pageTitle, { color: colors.text }]}>Study Materials</Text>
              {isFacultyOrAdmin && (
                <View style={[styles.roleTag, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={[styles.roleTagText, { color: '#4F46E5' }]}>FACULTY DESK</Text>
                </View>
              )}
            </View>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              {isFacultyOrAdmin
                ? 'Upload and manage lecture slides, PDFs & assignments'
                : 'Download lecture presentations, unit notes, and lab manuals'}
            </Text>
          </View>

          {/* Prominent Upload Button for Faculty / Admin */}
          {isFacultyOrAdmin && (
            <TouchableOpacity
              style={[styles.headerUploadBtn, { backgroundColor: '#10B981' }]}
              onPress={() => setUploadModalVisible(true)}
              activeOpacity={0.85}
            >
              <Feather name="upload-cloud" size={15} color="#FFFFFF" />
              <Text style={styles.headerUploadBtnText}>+ Upload</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search topic, title, subject code or faculty..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x-circle" size={15} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Faculty Sub Tabs: All Notes vs My Uploads */}
        {isFacultyOrAdmin && (
          <View style={[styles.tabBar, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'all' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('all')}
              activeOpacity={0.8}
            >
              <Feather
                name="grid"
                size={13}
                color={activeTab === 'all' ? '#FFFFFF' : colors.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, { color: activeTab === 'all' ? '#FFFFFF' : colors.textSecondary }]}>
                All Notes ({notes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'my_uploads' && { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab('my_uploads')}
              activeOpacity={0.8}
            >
              <Feather
                name="user-check"
                size={13}
                color={activeTab === 'my_uploads' ? '#FFFFFF' : colors.textSecondary}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.tabText, { color: activeTab === 'my_uploads' ? '#FFFFFF' : colors.textSecondary }]}>
                My Uploads
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subject Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {SUBJECT_FILTERS.map((sub) => {
            const isSelected = sub.code === selectedSubject;
            return (
              <TouchableOpacity
                key={sub.code}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedSubject(sub.code)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {sub.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content List */}
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Upload Banner for Faculty if list is empty or for prominence */}
        {isFacultyOrAdmin && (
          <TouchableOpacity
            style={[styles.uploadBanner, { backgroundColor: colors.primary }]}
            onPress={() => setUploadModalVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.uploadBannerIconBox}>
              <MaterialCommunityIcons name="cloud-upload" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.uploadBannerTitle}>Upload New Lecture Material</Text>
              <Text style={styles.uploadBannerSub}>Publish PDF presentations, syllabi and revision notes</Text>
            </View>
            <Feather name="arrow-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {filteredNotes.map((note) => {
          const isDownloaded = downloadedMap[note.id];
          const isMyUpload =
            isFacultyOrAdmin &&
            user?.name &&
            note.professorName.toLowerCase().includes(user.name.toLowerCase().split(' ')[0]);

          return (
            <View
              key={note.id}
              style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.topRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.codeBadge, { backgroundColor: colors.primarySubtle }]}>
                    <Text style={[styles.codeText, { color: colors.primary }]}>{note.subjectCode}</Text>
                  </View>
                  {note.semester && (
                    <View style={[styles.semBadge, { backgroundColor: colors.surfaceSubtle }]}>
                      <Text style={[styles.semBadgeText, { color: colors.textSecondary }]}>
                        Sem {note.semester}
                      </Text>
                    </View>
                  )}
                  {isMyUpload && (
                    <View style={[styles.myTagBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.myTagText, { color: '#15803D' }]}>MY NOTE</Text>
                    </View>
                  )}
                </View>

                <View style={styles.dateBadge}>
                  <Feather name="calendar" size={11} color={colors.textMuted} />
                  <Text style={[styles.dateText, { color: colors.textMuted }]}>{note.uploadedAt}</Text>
                </View>
              </View>

              <Text style={[styles.noteTitle, { color: colors.text }]}>{note.title}</Text>
              <Text style={[styles.noteDesc, { color: colors.textSecondary }]}>{note.description}</Text>

              {/* Attachment Pill Box */}
              <View style={[styles.fileRow, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                <View style={styles.fileLeft}>
                  <View
                    style={[
                      styles.fileIconBox,
                      {
                        backgroundColor: note.fileName.endsWith('.pdf')
                          ? '#FEE2E2'
                          : note.fileName.endsWith('.ppt') || note.fileName.endsWith('.pptx')
                          ? '#FEF3C7'
                          : '#EFF6FF',
                      },
                    ]}
                  >
                    <Feather
                      name="file-text"
                      size={15}
                      color={
                        note.fileName.endsWith('.pdf')
                          ? '#DC2626'
                          : note.fileName.endsWith('.ppt') || note.fileName.endsWith('.pptx')
                          ? '#D97706'
                          : '#2563EB'
                      }
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                      {note.fileName}
                    </Text>
                    <Text style={[styles.subjectSubName, { color: colors.textSecondary }]} numberOfLines={1}>
                      {note.subjectName}
                    </Text>
                  </View>
                </View>

                <View style={styles.fileSizeBadge}>
                  <Feather name="hard-drive" size={11} color={colors.textSecondary} />
                  <Text style={[styles.fileSizeText, { color: colors.textSecondary }]}>{note.fileSize}</Text>
                </View>
              </View>

              {/* Footer Row with Creator and Actions */}
              <View style={[styles.footerRow, { borderTopColor: colors.border }]}>
                <View style={styles.profRow}>
                  <Feather name="user" size={12} color={colors.textSecondary} />
                  <Text style={[styles.profName, { color: colors.textSecondary }]} numberOfLines={1}>
                    By {note.professorName}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {/* Delete button if faculty/admin */}
                  {isFacultyOrAdmin && (
                    <TouchableOpacity
                      style={[styles.deleteBtn, { backgroundColor: colors.dangerSubtle }]}
                      onPress={() => handleDeleteNote(note)}
                      activeOpacity={0.7}
                    >
                      <Feather name="trash-2" size={14} color={colors.danger} />
                    </TouchableOpacity>
                  )}

                  {/* Download Button */}
                  <TouchableOpacity
                    style={[
                      styles.downloadBtn,
                      {
                        backgroundColor: isDownloaded ? colors.successSubtle : colors.primary,
                      },
                    ]}
                    onPress={() => handleDownload(note)}
                    activeOpacity={0.8}
                  >
                    {isDownloaded ? (
                      <>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={[styles.downloadBtnText, { color: colors.success }]}>Saved</Text>
                      </>
                    ) : (
                      <>
                        <Feather name="download" size={13} color="#FFFFFF" />
                        <Text style={[styles.downloadBtnText, { color: '#FFFFFF' }]}>Download</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {filteredNotes.length === 0 && (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="file-document-outline" size={44} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Study Notes Found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery
                ? `No study materials matched "${searchQuery}".`
                : 'No notes have been uploaded for the selected subject yet.'}
            </Text>
            {isFacultyOrAdmin && (
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: '#10B981' }]}
                onPress={() => setUploadModalVisible(true)}
                activeOpacity={0.8}
              >
                <Feather name="upload-cloud" size={15} color="#FFFFFF" />
                <Text style={styles.emptyActionBtnText}>Upload First Material</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* =========================================================================
          UPLOAD STUDY MATERIAL MODAL (PARITY WITH WEB templates/prof/notes.html)
          ========================================================================= */}
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Upload Study Material</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Add lecture notes, unit syllabus or PPT presentations
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => setUploadModalVisible(false)}
              >
                <Feather name="x" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Note Title */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Note Title *</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text },
                  ]}
                  placeholder="e.g. Unit 3: Relational Calculus & Indexing"
                  placeholderTextColor={colors.textMuted}
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                />
              </View>

              {/* Subject Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Subject *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                  {AVAILABLE_SUBJECTS.map((sub) => {
                    const isSelected = selectedSubjectCode === sub.code;
                    return (
                      <TouchableOpacity
                        key={sub.code}
                        style={[
                          styles.subjectPickerPill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedSubjectCode(sub.code)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.subjectPickerText,
                            { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                          ]}
                        >
                          {sub.code} • {sub.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Document Format Presets */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Document Format *</Text>
                <View style={styles.fileTypeGrid}>
                  {FILE_TYPE_PRESETS.map((p) => {
                    const isSelected = fileType === p.ext;
                    return (
                      <TouchableOpacity
                        key={p.ext}
                        style={[
                          styles.fileTypeCard,
                          {
                            backgroundColor: isSelected ? colors.primarySubtle : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setFileType(p.ext)}
                        activeOpacity={0.7}
                      >
                        <Feather name={p.icon as any} size={15} color={isSelected ? colors.primary : colors.textSecondary} />
                        <Text
                          style={[
                            styles.fileTypeCardText,
                            { color: isSelected ? colors.primary : colors.textSecondary },
                          ]}
                        >
                          {p.ext}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Custom File Name (Optional) */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>File Attachment Name (Optional)</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text },
                  ]}
                  placeholder="e.g. DBMS_Unit3_Notes"
                  placeholderTextColor={colors.textMuted}
                  value={customFileName}
                  onChangeText={setCustomFileName}
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Description & Learning Outcomes</Text>
                <TextInput
                  style={[
                    styles.formTextArea,
                    { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text },
                  ]}
                  placeholder="Brief description of chapters covered, numerical questions, or lab guidelines..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  value={noteDescription}
                  onChangeText={setNoteDescription}
                />
              </View>
            </ScrollView>

            {/* Upload Button */}
            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                { backgroundColor: '#10B981', opacity: isSubmitting ? 0.7 : 1 },
              ]}
              onPress={handleUploadSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              <Feather name="upload-cloud" size={17} color="#FFFFFF" />
              <Text style={styles.modalSubmitBtnText}>
                {isSubmitting ? 'Uploading Material...' : 'Publish Study Material'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pageSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  headerUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  headerUploadBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filterScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contentContainer: {
    padding: 14,
    paddingBottom: 40,
  },
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    elevation: 2,
  },
  uploadBannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  uploadBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    marginTop: 1,
  },
  noteCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  semBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  semBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  myTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  myTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '500',
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  noteDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  fileLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  fileIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 12,
    fontWeight: '700',
  },
  subjectSubName: {
    fontSize: 10,
    marginTop: 1,
  },
  fileSizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fileSizeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  profRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    paddingRight: 8,
  },
  profName: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  downloadBtnText: {
    fontSize: 11,
    fontWeight: '700',
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
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 18,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeModalBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  formInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  formTextArea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  subjectPickerPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  subjectPickerText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fileTypeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  fileTypeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  fileTypeCardText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 14,
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

