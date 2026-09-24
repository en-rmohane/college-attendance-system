import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

interface LibraryScreenProps {
  navigation?: any;
  route?: any;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const userRole = user?.role || 'student';
  const isLibrarian = userRole === 'librarian' || userRole === 'assistant_librarian';
  const isAdmin = userRole === 'admin';
  const isAccountant = userRole === 'accountant';
  const isStaffOrAdmin = isLibrarian || isAdmin || isAccountant;
  const isStudentOrFaculty = userRole === 'student' || userRole === 'professor' || userRole === 'faculty';

  // Active Tab
  const defaultTab = isLibrarian ? 'dashboard' : (isAccountant ? 'members' : (isAdmin ? 'overview' : 'my_books'));
  const [activeTab, setActiveTab] = useState<string>(route?.params?.initialTab || defaultTab);

  // Barcode & QR Scanner Simulator Modal State
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'counter_member' | 'counter_copy' | 'catalog_search' | 'member_lookup'>('catalog_search');
  const [scannerMode, setScannerMode] = useState<'barcode' | 'qr'>('barcode');
  const [scannerFlashlight, setScannerFlashlight] = useState(false);
  const [customScanInput, setCustomScanInput] = useState('');
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scannerVisible) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [scannerVisible]);

  const openScanner = (target: 'counter_member' | 'counter_copy' | 'catalog_search' | 'member_lookup') => {
    setScannerTarget(target);
    setCustomScanInput('');
    setScannerMode(target === 'counter_copy' || target === 'catalog_search' ? 'barcode' : 'qr');
    setScannerVisible(true);
  };

  const handleScanResult = (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;
    setScannerVisible(false);

    if (scannerTarget === 'counter_member') {
      setCounterMemberInput(cleanCode);
      handleCounterLookup(cleanCode);
    } else if (scannerTarget === 'counter_copy') {
      setCounterCopyInput(cleanCode);
      handleBookLookup(cleanCode);
    } else if (scannerTarget === 'catalog_search') {
      setSearchQuery(cleanCode);
    } else if (scannerTarget === 'member_lookup') {
      setMemberSearchQuery(cleanCode);
      fetchMemberDossier(cleanCode);
    }
  };

  // Loading & Data States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [myLibrary, setMyLibrary] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [booksList, setBooksList] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);
  const [overdueList, setOverdueList] = useState<any[]>([]);
  const [finesList, setFinesList] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Counter State
  const [counterMemberInput, setCounterMemberInput] = useState('');
  const [counterCopyInput, setCounterCopyInput] = useState('');
  const [counterCondition, setCounterCondition] = useState('Good');
  const [counterRemarks, setCounterRemarks] = useState('');
  const [counterWaiveFine, setCounterWaiveFine] = useState(false);
  const [counterProcessing, setCounterProcessing] = useState(false);

  // Member Lookup & Dossier States
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberFilterDept, setMemberFilterDept] = useState('ALL');
  const [selectedMemberDossier, setSelectedMemberDossier] = useState<any>(null);
  const [memberDossierLoading, setMemberDossierLoading] = useState(false);
  const [memberModalTab, setMemberModalTab] = useState<'active_loans' | 'history' | 'reservations_dues'>('active_loans');
  const [counterStudentSnapshot, setCounterStudentSnapshot] = useState<any>(null);
  const [counterSearchingStudent, setCounterSearchingStudent] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberModalVisible, setMemberModalVisible] = useState(false);

  // Selected Book Detail Modal
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [extraCopiesCount, setExtraCopiesCount] = useState('1');

  // Barcode Batch Generator States
  const [barcodeModalVisible, setBarcodeModalVisible] = useState(false);
  const [batchBarcodeCount, setBatchBarcodeCount] = useState('10');
  const [generatedBarcodesList, setGeneratedBarcodesList] = useState<any[]>([]);
  const [generatingBarcodes, setGeneratingBarcodes] = useState(false);

  // Live Counter Book Lookup State
  const [counterBookSnapshot, setCounterBookSnapshot] = useState<any>(null);
  const [counterSearchingBook, setCounterSearchingBook] = useState(false);

  // Add Book Modal
  const [addBookModalVisible, setAddBookModalVisible] = useState(false);
  const [newBookBarcode, setNewBookBarcode] = useState('');
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookISBN, setNewBookISBN] = useState('');
  const [newBookPublisher, setNewBookPublisher] = useState('');
  const [newBookDept, setNewBookDept] = useState('CSE');
  const [newBookShelf, setNewBookShelf] = useState('Shelf A1');
  const [newBookRack, setNewBookRack] = useState('Rack 1');
  const [newBookPrice, setNewBookPrice] = useState('750');
  const [newBookCopies, setNewBookCopies] = useState('5');
  const [newBookCategory, setNewBookCategory] = useState<any>(null);

  // Issue Slip & Return Receipt Modal
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptType, setReceiptType] = useState<'issue' | 'return'>('issue');

  // Fine Waiver Modal
  const [waiverModalVisible, setWaiverModalVisible] = useState(false);
  const [selectedFine, setSelectedFine] = useState<any>(null);
  const [waiverReason, setWaiverReason] = useState('');

  // Fetch Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const studentRoll = user?.roll || user?.student_roll || user?.username;
      const res = await api.getLibraryDashboard(userRole, studentRoll, user?.id);

      if (res?.success) {
        setMetrics(res.metrics || null);
        setCategories(res.categories || []);
        let myLib = res.my_library || null;
        if (!myLib && studentRoll) {
          const directProfile = await api.getLibraryMemberProfile(studentRoll);
          if (directProfile?.success && directProfile.member) {
            myLib = directProfile;
          }
        }
        setMyLibrary(myLib);
        setRecentActivity(res.recent_activity || []);
      } else if (studentRoll) {
        const directProfile = await api.getLibraryMemberProfile(studentRoll);
        if (directProfile?.success && directProfile.member) {
          setMyLibrary(directProfile);
        }
      }

      // Load books
      const bRes = await api.getLibraryBooks({ search: searchQuery, category_id: selectedCategory, department: selectedDept });
      if (bRes?.success) setBooksList(bRes.books || []);

      if (isLibrarian || isAdmin || isAccountant) {
        const memRes = await api.getLibraryMembers();
        if (memRes?.success) setMembersList(memRes.members || []);

        const ovRes = await api.getLibraryOverdueReport();
        if (ovRes?.success) setOverdueList(ovRes.overdue_books || []);

        const fRes = await api.getLibraryFines('all');
        if (fRes?.success) setFinesList(fRes.fines || []);

        const aRes = await api.getLibraryAuditLogs(20);
        if (aRes?.success) setAuditLogs(aRes.logs || []);
      }
    } catch (e) {
      console.log('Error loading library data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, userRole, isLibrarian, isAdmin, isAccountant, searchQuery, selectedCategory, selectedDept]);

  // ==================== MEMBER DOSSIER LOOKUP ====================

  const fetchMemberDossier = async (identifier: string) => {
    if (!identifier) return;
    setMemberDossierLoading(true);
    setMemberModalVisible(true);
    try {
      const res = await api.getLibraryMemberProfile(identifier.trim());
      if (res?.success) {
        setSelectedMemberDossier(res);
      } else {
        Alert.alert('Not Found', res?.error || 'Student not found in Library database');
        setMemberModalVisible(false);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not fetch student library records');
      setMemberModalVisible(false);
    } finally {
      setMemberDossierLoading(false);
    }
  };

  const handleCounterLookup = async (roll: string) => {
    if (!roll.trim()) {
      setCounterStudentSnapshot(null);
      return;
    }
    setCounterSearchingStudent(true);
    try {
      const res = await api.getLibraryMemberProfile(roll.trim());
      if (res?.success) {
        setCounterStudentSnapshot(res);
      } else {
        setCounterStudentSnapshot(null);
      }
    } catch {
      setCounterStudentSnapshot(null);
    } finally {
      setCounterSearchingStudent(false);
    }
  };

  const handleBookLookup = async (code: string) => {
    if (!code.trim()) {
      setCounterBookSnapshot(null);
      return;
    }
    setCounterSearchingBook(true);
    try {
      const res = await api.getLibraryCopies(code.trim());
      if (res?.success && res.copies && res.copies.length > 0) {
        setCounterBookSnapshot(res.copies[0]);
      } else {
        const bRes = await api.getLibraryBooks({ search: code.trim() });
        if (bRes?.success && bRes.books && bRes.books.length > 0) {
          const matched = bRes.books[0];
          setCounterBookSnapshot({
            accession_no: code.trim().toUpperCase(),
            book_id: matched.id,
            title: matched.title,
            author: matched.author,
            shelf_location: `${matched.shelf || 'Shelf A1'} / ${matched.rack || 'Rack 1'}`,
            status: matched.available_copies > 0 ? 'Available' : 'Issued',
            price: matched.price || 500,
            available_copies: matched.available_copies,
            total_copies: matched.total_copies,
          });
        } else {
          setCounterBookSnapshot(null);
        }
      }
    } catch {
      setCounterBookSnapshot(null);
    } finally {
      setCounterSearchingBook(false);
    }
  };

  const handleGenerateBatchBarcodes = async (countNum: number) => {
    setGeneratingBarcodes(true);
    try {
      const res = await api.generateLibraryBarcodes(countNum);
      if (res?.success && res.barcodes) {
        setGeneratedBarcodesList(res.barcodes);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not generate barcodes');
    } finally {
      setGeneratingBarcodes(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ==================== ACTIONS ====================

  const handleIssueBook = async () => {
    if (!counterMemberInput.trim() || !counterCopyInput.trim()) {
      Alert.alert('Required', 'Please enter or scan both Member Roll/ID and Book Accession/Barcode');
      return;
    }
    setCounterProcessing(true);
    try {
      const res = await api.issueLibraryBook({
        member_identifier: counterMemberInput.trim(),
        copy_identifier: counterCopyInput.trim(),
        user_id: user?.id,
        remarks: counterRemarks.trim() || undefined,
      });

      if (res?.success) {
        setReceiptData(res.receipt);
        setReceiptType('issue');
        setReceiptModalVisible(true);
        setCounterMemberInput('');
        setCounterCopyInput('');
        setCounterRemarks('');
        loadData();
      } else {
        Alert.alert('Issue Failed', res?.error || 'Could not issue book');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Issue failed');
    } finally {
      setCounterProcessing(false);
    }
  };

  const handleDirectReturn = (item: { issue_id?: number; accession_no?: string; title?: string; member_roll?: string }) => {
    const identifier = item.accession_no || (item.issue_id ? String(item.issue_id) : '');
    const title = item.title || item.accession_no || 'this book';

    Alert.alert(
      'Confirm Book Return',
      `Return "${title}" (Acc: ${item.accession_no || item.issue_id})?\n\nThe book will be cleared from active borrowings and archived to student history.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Return',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await api.returnLibraryBook({
                copy_identifier: identifier,
                user_id: user?.id,
                condition: 'Good',
              });

              if (res?.success) {
                setReceiptData(res.receipt);
                setReceiptType('return');
                setReceiptModalVisible(true);

                // Reload all system data
                await loadData();

                // If counter student lookup is active, refresh it immediately
                if (counterMemberInput.trim()) {
                  await handleCounterLookup(counterMemberInput.trim());
                } else if (item.member_roll) {
                  await handleCounterLookup(item.member_roll);
                }

                // If dossier modal is open, refresh it immediately
                const targetRoll = item.member_roll || selectedMemberDossier?.member?.roll || selectedMemberDossier?.member?.member_code;
                if (targetRoll && memberModalVisible) {
                  const dosRes = await api.getLibraryMemberProfile(targetRoll);
                  if (dosRes?.success) setSelectedMemberDossier(dosRes);
                }
              } else {
                Alert.alert('Return Failed', res?.error || 'Could not return book');
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Return failed');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReturnBook = async () => {
    if (!counterCopyInput.trim()) {
      Alert.alert('Required', 'Please enter or scan Book Accession Number or Barcode to return');
      return;
    }
    setCounterProcessing(true);
    try {
      const res = await api.returnLibraryBook({
        copy_identifier: counterCopyInput.trim(),
        user_id: user?.id,
        condition: counterCondition,
        remarks: counterRemarks.trim() || undefined,
        waive_late_fine: counterWaiveFine,
      });

      if (res?.success) {
        setReceiptData(res.receipt);
        setReceiptType('return');
        setReceiptModalVisible(true);
        setCounterCopyInput('');
        setCounterRemarks('');
        setCounterWaiveFine(false);

        // Instant refresh of library state & counter student snapshot
        await loadData();
        if (counterMemberInput.trim()) {
          await handleCounterLookup(counterMemberInput.trim());
        }
      } else {
        Alert.alert('Return Failed', res?.error || 'Could not return book');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Return failed');
    } finally {
      setCounterProcessing(false);
    }
  };

  const handleAddBookSubmit = async () => {
    if (!newBookTitle.trim() || !newBookAuthor.trim()) {
      Alert.alert('Required', 'Please enter at least Book Title and Author');
      return;
    }
    try {
      setLoading(true);
      const res = await api.addLibraryBook({
        title: newBookTitle.trim(),
        author: newBookAuthor.trim(),
        isbn: newBookISBN.trim() || undefined,
        publisher: newBookPublisher.trim() || undefined,
        department: newBookDept,
        shelf: newBookShelf,
        rack: newBookRack,
        price: parseFloat(newBookPrice) || 500,
        total_copies: parseInt(newBookCopies) || 1,
        barcode: newBookBarcode.trim() || undefined,
        category_id: newBookCategory?.id || (categories[0]?.id || 1),
        user_id: user?.id,
      });

      if (res?.success) {
        Alert.alert(
          'Book Registered 🎉',
          `"${newBookTitle}" has been registered in the catalog with Barcode: ${newBookBarcode || 'Auto-generated'}`
        );
        setAddBookModalVisible(false);
        loadData();
      } else {
        Alert.alert('Failed', res?.error || 'Could not add book');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewBook = async (issueId: number) => {
    Alert.alert('Confirm Renewal', 'Are you sure you want to renew this loan period?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Renew Now',
        onPress: async () => {
          try {
            const res = await api.renewLibraryBook({ issue_id: issueId, user_id: user?.id });
            if (res?.success) {
              Alert.alert('Renewed', res.message || 'Book renewed successfully');
              loadData();
            } else {
              Alert.alert('Renewal Failed', res?.error || 'Could not renew');
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleReserveBook = async (bookId: number) => {
    const studentRoll = user?.roll || user?.student_roll || user?.username;
    if (!studentRoll) {
      Alert.alert('Error', 'User identifier not found');
      return;
    }
    Alert.alert('Reserve Book', 'Do you want to reserve this book copy when it becomes available?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reserve Now',
        onPress: async () => {
          try {
            const res = await api.reserveLibraryBook({
              member_identifier: studentRoll,
              book_id: bookId,
              user_id: user?.id,
            });
            if (res?.success) {
              Alert.alert('Reserved!', res.message || 'Reservation placed successfully');
              loadData();
            } else {
              Alert.alert('Reservation Failed', res?.error || 'Could not place reservation');
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleCancelReservation = async (reservationId: number) => {
    Alert.alert('Cancel Reservation', 'Are you sure you want to cancel this reservation?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.cancelLibraryReservation(reservationId, user?.id);
            if (res?.success) {
              Alert.alert('Cancelled', 'Reservation cancelled');
              loadData();
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleAddBookSubmit = async () => {
    if (!newBookTitle.trim() || !newBookAuthor.trim()) {
      Alert.alert('Required', 'Title and Author are required');
      return;
    }
    try {
      const res = await api.addLibraryBook({
        title: newBookTitle.trim(),
        author: newBookAuthor.trim(),
        isbn: newBookISBN.trim() || undefined,
        publisher: newBookPublisher.trim() || undefined,
        department: newBookDept,
        shelf: newBookShelf,
        rack: newBookRack,
        price: parseFloat(newBookPrice) || 500,
        copies_count: parseInt(newBookCopies, 10) || 1,
        category_id: newBookCategory?.id || (categories[0]?.id || 1),
        user_id: user?.id,
      });

      if (res?.success) {
        Alert.alert('Success', res.message || 'Book added with copies');
        setAddBookModalVisible(false);
        setNewBookTitle('');
        setNewBookAuthor('');
        setNewBookISBN('');
        loadData();
      } else {
        Alert.alert('Failed', res?.error || 'Could not add book');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleAddExtraCopies = async () => {
    if (!selectedBook) return;
    const count = parseInt(extraCopiesCount, 10) || 1;
    try {
      const res = await api.addExtraBookCopies(selectedBook.id, count, 'New', user?.id);
      if (res?.success) {
        Alert.alert('Success', res.message || 'Added extra physical copies');
        setBookModalVisible(false);
        loadData();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleWaiveFineSubmit = async () => {
    if (!selectedFine) return;
    if (!waiverReason.trim()) {
      Alert.alert('Required', 'Please enter a valid waiver justification');
      return;
    }
    try {
      const res = await api.waiveLibraryFine(selectedFine.id, waiverReason.trim(), user?.id);
      if (res?.success) {
        Alert.alert('Fine Waived', res.message || 'Fine successfully waived');
        setWaiverModalVisible(false);
        setWaiverReason('');
        loadData();
      } else {
        Alert.alert('Failed', res?.error || 'Could not waive fine');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handlePayFine = async (fine: any) => {
    Alert.alert('Collect Fine', `Record cash collection of ₹${fine.balance_amount.toFixed(2)} for ${fine.member_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm Cash Receipt',
        onPress: async () => {
          try {
            const res = await api.payLibraryFine(fine.id, fine.balance_amount, 'Cash');
            if (res?.success) {
              Alert.alert('Payment Recorded', `Receipt #${res.receipt_no} generated.`);
              loadData();
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  // ==================== SUB-RENDERERS ====================

  const renderRoleTabs = () => {
    let tabs: { id: string; label: string; icon: any }[] = [];

    if (isLibrarian) {
      tabs = [
        { id: 'dashboard', label: 'Overview', icon: 'grid-outline' },
        { id: 'counter', label: 'Counter Desk', icon: 'swap-horizontal-outline' },
        { id: 'catalog', label: 'Book Catalog', icon: 'book-outline' },
        { id: 'members', label: 'Members', icon: 'people-outline' },
        { id: 'overdue_fines', label: 'Overdue & Fines', icon: 'alert-circle-outline' },
        { id: 'reports_audit', label: 'Reports & Logs', icon: 'bar-chart-outline' },
      ];
    } else if (isAccountant) {
      tabs = [
        { id: 'members', label: 'Student Dues & Clearance', icon: 'people-outline' },
        { id: 'overdue_fines', label: 'Overdue & Fines', icon: 'alert-circle-outline' },
        { id: 'catalog', label: 'Book Catalog & Scan', icon: 'book-outline' },
        { id: 'counter', label: 'Circulation Desk', icon: 'swap-horizontal-outline' },
        { id: 'overview', label: 'Library KPIs', icon: 'stats-chart-outline' },
      ];
    } else if (isAdmin) {
      tabs = [
        { id: 'overview', label: 'Overview', icon: 'stats-chart-outline' },
        { id: 'catalog', label: 'Catalog', icon: 'book-outline' },
        { id: 'members', label: 'Members', icon: 'people-outline' },
        { id: 'overdue_fines', label: 'Overdue & Dues', icon: 'alert-circle-outline' },
        { id: 'reports_audit', label: 'Audit Logs', icon: 'shield-checkmark-outline' },
      ];
    } else {
      // Student & Faculty
      tabs = [
        { id: 'my_books', label: 'My Borrowings', icon: 'bookmark-outline' },
        { id: 'browse', label: 'Browse Catalog', icon: 'search-outline' },
        { id: 'reservations', label: 'Reservations', icon: 'time-outline' },
        { id: 'history', label: 'History & Fines', icon: 'receipt-outline' },
      ];
    }

    return (
      <View style={[styles.tabBarContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {tabs.map((t) => {
            const isSelected = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setActiveTab(t.id)}
                style={[
                  styles.tabPill,
                  isSelected && { backgroundColor: colors.primarySubtle, borderColor: colors.primary },
                ]}
              >
                <Ionicons
                  name={t.icon}
                  size={16}
                  color={isSelected ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabPillText,
                    { color: isSelected ? colors.primary : colors.textSecondary },
                    isSelected && { fontWeight: '700' },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // --- 1. LIBRARIAN / ADMIN DASHBOARD OVERVIEW ---
  const renderDashboardTab = () => (
    <View style={styles.sectionContainer}>
      {/* KPI Cards */}
      <View style={styles.metricsGrid}>
        <View style={[styles.kpiCard, { backgroundColor: colors.softBlue, borderColor: '#D0E1FD' }]}>
          <View style={styles.kpiIconRow}>
            <Text style={[styles.kpiTitle, { color: '#2C5282' }]}>Total Books</Text>
            <Ionicons name="book" size={20} color="#3182CE" />
          </View>
          <Text style={[styles.kpiValue, { color: '#1A365D' }]}>{metrics?.total_books || 0}</Text>
          <Text style={[styles.kpiSub, { color: '#4A5568' }]}>{metrics?.total_copies || 0} Total Physical Copies</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.softGreen, borderColor: '#C6F6D5' }]}>
          <View style={styles.kpiIconRow}>
            <Text style={[styles.kpiTitle, { color: '#22543D' }]}>Available</Text>
            <Ionicons name="checkmark-circle" size={20} color="#38A169" />
          </View>
          <Text style={[styles.kpiValue, { color: '#1C4532' }]}>{metrics?.available_copies || 0}</Text>
          <Text style={[styles.kpiSub, { color: '#4A5568' }]}>Ready on Shelves</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.softLavender, borderColor: '#E9D8FD' }]}>
          <View style={styles.kpiIconRow}>
            <Text style={[styles.kpiTitle, { color: '#553C9A' }]}>Issued Out</Text>
            <Ionicons name="swap-horizontal" size={20} color="#805AD5" />
          </View>
          <Text style={[styles.kpiValue, { color: '#44337A' }]}>{metrics?.issued_copies || 0}</Text>
          <Text style={[styles.kpiSub, { color: '#4A5568' }]}>{metrics?.active_members || 0} Active Members</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.softPeach, borderColor: '#FED7D7' }]}>
          <View style={styles.kpiIconRow}>
            <Text style={[styles.kpiTitle, { color: '#9B2C2C' }]}>Overdue Books</Text>
            <Ionicons name="alert-circle" size={20} color="#E53E3E" />
          </View>
          <Text style={[styles.kpiValue, { color: '#742A2A' }]}>{metrics?.overdue_issues || 0}</Text>
          <Text style={[styles.kpiSub, { color: '#4A5568' }]}>{metrics?.due_today || 0} Due Today</Text>
        </View>
      </View>

      {/* Today's Activity Strip */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Today's Circulation Activity</Text>
        <View style={styles.activityRow}>
          <View style={styles.activityItem}>
            <Text style={[styles.activityNum, { color: colors.primary }]}>{metrics?.issued_today || 0}</Text>
            <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Issued Today</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={[styles.activityNum, { color: colors.green }]}>{metrics?.returned_today || 0}</Text>
            <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Returned</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={[styles.activityNum, { color: colors.purple }]}>{metrics?.renewed_today || 0}</Text>
            <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Renewed</Text>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <Text style={[styles.activityNum, { color: colors.amber }]}>₹{metrics?.total_outstanding_fines || 0}</Text>
            <Text style={[styles.activityLabel, { color: colors.textSecondary }]}>Pending Dues</Text>
          </View>
        </View>
      </View>

      {/* Librarian Quick Workflow Actions */}
      {isLibrarian && (
        <View style={{ gap: 10, marginTop: 10 }}>
          <TouchableOpacity
            onPress={() => setActiveTab('counter')}
            style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="swap-horizontal" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryActionBtnText}>Open Circulation Counter (Scan Issue / Return)</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => {
                handleGenerateBatchBarcodes(Number(batchBarcodeCount) || 10);
                setBarcodeModalVisible(true);
              }}
              style={[
                styles.primaryActionBtn,
                { flex: 1, backgroundColor: colors.purple, paddingVertical: 10, marginTop: 0 },
              ]}
            >
              <Ionicons name="barcode-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={[styles.primaryActionBtnText, { fontSize: 12 }]}>Generate Book Barcodes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setNewBookBarcode('');
                setNewBookTitle('');
                setNewBookAuthor('');
                setNewBookISBN('');
                setNewBookPublisher('');
                setNewBookDept('CSE');
                setNewBookShelf('Shelf A1');
                setNewBookRack('Rack 1');
                setNewBookPrice('500');
                setNewBookCopies('1');
                setAddBookModalVisible(true);
              }}
              style={[
                styles.primaryActionBtn,
                { flex: 1, backgroundColor: colors.green, paddingVertical: 10, marginTop: 0 },
              ]}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={[styles.primaryActionBtnText, { fontSize: 12 }]}>+ Register Book with Barcode</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Recent Activity Table */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Recent Circulation Transactions</Text>
        {recentActivity.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No circulation activity recorded yet today.</Text>
        ) : (
          recentActivity.map((item, idx) => (
            <View key={idx} style={[styles.recentItemRow, { borderBottomColor: colors.borderLight }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recentBookTitle, { color: colors.text }]}>{item.book_title}</Text>
                <Text style={[styles.recentSub, { color: colors.textSecondary }]}>
                  {item.member_name} ({item.member_code}) • Acc: {item.accession_no}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View
                  style={[
                    styles.badgePill,
                    {
                      backgroundColor:
                        item.status === 'Issued' ? colors.softBlue : (item.status === 'Returned' ? colors.softGreen : colors.softPeach),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgePillText,
                      {
                        color:
                          item.status === 'Issued' ? colors.primary : (item.status === 'Returned' ? colors.green : colors.coral),
                      },
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
                <Text style={[styles.recentDate, { color: colors.textMuted }]}>Due: {item.due_date}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  // --- 2. LIBRARIAN COUNTER DESK (ISSUE / RETURN / RENEW) ---
  const renderCounterTab = () => (
    <View style={styles.sectionContainer}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="swap-horizontal" size={22} color={colors.primary} />
          <Text style={[styles.cardTitle, { color: colors.text, marginLeft: 8 }]}>Fast Circulation Counter</Text>
        </View>
        <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
          Enter student enrollment number to instantly view their issued books & dates.
        </Text>

        {/* Member Input with Search & QR Scanner Buttons */}
        <Text style={[styles.inputLabel, { color: colors.text }]}>Member Student Roll / Enrollment Number / ID *</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[styles.inputWrapper, { flex: 1, backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="e.g. 0545CS231001, 0101CS221001, or librarian"
              placeholderTextColor={colors.textMuted}
              value={counterMemberInput}
              onChangeText={(txt) => {
                setCounterMemberInput(txt);
                if (txt.length >= 6) {
                  handleCounterLookup(txt);
                } else if (txt.length === 0) {
                  setCounterStudentSnapshot(null);
                }
              }}
              style={[styles.textInput, { color: colors.text }]}
              autoCapitalize="characters"
            />
          </View>
          <TouchableOpacity
            onPress={() => handleCounterLookup(counterMemberInput)}
            style={[styles.lookupBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            {counterSearchingStudent ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name="search" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openScanner('counter_member')}
            style={[styles.lookupBtn, { backgroundColor: colors.purple }]}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Live Student Identity & Borrowed Books Card */}
        {counterStudentSnapshot && counterStudentSnapshot.member && (
          <View style={[styles.studentSnapshotCard, { backgroundColor: colors.softBlue, borderColor: `${colors.primary}40` }]}>
            <View style={styles.snapshotTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.snapshotName, { color: colors.text }]}>
                  {counterStudentSnapshot.member.name}
                </Text>
                <Text style={[styles.snapshotSub, { color: colors.textSecondary }]}>
                  Roll: <Text style={{ fontWeight: '700', color: colors.primary }}>{counterStudentSnapshot.member.roll || counterStudentSnapshot.member.member_code}</Text> • {counterStudentSnapshot.member.branch} (Sem {counterStudentSnapshot.member.semester || 3})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => fetchMemberDossier(counterStudentSnapshot.member.roll || counterStudentSnapshot.member.member_code)}
                style={[styles.snapshotDossierBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Ionicons name="document-text-outline" size={14} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.snapshotDossierBtnText}>Full Dossier</Text>
              </TouchableOpacity>
            </View>

            {/* Issued Books under this Student */}
            <View style={styles.snapshotBorrowSection}>
              <Text style={[styles.snapshotBorrowHeading, { color: colors.text }]}>
                Currently Borrowed Books ({counterStudentSnapshot.issued_count || counterStudentSnapshot.issued_books?.length || 0} of {counterStudentSnapshot.member.max_books || 4})
              </Text>

              {(!counterStudentSnapshot.issued_books || counterStudentSnapshot.issued_books.length === 0) ? (
                <Text style={[styles.snapshotEmptyText, { color: colors.textSecondary }]}>
                  No books currently borrowed. Student has full quota available.
                </Text>
              ) : (
                counterStudentSnapshot.issued_books.map((b: any, idx: number) => {
                  const isOverdue = b.is_overdue || (b.days_remaining !== undefined && b.days_remaining < 0);
                  return (
                    <View key={idx} style={[styles.snapshotBookItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.snapshotBookTitle, { color: colors.text }]} numberOfLines={1}>
                          {b.title}
                        </Text>
                        <Text style={[styles.snapshotBookMeta, { color: colors.textSecondary }]}>
                          Acc: <Text style={{ fontWeight: '700', color: colors.primary }}>{b.accession_no}</Text> • Issued: <Text style={{ fontWeight: '700', color: colors.text }}>{b.issue_date}</Text>
                        </Text>
                        <Text style={[styles.snapshotBookDue, { color: isOverdue ? colors.coral : colors.green }]}>
                          Due Date: {b.due_date} {isOverdue ? `(⚠️ Overdue)` : `(Active)`}
                        </Text>
                      </View>

                      <View style={{ gap: 4, alignItems: 'flex-end' }}>
                        <TouchableOpacity
                          onPress={() => handleDirectReturn({
                            issue_id: b.issue_id,
                            accession_no: b.accession_no,
                            title: b.title,
                            member_roll: counterStudentSnapshot?.member?.roll || counterStudentSnapshot?.member?.member_code || counterMemberInput,
                          })}
                          style={[styles.snapshotReturnBtn, { backgroundColor: colors.green }]}
                        >
                          <Ionicons name="arrow-down-circle-outline" size={12} color="#FFF" style={{ marginRight: 2 }} />
                          <Text style={styles.snapshotBtnText}>Return Now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRenewBook(b.issue_id)}
                          style={[styles.snapshotRenewBtn, { backgroundColor: colors.primarySubtle }]}
                        >
                          <Ionicons name="refresh" size={12} color={colors.primary} style={{ marginRight: 2 }} />
                          <Text style={[styles.snapshotBtnText, { color: colors.primary }]}>Renew</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* Book Copy Input */}
        <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Book Accession Number / Barcode *</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={[styles.inputWrapper, { flex: 1, backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
            <Ionicons name="barcode-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="e.g. LIB-BC-2026-0001, CS-0001-001"
              placeholderTextColor={colors.textMuted}
              value={counterCopyInput}
              onChangeText={(txt) => {
                setCounterCopyInput(txt);
                if (txt.length >= 3) {
                  handleBookLookup(txt);
                } else if (txt.length === 0) {
                  setCounterBookSnapshot(null);
                }
              }}
              style={[styles.textInput, { color: colors.text }]}
              autoCapitalize="characters"
            />
          </View>
          <TouchableOpacity
            onPress={() => handleBookLookup(counterCopyInput)}
            style={[styles.lookupBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            {counterSearchingBook ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name="search" size={18} color="#FFF" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openScanner('counter_copy')}
            style={[styles.lookupBtn, { backgroundColor: colors.teal }]}
            activeOpacity={0.8}
          >
            <Ionicons name="barcode-outline" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Live Book Details Snapshot Card */}
        {counterBookSnapshot && (
          <View style={[styles.studentSnapshotCard, { backgroundColor: colors.softGreen, borderColor: `${colors.green}40`, marginTop: 10 }]}>
            <View style={styles.snapshotTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.snapshotName, { color: colors.text }]}>
                  {counterBookSnapshot.title || 'Book Title'}
                </Text>
                <Text style={[styles.snapshotSub, { color: colors.textSecondary }]}>
                  By {counterBookSnapshot.author || 'Author'} • Shelf: <Text style={{ fontWeight: '700', color: colors.text }}>{counterBookSnapshot.shelf_location || `${counterBookSnapshot.shelf || 'Shelf A'} / ${counterBookSnapshot.rack || 'Rack 1'}`}</Text>
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 3 }}>
                  Barcode/Acc: <Text style={{ fontWeight: '800', color: colors.primary }}>{counterBookSnapshot.accession_no || counterCopyInput}</Text> • Price: ₹{counterBookSnapshot.price || 500}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View
                  style={[
                    styles.availBadge,
                    {
                      backgroundColor:
                        (counterBookSnapshot.available_copies > 0 || counterBookSnapshot.status === 'Available')
                          ? colors.softGreen
                          : colors.softPeach,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.availBadgeText,
                      {
                        color:
                          (counterBookSnapshot.available_copies > 0 || counterBookSnapshot.status === 'Available')
                            ? colors.green
                            : colors.coral,
                      },
                    ]}
                  >
                    {counterBookSnapshot.status || (counterBookSnapshot.available_copies > 0 ? 'AVAILABLE' : 'ISSUED')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Condition Selector for Returns */}
        <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Book Physical Condition (on Return)</Text>
        <View style={styles.pillRow}>
          {['Good', 'Fair', 'Damaged', 'Lost'].map((cond) => (
            <TouchableOpacity
              key={cond}
              onPress={() => setCounterCondition(cond)}
              style={[
                styles.smallPill,
                counterCondition === cond && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.smallPillText,
                  { color: counterCondition === cond ? '#FFF' : colors.textSecondary },
                ]}
              >
                {cond}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Waiver Checkbox on Return */}
        <TouchableOpacity
          onPress={() => setCounterWaiveFine(!counterWaiveFine)}
          style={styles.checkboxRow}
        >
          <Ionicons
            name={counterWaiveFine ? 'checkbox' : 'square-outline'}
            size={20}
            color={counterWaiveFine ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>Waive late fine on return (Librarian discretion)</Text>
        </TouchableOpacity>

        {/* Remarks */}
        <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Remarks / Notes (Optional)</Text>
        <TextInput
          placeholder="e.g. Issued for semester exam study"
          placeholderTextColor={colors.textMuted}
          value={counterRemarks}
          onChangeText={setCounterRemarks}
          style={[styles.textInputArea, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text }]}
        />

        {/* Action Buttons */}
        <View style={styles.actionBtnRow}>
          <TouchableOpacity
            onPress={handleIssueBook}
            disabled={counterProcessing}
            style={[styles.counterBtn, { backgroundColor: colors.primary }]}
          >
            {counterProcessing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="arrow-up-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.counterBtnText}>Issue Book</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReturnBook}
            disabled={counterProcessing}
            style={[styles.counterBtn, { backgroundColor: colors.green }]}
          >
            {counterProcessing ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="arrow-down-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.counterBtnText}>Return Book</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // --- 3. CATALOG BROWSER (COMMON & LIBRARIAN) ---
  const renderCatalogTab = () => (
    <View style={styles.sectionContainer}>
      {/* Search Bar & Action */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search by Title, Author, ISBN, Subject..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInputText, { color: colors.text }]}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => openScanner('catalog_search')}
          style={[styles.scanIconBtn, { backgroundColor: colors.softBlue, borderColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Ionicons name="barcode-outline" size={20} color={colors.primary} />
        </TouchableOpacity>

        {isLibrarian && (
          <TouchableOpacity
            onPress={() => setAddBookModalVisible(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => setSelectedCategory('all')}
          style={[
            styles.catPill,
            selectedCategory === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}
        >
          <Text style={[styles.catPillText, { color: selectedCategory === 'all' ? '#FFF' : colors.textSecondary }]}>
            All Categories
          </Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setSelectedCategory(c.id.toString())}
            style={[
              styles.catPill,
              selectedCategory === c.id.toString() && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.catPillText,
                { color: selectedCategory === c.id.toString() ? '#FFF' : colors.textSecondary },
              ]}
            >
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Books List */}
      {booksList.length === 0 ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', padding: 30 }]}>
          <Ionicons name="book-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.cardTitle, { color: colors.text, marginTop: 12 }]}>No Books Found</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
            Try changing search filters or add new titles to the central catalog.
          </Text>
        </View>
      ) : (
        booksList.map((book) => {
          const isAvailable = book.available_copies > 0;
          return (
            <TouchableOpacity
              key={book.id}
              onPress={() => {
                setSelectedBook(book);
                setBookModalVisible(true);
              }}
              style={[styles.bookCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.bookCoverThumb, { backgroundColor: colors.softBlue }]}>
                <Ionicons name="book" size={28} color={colors.primary} />
                <Text style={styles.bookCodeThumb}>{book.book_code}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={2}>
                  {book.title}
                </Text>
                <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>By {book.author}</Text>
                <Text style={[styles.bookMeta, { color: colors.textMuted }]}>
                  {book.department} • {book.edition || '1st Ed'} • {book.shelf} / {book.rack}
                </Text>

                <View style={styles.bookBottomRow}>
                  <View
                    style={[
                      styles.availBadge,
                      { backgroundColor: isAvailable ? colors.softGreen : colors.softPeach },
                    ]}
                  >
                    <Ionicons
                      name={isAvailable ? 'checkmark-circle' : 'close-circle'}
                      size={12}
                      color={isAvailable ? colors.green : colors.coral}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.availBadgeText, { color: isAvailable ? colors.green : colors.coral }]}>
                      {book.available_copies} of {book.total_copies} Available
                    </Text>
                  </View>

                  {!isLibrarian && (
                    <TouchableOpacity
                      onPress={() => handleReserveBook(book.id)}
                      style={[styles.smallActionBtn, { backgroundColor: colors.primarySubtle }]}
                    >
                      <Text style={[styles.smallActionBtnText, { color: colors.primary }]}>Reserve</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  // --- 4. STUDENT / FACULTY "MY BORROWINGS" ---
  const renderMyBooksTab = () => {
    const issuedBooks = myLibrary?.issued_books || [];
    return (
      <View style={styles.sectionContainer}>
        {/* Personal Summary Strip */}
        <View style={styles.metricsGrid}>
          <View style={[styles.kpiCard, { backgroundColor: colors.softBlue, borderColor: '#D0E1FD' }]}>
            <Text style={[styles.kpiTitle, { color: '#2C5282' }]}>Currently Borrowed</Text>
            <Text style={[styles.kpiValue, { color: '#1A365D' }]}>{myLibrary?.issued_count || 0}</Text>
            <Text style={[styles.kpiSub, { color: '#4A5568' }]}>Max Limit: {myLibrary?.member?.max_books || 3} Books</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.softYellow, borderColor: '#FEFCBF' }]}>
            <Text style={[styles.kpiTitle, { color: '#744210' }]}>Due Soon (≤2 Days)</Text>
            <Text style={[styles.kpiValue, { color: '#744210' }]}>{myLibrary?.due_soon_count || 0}</Text>
            <Text style={[styles.kpiSub, { color: '#4A5568' }]}>Please return or renew</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.softPeach, borderColor: '#FED7D7' }]}>
            <Text style={[styles.kpiTitle, { color: '#9B2C2C' }]}>Overdue Books</Text>
            <Text style={[styles.kpiValue, { color: '#742A2A' }]}>{myLibrary?.overdue_count || 0}</Text>
            <Text style={[styles.kpiSub, { color: '#4A5568' }]}>Fine ₹5/day</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.softGreen, borderColor: '#C6F6D5' }]}>
            <Text style={[styles.kpiTitle, { color: '#22543D' }]}>Outstanding Fine</Text>
            <Text style={[styles.kpiValue, { color: '#1C4532' }]}>₹{myLibrary?.outstanding_fine || 0}</Text>
            <Text style={[styles.kpiSub, { color: '#4A5568' }]}>Account: {myLibrary?.member?.status || 'Active'}</Text>
          </View>
        </View>

        {/* Issued Books Cards */}
        <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 16 }]}>My Active Book Loans</Text>
        {issuedBooks.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', padding: 30 }]}>
            <Ionicons name="bookmark-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 12 }]}>No Active Borrowings</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
              Browse the library catalog to explore and borrow textbooks for your semester.
            </Text>
          </View>
        ) : (
          issuedBooks.map((item: any) => {
            const isOverdue = item.is_overdue;
            const isDueSoon = item.is_due_soon;
            return (
              <View
                key={item.issue_id}
                style={[
                  styles.borrowedCard,
                  { backgroundColor: colors.card, borderColor: isOverdue ? colors.coral : colors.border },
                ]}
              >
                <View style={styles.borrowedTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bookTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>By {item.author}</Text>
                    <Text style={[styles.bookMeta, { color: colors.textMuted }]}>
                      Acc No: {item.accession_no} • {item.shelf_location}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.dueBadge,
                      {
                        backgroundColor: isOverdue ? colors.softPeach : (isDueSoon ? colors.softYellow : colors.softGreen),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dueBadgeText,
                        {
                          color: isOverdue ? colors.coral : (isDueSoon ? colors.amber : colors.green),
                        },
                      ]}
                    >
                      {isOverdue
                        ? `${Math.abs(item.days_remaining)}d Overdue`
                        : `${item.days_remaining}d Remaining`}
                    </Text>
                  </View>
                </View>

                <View style={styles.datesRow}>
                  <Text style={[styles.dateSub, { color: colors.textSecondary }]}>Issued: {item.issue_date}</Text>
                  <Text style={[styles.dateSub, { color: isOverdue ? colors.coral : colors.text }]}>
                    Due Date: <Text style={{ fontWeight: '700' }}>{item.due_date}</Text>
                  </Text>
                </View>

                {/* Action */}
                <View style={styles.borrowedActionRow}>
                  <Text style={[styles.renewCountText, { color: colors.textMuted }]}>
                    Renewals: {item.renew_count}/{item.max_renewals}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => handleDirectReturn({
                        issue_id: item.issue_id,
                        accession_no: item.accession_no,
                        title: item.title,
                        member_roll: user?.roll || user?.student_roll || user?.username,
                      })}
                      style={[styles.renewBtn, { backgroundColor: colors.softGreen, borderColor: colors.green, borderWidth: 1 }]}
                    >
                      <Ionicons name="arrow-down-circle-outline" size={14} color={colors.green} style={{ marginRight: 4 }} />
                      <Text style={[styles.renewBtnText, { color: colors.green, fontWeight: '700' }]}>Return Book</Text>
                    </TouchableOpacity>

                    {item.renew_count < item.max_renewals && (
                      <TouchableOpacity
                        onPress={() => handleRenewBook(item.issue_id)}
                        style={[styles.renewBtn, { backgroundColor: colors.primarySubtle }]}
                      >
                        <Ionicons name="refresh-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.renewBtnText, { color: colors.primary }]}>Request Renewal</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </View>
    );
  };

  // --- 4B. STUDENT RESERVATIONS TAB ---
  const renderReservationsTab = () => {
    const reservations = myLibrary?.reservations || [];
    return (
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionHeading, { color: colors.text }]}>My Book Reservations ({reservations.length})</Text>
        {reservations.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', padding: 30 }]}>
            <Ionicons name="time-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 12 }]}>No Active Reservations</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
              When a textbook is currently issued to another student, you can reserve it from the Browse Catalog tab.
            </Text>
          </View>
        ) : (
          reservations.map((r: any, idx: number) => (
            <View key={idx} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.bookTitle, { color: colors.text }]}>{r.title}</Text>
                <View style={[styles.badgePill, { backgroundColor: colors.softLavender }]}>
                  <Text style={[styles.badgePillText, { color: colors.purple }]}>Queue #{r.queue_position || 1}</Text>
                </View>
              </View>
              <Text style={[styles.bookAuthor, { color: colors.textSecondary, marginTop: 2 }]}>By {r.author}</Text>
              <Text style={[styles.bookMeta, { color: colors.textMuted, marginTop: 4 }]}>
                Status: <Text style={{ color: colors.green, fontWeight: '700' }}>{r.status}</Text> • Reserved on: {r.reservation_date}
              </Text>
              <TouchableOpacity
                onPress={() => handleCancelReservation(r.reservation_id)}
                style={[styles.smallActionBtn, { backgroundColor: colors.softPeach, alignSelf: 'flex-start', marginTop: 10 }]}
              >
                <Text style={[styles.smallActionBtnText, { color: colors.coral }]}>Cancel Reservation</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  };

  // --- 4C. STUDENT HISTORY & FINES TAB ---
  const renderHistoryTab = () => {
    const history = myLibrary?.history || [];
    const fines = myLibrary?.fines || [];
    return (
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Borrowing History ({history.length})</Text>
        {history.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', padding: 24, marginBottom: 16 }]}>
            <Ionicons name="receipt-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 8 }]}>No Returned History</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
              Completed book issues and returned transactions will be archived here.
            </Text>
          </View>
        ) : (
          history.map((h: any, idx: number) => (
            <View key={idx} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 8 }]}>
              <Text style={[styles.bookTitle, { color: colors.text }]}>{h.title}</Text>
              <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>By {h.author}</Text>
              <View style={[styles.datesRow, { marginTop: 6 }]}>
                <Text style={[styles.dateSub, { color: colors.textSecondary }]}>Issued: {h.issue_date}</Text>
                <Text style={[styles.dateSub, { color: colors.green, fontWeight: '700' }]}>Returned: {h.return_date}</Text>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 16 }]}>Fine Records & Dues</Text>
        {fines.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', padding: 20 }]}>
            <Ionicons name="checkmark-circle-outline" size={36} color={colors.green} />
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 6 }]}>No Dues Pending 🎉</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Your library account has zero outstanding fines.</Text>
          </View>
        ) : (
          fines.map((f: any, idx: number) => (
            <View key={idx} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.coral, marginBottom: 8 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[styles.bookTitle, { color: colors.text }]}>{f.fine_type || 'Late Return Fine'}</Text>
                <Text style={{ color: colors.coral, fontWeight: '800' }}>₹{f.balance_amount || f.amount}</Text>
              </View>
              <Text style={[styles.bookMeta, { color: colors.textSecondary, marginTop: 4 }]}>Status: {f.status}</Text>
            </View>
          ))
        )}
      </View>
    );
  };

  // --- 5. OVERDUE & FINES DESK (ADMIN / LIBRARIAN) ---
  const renderOverdueFinesTab = () => {
    const totalOverdue = overdueList.length;
    const criticalLate = overdueList.filter((o: any) => (o.days_overdue || 0) > 7).length;
    const totalFineDue = overdueList.reduce((acc: number, curr: any) => acc + (curr.accrued_fine || 0), 0);

    return (
      <View style={styles.sectionContainer}>
        {/* KPI Strip */}
        <View style={styles.metricsGrid}>
          <View style={[styles.kpiCard, { backgroundColor: colors.softPeach, borderColor: '#FED7D7' }]}>
            <Text style={[styles.kpiTitle, { color: '#9B2C2C' }]}>Overdue Borrowings</Text>
            <Text style={[styles.kpiValue, { color: '#742A2A' }]}>{totalOverdue}</Text>
            <Text style={[styles.kpiSub, { color: '#4A5568' }]}>Active Late Loans</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.softYellow, borderColor: '#FEFCBF' }]}>
            <Text style={[styles.kpiTitle, { color: '#744210' }]}>Critical Late (&gt;7 Days)</Text>
            <Text style={[styles.kpiValue, { color: '#744210' }]}>{criticalLate}</Text>
            <Text style={[styles.kpiSub, { color: '#4A5568' }]}>Requires Notice</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.softLavender, borderColor: '#E9D8FD' }]}>
            <Text style={[styles.kpiTitle, { color: '#553C9A' }]}>Accrued Late Dues</Text>
            <Text style={[styles.kpiValue, { color: '#44337A' }]}>₹{totalFineDue}</Text>
            <Text style={[styles.kpiSub, { color: '#4A5568' }]}>Fine at ₹5/day</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.softGreen, borderColor: '#C6F6D5' }]}>
            <Text style={[styles.kpiTitle, { color: '#22543D' }]}>Fee Desk Status</Text>
            <Text style={[styles.kpiValue, { color: '#1C4532' }]}>Synced</Text>
            <Text style={[styles.kpiSub, { color: '#4A5568' }]}>Accounts Linked</Text>
          </View>
        </View>

        {/* Section Header */}
        <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 12 }]}>
          Overdue Records & Defaulters ({totalOverdue})
        </Text>

        {/* Overdue Items */}
        {overdueList.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', padding: 32 }]}>
            <Ionicons name="checkmark-done-circle-outline" size={52} color={colors.green} />
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 12 }]}>Zero Overdue Borrowings 🎉</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
              All student and faculty book loans are currently within safe borrowing limits.
            </Text>
          </View>
        ) : (
          overdueList.map((item: any, idx: number) => (
            <View
              key={idx}
              style={[
                styles.overdueCard,
                { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: colors.coral, borderLeftWidth: 4 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.bookTitle, { color: colors.text }]}>{item.title}</Text>
                  <View style={[styles.badgePill, { backgroundColor: colors.softPeach }]}>
                    <Text style={[styles.badgePillText, { color: colors.coral }]}>
                      {item.days_overdue} Days Late
                    </Text>
                  </View>
                </View>

                <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>By {item.author}</Text>

                <TouchableOpacity
                  onPress={() => fetchMemberDossier(item.roll || item.member_code)}
                  activeOpacity={0.7}
                  style={{ marginTop: 4 }}
                >
                  <Text style={[styles.memberRollText, { color: colors.primary }]}>
                    👤 {item.member_name} ({item.roll || item.member_code}) • {item.branch}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.datesRow, { marginTop: 6 }]}>
                  <Text style={[styles.dateSub, { color: colors.textSecondary }]}>
                    Due: <Text style={{ color: colors.coral, fontWeight: '700' }}>{item.due_date}</Text>
                  </Text>
                  <Text style={[styles.dateSub, { color: colors.purple, fontWeight: '700' }]}>
                    Accrued Fine: ₹{item.accrued_fine}
                  </Text>
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleDirectReturn({
                      issue_id: item.issue_id,
                      accession_no: item.accession_no,
                      title: item.title,
                      member_roll: item.roll || item.member_code,
                    })}
                    style={[styles.smallBtn, { backgroundColor: colors.green, paddingVertical: 6 }]}
                  >
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Receive Return</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedFine({
                        id: item.issue_id,
                        member_name: item.member_name,
                        balance_amount: item.accrued_fine || 50,
                      });
                      setWaiverReason('');
                      setWaiverModalVisible(true);
                    }}
                    style={[styles.smallBtn, { backgroundColor: colors.softPeach, borderWidth: 1, borderColor: colors.coral, paddingVertical: 6 }]}
                  >
                    <Text style={{ color: colors.coral, fontSize: 11, fontWeight: '700' }}>Waive Fine</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    );
  };

  // --- 6. MEMBERS & STUDENTS DIRECTORY TAB (LIBRARIAN / ADMIN) ---
  const renderMembersTab = () => {
    const query = memberSearchQuery.trim().toLowerCase();
    const filteredMembers = membersList.filter((m) => {
      const matchSearch =
        !query ||
        m.name?.toLowerCase().includes(query) ||
        m.member_code?.toLowerCase().includes(query) ||
        m.roll?.toLowerCase().includes(query) ||
        m.branch?.toLowerCase().includes(query);

      const matchDept =
        memberFilterDept === 'ALL' ||
        (memberFilterDept === 'BORROWERS' && m.current_issued_count > 0) ||
        (memberFilterDept === 'OVERDUE' && m.outstanding_fine > 0) ||
        (m.branch?.toUpperCase().includes(memberFilterDept));

      return matchSearch && matchDept;
    });

    return (
      <View style={styles.sectionContainer}>
        {/* Search & Lookup Bar with QR Scanner */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <View style={[styles.searchBar, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search by Enrollment Roll No (0545CS...), Name, Branch..."
              placeholderTextColor={colors.textMuted}
              value={memberSearchQuery}
              onChangeText={setMemberSearchQuery}
              style={[styles.searchInputText, { color: colors.text }]}
              autoCapitalize="characters"
            />
            {memberSearchQuery ? (
              <TouchableOpacity onPress={() => setMemberSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => openScanner('member_lookup')}
            style={[styles.scanIconBtn, { backgroundColor: colors.softLavender, borderColor: colors.purple }]}
            activeOpacity={0.8}
          >
            <Ionicons name="qr-code-outline" size={20} color={colors.purple} />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['ALL', 'CSE', 'AD', 'BORROWERS', 'OVERDUE'].map((dept) => (
            <TouchableOpacity
              key={dept}
              onPress={() => setMemberFilterDept(dept)}
              style={[
                styles.catPill,
                memberFilterDept === dept && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.catPillText, { color: memberFilterDept === dept ? '#FFF' : colors.textSecondary }]}>
                {dept === 'ALL' ? 'All Members' : dept === 'BORROWERS' ? 'Active Loans' : dept === 'OVERDUE' ? 'With Dues' : dept}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Member Cards */}
        {filteredMembers.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', padding: 30 }]}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 12 }]}>No Students Found</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
              Check the enrollment number or clear filters to view the full student body.
            </Text>
          </View>
        ) : (
          filteredMembers.map((m) => {
            const hasLoans = (m.current_issued_count || 0) > 0;
            const hasFine = (m.outstanding_fine || 0) > 0;
            const initials = (m.name || 'Student')
              .split(' ')
              .map((n: string) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => fetchMemberDossier(m.roll || m.member_code)}
                style={[styles.memberCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.88}
              >
                <View style={[styles.memberAvatarCircle, { backgroundColor: colors.softBlue }]}>
                  <Text style={[styles.memberAvatarText, { color: colors.primary }]}>{initials}</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.memberNameText, { color: colors.text }]}>{m.name}</Text>
                  <Text style={[styles.memberRollText, { color: colors.primary }]}>
                    {m.roll || m.member_code} • {m.branch} {m.year ? `(Yr ${m.year})` : ''}
                  </Text>
                  <Text style={[styles.memberSubText, { color: colors.textSecondary }]}>
                    Quota: {m.max_books || 4} Books • {m.member_type}
                  </Text>

                  <View style={styles.memberStatusPillsRow}>
                    <View
                      style={[
                        styles.badgePill,
                        { backgroundColor: hasLoans ? colors.softLavender : colors.softGreen },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgePillText,
                          { color: hasLoans ? colors.purple : colors.green },
                        ]}
                      >
                        {m.current_issued_count || 0} Books Active
                      </Text>
                    </View>

                    {hasFine && (
                      <View style={[styles.badgePill, { backgroundColor: colors.softPeach, marginLeft: 6 }]}>
                        <Text style={[styles.badgePillText, { color: colors.coral }]}>
                          Due: ₹{m.outstanding_fine}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.memberChevronBox}>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Central Library LMS</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {isLibrarian ? 'Librarian Circulation Desk' : (isAccountant ? 'Accounts & Library Clearance' : (isAdmin ? 'Admin Library Overview' : 'Digital Student Library'))}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="sync-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Sub-Tabs */}
      {renderRoleTabs()}

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {activeTab === 'dashboard' || activeTab === 'overview' ? renderDashboardTab() : null}
            {activeTab === 'counter' ? renderCounterTab() : null}
            {activeTab === 'catalog' || activeTab === 'browse' ? renderCatalogTab() : null}
            {activeTab === 'members' ? renderMembersTab() : null}
            {activeTab === 'my_books' ? renderMyBooksTab() : null}
            {activeTab === 'reservations' ? renderReservationsTab() : null}
            {activeTab === 'history' ? renderHistoryTab() : null}
            {activeTab === 'overdue_fines' ? renderOverdueFinesTab() : null}
          </>
        )}
      </ScrollView>

      {/* ==================== MODALS ==================== */}

      {/* 1. Add Book Modal */}
      <Modal visible={addBookModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Book Title</Text>
              <TouchableOpacity onPress={() => setAddBookModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Book Title *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                placeholder="e.g. Computer Networks"
                value={newBookTitle}
                onChangeText={setNewBookTitle}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 8 }]}>Author *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                placeholder="e.g. Andrew S. Tanenbaum"
                value={newBookAuthor}
                onChangeText={setNewBookAuthor}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 8 }]}>ISBN</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                placeholder="e.g. 978-0132126953"
                value={newBookISBN}
                onChangeText={setNewBookISBN}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 8 }]}>Department & Shelf</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={[styles.textInput, { flex: 1, backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                  placeholder="CSE / AD / ALL"
                  value={newBookDept}
                  onChangeText={setNewBookDept}
                />
                <TextInput
                  style={[styles.textInput, { flex: 1, backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                  placeholder="Shelf A1"
                  value={newBookShelf}
                  onChangeText={setNewBookShelf}
                />
              </View>

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 8 }]}>Initial Physical Copies to Generate</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                placeholder="e.g. 5"
                keyboardType="numeric"
                value={newBookCopies}
                onChangeText={setNewBookCopies}
              />
            </ScrollView>

            <TouchableOpacity onPress={handleAddBookSubmit} style={[styles.primaryActionBtn, { backgroundColor: colors.primary, marginTop: 16 }]}>
              <Text style={styles.primaryActionBtnText}>Save & Generate Barcodes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Issue Slip / Return Receipt Modal */}
      <Modal visible={receiptModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.receiptCard, { backgroundColor: colors.card }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Ionicons
                name={receiptType === 'issue' ? 'checkmark-circle' : 'receipt'}
                size={48}
                color={receiptType === 'issue' ? colors.green : colors.primary}
              />
              <Text style={[styles.receiptTitle, { color: colors.text }]}>
                {receiptType === 'issue' ? 'Official Library Issue Slip' : 'Book Return Receipt'}
              </Text>
              <Text style={[styles.receiptSub, { color: colors.textSecondary }]}>SBITM Central Library</Text>
            </View>

            <View style={[styles.receiptBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Text style={[styles.receiptBookName, { color: colors.text }]}>{receiptData?.book_title}</Text>
              <Text style={[styles.receiptAcc, { color: colors.primary }]}>Accession No: {receiptData?.accession_no}</Text>
              <View style={styles.receiptDivider} />
              <Text style={[styles.receiptRow, { color: colors.textSecondary }]}>Member: <Text style={{ color: colors.text, fontWeight: '600' }}>{receiptData?.member_name} ({receiptData?.member_code})</Text></Text>
              <Text style={[styles.receiptRow, { color: colors.textSecondary }]}>Issue Date: <Text style={{ color: colors.text }}>{receiptData?.issue_date}</Text></Text>
              <Text style={[styles.receiptRow, { color: colors.textSecondary }]}>Due Date: <Text style={{ color: colors.coral, fontWeight: '700' }}>{receiptData?.due_date}</Text></Text>
              {receiptType === 'return' && (
                <>
                  <Text style={[styles.receiptRow, { color: colors.textSecondary }]}>Return Date: <Text style={{ color: colors.text }}>{receiptData?.return_date}</Text></Text>
                  <Text style={[styles.receiptRow, { color: colors.textSecondary }]}>Late Days: <Text style={{ color: colors.coral }}>{receiptData?.days_late} days</Text></Text>
                  <Text style={[styles.receiptRow, { color: colors.textSecondary }]}>Fine Status: <Text style={{ color: colors.purple, fontWeight: '700' }}>₹{receiptData?.fine_amount} ({receiptData?.fine_status})</Text></Text>
                </>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setReceiptModalVisible(false)}
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
            >
              <Text style={styles.primaryActionBtnText}>Done / Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. Book Details & Copies Modal */}
      <Modal visible={bookModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {selectedBook?.title}
              </Text>
              <TouchableOpacity onPress={() => setBookModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>Author: {selectedBook?.author}</Text>
              <Text style={[styles.bookMeta, { color: colors.textMuted }]}>
                ISBN: {selectedBook?.isbn || 'N/A'} • Location: {selectedBook?.location || '2nd Floor Section'}
              </Text>
              <Text style={[styles.bookMeta, { color: colors.textMuted }]}>
                Shelf: {selectedBook?.shelf} • Rack: {selectedBook?.rack}
              </Text>

              <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 16 }]}>
                Physical Copies ({selectedBook?.copies?.length || 0})
              </Text>

              {selectedBook?.copies?.map((c: any) => (
                <View key={c.id} style={[styles.copyRow, { borderBottomColor: colors.borderLight }]}>
                  <View>
                    <Text style={[styles.copyAcc, { color: colors.text }]}>{c.accession_no}</Text>
                    <Text style={[styles.copyBar, { color: colors.textMuted }]}>{c.barcode}</Text>
                  </View>
                  <View
                    style={[
                      styles.badgePill,
                      {
                        backgroundColor:
                          c.status === 'Available' ? colors.softGreen : (c.status === 'Issued' ? colors.softBlue : colors.softPeach),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgePillText,
                        {
                          color:
                            c.status === 'Available' ? colors.green : (c.status === 'Issued' ? colors.primary : colors.coral),
                        },
                      ]}
                    >
                      {c.status}
                    </Text>
                  </View>
                </View>
              ))}

              {isLibrarian && (
                <View style={{ marginTop: 16 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Add Additional Physical Copies</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <TextInput
                      style={[styles.textInput, { flex: 1, backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                      placeholder="Count (e.g. 2)"
                      keyboardType="numeric"
                      value={extraCopiesCount}
                      onChangeText={setExtraCopiesCount}
                    />
                    <TouchableOpacity onPress={handleAddExtraCopies} style={[styles.smallBtn, { backgroundColor: colors.primary }]}>
                      <Text style={{ color: '#FFF', fontWeight: '700' }}>+ Add Copies</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. Fine Waiver Justification Modal */}
      <Modal visible={waiverModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Authorize Fine Waiver</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Waiver for {selectedFine?.member_name} (Amount: ₹{selectedFine?.balance_amount})
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Mandatory Waiver Justification *</Text>
            <TextInput
              style={[styles.textInputArea, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
              placeholder="e.g. Medical emergency certificate approved by Principal"
              value={waiverReason}
              onChangeText={setWaiverReason}
            />

            <View style={styles.actionBtnRow}>
              <TouchableOpacity onPress={() => setWaiverModalVisible(false)} style={[styles.cancelBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleWaiveFineSubmit} style={[styles.counterBtn, { backgroundColor: colors.coral }]}>
                <Text style={styles.counterBtnText}>Authorize Waiver</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* 5. Comprehensive Student Library Dossier Modal */}
      <Modal visible={memberModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.dossierModalCard, { backgroundColor: colors.card }]}>
            {/* Header with Close */}
            <View style={styles.dossierHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                  {selectedMemberDossier?.member?.name || 'Student Library Dossier'}
                </Text>
                <Text style={[styles.modalSub, { color: colors.primary, marginTop: 2 }]}>
                  Roll: <Text style={{ fontWeight: '800' }}>{selectedMemberDossier?.member?.roll || selectedMemberDossier?.member?.member_code}</Text> • {selectedMemberDossier?.member?.branch} (Sem {selectedMemberDossier?.member?.semester || 3})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMemberModalVisible(false)} style={styles.closeModalBtn}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {memberDossierLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, color: colors.textSecondary }}>Accessing Student Library Records...</Text>
              </View>
            ) : (
              <>
                {/* Top KPI Metrics Strip */}
                <View style={styles.dossierKpiStrip}>
                  <View style={[styles.dossierKpiItem, { backgroundColor: colors.softBlue }]}>
                    <Text style={[styles.dossierKpiNum, { color: colors.primary }]}>
                      {selectedMemberDossier?.issued_count || selectedMemberDossier?.issued_books?.length || 0}/{selectedMemberDossier?.member?.max_books || 4}
                    </Text>
                    <Text style={[styles.dossierKpiLabel, { color: colors.textSecondary }]}>Active Loans</Text>
                  </View>

                  <View style={[styles.dossierKpiItem, { backgroundColor: colors.softPeach }]}>
                    <Text style={[styles.dossierKpiNum, { color: colors.coral }]}>
                      {selectedMemberDossier?.overdue_count || 0}
                    </Text>
                    <Text style={[styles.dossierKpiLabel, { color: colors.textSecondary }]}>Overdue Books</Text>
                  </View>

                  <View style={[styles.dossierKpiItem, { backgroundColor: colors.softGreen }]}>
                    <Text style={[styles.dossierKpiNum, { color: colors.green }]}>
                      ₹{selectedMemberDossier?.outstanding_fine || selectedMemberDossier?.member?.outstanding_fine || 0}
                    </Text>
                    <Text style={[styles.dossierKpiLabel, { color: colors.textSecondary }]}>Total Dues</Text>
                  </View>
                </View>

                {/* Library Clearance & No-Dues Status Card */}
                {(() => {
                  const issuedCount = selectedMemberDossier?.issued_count || selectedMemberDossier?.issued_books?.length || 0;
                  const duesFine = selectedMemberDossier?.outstanding_fine || selectedMemberDossier?.member?.outstanding_fine || 0;
                  const isClear = issuedCount === 0 && duesFine === 0;

                  return (
                    <View
                      style={[
                        styles.clearanceCard,
                        {
                          backgroundColor: isClear ? colors.softGreen : colors.softPeach,
                          borderColor: isClear ? colors.green : colors.coral,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isClear ? 'checkmark-circle' : 'alert-circle'}
                        size={22}
                        color={isClear ? colors.green : colors.coral}
                        style={{ marginRight: 8 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.clearanceTitle, { color: isClear ? colors.green : colors.coral }]}>
                          {isClear ? 'LIBRARY CLEARANCE: APPROVED (NO DUES)' : 'LIBRARY CLEARANCE: BLOCKED / PENDING'}
                        </Text>
                        <Text style={[styles.clearanceSub, { color: colors.textSecondary }]}>
                          {isClear
                            ? 'Student has returned all books and has ₹0 pending fines. Eligible for Exam Admit Card & Fee No-Dues.'
                            : `${issuedCount > 0 ? `${issuedCount} unreturned book(s) in hand. ` : ''}${duesFine > 0 ? `₹${duesFine} outstanding fine unpaid.` : ''} Must clear before semester release.`}
                        </Text>
                      </View>
                    </View>
                  );
                })()}

                {/* Sub-Tabs inside Dossier */}
                <View style={styles.dossierTabRow}>
                  <TouchableOpacity
                    onPress={() => setMemberModalTab('active_loans')}
                    style={[
                      styles.dossierTabPill,
                      memberModalTab === 'active_loans' && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.dossierTabPillText, { color: memberModalTab === 'active_loans' ? '#FFF' : colors.textSecondary }]}>
                      Currently Issued ({selectedMemberDossier?.issued_books?.length || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setMemberModalTab('history')}
                    style={[
                      styles.dossierTabPill,
                      memberModalTab === 'history' && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.dossierTabPillText, { color: memberModalTab === 'history' ? '#FFF' : colors.textSecondary }]}>
                      Past History ({selectedMemberDossier?.history?.length || 0})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setMemberModalTab('reservations_dues')}
                    style={[
                      styles.dossierTabPill,
                      memberModalTab === 'reservations_dues' && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.dossierTabPillText, { color: memberModalTab === 'reservations_dues' ? '#FFF' : colors.textSecondary }]}>
                      Reservations & Dues
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Tab 1: Currently Issued Books */}
                {memberModalTab === 'active_loans' && (
                  <ScrollView style={{ maxHeight: 340 }}>
                    {(!selectedMemberDossier?.issued_books || selectedMemberDossier.issued_books.length === 0) ? (
                      <View style={{ padding: 24, alignItems: 'center' }}>
                        <Ionicons name="checkmark-done-circle-outline" size={40} color={colors.green} />
                        <Text style={[styles.cardTitle, { color: colors.text, marginTop: 8 }]}>Zero Active Borrowings</Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
                          Student currently has no borrowed books in hand.
                        </Text>
                      </View>
                    ) : (
                      selectedMemberDossier.issued_books.map((b: any, idx: number) => {
                        const isOverdue = b.is_overdue || (b.days_remaining !== undefined && b.days_remaining < 0);
                        return (
                          <View key={idx} style={[styles.dossierLoanCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.bookTitle, { color: colors.text }]}>{b.title}</Text>
                              <Text style={[styles.bookAuthor, { color: colors.textSecondary }]}>By {b.author || 'Author'}</Text>
                              <Text style={[styles.bookMeta, { color: colors.textMuted }]}>
                                Acc No: <Text style={{ color: colors.primary, fontWeight: '700' }}>{b.accession_no}</Text> • {b.shelf_location}
                              </Text>

                              <View style={styles.dossierDateTagRow}>
                                <View style={[styles.tagPillSm, { backgroundColor: colors.softBlue }]}>
                                  <Ionicons name="calendar-outline" size={11} color={colors.primary} style={{ marginRight: 3 }} />
                                  <Text style={[styles.tagPillSmText, { color: colors.primary }]}>
                                    Issued: <Text style={{ fontWeight: '800' }}>{b.issue_date}</Text>
                                  </Text>
                                </View>

                                <View style={[styles.tagPillSm, { backgroundColor: isOverdue ? colors.softPeach : colors.softGreen, marginLeft: 6 }]}>
                                  <Ionicons name="time-outline" size={11} color={isOverdue ? colors.coral : colors.green} style={{ marginRight: 3 }} />
                                  <Text style={[styles.tagPillSmText, { color: isOverdue ? colors.coral : colors.green }]}>
                                    Due: <Text style={{ fontWeight: '800' }}>{b.due_date}</Text>
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <View style={{ gap: 6, justifyContent: 'center' }}>
                              <TouchableOpacity
                                onPress={() => handleDirectReturn({
                                  issue_id: b.issue_id,
                                  accession_no: b.accession_no,
                                  title: b.title,
                                  member_roll: selectedMemberDossier?.member?.roll || selectedMemberDossier?.member?.member_code,
                                })}
                                style={[styles.smallBtn, { backgroundColor: colors.green }]}
                              >
                                <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Return Book</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleRenewBook(b.issue_id)}
                                style={[styles.smallBtn, { backgroundColor: colors.primarySubtle }]}
                              >
                                <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '700' }}>Renew</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>
                )}

                {/* Tab 2: Complete Past History */}
                {memberModalTab === 'history' && (
                  <ScrollView style={{ maxHeight: 340 }}>
                    {(!selectedMemberDossier?.history || selectedMemberDossier.history.length === 0) ? (
                      <View style={{ padding: 24, alignItems: 'center' }}>
                        <Ionicons name="time-outline" size={40} color={colors.textMuted} />
                        <Text style={[styles.cardTitle, { color: colors.text, marginTop: 8 }]}>No Past History</Text>
                        <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
                          No previous returned books recorded for this student yet.
                        </Text>
                      </View>
                    ) : (
                      selectedMemberDossier.history.map((h: any, idx: number) => (
                        <View key={idx} style={[styles.dossierHistCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={1}>{h.title}</Text>
                            <Text style={[styles.recentSub, { color: colors.textSecondary }]}>
                              Acc: <Text style={{ color: colors.primary, fontWeight: '700' }}>{h.accession_no}</Text> • By {h.author || 'Author'}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                              <Text style={[styles.dateSub, { color: colors.textMuted }]}>
                                Issued: <Text style={{ color: colors.text, fontWeight: '600' }}>{h.issue_date}</Text>
                              </Text>
                              <Text style={[styles.dateSub, { color: colors.green }]}>
                                Returned: <Text style={{ fontWeight: '700' }}>{h.return_date}</Text>
                              </Text>
                            </View>
                          </View>

                          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                            <View style={[styles.badgePill, { backgroundColor: colors.softGreen }]}>
                              <Text style={[styles.badgePillText, { color: colors.green }]}>Returned</Text>
                            </View>
                            {h.fine_paid > 0 && (
                              <Text style={[styles.fineLabel, { color: colors.coral, marginTop: 4 }]}>
                                Fine Paid: ₹{h.fine_paid}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))
                    )}
                  </ScrollView>
                )}

                {/* Tab 3: Reservations & Dues */}
                {memberModalTab === 'reservations_dues' && (
                  <ScrollView style={{ maxHeight: 340 }}>
                    <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 4 }]}>Active Reservations</Text>
                    {(!selectedMemberDossier?.reservations || selectedMemberDossier.reservations.length === 0) ? (
                      <Text style={[styles.emptyText, { color: colors.textMuted, marginBottom: 12 }]}>No active reservations.</Text>
                    ) : (
                      selectedMemberDossier.reservations.map((r: any, idx: number) => (
                        <View key={idx} style={[styles.dossierLoanCard, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, marginBottom: 8 }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.bookTitle, { color: colors.text }]}>{r.title}</Text>
                            <Text style={[styles.recentSub, { color: colors.textSecondary }]}>Queue Position: #{r.queue_position}</Text>
                            <Text style={[styles.dateSub, { color: colors.primary }]}>Reserved On: {r.reservation_date}</Text>
                          </View>
                          <View style={[styles.badgePill, { backgroundColor: colors.softLavender }]}>
                            <Text style={[styles.badgePillText, { color: colors.purple }]}>{r.status}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </ScrollView>
                )}

                {/* Bottom Quick Issue Action */}
                <TouchableOpacity
                  onPress={() => {
                    setMemberModalVisible(false);
                    setCounterMemberInput(selectedMemberDossier?.member?.roll || selectedMemberDossier?.member?.member_code);
                    setActiveTab('counter');
                  }}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                  activeOpacity={0.88}
                >
                  <Ionicons name="arrow-up-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>+ Issue New Book to this Student</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* 6. Barcode & QR Code Scanner Simulation Modal */}
      <Modal visible={scannerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.scannerModalCard, { backgroundColor: colors.card }]}>
            {/* Header */}
            <View style={styles.scannerHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="camera-outline" size={22} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Optical Code Scanner</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setScannerFlashlight(!scannerFlashlight)}
                  style={[styles.scannerIconBtn, { backgroundColor: scannerFlashlight ? colors.softYellow : colors.surfaceSubtle }]}
                >
                  <Ionicons name={scannerFlashlight ? 'flash' : 'flash-outline'} size={18} color={scannerFlashlight ? colors.amber : colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScannerVisible(false)} style={styles.scannerIconBtn}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Target Subtitle */}
            <Text style={[styles.scannerTargetText, { color: colors.primary }]}>
              Target:{' '}
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {scannerTarget === 'counter_member' ? 'Member Roll / Student ID' :
                 scannerTarget === 'counter_copy' ? 'Book Copy Accession / Barcode' :
                 scannerTarget === 'catalog_search' ? 'Book Catalog Search' : 'Student Record Lookup'}
              </Text>
            </Text>

            {/* Mode Switcher */}
            <View style={styles.scannerModeRow}>
              <TouchableOpacity
                onPress={() => setScannerMode('barcode')}
                style={[
                  styles.scannerModePill,
                  scannerMode === 'barcode' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Ionicons name="barcode-outline" size={15} color={scannerMode === 'barcode' ? '#FFF' : colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.scannerModeText, { color: scannerMode === 'barcode' ? '#FFF' : colors.textSecondary }]}>
                  1D Barcode (Book/ISBN)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setScannerMode('qr')}
                style={[
                  styles.scannerModePill,
                  scannerMode === 'qr' && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                <Ionicons name="qr-code-outline" size={15} color={scannerMode === 'qr' ? '#FFF' : colors.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.scannerModeText, { color: scannerMode === 'qr' ? '#FFF' : colors.textSecondary }]}>
                  2D QR Code (Student ID)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Viewfinder Simulation */}
            <View style={styles.viewfinderContainer}>
              <View style={[styles.viewfinderBox, { borderColor: scannerFlashlight ? '#F6E05E' : colors.primary }]}>
                {/* Corner Markers */}
                <View style={[styles.cornerTL, { borderColor: colors.primary }]} />
                <View style={[styles.cornerTR, { borderColor: colors.primary }]} />
                <View style={[styles.cornerBL, { borderColor: colors.primary }]} />
                <View style={[styles.cornerBR, { borderColor: colors.primary }]} />

                {/* Animated Laser Line */}
                <Animated.View
                  style={[
                    styles.laserLine,
                    {
                      backgroundColor: colors.coral,
                      transform: [
                        {
                          translateY: scanAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [10, 120],
                          }),
                        },
                      ],
                    },
                  ]}
                />

                <Ionicons
                  name={scannerMode === 'barcode' ? 'barcode' : 'qr-code'}
                  size={52}
                  color="rgba(255,255,255,0.25)"
                />
                <Text style={styles.viewfinderHint}>Align code inside viewfinder</Text>
              </View>
            </View>

            {/* Quick Sample Scan Chips */}
            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 8, fontSize: 11 }]}>
              Quick Test Codes (Tap to Auto-Scan):
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {(scannerTarget === 'counter_member' || scannerTarget === 'member_lookup'
                ? ['0545CS211001', '0545CS211002', '0545CS211003', '0545AD211001', '0101CS221001']
                : ['CS-0001-001', 'CS-0002-001', 'AD-0001-001', '9780131103627', '9780262033848']
              ).map((sample) => (
                <TouchableOpacity
                  key={sample}
                  onPress={() => handleScanResult(sample)}
                  style={[styles.sampleChip, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                >
                  <Ionicons name="scan-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.sampleChipText, { color: colors.text }]}>{sample}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Manual Code Input Bar */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TextInput
                placeholder="Or type/paste code manually..."
                placeholderTextColor={colors.textMuted}
                value={customScanInput}
                onChangeText={setCustomScanInput}
                style={[styles.textInput, { flex: 1, backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                onPress={() => handleScanResult(customScanInput)}
                disabled={!customScanInput.trim()}
                style={[
                  styles.smallBtn,
                  { backgroundColor: customScanInput.trim() ? colors.primary : colors.border, paddingHorizontal: 16 },
                ]}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. Batch Barcode Generator Modal for Librarian */}
      <Modal visible={barcodeModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, maxHeight: '88%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="barcode-outline" size={22} color={colors.purple} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Batch Barcode Generator</Text>
              </View>
              <TouchableOpacity onPress={() => setBarcodeModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary, marginBottom: 12 }]}>
              Enter how many book barcode stickers you want to generate. Stick them onto books, then scan to register.
            </Text>

            {/* Quantity Selector */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Number of Barcode Stickers to Generate</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginVertical: 8 }}>
              {['5', '10', '25', '50', '100'].map((qty) => (
                <TouchableOpacity
                  key={qty}
                  onPress={() => {
                    setBatchBarcodeCount(qty);
                    handleGenerateBatchBarcodes(parseInt(qty));
                  }}
                  style={[
                    styles.smallPill,
                    batchBarcodeCount === qty && { backgroundColor: colors.purple, borderColor: colors.purple },
                  ]}
                >
                  <Text style={{ color: batchBarcodeCount === qty ? '#FFF' : colors.text, fontSize: 12, fontWeight: '700' }}>
                    {qty}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Generate Trigger */}
            <TouchableOpacity
              onPress={() => handleGenerateBatchBarcodes(parseInt(batchBarcodeCount) || 10)}
              disabled={generatingBarcodes}
              style={[styles.primaryActionBtn, { backgroundColor: colors.purple, marginTop: 4, marginBottom: 12 }]}
            >
              {generatingBarcodes ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryActionBtnText}>Generate {batchBarcodeCount} Barcodes</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Generated Barcode List (Visual Code128 Stickers) */}
            <Text style={[styles.sectionHeading, { color: colors.text, fontSize: 13, marginTop: 4 }]}>
              Generated Stickers Sheet ({generatedBarcodesList.length} Ready):
            </Text>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {generatedBarcodesList.map((item: any, idx: number) => (
                <View
                  key={idx}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 10,
                    padding: 12,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 1 }}>
                    SBITM CENTRAL LIBRARY • OFFICIAL BARCODE
                  </Text>

                  {/* Striped Barcode Graphic */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', height: 32, gap: 2, marginVertical: 6 }}>
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 4, 2, 1, 3, 2].map((w, i) => (
                      <View
                        key={i}
                        style={{
                          width: w,
                          height: '100%',
                          backgroundColor: i % 2 === 0 ? '#0F172A' : '#F1F5F9',
                          borderRadius: 0.5,
                        }}
                      />
                    ))}
                  </View>

                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A', letterSpacing: 2.5, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                    *{item.barcode}*
                  </Text>

                  {/* Actions for this barcode */}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, width: '100%' }}>
                    <TouchableOpacity
                      onPress={() => {
                        setBarcodeModalVisible(false);
                        setNewBookBarcode(item.barcode);
                        setAddBookModalVisible(true);
                      }}
                      style={{
                        flex: 1,
                        backgroundColor: colors.primary,
                        paddingVertical: 6,
                        borderRadius: 6,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Register Book with this Code</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        Alert.alert('Barcode Copied', `Sticker Code: ${item.barcode}`);
                      }}
                      style={{
                        backgroundColor: colors.surfaceSubtle,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Ionicons name="copy-outline" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 8. Register New Book with Barcode Modal */}
      <Modal visible={addBookModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="book-outline" size={22} color={colors.green} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Register Book with Barcode</Text>
              </View>
              <TouchableOpacity onPress={() => setAddBookModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Barcode Field */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Barcode Sticker / Accession Code *</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                <TextInput
                  placeholder="e.g. LIB-BC-2026-0001 or scan sticker"
                  placeholderTextColor={colors.textMuted}
                  value={newBookBarcode}
                  onChangeText={setNewBookBarcode}
                  style={[styles.textInput, { flex: 1, backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  onPress={() => {
                    const generated = `LIB-BC-2026-${Math.floor(Math.random() * 90000 + 10000)}`;
                    setNewBookBarcode(generated);
                  }}
                  style={[styles.smallBtn, { backgroundColor: colors.purple, paddingHorizontal: 12 }]}
                >
                  <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Auto Code</Text>
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Book Title *</Text>
              <TextInput
                placeholder="e.g. Let Us C, Operating Systems Concepts"
                placeholderTextColor={colors.textMuted}
                value={newBookTitle}
                onChangeText={setNewBookTitle}
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text, marginBottom: 10 }]}
              />

              {/* Author */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Author Name *</Text>
              <TextInput
                placeholder="e.g. Yashavant Kanetkar, Silberschatz"
                placeholderTextColor={colors.textMuted}
                value={newBookAuthor}
                onChangeText={setNewBookAuthor}
                style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text, marginBottom: 10 }]}
              />

              {/* ISBN / Publisher */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>ISBN (Optional)</Text>
                  <TextInput
                    placeholder="978-0131103627"
                    placeholderTextColor={colors.textMuted}
                    value={newBookISBN}
                    onChangeText={setNewBookISBN}
                    style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Publisher</Text>
                  <TextInput
                    placeholder="BPB / Pearson"
                    placeholderTextColor={colors.textMuted}
                    value={newBookPublisher}
                    onChangeText={setNewBookPublisher}
                    style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                  />
                </View>
              </View>

              {/* Department & Shelf */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Department</Text>
                  <TextInput
                    placeholder="CSE / AD / ME / EC"
                    placeholderTextColor={colors.textMuted}
                    value={newBookDept}
                    onChangeText={setNewBookDept}
                    style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Rack / Shelf</Text>
                  <TextInput
                    placeholder="Rack 2 / Shelf B1"
                    placeholderTextColor={colors.textMuted}
                    value={newBookShelf}
                    onChangeText={setNewBookShelf}
                    style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                  />
                </View>
              </View>

              {/* Price & Copies */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Price (₹)</Text>
                  <TextInput
                    placeholder="500"
                    placeholderTextColor={colors.textMuted}
                    value={newBookPrice}
                    onChangeText={setNewBookPrice}
                    keyboardType="numeric"
                    style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Number of Copies</Text>
                  <TextInput
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    value={newBookCopies}
                    onChangeText={setNewBookCopies}
                    keyboardType="numeric"
                    style={[styles.textInput, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleAddBookSubmit}
                disabled={loading}
                style={[styles.primaryActionBtn, { backgroundColor: colors.green, marginTop: 4 }]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryActionBtnText}>Register Book into Central Library</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LibraryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 1,
  },
  refreshBtn: {
    padding: 8,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
  },
  tabScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionContainer: {
    gap: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: (width - 44) / 2,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  kpiIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 6,
  },
  kpiSub: {
    fontSize: 11,
    marginTop: 2,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  activityItem: {
    alignItems: 'center',
    flex: 1,
  },
  activityNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  activityLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  activityDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryActionBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
  },
  textInputArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    minHeight: 60,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  smallPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  counterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  counterBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInputText: {
    flex: 1,
    fontSize: 13,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  bookCoverThumb: {
    width: 60,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookCodeThumb: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4A5568',
    marginTop: 2,
  },
  bookTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  bookAuthor: {
    fontSize: 12,
    marginTop: 2,
  },
  bookMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  bookBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  availBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  smallActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  smallActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  borrowedCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  borrowedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
  },
  dateSub: {
    fontSize: 11,
  },
  borrowedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  renewCountText: {
    fontSize: 11,
  },
  renewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  renewBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  overdueCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  fineAmt: {
    fontSize: 15,
    fontWeight: '800',
  },
  fineLabel: {
    fontSize: 10,
  },
  fineItemRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  fineCode: {
    fontSize: 13,
    fontWeight: '700',
  },
  fineBtnRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tinyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tinyBtnText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  recentItemRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  recentBookTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  recentSub: {
    fontSize: 11,
    marginTop: 2,
  },
  recentDate: {
    fontSize: 10,
    marginTop: 2,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  receiptCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  receiptTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 8,
  },
  receiptSub: {
    fontSize: 12,
  },
  receiptBox: {
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  receiptBookName: {
    fontSize: 15,
    fontWeight: '700',
  },
  receiptAcc: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#CBD5E1',
    marginVertical: 8,
  },
  receiptRow: {
    fontSize: 12,
    marginBottom: 3,
  },
  copyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  copyAcc: {
    fontSize: 13,
    fontWeight: '700',
  },
  copyBar: {
    fontSize: 10,
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: 'center',
  },
  studentSnapshotCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  lookupBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snapshotDossierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  dossierModalCard: {
    borderRadius: 20,
    padding: 18,
    maxHeight: '90%',
  },
  dossierHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalSub: {
    fontSize: 12,
  },
  closeModalBtn: {
    padding: 4,
  },
  dossierKpiStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  dossierKpiItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  dossierKpiNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  dossierKpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  dossierTabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dossierTabPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dossierTabPillText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  dossierLoanCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  dossierDateTagRow: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  tagPillSm: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagPillSmText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dossierHistCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
  },
  memberCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    alignItems: 'center',
  },
  memberAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  memberNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberRollText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  memberSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  memberStatusPillsRow: {
    flexDirection: 'row',
    marginTop: 6,
    flexWrap: 'wrap',
  },
  memberChevronBox: {
    paddingLeft: 8,
    justifyContent: 'center',
  },
  clearanceCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 14,
    alignItems: 'center',
  },
  clearanceTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  clearanceSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  scanIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerModalCard: {
    width: '92%',
    borderRadius: 20,
    padding: 18,
    maxHeight: '92%',
  },
  scannerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scannerIconBtn: {
    padding: 6,
    borderRadius: 8,
  },
  scannerTargetText: {
    fontSize: 12,
    marginBottom: 10,
  },
  scannerModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  scannerModePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  scannerModeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  viewfinderContainer: {
    height: 160,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 4,
  },
  viewfinderBox: {
    width: 220,
    height: 120,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 18,
    height: 18,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 18,
    height: 18,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  laserLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 1,
  },
  viewfinderHint: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 6,
    fontWeight: '600',
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
  },
  sampleChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
