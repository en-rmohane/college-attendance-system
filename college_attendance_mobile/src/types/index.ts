export type UserRole = 'student' | 'professor' | 'faculty' | 'admin' | 'accountant' | 'librarian' | 'assistant_librarian';

export interface UserProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  branch?: string;
  phone?: string;
  profilePhoto?: string;
  roll?: string;
  student_roll?: string;
  designation?: string;
  department?: string;
  year?: number;
  semester?: number;
  academicYear?: string;
}

export interface FeeStatus {
  totalFee: number;
  paidFee: number;
  pendingFee: number;
  dueDate: string;
  status: 'cleared' | 'partial' | 'due';
}

export interface Student {
  id: number;
  roll: string;
  name: string;
  branch: string;
  year: number;
  semester: number;
  email: string;
  phone?: string;
  profilePhoto?: string;
  overallAttendance: number;
  totalPresent: number;
  totalClasses: number;
  academicYear: string;
  status?: 'active' | 'detained' | 'condonation';
  feeStatus?: 'Paid' | 'Pending' | 'Partial';
  pendingFeeAmount?: number;
  busPassActive?: boolean;
  busRoute?: string;
}

export interface Faculty {
  id: number;
  name: string;
  username?: string;
  email: string;
  phone: string;
  designation: string;
  branches: string[];
  department: string;
  assignedSubjects: string[];
}

export interface SubjectItem {
  id: number;
  code: string;
  name: string;
  branch: string;
  semester: number;
  credits: number;
  type?: 'Theory' | 'Lab';
  isActive?: boolean;
}

export interface SubjectAllocation {
  id: number;
  professorId: number;
  professorName: string;
  professorUsername: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  branch: string;
  semester: number;
  slotType: 'theory' | 'lab';
  assignedDate: string;
}

export type AttendanceHealth = 'safe' | 'warning' | 'danger';

export interface SubjectAttendance {
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  professorName: string;
  totalLectures: number;
  attendedLectures: number;
  percentage: number;
  status: AttendanceHealth;
  classesNeededFor75: number;
  classesCanSkip: number;
}

export interface AttendanceDayLog {
  id: string;
  date: string;
  dayName: string;
  subjectName: string;
  subjectCode: string;
  period: number;
  time: string;
  status: 'present' | 'absent' | 'medical';
}

export interface TimetableSlot {
  id: number;
  dayOfWeek: number; // 1 = Mon, 2 = Tue, ..., 6 = Sat
  dayName: string;
  periodNumber: number;
  timeSlot: string;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  roomNumber: string;
  slotType: 'lecture' | 'lab' | 'theory';
  branch?: string;
  semester?: number;
  year?: number;
  isCommon?: boolean;
}

export interface TestQuestion {
  id: number;
  questionText: string;
  options: string[];
  correctOptionIndex?: number;
  explanation?: string;
  marks?: number;
}

export interface OnlineTest {
  id: number;
  title: string;
  subjectName: string;
  subjectCode: string;
  branch?: string;
  semester?: number;
  durationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  passingMarks?: number;
  deadline: string;
  status: 'available' | 'completed' | 'expired';
  scoredMarks?: number;
  securityOtp?: string;
  questions?: TestQuestion[];
}

export interface StudyNote {
  id: number;
  title: string;
  subjectName: string;
  subjectCode: string;
  branch?: string;
  semester?: number;
  professorName: string;
  description: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  downloadUrl?: string;
}

export interface Notice {
  id: number;
  title: string;
  message: string;
  creatorName: string;
  targetAudience: string;
  branch?: string;
  year?: number;
  isImportant: boolean;
  createdAt: string;
  expiresAt?: string;
  category: 'academic' | 'exam' | 'event' | 'transport' | 'general' | 'fee' | 'urgent';
}

export interface ExamMark {
  id?: number;
  studentRoll?: string;
  studentName?: string;
  subjectCode: string;
  subjectName: string;
  branch?: string;
  semester?: number;
  marksObtained?: number;
  totalMarks?: number;
  maxMarks?: number;
  midTerm1Marks?: number;
  midTerm2Marks?: number;
  assignmentMarks?: number;
  practicalMarks?: number;
  grade: string;
  examType?: string;
}

export interface FeeStructureItem {
  id: number;
  branch: string;
  year: number;
  semester: number;
  tuitionFee: number;
  developmentFee: number;
  examFee: number;
  busFee: number;
  cautionMoney: number;
  totalFee: number;
}

export interface FeeDemandItem {
  id: number;
  studentRoll: string;
  studentName: string;
  title: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidAmount: number;
  transactionRef?: string;
}

export interface NoDuesItem {
  id: number;
  studentRoll: string;
  studentName: string;
  branch: string;
  academicCleared: boolean;
  accountsCleared: boolean;
  libraryCleared: boolean;
  labCleared: boolean;
  hostelCleared: boolean;
  isApproved: boolean;
  generatedDate: string;
  certificateNumber: string;
}

export interface BusStopItem {
  id: number;
  name: string;
  time: string;
  fare: number;
}

export interface BusRouteItem {
  id: number;
  routeNumber: string;
  startPoint: string;
  endPoint: string;
  driverName: string;
  driverPhone: string;
  busNumber: string;
  capacity: number;
  totalStops: number;
  morningStartTime: string;
  eveningReturnTime: string;
  stops: BusStopItem[];
}

export interface BusPassCard {
  passNumber: string;
  studentRoll: string;
  studentName: string;
  branch: string;
  semester: number;
  routeName: string;
  busNumber: string;
  stopName: string;
  pickupTime: string;
  validTill: string;
  qrPayload: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED';
}

export interface AdminAnalytics {
  totalStudents: number;
  totalFaculty: number;
  totalSubjects: number;
  totalAllocations: number;
  totalClassesConducted: number;
  averageAttendanceRate: number;
  studentsBelow75: number;
  totalNotices: number;
  totalTests: number;
  totalFeesCollected: number;
  pendingFeeDues: number;
}

export interface AcademicSessionConfig {
  id: number;
  year: number; // 1, 2, 3, 4
  yearLabel: string; // "1st Year", "2nd Year", "3rd Year", "4th Year"
  branch: string; // "ALL" | "CSE" | "AD"
  academicSession: string; // "2025-2026"
  semesterType: 'odd' | 'even';
  currentSemester: number; // 1..8
  oddSemesterNumber: number; // e.g. 3 for Year 2
  evenSemesterNumber: number; // e.g. 4 for Year 2
  termStartDate: string; // e.g. "15-Jul-2025"
  termEndDate: string; // e.g. "15-Dec-2025" for 4th yr, "10-Jan-2026" for 1st-3rd yr
  examStartDate: string; // e.g. "20-Dec-2025" / "15-Jan-2026"
  status: 'Active Teaching' | 'Examinations' | 'Semester Break' | 'Next Term Transition';
  totalStudents: number;
  activeSubjectsCount: number;
}
