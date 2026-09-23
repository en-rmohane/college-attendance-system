import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AttendanceScreen } from '../screens/AttendanceScreen';
import { TimetableScreen } from '../screens/TimetableScreen';
import { TestsListScreen } from '../screens/TestsListScreen';
import { LiveTestScreen } from '../screens/LiveTestScreen';
import { NotesScreen } from '../screens/NotesScreen';
import { NoticesScreen } from '../screens/NoticesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { StudentsDirectoryScreen } from '../screens/StudentsDirectoryScreen';
import { FacultyDirectoryScreen } from '../screens/FacultyDirectoryScreen';
import { MarkAttendanceScreen } from '../screens/MarkAttendanceScreen';
import { AdminDashboardScreen } from '../screens/AdminDashboardScreen';
import { SubjectAllocationScreen } from '../screens/SubjectAllocationScreen';
import FeesScreen from '../screens/FeesScreen';
import TransportScreen from '../screens/TransportScreen';
import LibraryScreen from '../screens/LibraryScreen';
import MarksScreen from '../screens/MarksScreen';
import ReportsScreen from '../screens/ReportsScreen';
import CreateTestScreen from '../screens/CreateTestScreen';
import { SplashScreen } from '../screens/SplashScreen';

// Native Vector Icons
import { Ionicons, Feather } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 1. Student Tab Bar (With Soft Indigo Pill for active tabs)
const StudentTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#172033',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="StudentHome"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softBlue }]}>
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={19} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="StudentAttendance"
        component={AttendanceScreen}
        options={{
          tabBarLabel: 'Attendance',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softGreen }]}>
              <Ionicons name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} size={20} color={focused ? colors.green : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="StudentTimetable"
        component={TimetableScreen}
        options={{
          tabBarLabel: 'Timetable',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softBlue }]}>
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={19} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="StudentNotices"
        component={NoticesScreen}
        options={{
          tabBarLabel: 'Notices',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softYellow }]}>
              <Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={20} color={focused ? colors.amber : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="StudentProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softLavender }]}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={19} color={focused ? colors.purple : color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// 2. Professor Tab Bar
const ProfessorTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#172033',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="ProfHome"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softBlue }]}>
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={19} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfAttendance"
        component={MarkAttendanceScreen}
        options={{
          tabBarLabel: 'Mark Att.',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softGreen }]}>
              <Ionicons name={focused ? 'checkmark-done-circle' : 'checkmark-done-circle-outline'} size={21} color={focused ? colors.green : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfSchedule"
        component={TimetableScreen}
        options={{
          tabBarLabel: 'Schedule',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softBlue }]}>
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={19} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfMarks"
        component={MarksScreen}
        options={{
          tabBarLabel: 'Marks',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softYellow }]}>
              <Ionicons name={focused ? 'ribbon' : 'ribbon-outline'} size={19} color={focused ? colors.amber : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="ProfProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softLavender }]}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={19} color={focused ? colors.purple : color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// 3. Admin Tab Bar
const AdminTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#172033',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="AdminHome"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softBlue }]}>
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={19} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softCyan }]}>
              <Ionicons name={focused ? 'speedometer' : 'speedometer-outline'} size={19} color={focused ? colors.teal : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AdminAllocations"
        component={SubjectAllocationScreen}
        options={{
          tabBarLabel: 'Allocations',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softLavender }]}>
              <Feather name="layers" size={19} color={focused ? colors.purple : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AdminFees"
        component={FeesScreen}
        options={{
          tabBarLabel: 'Fee Desk',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softYellow }]}>
              <Ionicons name={focused ? 'card' : 'card-outline'} size={19} color={focused ? colors.amber : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softPink }]}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={19} color={focused ? colors.pink : color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// 4. Dedicated Accountant / Fee Officer Tab Bar
const AccountantTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#172033',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="AccountantHome"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Fee Desk',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softBlue }]}>
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={19} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AccountantApprovals"
        component={FeesScreen}
        initialParams={{ initialTab: 'approvals' }}
        options={{
          tabBarLabel: 'Approvals',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softYellow }]}>
              <Ionicons name={focused ? 'checkbox' : 'checkbox-outline'} size={20} color={focused ? colors.amber : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AccountantCashier"
        component={FeesScreen}
        initialParams={{ initialTab: 'cashier_desk' }}
        options={{
          tabBarLabel: 'Cash Desk',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softGreen }]}>
              <Ionicons name={focused ? 'card' : 'card-outline'} size={19} color={focused ? colors.green : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AccountantTransport"
        component={TransportScreen}
        options={{
          tabBarLabel: 'Transport',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softCyan }]}>
              <Ionicons name={focused ? 'bus' : 'bus-outline'} size={19} color={focused ? colors.teal : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="AccountantProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softLavender }]}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={19} color={focused ? colors.purple : color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// 5. Dedicated Librarian Tab Bar
const LibrarianTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#172033',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="LibrarianHome"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Library Desk',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softBlue }]}>
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={19} color={color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="LibrarianCounter"
        component={LibraryScreen}
        initialParams={{ initialTab: 'counter' }}
        options={{
          tabBarLabel: 'Counter',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softGreen }]}>
              <Ionicons name={focused ? 'swap-horizontal' : 'swap-horizontal-outline'} size={20} color={focused ? colors.green : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="LibrarianCatalog"
        component={LibraryScreen}
        initialParams={{ initialTab: 'catalog' }}
        options={{
          tabBarLabel: 'Catalog',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softLavender }]}>
              <Ionicons name={focused ? 'book' : 'book-outline'} size={19} color={focused ? colors.purple : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="LibrarianOverdue"
        component={LibraryScreen}
        initialParams={{ initialTab: 'overdue_fines' }}
        options={{
          tabBarLabel: 'Overdue/Fines',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softPeach }]}>
              <Ionicons name={focused ? 'alert-circle' : 'alert-circle-outline'} size={19} color={focused ? colors.coral : color} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="LibrarianProfile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrapper, focused && { backgroundColor: colors.softLavender }]}>
              <Ionicons name={focused ? 'person' : 'person-outline'} size={19} color={focused ? colors.purple : color} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Root App Navigator
export const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);

  if (isLoading) {
    return null;
  }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const role = user?.role || 'student';

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          {/* Main Role Navigator */}
          {role === 'admin' ? (
            <Stack.Screen name="AdminMain" component={AdminTabs} />
          ) : role === 'accountant' ? (
            <Stack.Screen name="AccountantMain" component={AccountantTabs} />
          ) : (role === 'librarian' || role === 'assistant_librarian') ? (
            <Stack.Screen name="LibrarianMain" component={LibrarianTabs} />
          ) : role === 'professor' ? (
            <Stack.Screen name="ProfMain" component={ProfessorTabs} />
          ) : (
            <Stack.Screen name="StudentMain" component={StudentTabs} />
          )}

          {/* Common Stacks for Permitted Roles */}
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Library" component={LibraryScreen} />
          <Stack.Screen name="Fees" component={FeesScreen} />
          <Stack.Screen name="Transport" component={TransportScreen} />
          <Stack.Screen name="Marks" component={MarksScreen} />
          <Stack.Screen name="Reports" component={ReportsScreen} />
          <Stack.Screen name="CreateTest" component={CreateTestScreen} />
          <Stack.Screen name="SubjectAllocation" component={SubjectAllocationScreen} />
          <Stack.Screen name="StudentsDirectory" component={StudentsDirectoryScreen} />
          <Stack.Screen name="FacultyDirectory" component={FacultyDirectoryScreen} />
          <Stack.Screen name="LiveTest" component={LiveTestScreen} />
          <Stack.Screen name="NotesTab" component={NotesScreen} />
          <Stack.Screen name="Notices" component={NoticesScreen} />
          <Stack.Screen name="MarkAttendance" component={MarkAttendanceScreen} />
          <Stack.Screen name="Timetable" component={TimetableScreen} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} />
          <Stack.Screen name="TestsTab" component={TestsListScreen} />
          <Stack.Screen name="AdminTab" component={AdminDashboardScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
