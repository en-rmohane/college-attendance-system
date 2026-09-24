import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { allBusRoutes, getBusPassForStudent } from '../services/collegeDatabase';
import { api } from '../services/api';

export default function TransportScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const isAccountant = (user?.role as string) === 'accountant' || (user?.role as string) === 'fee_manager';
  const isAdmin = user?.role === 'admin';
  const isBusIncharge = (user?.role as string) === 'bus_incharge' || (user?.role as string) === 'transport_incharge' || (user?.role as string) === 'driver';
  const isStaff = isAccountant || isAdmin || isBusIncharge;

  // Active Tab State (Bus Incharge defaults to 'scanner', Accountant to 'approvals', Student to 'pass')
  const [activeTab, setActiveTab] = useState<string>(
    route?.params?.initialTab || (isBusIncharge ? 'scanner' : (isAccountant ? 'approvals' : (isAdmin ? 'routes' : 'pass')))
  );

  const [selectedRouteId, setSelectedRouteId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [passSearchQuery, setPassSearchQuery] = useState('');
  const [transportApprovals, setTransportApprovals] = useState<any[]>([]);
  const [issuedPasses, setIssuedPasses] = useState<any[]>([
    {
      id: 1,
      pass_number: 'BP-2026-000001',
      student_name: 'RAVI KUMAR',
      student_roll: '0545CS231001',
      branch: 'CSE',
      year: 2,
      route_name: 'Betul Campus Express',
      bus_number: 'MP-48-PA-1204',
      stop_name: 'Betul Station',
      annual_fee: 15000,
      valid_upto: '30/06/2027',
      status: 'ACTIVE',
    },
    {
      id: 2,
      pass_number: 'BP-2026-000002',
      student_name: 'PRIYA SHARMA',
      student_roll: '0545CS231002',
      branch: 'CSE',
      year: 2,
      route_name: 'Multai Campus Express',
      bus_number: 'MP-48-PA-1588',
      stop_name: 'Multai Bus Stand',
      annual_fee: 25000,
      valid_upto: '30/06/2027',
      status: 'ACTIVE',
    },
    {
      id: 3,
      pass_number: 'BP-2026-000003',
      student_name: 'AMAN VERMA',
      student_roll: '0545AD231005',
      branch: 'AD',
      year: 2,
      route_name: 'Pandhurna Express',
      bus_number: 'MP-48-PA-2102',
      stop_name: 'Pandhurna Bypass',
      annual_fee: 30000,
      valid_upto: '30/06/2027',
      status: 'ACTIVE',
    },
  ]);

  // QR Scanner / Verifier State
  const [verifyToken, setVerifyToken] = useState('PASS-03AAD6E391154170B361');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  // Student Pass Application State
  const [selectedApplyRoute, setSelectedApplyRoute] = useState(1);
  const [applyPaymentMode, setApplyPaymentMode] = useState('UPI');
  const [applyTxnId, setApplyTxnId] = useState('');
  const [studentBusPass, setStudentBusPass] = useState<any>(null);

  const routes = allBusRoutes;
  const currentRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  const loadData = async () => {
    setLoading(true);
    try {
      if (isStaff) {
        const res = await api.getAccountantTransportApprovals('PENDING_APPROVAL', '2026-27');
        if (res?.success && res.requests) {
          setTransportApprovals(res.requests);
        }
      } else {
        const studentRoll = user?.roll || user?.student_roll;
        if (studentRoll) {
          try {
            const passRes = await api.getStudentBusPass(studentRoll);
            if (passRes?.success && passRes.busPass) {
              setStudentBusPass(passRes.busPass);
            } else {
              const localPass = getBusPassForStudent(studentRoll);
              setStudentBusPass(localPass);
            }
          } catch {
            const localPass = getBusPassForStudent(studentRoll);
            setStudentBusPass(localPass);
          }
        }
      }
    } catch (e) {
      console.log('Error fetching transport data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  const handleCallDriver = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert('Unable to dial', `Call driver directly at ${phone}`);
    });
  };

  const handleSharePass = async () => {
    if (!studentBusPass) return;
    try {
      await Share.share({
        message: `SBITM Digital Bus Pass\nPass ID: ${studentBusPass.passNumber || studentBusPass.pass_number}\nStudent: ${studentBusPass.studentName || studentBusPass.student_name} (${studentBusPass.studentRoll || studentBusPass.student_roll})\nRoute: ${studentBusPass.routeName || studentBusPass.route_name} (Bus: ${studentBusPass.busNumber || studentBusPass.bus_number})\nPickup: ${studentBusPass.stopName || studentBusPass.stop_name || 'Campus Gate'}\nStatus: ${studentBusPass.status || 'ACTIVE'}`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  // Accountant Approves Bus Pass
  const handleApproveTransport = async (reqId: number, studentName: string) => {
    Alert.alert('Authorize Bus Pass', `Approve transport fee and activate Digital QR Pass for ${studentName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve & Activate',
        onPress: async () => {
          try {
            const res = await api.approveTransportPayment(reqId, user?.id || 202);
            if (res?.success) {
              Alert.alert('Pass Activated 🎉', `Digital QR Bus Pass has been generated and issued to ${studentName}.`);
              loadData();
            } else {
              Alert.alert('Approval Failed', res?.message || 'Could not approve request.');
            }
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  // Accountant Rejects Bus Pass
  const handleRejectTransport = async (reqId: number, studentName: string) => {
    Alert.alert('Reject Application', `Are you sure you want to reject transport request for ${studentName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          const res = await api.rejectTransportPayment(reqId, 'Payment mismatch / Invalid transaction proof');
          if (res?.success) {
            Alert.alert('Rejected', `Transport application for ${studentName} has been rejected.`);
            loadData();
          }
        },
      },
    ]);
  };

  // QR Pass Scanner / Verifier
  const handleVerifyPassToken = async () => {
    if (!verifyToken.trim()) {
      Alert.alert('Enter Token', 'Please enter a valid QR token (e.g. PASS-03AAD6E391154170B361)');
      return;
    }
    setVerifying(true);
    try {
      const res = await api.verifyTransportPass(verifyToken.trim());
      if (res?.valid) {
        setVerifyResult(res);
      } else {
        setVerifyResult({
          valid: false,
          message: res?.message || 'Invalid or Expired Pass Token',
        });
      }
    } catch (e: any) {
      setVerifyResult({ valid: false, message: e.message });
    } finally {
      setVerifying(false);
    }
  };

  // Student Submits Bus Pass Application
  const handleStudentApply = async () => {
    if (!applyTxnId.trim()) {
      Alert.alert('Missing Transaction ID', 'Please enter UPI reference/UTR number or receipt proof.');
      return;
    }
    try {
      const res = await api.payTransportOnline({
        roll: user?.roll || '0545CS231001',
        student_id: user?.id || 1,
        route_id: selectedApplyRoute,
        payment_mode: applyPaymentMode,
      });
      if (res?.success) {
        Alert.alert(
          'Application Submitted ✅',
          'Your transport subscription and payment proof have been sent to the Accountant Desk for authorization. Your digital QR pass will be active once approved.'
        );
        setActiveTab('pass');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.surfaceSubtle }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isBusIncharge
                ? 'Transit & Bus Incharge Desk'
                : isAccountant
                ? 'Transport Accounts Desk'
                : isAdmin
                ? 'Fleet & Transport Hub'
                : 'Campus Transport'}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
              {isBusIncharge
                ? 'Scan student barcodes, verify passes & check bus roster'
                : isStaff
                ? 'Fleet Routes, Pass Approvals, Roster & QR Verification'
                : 'Digital Bus Passes, Routes & Live Driver Helplines'}
            </Text>
          </View>
        </View>

        {/* Tab Chips (Strict Role Segregation) */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {/* STAFF TABS */}
          {isStaff ? (
            <>
              {/* 1. QR / Barcode Verifier (Priority for Bus Incharge) */}
              {(isBusIncharge || isAdmin) && (
                <TouchableOpacity
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor: activeTab === 'scanner' ? colors.purple : colors.surfaceSubtle,
                      borderColor: activeTab === 'scanner' ? colors.purple : colors.border,
                    },
                  ]}
                  onPress={() => setActiveTab('scanner')}
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={13}
                    color={activeTab === 'scanner' ? '#FFF' : colors.purple}
                  />
                  <Text
                    style={[
                      styles.tabPillText,
                      { color: activeTab === 'scanner' ? '#FFF' : colors.purple },
                    ]}
                  >
                    Barcode Verifier
                  </Text>
                </TouchableOpacity>
              )}

              {/* 2. Approvals Queue (Accountant & Admin) */}
              {(isAccountant || isAdmin) && (
                <TouchableOpacity
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor: activeTab === 'approvals' ? colors.amber : colors.surfaceSubtle,
                      borderColor: activeTab === 'approvals' ? colors.amber : colors.border,
                    },
                  ]}
                  onPress={() => setActiveTab('approvals')}
                >
                  <Feather name="check-square" size={13} color={activeTab === 'approvals' ? '#FFF' : colors.amber} />
                  <Text
                    style={[
                      styles.tabPillText,
                      { color: activeTab === 'approvals' ? '#FFF' : colors.amber },
                    ]}
                  >
                    Approvals ({transportApprovals.length})
                  </Text>
                </TouchableOpacity>
              )}

              {/* 3. Issued Passes Roster (All Staff: Accountant & Bus Incharge) */}
              <TouchableOpacity
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: activeTab === 'passes' ? colors.green : colors.surfaceSubtle,
                    borderColor: activeTab === 'passes' ? colors.green : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('passes')}
              >
                <FontAwesome5 name="id-badge" size={13} color={activeTab === 'passes' ? '#FFF' : colors.green} />
                <Text
                  style={[
                    styles.tabPillText,
                    { color: activeTab === 'passes' ? '#FFF' : colors.green },
                  ]}
                >
                  Issued Passes ({issuedPasses.length})
                </Text>
              </TouchableOpacity>

              {/* 4. Fleet & Routes */}
              <TouchableOpacity
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: activeTab === 'routes' ? colors.primary : colors.surfaceSubtle,
                    borderColor: activeTab === 'routes' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('routes')}
              >
                <Feather name="map" size={13} color={activeTab === 'routes' ? '#FFF' : colors.textSecondary} />
                <Text
                  style={[
                    styles.tabPillText,
                    { color: activeTab === 'routes' ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  Fleet Routes
                </Text>
              </TouchableOpacity>

              {/* QR Scanner Verifier for Accountant if not already rendered */}
              {isAccountant && !isBusIncharge && (
                <TouchableOpacity
                  style={[
                    styles.tabPill,
                    {
                      backgroundColor: activeTab === 'scanner' ? colors.purple : colors.surfaceSubtle,
                      borderColor: activeTab === 'scanner' ? colors.purple : colors.border,
                    },
                  ]}
                  onPress={() => setActiveTab('scanner')}
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={13}
                    color={activeTab === 'scanner' ? '#FFF' : colors.purple}
                  />
                  <Text
                    style={[
                      styles.tabPillText,
                      { color: activeTab === 'scanner' ? '#FFF' : colors.purple },
                    ]}
                  >
                    Barcode Verifier
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            /* STUDENT TABS */
            <>
              {/* 1. Digital Pass */}
              <TouchableOpacity
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: activeTab === 'pass' ? colors.primary : colors.surfaceSubtle,
                    borderColor: activeTab === 'pass' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('pass')}
              >
                <FontAwesome5
                  name="id-badge"
                  size={12}
                  color={activeTab === 'pass' ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabPillText,
                    { color: activeTab === 'pass' ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  Digital Pass
                </Text>
              </TouchableOpacity>

              {/* 2. Routes & Stops */}
              <TouchableOpacity
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: activeTab === 'routes' ? colors.primary : colors.surfaceSubtle,
                    borderColor: activeTab === 'routes' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('routes')}
              >
                <Feather
                  name="map"
                  size={12}
                  color={activeTab === 'routes' ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabPillText,
                    { color: activeTab === 'routes' ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  Routes & Stops
                </Text>
              </TouchableOpacity>

              {/* 3. Apply Pass (STUDENT ONLY) */}
              <TouchableOpacity
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: activeTab === 'apply' ? colors.primary : colors.surfaceSubtle,
                    borderColor: activeTab === 'apply' ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setActiveTab('apply')}
              >
                <Feather
                  name="edit"
                  size={12}
                  color={activeTab === 'apply' ? '#FFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabPillText,
                    { color: activeTab === 'apply' ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  Apply Pass
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* =========================================================================
            STAFF TAB 1: FLEET & ROUTES
            ========================================================================= */}
        {activeTab === 'routes' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>College Bus Fleet (3 Routes)</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Betul, Multai & Pandhurna transport corridors
                </Text>
              </View>
            </View>

            {/* Route Selector Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routePills}>
              {routes.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.routePill,
                    {
                      backgroundColor: selectedRouteId === r.id ? colors.primary : colors.card,
                      borderColor: selectedRouteId === r.id ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedRouteId(r.id)}
                >
                  <Text
                    style={[
                      styles.routePillText,
                      { color: selectedRouteId === r.id ? '#FFF' : colors.textSecondary },
                    ]}
                  >
                    {r.routeNumber}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Selected Route Detailed Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.routeHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routeName, { color: colors.text }]}>{currentRoute.routeNumber}</Text>
                  <Text style={[styles.routeSpan, { color: colors.textSecondary }]}>
                    {currentRoute.startPoint} ➔ {currentRoute.endPoint}
                  </Text>
                </View>
                <View style={[styles.busTag, { backgroundColor: colors.softBlue }]}>
                  <Text style={[styles.busTagText, { color: colors.primary }]}>{currentRoute.busNumber}</Text>
                </View>
              </View>

              {/* Annual Fee Badge */}
              <View
                style={[
                  styles.feeBanner,
                  {
                    backgroundColor:
                      currentRoute.id === 1
                        ? colors.softGreen
                        : currentRoute.id === 2
                        ? colors.softYellow
                        : colors.softLavender,
                  },
                ]}
              >
                <Feather
                  name="dollar-sign"
                  size={14}
                  color={
                    currentRoute.id === 1 ? colors.green : currentRoute.id === 2 ? colors.amber : colors.purple
                  }
                />
                <Text
                  style={[
                    styles.feeBannerText,
                    {
                      color:
                        currentRoute.id === 1 ? colors.green : currentRoute.id === 2 ? colors.amber : colors.purple,
                    },
                  ]}
                >
                  Annual Transport Fee: ₹
                  {currentRoute.id === 1
                    ? '15,000'
                    : currentRoute.id === 2
                    ? '25,000'
                    : '30,000'}{' '}
                  / student
                </Text>
              </View>

              {/* Driver and Bus Incharge Bar */}
              <View style={[styles.driverBar, { backgroundColor: colors.surfaceSubtle }]}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Feather name="user" size={14} color={colors.textSecondary} />
                  <Text style={[styles.driverBarText, { color: colors.textSecondary }]}>
                    {currentRoute.driverName} ({currentRoute.driverPhone})
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.callBtnSmall, { backgroundColor: colors.green }]}
                  onPress={() => handleCallDriver(currentRoute.driverPhone)}
                >
                  <Ionicons name="call" size={12} color="#FFF" />
                  <Text style={styles.callBtnSmallText}>Call</Text>
                </TouchableOpacity>
              </View>

              {/* Morning Pickup Schedule Timeline */}
              <Text style={[styles.stopsHeader, { color: colors.text }]}>Pickup Stops & Schedule</Text>
              <View style={styles.stopsList}>
                {currentRoute.stops.map((stop, idx) => (
                  <View key={stop.id} style={styles.stopItem}>
                    <View style={styles.stopTimeline}>
                      <View style={[styles.stopDot, { backgroundColor: colors.primary }]} />
                      {idx < currentRoute.stops.length - 1 && (
                        <View style={[styles.stopLine, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                    <View style={styles.stopInfo}>
                      <Text style={[styles.stopName, { color: colors.text }]}>{stop.name}</Text>
                      <Text style={[styles.stopTime, { color: colors.textSecondary }]}>
                        Pickup: {stop.time} {stop.fare > 0 ? `• ₹${stop.fare}/yr` : '• Campus Arrival'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* =========================================================================
            STAFF TAB 2: PENDING TRANSPORT APPROVALS QUEUE
            ========================================================================= */}
        {isStaff && activeTab === 'approvals' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Transport Approvals Queue</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Review fee payments & activate digital QR bus passes
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : transportApprovals.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.softGreen }]}>
                  <Feather name="check-circle" size={28} color={colors.green} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pending Requests 🎉</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  All student transport subscriptions have been authorized and passes issued.
                </Text>
              </View>
            ) : (
              transportApprovals.map((req) => (
                <View
                  key={req.id}
                  style={[styles.approvalCard, { backgroundColor: colors.card, borderColor: `${colors.amber}50` }]}
                >
                  <View style={styles.approvalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.approvalStudentName, { color: colors.text }]}>{req.student_name}</Text>
                      <Text style={[styles.approvalStudentMeta, { color: colors.textSecondary }]}>
                        {req.student_roll} • {req.branch} • Year {req.year}
                      </Text>
                    </View>
                    <View style={[styles.feePill, { backgroundColor: colors.softGreen }]}>
                      <Text style={[styles.feePillText, { color: colors.green }]}>
                        ₹{Number(req.amount || 15000).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.approvalDetailsBox, { backgroundColor: colors.surfaceSubtle }]}>
                    <View style={styles.approvalDetailRow}>
                      <Text style={[styles.approvalLbl, { color: colors.textSecondary }]}>Route:</Text>
                      <Text style={[styles.approvalVal, { color: colors.text }]}>{req.route_name}</Text>
                    </View>
                    <View style={styles.approvalDetailRow}>
                      <Text style={[styles.approvalLbl, { color: colors.textSecondary }]}>Pickup Stop:</Text>
                      <Text style={[styles.approvalVal, { color: colors.text }]}>{req.stop_name || 'Main Stop'}</Text>
                    </View>
                    <View style={styles.approvalDetailRow}>
                      <Text style={[styles.approvalLbl, { color: colors.textSecondary }]}>Payment Mode:</Text>
                      <Text style={[styles.approvalVal, { color: colors.primary }]}>{req.payment_mode || 'UPI'}</Text>
                    </View>
                  </View>

                  <View style={styles.approvalActionsRow}>
                    <TouchableOpacity
                      style={[styles.rejectBtn, { borderColor: colors.coral }]}
                      onPress={() => handleRejectTransport(req.id, req.student_name)}
                    >
                      <Feather name="x" size={14} color={colors.coral} />
                      <Text style={[styles.rejectBtnText, { color: colors.coral }]}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.approveBtn, { backgroundColor: colors.green }]}
                      onPress={() => handleApproveTransport(req.id, req.student_name)}
                    >
                      <Feather name="check" size={14} color="#FFF" />
                      <Text style={styles.approveBtnText}>Approve & Issue Pass</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* =========================================================================
            STAFF TAB 3: ISSUED BUS PASSES ROSTER
            ========================================================================= */}
        {isStaff && activeTab === 'passes' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Pass Holders ({issuedPasses.length})</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Authorized students with active digital transit barcodes & QR passes
                </Text>
              </View>
            </View>

            {/* Search Filter Box */}
            <View style={{ marginBottom: 12 }}>
              <View style={[styles.searchInputBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={16} color={colors.textSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search student name, roll number, or pass ID..."
                  placeholderTextColor={colors.textMuted}
                  value={passSearchQuery}
                  onChangeText={setPassSearchQuery}
                />
                {passSearchQuery ? (
                  <TouchableOpacity onPress={() => setPassSearchQuery('')}>
                    <Feather name="x" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {issuedPasses.filter(
              (p) =>
                !passSearchQuery ||
                p.student_name.toLowerCase().includes(passSearchQuery.toLowerCase()) ||
                p.student_roll.toLowerCase().includes(passSearchQuery.toLowerCase()) ||
                p.pass_number.toLowerCase().includes(passSearchQuery.toLowerCase()) ||
                p.route_name.toLowerCase().includes(passSearchQuery.toLowerCase())
            ).length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="info" size={24} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 8 }]}>No Pass Records Found</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  {passSearchQuery
                    ? `No students matching "${passSearchQuery}"`
                    : 'No student bus passes have been issued yet.'}
                </Text>
              </View>
            ) : (
              issuedPasses
                .filter(
                  (p) =>
                    !passSearchQuery ||
                    p.student_name.toLowerCase().includes(passSearchQuery.toLowerCase()) ||
                    p.student_roll.toLowerCase().includes(passSearchQuery.toLowerCase()) ||
                    p.pass_number.toLowerCase().includes(passSearchQuery.toLowerCase()) ||
                    p.route_name.toLowerCase().includes(passSearchQuery.toLowerCase())
                )
                .map((p) => (
                  <View key={p.id} style={[styles.passRosterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.passRosterHeader}>
                      <View style={[styles.passNumberPill, { backgroundColor: colors.softBlue }]}>
                        <Text style={[styles.passNumberText, { color: colors.primary }]}>{p.pass_number}</Text>
                      </View>
                      <View style={[styles.activeStatusPill, { backgroundColor: colors.softGreen }]}>
                        <Text style={[styles.activeStatusText, { color: colors.green }]}>ACTIVE</Text>
                      </View>
                    </View>

                    <Text style={[styles.passStudentTitle, { color: colors.text }]}>{p.student_name}</Text>
                    <Text style={[styles.passStudentSub, { color: colors.textSecondary }]}>
                      {p.student_roll} • {p.branch} • Year {p.year}
                    </Text>

                    <View style={[styles.passRosterDetails, { backgroundColor: colors.surfaceSubtle }]}>
                      <View style={styles.rosterRow}>
                        <Feather name="map-pin" size={12} color={colors.primary} />
                        <Text style={[styles.rosterText, { color: colors.text }]}>{p.route_name}</Text>
                      </View>
                      <View style={styles.rosterRow}>
                        <Feather name="navigation" size={12} color={colors.teal} />
                        <Text style={[styles.rosterText, { color: colors.text }]}>{p.stop_name}</Text>
                      </View>
                      <View style={styles.rosterRow}>
                        <Feather name="truck" size={12} color={colors.purple} />
                        <Text style={[styles.rosterText, { color: colors.text }]}>{p.bus_number}</Text>
                      </View>
                    </View>
                  </View>
                ))
            )}
          </View>
        )}

        {/* =========================================================================
            STAFF TAB 4: QR & BARCODE VERIFIER (BUS INCHARGE / SECURITY)
            ========================================================================= */}
        {isStaff && activeTab === 'scanner' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Transit Barcode & QR Verifier</Text>
                <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                  Scan student transit barcode or enter token to authenticate boarding
                </Text>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Enter Student Barcode / Token</Text>
              <TextInput
                style={[styles.tokenInput, { backgroundColor: colors.surfaceSubtle, color: colors.text, borderColor: colors.border }]}
                value={verifyToken}
                onChangeText={setVerifyToken}
                placeholder="e.g. BP-2026-000001 or PASS-03AAD6E391154170B361"
                placeholderTextColor={colors.textMuted}
              />

              {/* Quick-test Presets for Bus Incharge */}
              <View style={{ marginTop: 8, marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 }}>
                  Quick Test Barcode Tokens:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {issuedPasses.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={{
                        backgroundColor: colors.surfaceSubtle,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                      onPress={() => setVerifyToken(p.pass_number)}
                    >
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>{p.pass_number}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={{
                      backgroundColor: colors.softPeach,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: colors.coral,
                    }}
                    onPress={() => setVerifyToken('INVALID-PASS-999')}
                  >
                    <Text style={{ fontSize: 11, color: colors.coral }}>Test Invalid Token</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <TouchableOpacity
                style={[styles.verifyBtn, { backgroundColor: colors.primary }]}
                onPress={handleVerifyPassToken}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="barcode-scan" size={18} color="#FFF" />
                    <Text style={styles.verifyBtnText}>Scan & Verify Barcode</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Verification Result Display */}
              {verifyResult && (
                <View
                  style={[
                    styles.verifyResultBox,
                    {
                      backgroundColor: verifyResult.valid ? colors.softGreen : colors.softPeach,
                      borderColor: verifyResult.valid ? colors.green : colors.coral,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Ionicons
                      name={verifyResult.valid ? 'checkmark-circle' : 'close-circle'}
                      size={24}
                      color={verifyResult.valid ? colors.green : colors.coral}
                    />
                    <Text
                      style={[
                        styles.verifyStatusTitle,
                        { color: verifyResult.valid ? colors.green : colors.coral },
                      ]}
                    >
                      {verifyResult.valid ? 'AUTHORIZED: VALID BUS PASS' : 'DENIED: INVALID / UNPAID PASS'}
                    </Text>
                  </View>

                  {verifyResult.valid && verifyResult.pass && (
                    <View style={{ gap: 4 }}>
                      <Text style={[styles.verifyDataText, { color: colors.text, fontWeight: '700' }]}>
                        Student: {verifyResult.pass.student_name} ({verifyResult.pass.student_roll})
                      </Text>
                      <Text style={[styles.verifyDataText, { color: colors.text }]}>
                        Assigned Route: {verifyResult.pass.route_name}
                      </Text>
                      <Text style={[styles.verifyDataText, { color: colors.text }]}>
                        Bus Number: {verifyResult.pass.bus_number} • Boarding: {verifyResult.pass.stop_name || 'Designated Stop'}
                      </Text>
                      <Text style={[styles.verifyDataText, { color: colors.text }]}>
                        Valid Upto: {verifyResult.pass.valid_upto || '30/06/2027'}
                      </Text>
                    </View>
                  )}
                  {!verifyResult.valid && (
                    <Text style={{ color: colors.coral, fontSize: 12, fontWeight: '600' }}>
                      {verifyResult.message || 'Pass not authorized. Student has not paid transport fee or pass expired.'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* =========================================================================
            STUDENT TAB 1: DIGITAL BUS PASS
            ========================================================================= */}
        {!isStaff && activeTab === 'pass' && (
          <View>
            {studentBusPass ? (
              <View style={[styles.passCard, { backgroundColor: '#0F172A', borderColor: '#1E293B' }]}>
                {/* College Branding */}
                <View style={styles.passHeader}>
                  <View>
                    <Text style={styles.passCollege}>SHRI BABAJI INSTITUTE OF TECH</Text>
                    <Text style={styles.passSub}>CAMPUS COMMUTER PASS 2026-27</Text>
                  </View>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{studentBusPass.status || 'ACTIVE'}</Text>
                  </View>
                </View>

                {/* Student details */}
                <View style={styles.passBody}>
                  <View style={styles.passStudentInfo}>
                    <Text style={styles.studentName}>
                      {studentBusPass.studentName || studentBusPass.student_name}
                    </Text>
                    <Text style={styles.studentRoll}>
                      {studentBusPass.studentRoll || studentBusPass.student_roll} • {studentBusPass.branch || user?.branch || 'CSE'}
                    </Text>
                    <Text style={styles.passId}>Pass No: {studentBusPass.passNumber || studentBusPass.pass_number}</Text>
                  </View>

                  {/* QR Code Container */}
                  <View style={styles.qrContainer}>
                    <MaterialCommunityIcons name="qrcode-scan" size={54} color="#0F172A" />
                    <Text style={styles.qrLabel}>SCAN TO VERIFY</Text>
                  </View>
                </View>

                <View style={styles.passDivider} />

                {/* Route & Stop info */}
                <View style={styles.passRouteDetails}>
                  <View style={styles.detailRow}>
                    <Feather name="map-pin" size={13} color="#818CF8" />
                    <Text style={styles.detailLabel}>Assigned Route:</Text>
                    <Text style={styles.detailVal}>
                      {studentBusPass.routeName || studentBusPass.route_name || 'Betul Campus Corridor'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="navigation" size={13} color="#818CF8" />
                    <Text style={styles.detailLabel}>Boarding Stop:</Text>
                    <Text style={styles.detailVal}>
                      {studentBusPass.stopName || studentBusPass.stop_name || 'Designated Stop'} ({studentBusPass.pickupTime || '07:45 AM'})
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="truck" size={13} color="#818CF8" />
                    <Text style={styles.detailLabel}>Bus Number:</Text>
                    <Text style={styles.detailVal}>
                      {studentBusPass.busNumber || studentBusPass.bus_number || 'MP-48-PA-1204'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="calendar" size={13} color="#818CF8" />
                    <Text style={styles.detailLabel}>Valid Upto:</Text>
                    <Text style={styles.detailVal}>
                      {studentBusPass.validTill || studentBusPass.valid_upto || '30 June 2027'}
                    </Text>
                  </View>
                </View>

                {/* Official Digital Transit Barcode */}
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginVertical: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 1.5, marginBottom: 8 }}>
                    OFFICIAL TRANSIT BARCODE (SCAN TO VERIFY)
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', height: 40, gap: 2 }}>
                    {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 4, 2, 1, 3, 2].map((w, idx) => (
                      <View
                        key={idx}
                        style={{
                          width: w,
                          height: '100%',
                          backgroundColor: idx % 2 === 0 ? '#0F172A' : '#E2E8F0',
                          borderRadius: 0.5,
                        }}
                      />
                    ))}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: '#0F172A', letterSpacing: 3, marginTop: 6, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                    *{studentBusPass.passNumber || studentBusPass.pass_number || 'BP-2026-000001'}*
                  </Text>
                  <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>
                    Scan with Bus Incharge Mobile Terminal to authenticate
                  </Text>
                </View>

                <TouchableOpacity style={styles.shareBtn} onPress={handleSharePass} activeOpacity={0.8}>
                  <Feather name="share-2" size={15} color="#FFFFFF" />
                  <Text style={styles.shareBtnText}>Share / Save Digital Pass</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', paddingVertical: 28, marginVertical: 8 }]}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <FontAwesome5 name="bus" size={28} color={colors.textSecondary} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
                  No Active Bus Pass
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20, marginBottom: 20 }}>
                  Aapke account par abhi koi active bus pass issue nahi hua hai. Jab Accountant aapki transport application aur fee payment approve karke pass issue karega, tabhi aapka Digital QR Bus Pass yahan activate hokar dikhayi dega.
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  onPress={() => setActiveTab('apply')}
                >
                  <Feather name="plus-circle" size={16} color="#FFF" />
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Apply for Bus Pass</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Helpline Section */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Transport Helpdesk</Text>
            <View style={[styles.helpCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.helpRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpName, { color: colors.text }]}>Bus Incharge: Rameshwar Yadav</Text>
                  <Text style={[styles.helpPhone, { color: colors.textSecondary }]}>
                    +91 94250 88211 • 24/7 Transit Support
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.callBtn, { backgroundColor: colors.green }]}
                  onPress={() => handleCallDriver('+919425088211')}
                >
                  <Ionicons name="call" size={14} color="#FFFFFF" />
                  <Text style={styles.callBtnText}>Call</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* =========================================================================
            STUDENT TAB 3: APPLY FOR PASS (STUDENT ONLY)
            ========================================================================= */}
        {!isStaff && activeTab === 'apply' && (
          <View>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.text }]}>Apply for Campus Bus Pass</Text>
              <Text style={[styles.formSub, { color: colors.textSecondary }]}>
                Select your route and submit fee payment proof for instant accountant authorization.
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Student Name</Text>
                <Text style={[styles.readOnlyVal, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}>
                  {user?.name || 'RAVI KUMAR'}
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Roll Number & Branch</Text>
                <Text style={[styles.readOnlyVal, { backgroundColor: colors.surfaceSubtle, color: colors.text }]}>
                  {user?.roll || '0545CS231001'} ({user?.branch || 'CSE'})
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Select Route</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {routes.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[
                        styles.applyRoutePill,
                        {
                          backgroundColor: selectedApplyRoute === r.id ? colors.primary : colors.surfaceSubtle,
                          borderColor: selectedApplyRoute === r.id ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedApplyRoute(r.id)}
                    >
                      <Text
                        style={[
                          styles.applyRoutePillText,
                          { color: selectedApplyRoute === r.id ? '#FFF' : colors.text },
                        ]}
                      >
                        {r.routeNumber.split('-')[0]}
                      </Text>
                      <Text
                        style={[
                          styles.applyRoutePillSub,
                          { color: selectedApplyRoute === r.id ? '#E0E7FF' : colors.textSecondary },
                        ]}
                      >
                        ₹{r.id === 1 ? '15,000' : r.id === 2 ? '25,000' : '30,000'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Mode</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {['UPI', 'NetBanking', 'Card'].map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.payModePill,
                        {
                          backgroundColor: applyPaymentMode === m ? colors.primary : colors.surfaceSubtle,
                          borderColor: applyPaymentMode === m ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setApplyPaymentMode(m)}
                    >
                      <Text
                        style={[
                          styles.payModePillText,
                          { color: applyPaymentMode === m ? '#FFF' : colors.text },
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Transaction Reference / UTR</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    { backgroundColor: colors.surfaceSubtle, color: colors.text, borderColor: colors.border },
                  ]}
                  value={applyTxnId}
                  onChangeText={setApplyTxnId}
                  placeholder="e.g. UPI-123456789012"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleStudentApply}
              >
                <Text style={styles.submitBtnText}>Submit Bus Pass Application</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  routePills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  routePill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  routePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '800',
  },
  routeSpan: {
    fontSize: 12,
    marginTop: 2,
  },
  busTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  busTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  feeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  feeBannerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  driverBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  driverBarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  callBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  callBtnSmallText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stopsHeader: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  stopsList: {
    gap: 4,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stopTimeline: {
    alignItems: 'center',
    width: 20,
    marginRight: 8,
    paddingTop: 4,
  },
  stopDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stopLine: {
    width: 2,
    height: 28,
    marginTop: 2,
  },
  stopInfo: {
    flex: 1,
    paddingBottom: 8,
  },
  stopName: {
    fontSize: 13,
    fontWeight: '700',
  },
  stopTime: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  approvalCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  approvalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  approvalStudentName: {
    fontSize: 14,
    fontWeight: '800',
  },
  approvalStudentMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  feePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  feePillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  approvalDetailsBox: {
    padding: 10,
    borderRadius: 10,
    gap: 4,
    marginBottom: 10,
  },
  approvalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approvalLbl: {
    fontSize: 11,
    fontWeight: '500',
  },
  approvalVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  approvalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 10,
  },
  approveBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },
  passRosterCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  passRosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  passNumberPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  passNumberText: {
    fontSize: 10,
    fontWeight: '800',
  },
  activeStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  passStudentTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  passStudentSub: {
    fontSize: 11,
    marginTop: 1,
  },
  passRosterDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rosterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  tokenInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    marginBottom: 12,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  verifyResultBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
  },
  verifyStatusTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  verifyDataText: {
    fontSize: 11,
    fontWeight: '600',
  },
  passCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  passHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passCollege: {
    color: '#E0E7FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  passSub: {
    color: '#A5B4FC',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  passBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  passStudentInfo: {
    flex: 1,
  },
  studentName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  studentRoll: {
    color: '#C7D2FE',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  passId: {
    color: '#818CF8',
    fontSize: 11,
    marginTop: 4,
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  passDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 12,
  },
  passRouteDetails: {
    gap: 8,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },
  detailVal: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  helpCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  helpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helpName: {
    fontSize: 13,
    fontWeight: '700',
  },
  helpPhone: {
    fontSize: 11,
    marginTop: 2,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  formSub: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  readOnlyVal: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  applyRoutePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  applyRoutePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  applyRoutePillSub: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  payModePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  payModePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
  },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
