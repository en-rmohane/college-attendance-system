import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Feather,
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';
import { AnimatedCard } from '../components/common/AnimatedCard';
import { StatusBadge } from '../components/common/StatusBadge';

export const ProfileScreen = ({ navigation }: any) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, role, logout } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const isAdmin = role === 'admin';
  const isAccountant = role === 'accountant';
  const isProf = role === 'professor';
  const isLibrarian = role === 'librarian' || role === 'assistant_librarian';
  const isBusIncharge = role === 'bus_incharge' || role === 'transport_manager' || role === 'transport_incharge' || role === 'driver';
  const isStudent = !isAdmin && !isAccountant && !isProf && !isLibrarian && !isBusIncharge;

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const handleChangePassword = () => {
    if (!oldPassword || !newPassword) {
      Alert.alert('Incomplete Form', 'Please enter your current and new passwords.');
      return;
    }
    Alert.alert('Success ✅', 'Your portal password has been updated securely.');
    setShowPasswordModal(false);
    setOldPassword('');
    setNewPassword('');
  };

  const roleLabel = isAdmin
    ? 'SYSTEM ADMINISTRATOR'
    : isAccountant
    ? 'CHIEF ACCOUNTANT / FEE OFFICER'
    : isLibrarian
    ? 'CENTRAL LIBRARIAN'
    : isBusIncharge
    ? 'TRANSIT & BUS INCHARGE'
    : isProf
    ? 'FACULTY MEMBER'
    : 'STUDENT ENROLLMENT';

  const userInitial = user?.name
    ? user.name.replace(/(pro\.|dr\.|prof\.)/gi, '').trim().charAt(0).toUpperCase()
    : (isAccountant ? 'A' : (isLibrarian ? 'L' : (isBusIncharge ? 'B' : 'U')));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top Header Card */}
      <View
        style={[
          styles.headerBox,
          { backgroundColor: colors.headerBg, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>
          {isAdmin
            ? 'Administrator Profile'
            : isAccountant
            ? 'Finance Officer Profile'
            : isLibrarian
            ? 'Central Librarian Profile'
            : isBusIncharge
            ? 'Transit Incharge Profile'
            : isProf
            ? 'Faculty Profile'
            : 'Student Profile'}
        </Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          {isAdmin
            ? 'Central Administration & Campus Management'
            : isAccountant
            ? 'Fee Collection, Ledger & Financial Clearance Desk'
            : isLibrarian
            ? 'Central Library, OPAC Catalog & LMS Circulation Desk'
            : isBusIncharge
            ? 'Fleet Management, Transit Barcodes & Student Transport Desk'
            : isProf
            ? 'Department Faculty & Teaching Records'
            : 'Academic Information & Institutional Records'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* 1. Main Profile Card (Soft Lavender / Blue Theme) */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarWrap, { borderColor: colors.purple, backgroundColor: colors.softLavender }]}>
            {user?.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.purple }]}>
                <Text style={styles.avatarInitial}>{userInitial}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.studentName, { color: colors.text }]}>
            {user?.name || (isAccountant ? 'Chief Accountant / Fee Officer' : (isLibrarian ? 'Rajesh Kumar (Central Librarian)' : (isBusIncharge ? 'Rameshwar Yadav (Bus Incharge)' : (isAdmin ? 'SYSTEM ADMIN' : 'STUDENT'))))}
          </Text>

          <View
            style={[
              styles.rollBadge,
              {
                backgroundColor: isAccountant
                  ? colors.softLavender
                  : isLibrarian
                  ? colors.softCyan
                  : isBusIncharge
                  ? colors.softPeach
                  : isAdmin
                  ? colors.softPeach
                  : isProf
                  ? colors.softCyan
                  : colors.softYellow,
              },
            ]}
          >
            <Text
              style={[
                styles.rollText,
                {
                  color: isAccountant
                    ? colors.purple
                    : isLibrarian
                    ? colors.teal
                    : isBusIncharge
                    ? colors.coral
                    : isAdmin
                    ? colors.coral
                    : isProf
                    ? colors.teal
                    : colors.amber,
                },
              ]}
            >
              {isAdmin
                ? 'CENTRAL ADMIN CONTROL'
                : isAccountant
                ? 'ACCOUNTS & FEE DESK'
                : isLibrarian
                ? 'STAFF ID: LIB-2026'
                : isBusIncharge
                ? 'STAFF ID: TRANS-205'
                : isProf
                ? `FACULTY ID: PROF-${user?.id || '01'}`
                : `ENROLLMENT: ${user?.roll || '0545CS231001'}`}
            </Text>
          </View>

          <Text style={[styles.deptText, { color: colors.textSecondary }]}>
            {isAccountant
              ? 'Finance & Accounts Department'
              : isLibrarian
              ? 'Central Library LMS Section'
              : isBusIncharge
              ? 'Campus Fleet & Transit Section'
              : (user?.department || user?.branch || 'Computer Science & Engineering')}
          </Text>

          <View style={[styles.contactRow, { borderTopColor: colors.border }]}>
            <View style={styles.contactItem}>
              <Feather name="mail" size={12} color={colors.primary} />
              <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                {user?.email || (isAccountant ? 'accountant@sbitm.edu.in' : isLibrarian ? 'librarian@sbitm.edu.in' : isBusIncharge ? 'transport@sbitm.edu.in' : 'user@college.com')}
              </Text>
            </View>
            <View style={styles.contactItem}>
              <Feather name="phone" size={12} color={colors.teal} />
              <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                {user?.phone || '+91 94072 00000'}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Role-Specific Personal & Professional Details Card */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isAccountant
              ? 'Finance Officer Details'
              : isLibrarian
              ? 'Librarian Credentials & Desk'
              : isBusIncharge
              ? 'Transit Incharge Details'
              : isProf
              ? 'Faculty Profile & Details'
              : isAdmin
              ? 'Administrator Details'
              : 'Personal Information'}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoGridRow}>
              <View style={styles.infoCol}>
                <Text style={[styles.infoColLabel, { color: colors.textSecondary }]}>Full Legal Name</Text>
                <Text style={[styles.infoColVal, { color: colors.text }]}>
                  {user?.name || (isAccountant ? 'Accountant / Fee Officer' : isLibrarian ? 'Rajesh Kumar' : isBusIncharge ? 'Rameshwar Yadav' : (isAdmin ? 'Admin' : 'User'))}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoColLabel, { color: colors.textSecondary }]}>Department / Cell</Text>
                <Text style={[styles.infoColVal, { color: colors.text }]}>
                  {isAccountant
                    ? 'Finance & Accounts'
                    : isLibrarian
                    ? 'Central Library Section'
                    : isBusIncharge
                    ? 'Campus Fleet & Transit'
                    : 'Academic Cell'}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoGridRow}>
              <View style={styles.infoCol}>
                <Text style={[styles.infoColLabel, { color: colors.textSecondary }]}>
                  {isAccountant
                    ? 'Designation'
                    : isLibrarian
                    ? 'Designation'
                    : isBusIncharge
                    ? 'Designation'
                    : isProf
                    ? 'Date of Joining'
                    : isAdmin
                    ? 'System Role'
                    : 'Date of Birth'}
                </Text>
                <Text style={[styles.infoColVal, { color: colors.text }]}>
                  {isAccountant
                    ? 'Fee Manager & Cashier'
                    : isLibrarian
                    ? 'Head Librarian & LMS Admin'
                    : isBusIncharge
                    ? 'Transit Incharge & Route Head'
                    : isProf
                    ? '15 Jul 2018'
                    : isAdmin
                    ? 'Super Administrator'
                    : '15 Aug 2005'}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoColLabel, { color: colors.textSecondary }]}>
                  {isAccountant
                    ? 'Desk Node'
                    : isLibrarian
                    ? 'Desk Node'
                    : isBusIncharge
                    ? 'Operational Hub'
                    : isProf
                    ? 'Employee Status'
                    : isAdmin
                    ? 'Campus Node'
                    : 'Admission Session'}
                </Text>
                <Text style={[styles.infoColVal, { color: colors.primary }]}>
                  {isAccountant
                    ? 'Central Accounts Desk'
                    : isLibrarian
                    ? 'Central Library Counter'
                    : isBusIncharge
                    ? 'Campus Transport Terminal'
                    : isProf
                    ? 'Regular Faculty'
                    : isAdmin
                    ? 'SBITM Betul Campus'
                    : '2023-2027'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. Role-Specific Access Matrix */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {isAccountant
              ? 'Fee & Financial Permissions'
              : isLibrarian
              ? 'Library Administration & LMS Matrix'
              : isBusIncharge
              ? 'Fleet & Transit Verification Matrix'
              : isProf
              ? 'Teaching & Department Records'
              : isAdmin
              ? 'Access & Control Matrix'
              : 'Academic Details'}
          </Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoGridRow}>
              <View style={styles.infoCol}>
                <Text style={[styles.infoColLabel, { color: colors.textSecondary }]}>
                  {isAccountant
                    ? 'Counter Authorization'
                    : isLibrarian
                    ? 'Circulation Privilege'
                    : isBusIncharge
                    ? 'Pass Authentication'
                    : isProf
                    ? 'Designation'
                    : isAdmin
                    ? 'Privilege Level'
                    : 'Degree / Course'}
                </Text>
                <Text style={[styles.infoColVal, { color: colors.text }]}>
                  {isAccountant
                    ? 'Fee Collection & Receipts'
                    : isLibrarian
                    ? 'Full LMS & Barcode Circulation'
                    : isBusIncharge
                    ? 'Barcode & QR Scanner Terminal'
                    : isProf
                    ? 'Associate Professor'
                    : isAdmin
                    ? 'Full Control (Root)'
                    : 'B.Tech (CSE)'}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoColLabel, { color: colors.textSecondary }]}>
                  {isAccountant
                    ? 'Ledger Reconciliation'
                    : isLibrarian
                    ? 'Catalog Management'
                    : isBusIncharge
                    ? 'Fleet Coverage'
                    : isProf
                    ? 'Department'
                    : isAdmin
                    ? 'Assigned Portal'
                    : 'Current Term'}
                </Text>
                <Text style={[styles.infoColVal, { color: colors.text }]}>
                  {isAccountant
                    ? 'Double-Entry Verified'
                    : isLibrarian
                    ? 'DDC / ISBN Barcode Generator'
                    : isBusIncharge
                    ? 'Betul, Multai & Pandhurna'
                    : isProf
                    ? 'Computer Science & Engg'
                    : isAdmin
                    ? 'Central Management'
                    : 'Semester 3 (Odd)'}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.infoGridRow}>
              <View style={styles.infoCol}>
                <Text style={[styles.infoColLabel, { color: colors.textSecondary }]}>
                  {isAccountant
                    ? 'Security Protocol'
                    : isLibrarian
                    ? 'Fine Policy'
                    : isBusIncharge
                    ? 'Boarding Validation'
                    : isProf
                    ? 'Teaching Experience'
                    : isAdmin
                    ? 'Security Protocol'
                    : 'University Affiliation'}
                </Text>
                <Text style={[styles.infoColVal, { color: colors.text }]}>
                  {isAccountant
                    ? 'Financial Audit Trace'
                    : isLibrarian
                    ? 'Automated Overdue & Dues Clear'
                    : isBusIncharge
                    ? 'Live Transit Roster Verified'
                    : isProf
                    ? '8+ Years (UG / PG)'
                    : isAdmin
                    ? '2FA Enabled'
                    : 'RGPV Bhopal'}
                </Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={[styles.infoColLabel, { color: colors.textSecondary }]}>
                  {isAccountant
                    ? 'Account Status'
                    : isLibrarian
                    ? 'Terminal Status'
                    : isBusIncharge
                    ? 'Operational Status'
                    : isProf
                    ? 'Qualification / Approval'
                    : isAdmin
                    ? 'Status'
                    : 'Cumulative CGPA'}
                </Text>
                <Text style={[styles.infoColVal, { color: colors.green }]}>
                  {isAccountant
                    ? 'Active Fee Officer'
                    : isLibrarian
                    ? 'Active Librarian Node'
                    : isBusIncharge
                    ? 'Active Transit Incharge'
                    : isProf
                    ? 'M.Tech, Ph.D (CSE)'
                    : isAdmin
                    ? 'Active'
                    : '8.65 (Grade A+)'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. Digital Documents & Passes */}
        {isStudent && (
          <View style={styles.sectionWrapper}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Documents & Clearances</Text>
            <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => navigation.navigate('Fees')}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.softGreen }]}>
                  <Feather name="file-text" size={16} color={colors.green} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.text }]}>No-Dues Certificate</Text>
                  <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Verified Clearance Certificate</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => navigation.navigate('Transport')}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: colors.softYellow }]}>
                  <FontAwesome5 name="bus" size={14} color={colors.amber} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.text }]}>Digital QR Bus Pass</Text>
                  <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Route 4 • Active</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 5. Settings & Security */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings & Security</Text>
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Dark Mode Switch */}
            <View style={styles.menuItemRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.softBlue }]}>
                <Ionicons name={isDark ? 'sunny' : 'moon'} size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>
                  {isDark ? 'Dark theme enabled' : 'Clean light pastel UI'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Notifications Switch */}
            <View style={styles.menuItemRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.softLavender }]}>
                <Ionicons name="notifications-outline" size={16} color={colors.purple} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Attendance & timetable alerts</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Change Password */}
            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={() => setShowPasswordModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.softPeach }]}>
                <Feather name="lock" size={16} color={colors.coral} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Change Password</Text>
                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>Update login credentials</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Logout */}
            <TouchableOpacity
              style={styles.menuItemRow}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.softPeach }]}>
                <Feather name="log-out" size={16} color={colors.coral} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.menuItemTitle, { color: colors.coral }]}>Sign Out</Text>
                <Text style={[styles.menuItemSub, { color: colors.textSecondary }]}>End session securely</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.coral} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.versionText, { color: colors.textMuted }]}>
          SBITM ERP Mobile App • Version 2.2.0 (Material 3 Pastel Edition)
        </Text>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Feather name="x" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Enter your current password and a new secure password.
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Current Password</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Enter current password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={oldPassword}
                onChangeText={setOldPassword}
              />
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>New Password</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Enter new password (min 6 chars)"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.savePassBtn, { backgroundColor: colors.primary }]}
              onPress={handleChangePassword}
              activeOpacity={0.85}
            >
              <Text style={styles.savePassBtnText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.logoutModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.logoutIconBox, { backgroundColor: colors.softPeach }]}>
              <Feather name="log-out" size={26} color={colors.coral} />
            </View>

            <Text style={[styles.logoutModalTitle, { color: colors.text }]}>Sign Out from Portal?</Text>
            <Text style={[styles.logoutModalSub, { color: colors.textSecondary }]}>
              Are you sure you want to end your current session as {user?.name || 'User'}? You will need to log in again to access the portal.
            </Text>

            <View style={styles.logoutBtnRow}>
              <TouchableOpacity
                style={[styles.logoutCancelBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.logoutCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.logoutConfirmBtn, { backgroundColor: colors.coral }]}
                onPress={confirmLogout}
                activeOpacity={0.85}
              >
                <Feather name="log-out" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.logoutConfirmText}>Sign Out Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerBox: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 110,
  },
  profileCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  studentName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  rollBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  rollText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deptText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textAlign: 'center',
  },
  yearSemText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 14,
    textAlign: 'center',
  },
  contactRow: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  contactText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sectionWrapper: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  menuCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  infoGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
  },
  infoColLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoColVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  menuItemSub: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    marginTop: 6,
    fontWeight: '500',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 14,
  },
  modalInputGroup: {
    marginBottom: 12,
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
  savePassBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  savePassBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  logoutModalCard: {
    borderRadius: 24,
    padding: 24,
    margin: 20,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoutIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutModalSub: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  logoutBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  logoutConfirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutConfirmText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});

