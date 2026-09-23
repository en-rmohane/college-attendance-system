import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Share,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { AnimatedCard } from '../components/common/AnimatedCard';
import { AnimatedCounter } from '../components/common/AnimatedCounter';
import { StatusBadge } from '../components/common/StatusBadge';
import { allFeeStructures } from '../services/collegeDatabase';

const { width } = Dimensions.get('window');

export default function FeesScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const isStudent = user?.role === 'student';
  const isAccountant = user?.role === 'accountant';
  const isAdmin = user?.role === 'admin';
  const isStaff = isAccountant || isAdmin;

  // Active Tab - default to route param or role default
  const [activeTab, setActiveTab] = useState<string>(
    route?.params?.initialTab || (isStudent ? 'my_fees' : 'approvals')
  );

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  // Loading & Refreshing
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Dashboard Data State
  const [dashboardData, setDashboardData] = useState<any>({
    total_expected: 30720000,
    total_collected: 20450000,
    total_pending: 10270000,
    collection_rate: 66.57,
    today_collection: 45000,
    overdue_amount: 10270000,
    defaulters_count: 53,
    total_students: 184,
    pendingVerifications: 0,
    pendingFeeApprovals: 0,
    pendingTransportApprovals: 0,
  });

  // Approvals State
  const [feeApprovals, setFeeApprovals] = useState<any[]>([]);
  const [transportApprovals, setTransportApprovals] = useState<any[]>([]);
  const [approvalsFilter, setApprovalsFilter] = useState<'ALL' | 'FEES' | 'TRANSPORT'>('ALL');
  const [approvingId, setApprovingId] = useState<number | null>(null);

  // Fee Schedule State
  const [feeSchedule, setFeeSchedule] = useState<any>(null);
  const [scheduleInstallments, setScheduleInstallments] = useState<any[]>([]);
  const [releasingInstNo, setReleasingInstNo] = useState<number | null>(null);

  // Student Roster State
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL');

  // Selected Student Profile (for modal or student view)
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [profileModalVisible, setProfileModalVisible] = useState<boolean>(false);

  // Multi-Year Schedule & Edit Modal State
  const [selectedScheduleYear, setSelectedScheduleYear] = useState<number>(1);
  const [editScheduleModalVisible, setEditScheduleModalVisible] = useState<boolean>(false);
  const [editingInstData, setEditingInstData] = useState<any>({
    installment_no: 1,
    title: '',
    amount: '',
    due_date: '',
    release_date: '',
  });
  const [savingSchedule, setSavingSchedule] = useState<boolean>(false);

  // Cashier Modal State
  const [cashierModalVisible, setCashierModalVisible] = useState<boolean>(false);
  const [cashierRoll, setCashierRoll] = useState<string>('');
  const [cashierAmount, setCashierAmount] = useState<string>('');
  const [cashierMode, setCashierMode] = useState<string>('CASH');
  const [cashierRef, setCashierRef] = useState<string>('');
  const [cashierRemarks, setCashierRemarks] = useState<string>('');
  const [cashierTargetStudent, setCashierTargetStudent] = useState<any>(null);
  const [collectingPayment, setCollectingPayment] = useState<boolean>(false);

  // Generated Receipt Modal State
  const [receiptModalVisible, setReceiptModalVisible] = useState<boolean>(false);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);

  // Daily Report State
  const [dailyReport, setDailyReport] = useState<any>(null);

  // 1. Fetch Dashboard, Approvals, Schedule & Students
  const loadFeeData = useCallback(async () => {
    try {
      if (isStaff) {
        const [dashRes, stRes, feeAppRes, transAppRes, schedRes] = await Promise.all([
          api.getFeeDashboard(),
          api.getFeeStudents({ query: searchQuery, status: statusFilter }),
          api.getAccountantFeeApprovals('PENDING_APPROVAL'),
          api.getAccountantTransportApprovals('PENDING_APPROVAL'),
          api.getFeeSchedule('2026-27', selectedScheduleYear),
        ]);

        if (dashRes && dashRes.success && (dashRes.metrics || dashRes.data)) {
          setDashboardData(dashRes.metrics || dashRes.data);
        }
        if (stRes && stRes.success && Array.isArray(stRes.students)) {
          setStudentsList(stRes.students);
        }
        if (feeAppRes && feeAppRes.success && Array.isArray(feeAppRes.requests)) {
          setFeeApprovals(feeAppRes.requests);
        }
        if (transAppRes && transAppRes.success && Array.isArray(transAppRes.requests)) {
          setTransportApprovals(transAppRes.requests);
        }
        if (schedRes && schedRes.success && schedRes.schedule) {
          setFeeSchedule(schedRes.schedule);
          setScheduleInstallments(schedRes.schedule.installments || []);
        }
      }

      if (isStudent) {
        const roll = user?.roll || user?.username || '0545CS231001';
        const profRes = await api.getMyFees(roll);
        if (profRes && profRes.success) {
          setStudentProfile(profRes);
        }
      }
    } catch (e) {
      console.log('Error loading fee data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isStaff, isStudent, user, searchQuery, statusFilter]);

  useEffect(() => {
    loadFeeData();
  }, [loadFeeData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeeData();
  };

  const handleApproveFee = async (paymentId: number) => {
    setApprovingId(paymentId);
    try {
      const res = await api.approveFeePayment(paymentId);
      if (res && res.success) {
        Alert.alert('Payment Approved ✅', `Official Receipt: ${res.receipt_no}\nLedger updated and installment marked PAID.`);
        loadFeeData();
      } else {
        Alert.alert('Approval Failed', res?.error || 'Unable to approve payment.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Approval error.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectFee = (paymentId: number) => {
    Alert.alert('Reject Payment', 'Are you sure you want to reject this transaction request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          const res = await api.rejectFeePayment(paymentId, 'Verification failed / mismatch');
          if (res?.success) {
            Alert.alert('Rejected', 'Payment request marked rejected.');
            loadFeeData();
          }
        },
      },
    ]);
  };

  const handleApproveTransport = async (paymentId: number) => {
    setApprovingId(paymentId);
    try {
      const res = await api.approveTransportPayment(paymentId);
      if (res && res.success) {
        Alert.alert('Transport Approved 🚌', `Bus Pass: ${res.bus_pass?.pass_number}\nStatus is now ACTIVE with verified QR token.`);
        loadFeeData();
      } else {
        Alert.alert('Approval Failed', res?.error || 'Unable to approve bus fee.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Approval error.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectTransport = (paymentId: number) => {
    Alert.alert('Reject Transport Payment', 'Are you sure you want to reject this transport fee request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          const res = await api.rejectTransportPayment(paymentId, 'Verification failed');
          if (res?.success) {
            Alert.alert('Rejected', 'Transport request marked rejected.');
            loadFeeData();
          }
        },
      },
    ]);
  };

  const loadScheduleForYear = async (year: number) => {
    setSelectedScheduleYear(year);
    try {
      const schedRes = await api.getFeeSchedule('2026-27', year);
      if (schedRes && schedRes.success && schedRes.schedule) {
        setFeeSchedule(schedRes.schedule);
        setScheduleInstallments(schedRes.schedule.installments || []);
      }
    } catch (e) {
      console.log('Error loading schedule for year', e);
    }
  };

  const handleOpenEditScheduleModal = (inst: any) => {
    setEditingInstData({
      installment_no: inst.installment_no,
      title: inst.title,
      amount: String(inst.amount),
      due_date: inst.due_date || '',
      release_date: inst.release_date || '',
    });
    setEditScheduleModalVisible(true);
  };

  const handleSaveScheduleEdit = async () => {
    if (!editingInstData.due_date.trim()) {
      Alert.alert('Missing Due Date', 'Please enter a valid due date (YYYY-MM-DD).');
      return;
    }
    const amt = parseFloat(editingInstData.amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive installment amount.');
      return;
    }
    setSavingSchedule(true);
    try {
      const updatedList = scheduleInstallments.map((i: any) => {
        if (i.installment_no === editingInstData.installment_no) {
          return {
            ...i,
            title: editingInstData.title,
            amount: amt,
            due_date: editingInstData.due_date,
            release_date: editingInstData.release_date,
          };
        }
        return i;
      });

      const totalAnnual = updatedList.reduce((sum: number, x: any) => sum + Number(x.amount || 0), 0);

      const res = await api.updateFeeSchedule({
        academic_year: '2026-27',
        student_year: selectedScheduleYear,
        annual_fee: totalAnnual,
        late_fee_per_day: feeSchedule?.late_fee_per_day || 25,
        installments: updatedList,
        user_id: user?.id || 1,
      });

      if (res && res.success) {
        Alert.alert('Schedule Updated ✅', `Installment #${editingInstData.installment_no} details updated for Year ${selectedScheduleYear}.`);
        setEditScheduleModalVisible(false);
        loadScheduleForYear(selectedScheduleYear);
      } else {
        Alert.alert('Update Failed', res?.error || res?.message || 'Could not update schedule.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleReleaseInstallment = async (installmentNo: number) => {
    setReleasingInstNo(installmentNo);
    try {
      const res = await api.releaseFeeInstallment('2026-27', installmentNo, selectedScheduleYear);
      if (res && res.success) {
        Alert.alert('Installment Released 📢', `Installment #${installmentNo} is now RELEASED and payable by Year ${selectedScheduleYear} students.`);
        loadScheduleForYear(selectedScheduleYear);
      } else {
        Alert.alert('Failed', res?.error || 'Could not release installment.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Release error.');
    } finally {
      setReleasingInstNo(null);
    }
  };

  // Open Student Fee Profile Modal
  const handleOpenStudentProfile = async (roll: string) => {
    try {
      const res = await api.getStudentFeeProfile(roll);
      if (res && res.success && res.data) {
        setStudentProfile(res.data);
        setProfileModalVisible(true);
      } else {
        Alert.alert('Notice', 'Could not load student fee profile.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to fetch student details.');
    }
  };

  // Quick lookup student in Cashier modal
  const handleLookupStudentForCashier = async (roll: string) => {
    setCashierRoll(roll);
    if (!roll.trim()) {
      setCashierTargetStudent(null);
      return;
    }
    try {
      const res = await api.getStudentFeeProfile(roll.trim());
      if (res && res.success && res.data) {
        setCashierTargetStudent(res.data);
        // Pre-fill amount with minimum of pending or next installment
        const pending = res.data.calculation?.pending_balance || 0;
        if (pending > 0) {
          setCashierAmount(String(Math.min(pending, 20000)));
        } else {
          setCashierAmount('0');
        }
      } else {
        setCashierTargetStudent(null);
      }
    } catch (e) {
      setCashierTargetStudent(null);
    }
  };

  // Submit Payment Collection
  const handleSubmitPayment = async () => {
    const numAmount = parseFloat(cashierAmount);
    if (!cashierRoll.trim()) {
      Alert.alert('Error', 'Please enter a valid student roll number.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive payment amount.');
      return;
    }

    if (cashierTargetStudent) {
      const pending = cashierTargetStudent.calculation?.pending_balance || 0;
      if (numAmount > pending) {
        Alert.alert(
          'Overpayment Blocked',
          `Entered amount (₹${numAmount.toLocaleString('en-IN')}) exceeds total pending dues of ₹${pending.toLocaleString('en-IN')}. Please correct amount.`
        );
        return;
      }
    }

    setCollectingPayment(true);
    try {
      const res = await api.recordFeePayment({
        student_roll: cashierRoll.trim().toUpperCase(),
        amount: numAmount,
        payment_mode: cashierMode,
        transaction_id: cashierRef || undefined,
        remarks: cashierRemarks || 'Counter Collection',
        collected_by: user?.name || user?.username || 'Fee Counter',
      });

      if (res && res.success && res.data) {
        setCashierModalVisible(false);
        setCurrentReceipt(res.data);
        setReceiptModalVisible(true);
        // Reset form
        setCashierRoll('');
        setCashierAmount('');
        setCashierRef('');
        setCashierRemarks('');
        setCashierTargetStudent(null);
        // Reload roster
        loadFeeData();
      } else {
        Alert.alert('Payment Failed', res?.error || 'Unable to record payment.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Payment processing error.');
    } finally {
      setCollectingPayment(false);
    }
  };

  // Share Official Receipt
  const handleShareReceipt = async (receipt: any) => {
    if (!receipt) return;
    try {
      await Share.share({
        message: `🏛️ SHRI BALAJI INSTITUTE OF TECHNOLOGY & MANAGEMENT\n` +
          `OFFICIAL FEE RECEIPT\n` +
          `Receipt No: ${receipt.receipt_number}\n` +
          `Date: ${receipt.payment_date || new Date().toLocaleDateString()}\n` +
          `Student: ${receipt.student_name || 'STUDENT'} (${receipt.student_roll})\n` +
          `Amount Paid: ₹${Number(receipt.amount_paid || receipt.amount || 0).toLocaleString('en-IN')}\n` +
          `Mode: ${receipt.payment_mode}\n` +
          `Remaining Balance: ₹${Number(receipt.remaining_balance || 0).toLocaleString('en-IN')}\n` +
          `Cashier: ${receipt.collected_by || 'Accounts Desk'}\n` +
          `Status: PROCESSED & VERIFIED ✅`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  // Share No Dues Certificate
  const handleShareNoDues = async () => {
    try {
      const roll = user?.roll || user?.username || '0545CS231001';
      const name = user?.name || 'STUDENT';
      await Share.share({
        message: `🏛️ SBITM OFFICIAL NO-DUES CLEARANCE CERTIFICATE\n` +
          `Certificate No: SBITM/ND/2026/${Math.floor(100000 + Math.random() * 900000)}\n` +
          `Student: ${name} (${roll})\n` +
          `Branch: ${user?.branch || 'Computer Science'}\n` +
          `Status: 100% FEES CLEARED - ALL DEPARTMENTS CLEARED\n` +
          `Issued Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}\n` +
          `Authorized by Chief Finance Officer`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  // Fallback calculations for student if profile not loaded
  const calc = studentProfile?.calculation || {
    gross_fee: 75000,
    scholarship: 10000,
    discount: 5000,
    fine: 0,
    net_payable: 60000,
    total_paid: 40000,
    pending_balance: 20000,
    status: 'PARTIAL',
  };

  const installments = studentProfile?.installments || [
    { installment_number: 1, name: 'Admission & 1st Term', due_amount: 15000, paid_amount: 15000, status: 'PAID', due_date: '2026-08-15' },
    { installment_number: 2, name: '2nd Term Exam Clearance', due_amount: 15000, paid_amount: 15000, status: 'PAID', due_date: '2026-10-30' },
    { installment_number: 3, name: '3rd Term Pre-University', due_amount: 15000, paid_amount: 10000, status: 'PARTIAL', due_date: '2027-01-15' },
    { installment_number: 4, name: 'Final Semester Clearance', due_amount: 15000, paid_amount: 0, status: 'PENDING', due_date: '2027-04-10' },
  ];

  const paidPercent = calc.net_payable > 0
    ? Math.min(100, Math.round((calc.total_paid / calc.net_payable) * 100))
    : 100;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header Card */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isStudent ? 'Student Fee Desk' : isAccountant ? 'Fee Manager Counter' : 'Fee Executive Overview'}
          </Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {isStudent
              ? 'Installments, Receipts & Clearance'
              : isAccountant
              ? 'RBAC Cashier, Roster & Double-Entry Ledger'
              : 'Institutional Financial Overview & Audits'}
          </Text>
        </View>

        {isStaff && (
          <TouchableOpacity
            style={[styles.collectTopBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              setCashierModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={16} color="#FFF" />
            <Text style={styles.collectTopBtnText}>Collect</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* TABS ROW */}
      {isStudent ? (
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceSubtle }]}>
          {[
            { id: 'my_fees', label: 'Summary', icon: 'credit-card' },
            { id: 'installments', label: 'Installments', icon: 'layers' },
            { id: 'history', label: 'Ledger', icon: 'file-text' },
            { id: 'nodues', label: 'No-Dues', icon: 'check-circle' },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabItem,
                  isSelected && [styles.tabItemActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Feather
                  name={tab.icon as any}
                  size={12}
                  color={isSelected ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: isSelected ? colors.primary : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={[styles.tabBar, { backgroundColor: colors.surfaceSubtle }]}>
          {[
            { id: 'approvals', label: `Approvals (${feeApprovals.length + transportApprovals.length})`, icon: 'check-square' },
            { id: 'cashier_desk', label: 'Cash Desk', icon: 'credit-card' },
            { id: 'schedule', label: 'Schedule', icon: 'calendar' },
            { id: 'roster', label: 'Roster', icon: 'users' },
            { id: 'overview', label: 'Overview', icon: 'pie-chart' },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            const hasPending = tab.id === 'approvals' && (feeApprovals.length + transportApprovals.length) > 0;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabItem,
                  isSelected && [styles.tabItemActive, { backgroundColor: colors.card }],
                ]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Feather
                  name={tab.icon as any}
                  size={12}
                  color={isSelected ? (hasPending ? colors.coral : colors.primary) : (hasPending ? colors.coral : colors.textSecondary)}
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: isSelected ? (hasPending ? colors.coral : colors.primary) : (hasPending ? colors.coral : colors.textSecondary), fontWeight: isSelected || hasPending ? '700' : '500' },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ======================================================== */}
        {/* 0. STAFF APPROVALS QUEUE (FEES + TRANSPORT)               */}
        {/* ======================================================== */}
        {isStaff && activeTab === 'approvals' && (
          <View>
            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              {[
                { id: 'ALL', label: `All Requests (${feeApprovals.length + transportApprovals.length})` },
                { id: 'FEES', label: `College Fees (${feeApprovals.length})` },
                { id: 'TRANSPORT', label: `Bus Fees (${transportApprovals.length})` },
              ].map((f) => {
                const isSel = approvalsFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isSel ? colors.primary : colors.surfaceSubtle,
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setApprovalsFilter(f.id as any)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, { color: isSel ? '#FFF' : colors.textSecondary }]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Empty State if no pending approvals */}
            {((approvalsFilter === 'ALL' && feeApprovals.length === 0 && transportApprovals.length === 0) ||
              (approvalsFilter === 'FEES' && feeApprovals.length === 0) ||
              (approvalsFilter === 'TRANSPORT' && transportApprovals.length === 0)) && (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.deskIconCircle, { backgroundColor: colors.softGreen, width: 48, height: 48, borderRadius: 24, marginBottom: 12 }]}>
                  <Feather name="check" size={24} color={colors.green} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Queue Clear 🎉</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  All online payments and bus fee applications have been reviewed.
                </Text>
              </View>
            )}

            {/* College Fee Approvals */}
            {(approvalsFilter === 'ALL' || approvalsFilter === 'FEES') && feeApprovals.map((req) => (
              <View
                key={`fee-${req.id}`}
                style={[styles.studentCard, { backgroundColor: colors.card, borderColor: `${colors.amber}50`, borderWidth: 1.5 }]}
              >
                <View style={styles.studentCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.studentName, { color: colors.text }]}>{req.student_name}</Text>
                      <View style={[styles.statusPill, { backgroundColor: colors.softYellow }]}>
                        <Text style={[styles.statusPillText, { color: colors.amber }]}>COLLEGE FEE</Text>
                      </View>
                    </View>
                    <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>
                      {req.student_roll} • {req.branch} • Year {req.year}
                    </Text>
                  </View>
                  <Text style={[styles.cardStatVal, { color: colors.primary, fontSize: 16 }]}>
                    ₹{Number(req.amount_paid || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Financial Breakdown */}
                <View style={[styles.studentCardStats, { backgroundColor: colors.surfaceSubtle, marginTop: 8 }]}>
                  <View style={styles.cardStatCol}>
                    <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Installment</Text>
                    <Text style={[styles.cardStatVal, { color: colors.text }]}>#{req.installment_no}</Text>
                  </View>
                  <View style={styles.cardStatCol}>
                    <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Base Fee</Text>
                    <Text style={[styles.cardStatVal, { color: colors.text }]}>₹{req.base_amount?.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={styles.cardStatCol}>
                    <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Late Fee (₹25/d)</Text>
                    <Text style={[styles.cardStatVal, { color: req.late_fee_paid > 0 ? colors.coral : colors.green }]}>
                      ₹{req.late_fee_paid || 0} ({req.late_days || 0}d)
                    </Text>
                  </View>
                </View>

                {/* Txn Details */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 }}>
                  <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>Mode: {req.payment_mode} • Txn: {req.transaction_id || 'N/A'}</Text>
                  <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>{req.payment_date}</Text>
                </View>

                {/* Approve / Reject Actions */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.quickCollectBtn, { flex: 1, backgroundColor: colors.softGreen, paddingVertical: 10 }]}
                    onPress={() => handleApproveFee(req.id)}
                    disabled={approvingId === req.id}
                    activeOpacity={0.8}
                  >
                    {approvingId === req.id ? (
                      <ActivityIndicator size="small" color={colors.green} />
                    ) : (
                      <>
                        <Feather name="check-circle" size={14} color={colors.green} />
                        <Text style={[styles.quickCollectBtnText, { color: colors.green, fontWeight: '700' }]}>Approve & Issue Receipt</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickCollectBtn, { backgroundColor: colors.softPeach, paddingHorizontal: 14, paddingVertical: 10 }]}
                    onPress={() => handleRejectFee(req.id)}
                    activeOpacity={0.8}
                  >
                    <Feather name="x-circle" size={14} color={colors.coral} />
                    <Text style={[styles.quickCollectBtnText, { color: colors.coral }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Transport Approvals */}
            {(approvalsFilter === 'ALL' || approvalsFilter === 'TRANSPORT') && transportApprovals.map((req) => (
              <View
                key={`trans-${req.id}`}
                style={[styles.studentCard, { backgroundColor: colors.card, borderColor: `${colors.teal}50`, borderWidth: 1.5 }]}
              >
                <View style={styles.studentCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.studentName, { color: colors.text }]}>{req.student_name}</Text>
                      <View style={[styles.statusPill, { backgroundColor: colors.softCyan }]}>
                        <Text style={[styles.statusPillText, { color: colors.teal }]}>BUS PASS FEE</Text>
                      </View>
                    </View>
                    <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>
                      {req.student_roll} • {req.branch}
                    </Text>
                  </View>
                  <Text style={[styles.cardStatVal, { color: colors.teal, fontSize: 16 }]}>
                    ₹{Number(req.amount_paid || req.annual_fee || 0).toLocaleString('en-IN')}
                  </Text>
                </View>

                {/* Transport Route Info */}
                <View style={[styles.studentCardStats, { backgroundColor: colors.surfaceSubtle, marginTop: 8 }]}>
                  <View style={styles.cardStatCol}>
                    <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Route</Text>
                    <Text style={[styles.cardStatVal, { color: colors.text }]}>{req.route_name}</Text>
                  </View>
                  <View style={styles.cardStatCol}>
                    <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Vehicle</Text>
                    <Text style={[styles.cardStatVal, { color: colors.text }]}>{req.bus_number}</Text>
                  </View>
                  <View style={styles.cardStatCol}>
                    <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Period</Text>
                    <Text style={[styles.cardStatVal, { color: colors.text }]}>Annual (2026-27)</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 8 }}>
                  <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>Mode: {req.payment_mode} • Txn: {req.transaction_id || 'N/A'}</Text>
                  <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>{req.payment_date}</Text>
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.quickCollectBtn, { flex: 1, backgroundColor: colors.softGreen, paddingVertical: 10 }]}
                    onPress={() => handleApproveTransport(req.id)}
                    disabled={approvingId === req.id}
                    activeOpacity={0.8}
                  >
                    {approvingId === req.id ? (
                      <ActivityIndicator size="small" color={colors.green} />
                    ) : (
                      <>
                        <Ionicons name="bus" size={14} color={colors.green} />
                        <Text style={[styles.quickCollectBtnText, { color: colors.green, fontWeight: '700' }]}>Approve & Activate Bus Pass</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickCollectBtn, { backgroundColor: colors.softPeach, paddingHorizontal: 14, paddingVertical: 10 }]}
                    onPress={() => handleRejectTransport(req.id)}
                    activeOpacity={0.8}
                  >
                    <Feather name="x-circle" size={14} color={colors.coral} />
                    <Text style={[styles.quickCollectBtnText, { color: colors.coral }]}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ======================================================== */}
        {/* 0.5 STAFF FEE SCHEDULE (4 INSTALLMENTS CONTROL)          */}
        {/* ======================================================== */}
        {isStaff && activeTab === 'schedule' && (
          <View>
            {/* Header with Annual Fee & Year Selector */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={[styles.cardHeading, { color: colors.text }]}>Academic Fee Schedules</Text>
                  <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>
                    Academic Year 2026-27 • Annual Fee: ₹{Number(feeSchedule?.annual_fee || 55000).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: colors.softGreen }]}>
                  <Text style={[styles.statusPillText, { color: colors.green }]}>4 STAGES</Text>
                </View>
              </View>

              {/* 4-Year Student Batch Selector Pills */}
              <Text style={[styles.cardStatLabel, { color: colors.textSecondary, marginTop: 14, marginBottom: 6, fontWeight: '700' }]}>
                SELECT STUDENT ACADEMIC YEAR:
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4].map((yr) => (
                  <TouchableOpacity
                    key={yr}
                    style={[
                      styles.filterPill,
                      {
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 9,
                        backgroundColor: selectedScheduleYear === yr ? colors.primary : colors.surfaceSubtle,
                        borderColor: selectedScheduleYear === yr ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => loadScheduleForYear(yr)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color: selectedScheduleYear === yr ? '#FFFFFF' : colors.text,
                          fontWeight: '800',
                          fontSize: 11,
                        },
                      ]}
                    >
                      {yr}{yr === 1 ? 'st' : yr === 2 ? 'nd' : yr === 3 ? 'rd' : 'th'} Year
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Installments for Selected Year */}
            {scheduleInstallments.map((inst: any) => (
              <View
                key={inst.installment_no}
                style={[
                  styles.studentCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: inst.is_released ? colors.border : `${colors.amber}80`,
                    borderWidth: inst.is_released ? 1 : 1.5,
                  },
                ]}
              >
                <View style={styles.studentCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.studentName, { color: colors.text }]}>{inst.title}</Text>
                    <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>
                      Due Date: {inst.due_date_formatted || inst.due_date} • Rate: ₹{inst.late_fee_rate || 25}/day
                    </Text>
                  </View>
                  <StatusBadge
                    status={inst.is_released ? 'completed' : 'pending'}
                    label={inst.is_released ? 'RELEASED' : 'DRAFT'}
                    size="sm"
                  />
                </View>

                <View style={[styles.studentCardStats, { backgroundColor: colors.surfaceSubtle, marginTop: 8 }]}>
                  <View style={styles.cardStatCol}>
                    <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Amount</Text>
                    <Text style={[styles.cardStatVal, { color: colors.text }]}>
                      ₹{Number(inst.amount).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.cardStatCol}>
                    <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Release Date</Text>
                    <Text style={[styles.cardStatVal, { color: colors.textSecondary }]}>
                      {inst.release_date_formatted || inst.release_date || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.cardStatCol}>
                    <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Late Fee Starts</Text>
                    <Text style={[styles.cardStatVal, { color: colors.coral }]}>
                      {inst.due_date_formatted || inst.due_date}
                    </Text>
                  </View>
                </View>

                {/* Accountant Actions: Edit Dates/Amount & Release Installment */}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.quickCollectBtn,
                      {
                        flex: 1,
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        borderWidth: 1,
                        paddingVertical: 9,
                        justifyContent: 'center',
                      },
                    ]}
                    onPress={() => handleOpenEditScheduleModal(inst)}
                    activeOpacity={0.8}
                  >
                    <Feather name="edit-3" size={13} color={colors.primary} />
                    <Text style={[styles.quickCollectBtnText, { color: colors.primary, fontWeight: '700' }]}>
                      Edit Dates & Amount
                    </Text>
                  </TouchableOpacity>

                  {!inst.is_released && (
                    <TouchableOpacity
                      style={[
                        styles.quickCollectBtn,
                        {
                          flex: 1.2,
                          backgroundColor: colors.primary,
                          paddingVertical: 9,
                          justifyContent: 'center',
                        },
                      ]}
                      onPress={() => handleReleaseInstallment(inst.installment_no)}
                      disabled={releasingInstNo === inst.installment_no}
                      activeOpacity={0.8}
                    >
                      {releasingInstNo === inst.installment_no ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Feather name="send" size={13} color="#FFF" />
                          <Text style={[styles.quickCollectBtnText, { color: '#FFF', fontWeight: '700' }]}>
                            Release to {selectedScheduleYear}{selectedScheduleYear === 1 ? 'st' : selectedScheduleYear === 2 ? 'nd' : selectedScheduleYear === 3 ? 'rd' : 'th'} Yr
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ======================================================== */}
        {/* 1. STAFF OVERVIEW (KPI PASTEL CARDS)                      */}
        {/* ======================================================== */}
        {isStaff && activeTab === 'overview' && (
          <View>
            {/* KPI 2x2 Grid */}
            <View style={styles.kpiGrid}>
              {/* Collected (Soft Green) */}
              <View style={[styles.kpiCard, { backgroundColor: colors.softGreen, borderColor: colors.border }]}>
                <View style={styles.kpiCardHeader}>
                  <Text style={[styles.kpiCardTitle, { color: colors.green }]}>COLLECTED</Text>
                  <Feather name="check-circle" size={15} color={colors.green} />
                </View>
                <AnimatedCounter
                  value={dashboardData.total_collected}
                  prefix="₹"
                  style={[styles.kpiAmount, { color: colors.green }]}
                />
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                  {dashboardData.collection_rate}% of Net Expected
                </Text>
              </View>

              {/* Pending Dues (Soft Peach) */}
              <View style={[styles.kpiCard, { backgroundColor: colors.softPeach, borderColor: colors.border }]}>
                <View style={styles.kpiCardHeader}>
                  <Text style={[styles.kpiCardTitle, { color: colors.coral }]}>PENDING DUES</Text>
                  <Feather name="clock" size={15} color={colors.coral} />
                </View>
                <AnimatedCounter
                  value={dashboardData.total_pending}
                  prefix="₹"
                  style={[styles.kpiAmount, { color: colors.coral }]}
                />
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                  From {dashboardData.defaulters_count || 0} students
                </Text>
              </View>

              {/* Expected Total (Soft Blue) */}
              <View style={[styles.kpiCard, { backgroundColor: colors.softBlue, borderColor: colors.border }]}>
                <View style={styles.kpiCardHeader}>
                  <Text style={[styles.kpiCardTitle, { color: colors.primary }]}>GROSS EXPECTED</Text>
                  <Feather name="briefcase" size={15} color={colors.primary} />
                </View>
                <AnimatedCounter
                  value={dashboardData.total_expected}
                  prefix="₹"
                  style={[styles.kpiAmount, { color: colors.primary }]}
                />
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                  Total {dashboardData.total_students || 184} Registered
                </Text>
              </View>

              {/* Today's Counter (Soft Lavender) */}
              <View style={[styles.kpiCard, { backgroundColor: colors.softLavender, borderColor: colors.border }]}>
                <View style={styles.kpiCardHeader}>
                  <Text style={[styles.kpiCardTitle, { color: colors.purple }]}>TODAY REVENUE</Text>
                  <Feather name="activity" size={15} color={colors.purple} />
                </View>
                <AnimatedCounter
                  value={dashboardData.today_collection || 0}
                  prefix="₹"
                  style={[styles.kpiAmount, { color: colors.purple }]}
                />
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                  Counter + Online Sync
                </Text>
              </View>
            </View>

            {/* Quick Actions Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Counter Actions</Text>
              <View style={styles.quickActionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setCashierModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="cash-register" size={20} color="#FFF" />
                  <Text style={styles.actionBtnText}>New Collection</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.teal }]}
                  onPress={() => setActiveTab('roster')}
                  activeOpacity={0.85}
                >
                  <Feather name="search" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Lookup Student</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Collection Progress Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.cardHeading, { color: colors.text }]}>Institutional Recovery</Text>
                <Text style={[styles.rateBadge, { color: colors.green }]}>
                  {dashboardData.collection_rate}% Achieved
                </Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSubtle, marginTop: 10 }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, dashboardData.collection_rate || 0)}%`,
                      backgroundColor: colors.green,
                    },
                  ]}
                />
              </View>
              <View style={[styles.statSplitRow, { marginTop: 12 }]}>
                <View>
                  <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>Received</Text>
                  <Text style={[styles.splitVal, { color: colors.green }]}>
                    ₹{(dashboardData.total_collected / 100000).toFixed(2)} Lakhs
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>Remaining</Text>
                  <Text style={[styles.splitVal, { color: colors.coral }]}>
                    ₹{(dashboardData.total_pending / 100000).toFixed(2)} Lakhs
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* 2. STAFF ROSTER & DEFAULTERS                              */}
        {/* ======================================================== */}
        {isStaff && activeTab === 'roster' && (
          <View>
            {/* Search and Filters */}
            <View style={[styles.searchBarBox, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search Roll No or Name..."
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

            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              {(['ALL', 'UNPAID', 'PARTIAL', 'PAID'] as const).map((filter) => {
                const isSelected = statusFilter === filter;
                return (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setStatusFilter(filter)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {filter === 'ALL' ? 'All Students' : filter}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Students List */}
            {studentsList.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="inbox" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No records found</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Try clearing your search query or changing filters
                </Text>
              </View>
            ) : (
              studentsList.map((st: any) => {
                const pending = st.pending_balance ?? (st.net_payable - (st.total_paid || 0));
                const status = pending <= 0 ? 'PAID' : (st.total_paid > 0 ? 'PARTIAL' : 'UNPAID');

                return (
                  <TouchableOpacity
                    key={st.roll}
                    style={[styles.studentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleOpenStudentProfile(st.roll)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.studentCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.studentName, { color: colors.text }]}>{st.name}</Text>
                        <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>
                          {st.roll} • {st.branch} • Year {st.year}
                        </Text>
                      </View>
                      <StatusBadge
                        status={status === 'PAID' ? 'completed' : status === 'PARTIAL' ? 'pending' : 'failed'}
                        label={status}
                        size="sm"
                      />
                    </View>

                    <View style={[styles.studentCardStats, { backgroundColor: colors.surfaceSubtle }]}>
                      <View style={styles.cardStatCol}>
                        <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Net Payable</Text>
                        <Text style={[styles.cardStatVal, { color: colors.text }]}>
                          ₹{Number(st.net_payable || st.total_fee || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.cardStatCol}>
                        <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Paid</Text>
                        <Text style={[styles.cardStatVal, { color: colors.green }]}>
                          ₹{Number(st.total_paid || 0).toLocaleString('en-IN')}
                        </Text>
                      </View>
                      <View style={styles.cardStatCol}>
                        <Text style={[styles.cardStatLabel, { color: colors.textSecondary }]}>Due</Text>
                        <Text style={[styles.cardStatVal, { color: pending > 0 ? colors.coral : colors.green }]}>
                          ₹{Number(pending).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    {pending > 0 && (
                      <View style={styles.cardActionRow}>
                        <TouchableOpacity
                          style={[styles.quickCollectBtn, { backgroundColor: colors.softGreen }]}
                          onPress={() => {
                            handleLookupStudentForCashier(st.roll);
                            setCashierModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Feather name="plus-circle" size={13} color={colors.green} />
                          <Text style={[styles.quickCollectBtnText, { color: colors.green }]}>Collect Fee</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* ======================================================== */}
        {/* 3. STAFF CASHIER DESK                                    */}
        {/* ======================================================== */}
        {isStaff && activeTab === 'cashier_desk' && (
          <View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Fee Collection Counter</Text>
              <Text style={[styles.formSub, { color: colors.textSecondary }]}>
                Record official payment, update ledger & issue instant digital receipt
              </Text>

              {/* Roll Input & Lookup */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Student Roll Number *</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[
                      styles.inputField,
                      {
                        flex: 1,
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        color: colors.text,
                      },
                    ]}
                    value={cashierRoll}
                    onChangeText={handleLookupStudentForCashier}
                    placeholder="e.g. 0545CS231001"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[styles.lookupBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleLookupStudentForCashier(cashierRoll)}
                    activeOpacity={0.8}
                  >
                    <Feather name="search" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Lookup summary banner */}
              {cashierTargetStudent && (
                <View style={[styles.studentPreviewBox, { backgroundColor: colors.softBlue, borderColor: colors.primary }]}>
                  <Text style={[styles.previewName, { color: colors.primary }]}>
                    {cashierTargetStudent.student?.name}
                  </Text>
                  <Text style={[styles.previewMeta, { color: colors.textSecondary }]}>
                    {cashierTargetStudent.student?.branch} • Year {cashierTargetStudent.student?.year}
                  </Text>
                  <View style={[styles.previewCalcRow, { borderTopColor: 'rgba(0,0,0,0.06)' }]}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Outstanding Balance:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.coral }}>
                      ₹{Number(cashierTargetStudent.calculation?.pending_balance || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              )}

              {/* Amount Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Amount to Receive (₹) *</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={cashierAmount}
                  onChangeText={setCashierAmount}
                  placeholder="e.g. 15000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              {/* Payment Mode Pills */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Mode *</Text>
                <View style={styles.modePillsRow}>
                  {['CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER'].map((mode) => {
                    const isSelected = cashierMode === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.modePill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setCashierMode(mode)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.modePillText,
                            { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                          ]}
                        >
                          {mode.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Reference ID */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Transaction / Cheque / UTR No.</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={cashierRef}
                  onChangeText={setCashierRef}
                  placeholder="Optional reference identifier"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Remarks */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Remarks / Notes</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={cashierRemarks}
                  onChangeText={setCashierRemarks}
                  placeholder="e.g. Term 2 installment payment"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.collectSubmitBtn, { backgroundColor: colors.green }]}
                onPress={handleSubmitPayment}
                disabled={collectingPayment}
                activeOpacity={0.85}
              >
                {collectingPayment ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="receipt" size={18} color="#FFFFFF" />
                    <Text style={styles.collectSubmitBtnText}>Issue Official Fee Receipt</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* 4. STAFF DAILY REPORTS & AUDIT                           */}
        {/* ======================================================== */}
        {isStaff && activeTab === 'reports' && (
          <View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Today's Collection Breakdown</Text>
              <Text style={[styles.formSub, { color: colors.textSecondary }]}>
                Real-time collection reconciliation by payment channels
              </Text>

              <View style={styles.statsRow}>
                <View style={[styles.statCardSmall, { backgroundColor: colors.softGreen }]}>
                  <Text style={[styles.statCardVal, { color: colors.green }]}>
                    ₹{Number(dashboardData.today_collection || 0).toLocaleString('en-IN')}
                  </Text>
                  <Text style={[styles.statCardLbl, { color: colors.textSecondary }]}>Total Collected Today</Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 4 }]}>Modes Distribution</Text>
              {[
                { mode: 'Cash Counter', icon: 'dollar-sign', amount: 25000, count: 2, color: colors.green },
                { mode: 'UPI / QR Code', icon: 'smartphone', amount: 15000, count: 1, color: colors.primary },
                { mode: 'Card / POS', icon: 'credit-card', amount: 5000, count: 1, color: colors.purple },
                { mode: 'Cheque / Draft', icon: 'file-text', amount: 0, count: 0, color: colors.coral },
              ].map((item, idx) => (
                <View key={idx} style={[styles.feeItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.feeItemLeft}>
                    <Feather name={item.icon as any} size={15} color={item.color} />
                    <View>
                      <Text style={[styles.feeItemTitle, { color: colors.text }]}>{item.mode}</Text>
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>{item.count} Transactions</Text>
                    </View>
                  </View>
                  <Text style={[styles.feeItemVal, { color: colors.text }]}>
                    ₹{item.amount.toLocaleString('en-IN')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ======================================================== */}
        {/* 5. STUDENT VIEWS                                         */}
        {/* ======================================================== */}
        {isStudent && activeTab === 'my_fees' && (
          <View>
            {/* Balance Card */}
            <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.balanceRow}>
                <View>
                  <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>NET OUTSTANDING DUES</Text>
                  <AnimatedCounter
                    value={calc.pending_balance}
                    prefix="₹"
                    style={[
                      styles.balanceAmount,
                      { color: calc.pending_balance === 0 ? colors.green : colors.coral },
                    ]}
                  />
                </View>
                <StatusBadge
                  status={calc.pending_balance === 0 ? 'completed' : 'pending'}
                  label={calc.pending_balance === 0 ? 'CLEARED' : 'DUE SOON'}
                />
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceSubtle }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${paidPercent}%`,
                      backgroundColor: paidPercent === 100 ? colors.green : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressNote, { color: colors.textSecondary }]}>
                {paidPercent}% cleared (₹{Number(calc.total_paid).toLocaleString('en-IN')} of ₹{Number(calc.net_payable).toLocaleString('en-IN')})
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Concession summary */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statSub, { color: colors.textSecondary }]}>Gross Fee</Text>
                  <Text style={[styles.statVal, { color: colors.text }]}>
                    ₹{Number(calc.gross_fee).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statSub, { color: colors.green }]}>Concessions</Text>
                  <Text style={[styles.statVal, { color: colors.green }]}>
                    -₹{(Number(calc.scholarship || 0) + Number(calc.discount || 0)).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statSub, { color: colors.textSecondary }]}>Net Payable</Text>
                  <Text style={[styles.statVal, { color: colors.text }]}>
                    ₹{Number(calc.net_payable).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {calc.pending_balance > 0 && (
                <TouchableOpacity
                  style={[styles.payBtn, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    handleLookupStudentForCashier(user?.roll || '0545CS231001');
                    setCashierModalVisible(true);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="card-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.payBtnText}>Pay Online (₹{calc.pending_balance})</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Fee Component Breakdown */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Academic Fee Components</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.feeItem, { borderBottomColor: colors.border }]}>
                <View style={styles.feeItemLeft}>
                  <Feather name="book-open" size={15} color={colors.primary} />
                  <Text style={[styles.feeItemTitle, { color: colors.text }]}>Tuition & Lab Fee</Text>
                </View>
                <Text style={[styles.feeItemVal, { color: colors.text }]}>₹45,000</Text>
              </View>

              <View style={[styles.feeItem, { borderBottomColor: colors.border }]}>
                <View style={styles.feeItemLeft}>
                  <Feather name="shield" size={15} color={colors.teal} />
                  <Text style={[styles.feeItemTitle, { color: colors.text }]}>Development Fund</Text>
                </View>
                <Text style={[styles.feeItemVal, { color: colors.text }]}>₹15,000</Text>
              </View>

              <View style={[styles.feeItem, { borderBottomColor: colors.border }]}>
                <View style={styles.feeItemLeft}>
                  <Feather name="file-text" size={15} color={colors.purple} />
                  <Text style={[styles.feeItemTitle, { color: colors.text }]}>Exam & University Fee</Text>
                </View>
                <Text style={[styles.feeItemVal, { color: colors.text }]}>₹10,000</Text>
              </View>

              <View style={[styles.feeItem, { borderBottomWidth: 0 }]}>
                <View style={styles.feeItemLeft}>
                  <Feather name="truck" size={15} color={colors.amber} />
                  <Text style={[styles.feeItemTitle, { color: colors.text }]}>Bus Transport & Facilities</Text>
                </View>
                <Text style={[styles.feeItemVal, { color: colors.text }]}>₹5,000</Text>
              </View>
            </View>
          </View>
        )}

        {/* 6. STUDENT INSTALLMENTS */}
        {isStudent && activeTab === 'installments' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>4-Stage Semester Installments</Text>
            {installments.map((inst: any, idx: number) => {
              const isCleared = inst.status === 'PAID';
              const isPartial = inst.status === 'PARTIAL';

              return (
                <AnimatedCard
                  key={idx}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.demandHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.demandTitle, { color: colors.text }]}>
                        Stage {inst.installment_number}: {inst.name}
                      </Text>
                      <Text style={[styles.demandSub, { color: colors.textSecondary }]}>
                        Due Date: {inst.due_date}
                      </Text>
                    </View>
                    <Text style={[styles.demandAmount, { color: isCleared ? colors.green : colors.primary }]}>
                      ₹{Number(inst.due_amount).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={[styles.demandFooter, { borderTopColor: colors.border }]}>
                    <StatusBadge
                      status={isCleared ? 'paid' : isPartial ? 'pending' : 'failed'}
                      label={inst.status}
                      size="sm"
                    />

                    {!isCleared && (
                      <TouchableOpacity
                        style={[styles.smallPayBtn, { backgroundColor: colors.primary }]}
                        onPress={() => {
                          handleLookupStudentForCashier(user?.roll || '0545CS231001');
                          setCashierAmount(String(inst.due_amount - (inst.paid_amount || 0)));
                          setCashierModalVisible(true);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.smallPayBtnText}>Pay Installment</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </AnimatedCard>
              );
            })}
          </View>
        )}

        {/* 7. STUDENT LEDGER HISTORY */}
        {isStudent && activeTab === 'history' && (
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment History & Receipts</Text>
            {studentProfile?.ledger && studentProfile.ledger.length > 0 ? (
              studentProfile.ledger.map((tx: any, idx: number) => (
                <View
                  key={idx}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <Text style={[styles.receiptNo, { color: colors.text }]}>{tx.receipt_number || `REC-${idx + 1}`}</Text>
                      <Text style={[styles.receiptDate, { color: colors.textSecondary }]}>
                        {tx.created_at || tx.payment_date || 'Recent'} • {tx.payment_mode || 'COUNTER'}
                      </Text>
                    </View>
                    <Text style={[styles.receiptAmount, { color: colors.green }]}>
                      +₹{Number(tx.amount || tx.credit || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.viewReceiptBtn, { backgroundColor: colors.surfaceSubtle }]}
                    onPress={() => {
                      setCurrentReceipt(tx);
                      setReceiptModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name="eye" size={13} color={colors.primary} />
                    <Text style={[styles.viewReceiptBtnText, { color: colors.primary }]}>View Official Receipt</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="file-text" size={32} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No payment transactions yet</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  Your digital fee receipts will appear here automatically
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 8. STUDENT NO-DUES CLEARANCE */}
        {isStudent && activeTab === 'nodues' && (
          <View>
            <View style={[styles.noDuesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.noDuesHeader}>
                <View style={[styles.certIconBox, { backgroundColor: colors.softGreen }]}>
                  <MaterialCommunityIcons name="certificate" size={24} color={colors.green} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.certHeading, { color: colors.text }]}>OFFICIAL NO-DUES CLEARANCE</Text>
                  <Text style={[styles.certSub, { color: colors.textSecondary }]}>
                    Academic Examination & Institutional Clearance
                  </Text>
                </View>
              </View>

              <View style={[styles.certDetails, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={styles.certRow}>
                  <Text style={[styles.certLabel, { color: colors.textSecondary }]}>Certificate Status:</Text>
                  <Text
                    style={[
                      styles.certVal,
                      { color: calc.pending_balance === 0 ? colors.green : colors.coral },
                    ]}
                  >
                    {calc.pending_balance === 0 ? 'CLEARED & ELIGIBLE' : 'PENDING CLEARANCE'}
                  </Text>
                </View>
                <View style={styles.certRow}>
                  <Text style={[styles.certLabel, { color: colors.textSecondary }]}>Student Name:</Text>
                  <Text style={[styles.certVal, { color: colors.text }]}>{user?.name || 'STUDENT'}</Text>
                </View>
                <View style={styles.certRow}>
                  <Text style={[styles.certLabel, { color: colors.textSecondary }]}>Roll Number:</Text>
                  <Text style={[styles.certVal, { color: colors.text }]}>{user?.roll || user?.username || '0545CS231001'}</Text>
                </View>
              </View>

              {calc.pending_balance === 0 ? (
                <TouchableOpacity
                  style={[styles.shareCertBtn, { backgroundColor: colors.green }]}
                  onPress={handleShareNoDues}
                  activeOpacity={0.85}
                >
                  <Feather name="share-2" size={15} color="#FFFFFF" />
                  <Text style={styles.shareCertBtnText}>Share Verified No-Dues Certificate</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ fontSize: 11, color: colors.coral, textAlign: 'center', marginTop: 8 }}>
                  Clear remaining pending dues (₹{calc.pending_balance}) to generate certificate.
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ======================================================== */}
      {/* CASHIER MODAL (STAFF / STUDENT)                           */}
      {/* ======================================================== */}
      <Modal
        visible={cashierModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCashierModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Fee Collection Drawer</Text>
              <TouchableOpacity onPress={() => setCashierModalVisible(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Student Roll Number *</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={cashierRoll}
                  onChangeText={handleLookupStudentForCashier}
                  placeholder="e.g. 0545CS231001"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                />
              </View>

              {cashierTargetStudent && (
                <View style={[styles.studentPreviewBox, { backgroundColor: colors.softBlue, borderColor: colors.primary }]}>
                  <Text style={[styles.previewName, { color: colors.primary }]}>
                    {cashierTargetStudent.student?.name}
                  </Text>
                  <Text style={[styles.previewMeta, { color: colors.textSecondary }]}>
                    {cashierTargetStudent.student?.branch} • Year {cashierTargetStudent.student?.year}
                  </Text>
                  <View style={[styles.previewCalcRow, { borderTopColor: 'rgba(0,0,0,0.06)' }]}>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Outstanding Balance:</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: colors.coral }}>
                      ₹{Number(cashierTargetStudent.calculation?.pending_balance || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Amount to Receive (₹) *</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={cashierAmount}
                  onChangeText={setCashierAmount}
                  placeholder="e.g. 15000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Mode *</Text>
                <View style={styles.modePillsRow}>
                  {['CASH', 'UPI', 'CARD', 'CHEQUE', 'BANK_TRANSFER'].map((mode) => {
                    const isSelected = cashierMode === mode;
                    return (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.modePill,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.surfaceSubtle,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setCashierMode(mode)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.modePillText,
                            { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                          ]}
                        >
                          {mode.replace('_', ' ')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Reference / Cheque No.</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={cashierRef}
                  onChangeText={setCashierRef}
                  placeholder="Optional reference identifier"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <TouchableOpacity
                style={[styles.collectSubmitBtn, { backgroundColor: colors.green, marginTop: 14 }]}
                onPress={handleSubmitPayment}
                disabled={collectingPayment}
                activeOpacity={0.85}
              >
                {collectingPayment ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="receipt" size={18} color="#FFFFFF" />
                    <Text style={styles.collectSubmitBtnText}>Process & Generate Receipt</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* OFFICIAL RECEIPT MODAL                                   */}
      {/* ======================================================== */}
      <Modal
        visible={receiptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Official Fee Receipt 🧾</Text>
              <TouchableOpacity onPress={() => setReceiptModalVisible(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {currentReceipt && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                {/* Institute Badge */}
                <View style={[styles.receiptHeaderBox, { backgroundColor: colors.surfaceSubtle }]}>
                  <Text style={[styles.receiptInstName, { color: colors.text }]}>
                    SHRI BALAJI INSTITUTE OF TECHNOLOGY & MANAGEMENT
                  </Text>
                  <Text style={[styles.receiptInstSub, { color: colors.textSecondary }]}>
                    Betul, Madhya Pradesh • Approved by AICTE & Affiliated to RGPV
                  </Text>
                  <View style={[styles.receiptBadge, { backgroundColor: colors.softGreen }]}>
                    <Text style={[styles.receiptBadgeText, { color: colors.green }]}>PAYMENT VERIFIED</Text>
                  </View>
                </View>

                {/* Receipt Details Grid */}
                <View style={[styles.receiptDetailsCard, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.receiptGridRow}>
                    <Text style={[styles.receiptGridLbl, { color: colors.textSecondary }]}>Receipt No:</Text>
                    <Text style={[styles.receiptGridVal, { color: colors.text }]}>
                      {currentReceipt.receipt_number}
                    </Text>
                  </View>
                  <View style={styles.receiptGridRow}>
                    <Text style={[styles.receiptGridLbl, { color: colors.textSecondary }]}>Date & Time:</Text>
                    <Text style={[styles.receiptGridVal, { color: colors.text }]}>
                      {currentReceipt.payment_date || new Date().toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.receiptGridRow}>
                    <Text style={[styles.receiptGridLbl, { color: colors.textSecondary }]}>Student Roll:</Text>
                    <Text style={[styles.receiptGridVal, { color: colors.text }]}>
                      {currentReceipt.student_roll}
                    </Text>
                  </View>
                  <View style={styles.receiptGridRow}>
                    <Text style={[styles.receiptGridLbl, { color: colors.textSecondary }]}>Student Name:</Text>
                    <Text style={[styles.receiptGridVal, { color: colors.text }]}>
                      {currentReceipt.student_name || 'STUDENT'}
                    </Text>
                  </View>
                  <View style={styles.receiptGridRow}>
                    <Text style={[styles.receiptGridLbl, { color: colors.textSecondary }]}>Payment Mode:</Text>
                    <Text style={[styles.receiptGridVal, { color: colors.text }]}>
                      {currentReceipt.payment_mode}
                    </Text>
                  </View>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <View style={styles.receiptGridRow}>
                    <Text style={[styles.receiptTotalLbl, { color: colors.text }]}>Amount Received:</Text>
                    <Text style={[styles.receiptTotalVal, { color: colors.green }]}>
                      ₹{Number(currentReceipt.amount_paid || currentReceipt.amount || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  {currentReceipt.remaining_balance !== undefined && (
                    <View style={styles.receiptGridRow}>
                      <Text style={[styles.receiptGridLbl, { color: colors.textSecondary }]}>Remaining Due:</Text>
                      <Text style={[styles.receiptGridVal, { color: colors.coral }]}>
                        ₹{Number(currentReceipt.remaining_balance).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    style={[styles.shareReceiptBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={() => handleShareReceipt(currentReceipt)}
                    activeOpacity={0.85}
                  >
                    <Feather name="share-2" size={15} color="#FFFFFF" />
                    <Text style={styles.shareReceiptBtnText}>Share Receipt</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.shareReceiptBtn, { backgroundColor: colors.surfaceSubtle, flex: 1 }]}
                    onPress={() => setReceiptModalVisible(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.shareReceiptBtnText, { color: colors.text }]}>Done</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* STUDENT FULL PROFILE & LEDGER MODAL                      */}
      {/* ======================================================== */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {studentProfile?.student?.name || 'Student Fee Profile'}
              </Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {studentProfile && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                {/* Meta details */}
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 12 }}>
                  Roll: {studentProfile.student?.roll} • Branch: {studentProfile.student?.branch} • Year: {studentProfile.student?.year}
                </Text>

                {/* Calculations grid */}
                <View style={[styles.certDetails, { backgroundColor: colors.surfaceSubtle }]}>
                  <View style={styles.certRow}>
                    <Text style={[styles.certLabel, { color: colors.textSecondary }]}>Gross Fee:</Text>
                    <Text style={[styles.certVal, { color: colors.text }]}>
                      ₹{Number(studentProfile.calculation?.gross_fee || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.certRow}>
                    <Text style={[styles.certLabel, { color: colors.green }]}>Scholarship + Discount:</Text>
                    <Text style={[styles.certVal, { color: colors.green }]}>
                      -₹{(Number(studentProfile.calculation?.scholarship || 0) + Number(studentProfile.calculation?.discount || 0)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.certRow}>
                    <Text style={[styles.certLabel, { color: colors.textSecondary }]}>Net Payable:</Text>
                    <Text style={[styles.certVal, { color: colors.text, fontWeight: '800' }]}>
                      ₹{Number(studentProfile.calculation?.net_payable || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.certRow}>
                    <Text style={[styles.certLabel, { color: colors.textSecondary }]}>Total Paid:</Text>
                    <Text style={[styles.certVal, { color: colors.green, fontWeight: '800' }]}>
                      ₹{Number(studentProfile.calculation?.total_paid || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.certRow}>
                    <Text style={[styles.certLabel, { color: colors.coral }]}>Pending Balance:</Text>
                    <Text style={[styles.certVal, { color: colors.coral, fontWeight: '900' }]}>
                      ₹{Number(studentProfile.calculation?.pending_balance || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>

                {/* 4 Installments */}
                <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>
                  Installment Schedule
                </Text>
                {studentProfile.installments?.map((inst: any, idx: number) => (
                  <View
                    key={idx}
                    style={[styles.feeItem, { borderBottomColor: colors.border }]}
                  >
                    <View>
                      <Text style={[styles.feeItemTitle, { color: colors.text }]}>
                        Stage {inst.installment_number}: {inst.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textSecondary }}>Due: {inst.due_date}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.feeItemVal, { color: colors.text }]}>
                        ₹{Number(inst.due_amount).toLocaleString('en-IN')}
                      </Text>
                      <StatusBadge
                        status={inst.status === 'PAID' ? 'completed' : 'pending'}
                        label={inst.status}
                        size="sm"
                      />
                    </View>
                  </View>
                ))}

                {/* Quick Action in profile */}
                {(studentProfile.calculation?.pending_balance || 0) > 0 && (
                  <TouchableOpacity
                    style={[styles.collectSubmitBtn, { backgroundColor: colors.green, marginTop: 16 }]}
                    onPress={() => {
                      setProfileModalVisible(false);
                      handleLookupStudentForCashier(studentProfile.student?.roll);
                      setCashierModalVisible(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <MaterialCommunityIcons name="cash-register" size={17} color="#FFF" />
                    <Text style={styles.collectSubmitBtnText}>Collect Payment for Student</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* ACCOUNTANT EDIT INSTALLMENT DATES & AMOUNT MODAL          */}
      {/* ======================================================== */}
      <Modal
        visible={editScheduleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditScheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Edit Installment #{editingInstData.installment_no}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  Student Year: {selectedScheduleYear}{selectedScheduleYear === 1 ? 'st' : selectedScheduleYear === 2 ? 'nd' : selectedScheduleYear === 3 ? 'rd' : 'th'} Year • Academic Year 2026-27
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditScheduleModalVisible(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Title */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Installment Title</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: colors.surfaceSubtle, color: colors.text, borderColor: colors.border }]}
                  value={editingInstData.title}
                  onChangeText={(val) => setEditingInstData({ ...editingInstData, title: val })}
                  placeholder="e.g. Installment 1"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Amount */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Installment Amount (₹)</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: colors.surfaceSubtle, color: colors.text, borderColor: colors.border }]}
                  value={editingInstData.amount}
                  onChangeText={(val) => setEditingInstData({ ...editingInstData, amount: val })}
                  keyboardType="numeric"
                  placeholder="e.g. 13750"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Release Date */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Release Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: colors.surfaceSubtle, color: colors.text, borderColor: colors.border }]}
                  value={editingInstData.release_date}
                  onChangeText={(val) => setEditingInstData({ ...editingInstData, release_date: val })}
                  placeholder="YYYY-MM-DD (e.g. 2026-07-01)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Due Date */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Due Date / Late Fee Starts (YYYY-MM-DD)</Text>
                <TextInput
                  style={[styles.inputField, { backgroundColor: colors.surfaceSubtle, color: colors.text, borderColor: colors.border }]}
                  value={editingInstData.due_date}
                  onChangeText={(val) => setEditingInstData({ ...editingInstData, due_date: val })}
                  placeholder="YYYY-MM-DD (e.g. 2026-07-15)"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.collectSubmitBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                onPress={handleSaveScheduleEdit}
                disabled={savingSchedule}
                activeOpacity={0.85}
              >
                {savingSchedule ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Feather name="check" size={16} color="#FFF" />
                    <Text style={styles.collectSubmitBtnText}>Save Changes for Year {selectedScheduleYear}</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  collectTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  collectTopBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  tabItemActive: {
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  kpiCard: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  kpiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kpiAmount: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  kpiSub: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: '800',
  },
  rateBadge: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  splitLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  splitVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  studentCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '800',
  },
  studentMeta: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  studentCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
  },
  cardStatCol: {
    alignItems: 'center',
    flex: 1,
  },
  cardStatLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  cardStatVal: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  quickCollectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  quickCollectBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  formSub: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputField: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  lookupBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentPreviewBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  previewName: {
    fontSize: 12,
    fontWeight: '800',
  },
  previewMeta: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  previewCalcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  modePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  collectSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  collectSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statCardSmall: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  statCardVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  statCardLbl: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  feeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  feeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feeItemTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  feeItemVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  balanceCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  progressNote: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 6,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 14,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  demandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  demandTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  demandSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  demandAmount: {
    fontSize: 16,
    fontWeight: '800',
  },
  demandFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  smallPayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallPayBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  receiptNo: {
    fontSize: 12,
    fontWeight: '800',
  },
  receiptDate: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  receiptAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  viewReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  viewReceiptBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  noDuesCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
  },
  noDuesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  certIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certHeading: {
    fontSize: 14,
    fontWeight: '800',
  },
  certSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  certDetails: {
    padding: 12,
    borderRadius: 12,
    gap: 6,
    marginBottom: 14,
  },
  certRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  certLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  certVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  shareCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareCertBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  receiptHeaderBox: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  receiptInstName: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  receiptInstSub: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  receiptBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  receiptBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  receiptDetailsCard: {
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  receiptGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptGridLbl: {
    fontSize: 11,
    fontWeight: '500',
  },
  receiptGridVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  receiptTotalLbl: {
    fontSize: 12,
    fontWeight: '800',
  },
  receiptTotalVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  shareReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareReceiptBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  deskIconCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
});
