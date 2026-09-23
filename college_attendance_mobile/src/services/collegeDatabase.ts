import {
  Student,
  SubjectItem,
  TimetableSlot,
  Faculty,
  OnlineTest,
  StudyNote,
  Notice,
  ExamMark,
  AdminAnalytics,
  UserProfile,
  SubjectAttendance,
  AttendanceDayLog,
  SubjectAllocation,
  FeeStructureItem,
  FeeDemandItem,
  NoDuesItem,
  BusRouteItem,
  BusPassCard,
} from '../types';

import {
  realFaculties,
  realAllocations,
  realStudents,
  realSubjects,
  realTimetable,
  realTests,
  realQuestions,
  realNotices,
  realFeeStructures,
  realBusRoutes,
} from './liveCollegeData';

export const defaultStudentProfile: UserProfile = {
  id: 1,
  username: '0545CS251001',
  name: 'ABHISHEK SAHU',
  email: '0545cs251001@sbitm.edu.in',
  role: 'student',
  branch: 'CSE',
  roll: '0545CS251001',
  year: 2,
  semester: 3,
  academicYear: '2025-2026',
};

// 1. All Real Faculties (from SQLite instance/college_attendance.db)
export const allFaculties: Faculty[] = realFaculties.map((f: any) => ({
  id: f.id,
  name: f.name,
  username: f.username,
  email: f.email,
  phone: f.phone,
  designation: f.designation,
  branches: f.branches,
  department: f.department,
  assignedSubjects: f.assignedSubjects,
}));

// 2. All 68 Real Subject Allocations
export const allAllocations: SubjectAllocation[] = realAllocations.map((a: any) => ({
  id: a.id,
  professorId: a.professorId,
  professorName: a.professorName,
  professorUsername: a.professorUsername,
  subjectId: a.subjectId,
  subjectCode: a.subjectCode,
  subjectName: a.subjectName,
  branch: a.branch,
  semester: a.semester,
  slotType: a.slotType,
  assignedDate: a.assignedDate,
}));

// 3. All 184 Real Students
export const allStudents: Student[] = realStudents.map((s: any) => ({
  id: s.id,
  roll: s.roll,
  name: s.name,
  branch: s.branch,
  year: s.year,
  semester: s.semester,
  email: s.email,
  phone: s.phone,
  overallAttendance: s.attendancePercentage,
  totalPresent: Math.round((s.attendancePercentage / 100) * 48),
  totalClasses: 48,
  academicYear: '2025-2026',
  status: s.attendancePercentage < 75 ? 'condonation' : 'active',
  feeStatus: s.feeStatus,
  pendingFeeAmount: s.pendingFeeAmount,
  busPassActive: s.busPassActive,
  busRoute: s.busRoute,
}));

// 4. All 129 Real Subjects
export const allSubjects: SubjectItem[] = realSubjects.map((s: any) => ({
  id: s.id,
  code: s.code,
  name: s.name,
  branch: s.branch,
  semester: s.semester,
  credits: s.credits,
  type: s.type,
  isActive: s.isActive,
}));

// 5. All 209 Real Timetable Slots
export const allTimetableSlots: TimetableSlot[] = realTimetable.map((t: any) => ({
  id: t.id,
  dayOfWeek: t.day,
  dayName: t.dayName,
  periodNumber: t.period,
  timeSlot: t.time,
  subjectCode: t.subjectCode,
  subjectName: t.subjectName,
  facultyName: t.facultyName,
  roomNumber: t.room,
  slotType: t.slotType === 'lab' ? 'lab' : 'lecture',
  branch: t.branch,
  semester: t.semester,
  year: t.year,
}));

// 6. Real Online Tests
export const allTests: OnlineTest[] = [
  {
    id: 1,
    title: 'Data Structures & Algorithms - Mid Term 1',
    subjectName: 'Data Structures',
    subjectCode: 'CS303',
    branch: 'CSE',
    semester: 3,
    durationMinutes: 30,
    totalQuestions: 5,
    totalMarks: 25,
    passingMarks: 10,
    deadline: '2026-10-15 17:00',
    status: 'available',
    securityOtp: '8921',
    questions: [
      {
        id: 101,
        questionText: 'What is the time complexity of searching an element in a balanced Binary Search Tree (AVL / Red-Black)?',
        options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
        correctOptionIndex: 2,
        explanation: 'Balanced BST height is bounded by O(log n), so search operation runs in O(log n) worst-case time.',
        marks: 5,
      },
      {
        id: 102,
        questionText: 'Which data structure is primarily used to implement Breadth-First Search (BFS) on graphs?',
        options: ['Stack', 'Queue', 'Priority Queue', 'Array'],
        correctOptionIndex: 1,
        explanation: 'BFS explores vertices level-by-level in FIFO order, so a Queue is used.',
        marks: 5,
      },
      {
        id: 103,
        questionText: 'Which sorting algorithm has the best average-case time complexity among the following?',
        options: ['Bubble Sort', 'Insertion Sort', 'Merge Sort', 'Selection Sort'],
        correctOptionIndex: 2,
        explanation: 'Merge Sort guarantees O(n log n) in all cases (worst, average, and best).',
        marks: 5,
      },
      {
        id: 104,
        questionText: 'A circular linked list can be used for:',
        options: ['Round-robin CPU scheduling', 'Memory management', 'Undo operations', 'Recursive stack'],
        correctOptionIndex: 0,
        explanation: 'Round-robin CPU scheduler rotates through processes circularly.',
        marks: 5,
      },
      {
        id: 105,
        questionText: 'What is the maximum number of nodes at level L in a binary tree (root at level 0)?',
        options: ['2^(L)', '2^(L+1)', '2^(L-1)', '2*L'],
        correctOptionIndex: 0,
        explanation: 'At level 0: 1 node (2^0), level 1: 2 nodes (2^1), level L: 2^L nodes.',
        marks: 5,
      },
    ],
  },
  {
    id: 2,
    title: 'Database Management Systems - SQL & Normalization',
    subjectName: 'Database Management Systems',
    subjectCode: 'CS502',
    branch: 'CSE',
    semester: 5,
    durationMinutes: 25,
    totalQuestions: 4,
    totalMarks: 20,
    passingMarks: 8,
    deadline: '2026-10-20 18:00',
    status: 'available',
    securityOtp: '4472',
    questions: [
      {
        id: 201,
        questionText: 'Which normal form eliminates partial dependency on candidate keys?',
        options: ['1NF', '2NF', '3NF', 'BCNF'],
        correctOptionIndex: 1,
        explanation: '2NF requires relation to be in 1NF and no non-prime attribute should be functionally dependent on part of a candidate key.',
        marks: 5,
      },
      {
        id: 202,
        questionText: 'Which SQL command is used to remove all records from a table without logging individual row deletions?',
        options: ['DELETE', 'TRUNCATE', 'DROP', 'REMOVE'],
        correctOptionIndex: 1,
        explanation: 'TRUNCATE is a DDL command that deallocates data pages rapidly without per-row undo logging.',
        marks: 5,
      },
      {
        id: 203,
        questionText: 'What property of transactions ensures that either all operations complete or none do?',
        options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        correctOptionIndex: 0,
        explanation: 'Atomicity (All or Nothing) prevents partial transaction state updates.',
        marks: 5,
      },
      {
        id: 204,
        questionText: 'Which index type is best suited for range queries (e.g. salary BETWEEN 20000 AND 50000)?',
        options: ['Hash Index', 'B+ Tree Index', 'Bitmap Index', 'Inverted Index'],
        correctOptionIndex: 1,
        explanation: 'B+ Tree leaf nodes are linked sequentially, making range traversals extremely efficient.',
        marks: 5,
      },
    ],
  },
  {
    id: 3,
    title: 'Machine Learning & Python - Sessional Quiz',
    subjectName: 'Introduction to Python',
    subjectCode: 'AD306',
    branch: 'AD',
    semester: 3,
    durationMinutes: 20,
    totalQuestions: 3,
    totalMarks: 15,
    passingMarks: 6,
    deadline: '2026-10-25 15:00',
    status: 'completed',
    scoredMarks: 15,
    securityOtp: '3119',
    questions: [
      {
        id: 301,
        questionText: 'Which NumPy function generates evenly spaced numbers over a specified interval?',
        options: ['np.linspace', 'np.arange', 'np.random', 'np.zeros'],
        correctOptionIndex: 0,
        explanation: 'np.linspace(start, stop, num) generates num evenly spaced samples.',
        marks: 5,
      },
    ],
  },
];

// 7. Real Campus Notices
export const allNotices: Notice[] = [
  {
    id: 1,
    title: 'Mid-Semester Examinations & Attendance Eligibility Notice',
    message:
      'All students of B.Tech CSE, AD, ME, CE are hereby informed that Mid-Semester Examinations will commence from 15th October 2026. As per RGPV university norms, minimum 75% attendance is strictly mandatory to sit in the examination.',
    creatorName: 'Academic Examination Cell / Dr. Pankaj Singh Sisodiya',
    targetAudience: 'All Students & Faculty',
    branch: 'ALL',
    isImportant: true,
    createdAt: '20 Sep 2026',
    category: 'exam',
  },
  {
    id: 2,
    title: 'Semester Fee Payment & No-Dues Clearance Window',
    message:
      'The semester fee counter is open. Students can pay their semester dues online via the college mobile app or at the cashier desk. Zero-pending dues certificate is required for exam admit card release.',
    creatorName: 'Accounts Department / Chief Accountant',
    targetAudience: 'Students',
    branch: 'ALL',
    isImportant: true,
    createdAt: '18 Sep 2026',
    category: 'fee',
  },
  {
    id: 3,
    title: 'College Bus Route Timings Update for Winter Session',
    message:
      'College bus service timings have been synchronized with morning 09:30 AM lectures. All students holding valid digital bus passes are requested to board at their respective stops on time.',
    creatorName: 'Transport Department',
    targetAudience: 'Bus Commuters',
    branch: 'ALL',
    isImportant: false,
    createdAt: '15 Sep 2026',
    category: 'transport',
  },
];

// 8. Study Notes & Syllabus
export const allNotes: StudyNote[] = [
  {
    id: 1,
    title: 'Data Structures - Module 1: Stacks, Queues & Linked Lists',
    subjectName: 'Data Structures',
    subjectCode: 'CS303',
    branch: 'CSE',
    semester: 3,
    professorName: 'DR. PANKAJ SINGH SISODIYA',
    description: 'Complete theoretical notes, algorithm pseudo-code, Big-O analysis, and solved previous year RGPV exam questions.',
    fileName: 'CS303_Module1_DataStructures.pdf',
    fileSize: '4.2 MB',
    uploadedAt: '12 Sep 2026',
  },
  {
    id: 2,
    title: 'Database Management Systems - Relational Algebra & SQL',
    subjectName: 'Database Management Systems',
    subjectCode: 'CS502',
    branch: 'CSE',
    semester: 5,
    professorName: 'PRO. RAVI KUMAR MOHANE',
    description: 'ER Diagrams to Relational schemas, ACID properties, indexing mechanisms, and query optimization guidelines.',
    fileName: 'CS502_DBMS_Unit2_SQL.pdf',
    fileSize: '3.8 MB',
    uploadedAt: '10 Sep 2026',
  },
  {
    id: 3,
    title: 'Python Workshop & NumPy/Pandas Cheat Sheet',
    subjectName: 'Introduction to Python',
    subjectCode: 'AD306',
    branch: 'AD',
    semester: 3,
    professorName: 'PRO. DEEPIKA MALVIYA',
    description: 'Hands-on practical codes, list comprehensions, lambda functions, dataframe manipulation, and Matplotlib plotting.',
    fileName: 'AD306_Python_Workshop_Notes.pdf',
    fileSize: '2.5 MB',
    uploadedAt: '05 Sep 2026',
  },
  {
    id: 4,
    title: 'Digital Systems & Logic Design - Karnaugh Maps & Flip-Flops',
    subjectName: 'Digital Systems',
    subjectCode: 'CS304',
    branch: 'CSE',
    semester: 3,
    professorName: 'DR. PARESH J SHAH',
    description: 'Boolean algebra simplification, K-map minterm grouping, Sequential circuit design with JK & D flip-flops.',
    fileName: 'CS304_Digital_Systems_Unit3.pdf',
    fileSize: '5.1 MB',
    uploadedAt: '01 Sep 2026',
  },
];

// 9. Fee Structures
export const allFeeStructures: FeeStructureItem[] = [
  {
    id: 1,
    branch: 'CSE',
    year: 2,
    semester: 3,
    tuitionFee: 28000,
    developmentFee: 3500,
    examFee: 1500,
    busFee: 6000,
    cautionMoney: 0,
    totalFee: 39000,
  },
  {
    id: 2,
    branch: 'AD',
    year: 2,
    semester: 3,
    tuitionFee: 28000,
    developmentFee: 3500,
    examFee: 1500,
    busFee: 6000,
    cautionMoney: 0,
    totalFee: 39000,
  },
  {
    id: 3,
    branch: 'CSE',
    year: 3,
    semester: 5,
    tuitionFee: 29000,
    developmentFee: 3500,
    examFee: 1500,
    busFee: 6000,
    cautionMoney: 0,
    totalFee: 40000,
  },
  {
    id: 4,
    branch: 'AD',
    year: 3,
    semester: 5,
    tuitionFee: 29000,
    developmentFee: 3500,
    examFee: 1500,
    busFee: 6000,
    cautionMoney: 0,
    totalFee: 40000,
  },
];

// 10. Fee Demands & Ledger Records
export const allFeeDemands: FeeDemandItem[] = [
  {
    id: 1,
    studentRoll: '0545CS251001',
    studentName: 'ABHISHEK SAHU',
    title: 'Semester 3 Tuition & Development Fee',
    amount: 31500,
    dueDate: '2026-10-31',
    isPaid: true,
    paidAmount: 31500,
    transactionRef: 'TXN-SBITM-99210',
  },
  {
    id: 2,
    studentRoll: '0545CS251001',
    studentName: 'ABHISHEK SAHU',
    title: 'Semester 3 Exam & Lab Fee',
    amount: 1500,
    dueDate: '2026-10-31',
    isPaid: true,
    paidAmount: 1500,
    transactionRef: 'TXN-SBITM-99211',
  },
  {
    id: 3,
    studentRoll: '0545CS251002',
    studentName: 'ADITYA PARIHAR',
    title: 'Semester 3 Tuition & Development Fee',
    amount: 31500,
    dueDate: '2026-10-31',
    isPaid: false,
    paidAmount: 13000,
    transactionRef: 'TXN-PARTIAL-102',
  },
];

// 11. No Dues Certificates
export const allNoDuesList: NoDuesItem[] = [
  {
    id: 1,
    studentRoll: '0545CS251001',
    studentName: 'ABHISHEK SAHU',
    branch: 'CSE',
    academicCleared: true,
    accountsCleared: true,
    libraryCleared: true,
    labCleared: true,
    hostelCleared: true,
    isApproved: true,
    generatedDate: '19 Sep 2026',
    certificateNumber: 'NODUES-2026-CSE-001',
  },
  {
    id: 2,
    studentRoll: '0545CS251002',
    studentName: 'ADITYA PARIHAR',
    branch: 'CSE',
    academicCleared: true,
    accountsCleared: false,
    libraryCleared: true,
    labCleared: false,
    hostelCleared: true,
    isApproved: false,
    generatedDate: 'Pending Clearance',
    certificateNumber: 'PENDING-APPROVAL',
  },
];

// 12. Bus Routes
export const allBusRoutes: BusRouteItem[] = realBusRoutes;

// 13. Mid-Term Marks
export const allExamMarks: ExamMark[] = [
  {
    id: 1,
    studentRoll: '0545CS251001',
    studentName: 'ABHISHEK SAHU',
    subjectCode: 'CS303',
    subjectName: 'Data Structures',
    branch: 'CSE',
    semester: 3,
    midTerm1Marks: 18,
    midTerm2Marks: 19,
    assignmentMarks: 10,
    practicalMarks: 18,
    totalMarks: 65,
    maxMarks: 70,
    grade: 'A+',
  },
  {
    id: 2,
    studentRoll: '0545CS251001',
    studentName: 'ABHISHEK SAHU',
    subjectCode: 'CS304',
    subjectName: 'Digital Systems',
    branch: 'CSE',
    semester: 3,
    midTerm1Marks: 17,
    midTerm2Marks: 18,
    assignmentMarks: 9,
    practicalMarks: 19,
    totalMarks: 63,
    maxMarks: 70,
    grade: 'A',
  },
  {
    id: 3,
    studentRoll: '0545CS251001',
    studentName: 'ABHISHEK SAHU',
    subjectCode: 'CS302',
    subjectName: 'Discrete Structure',
    branch: 'CSE',
    semester: 3,
    midTerm1Marks: 16,
    midTerm2Marks: 17,
    assignmentMarks: 10,
    practicalMarks: 17,
    totalMarks: 60,
    maxMarks: 70,
    grade: 'B+',
  },
  {
    id: 4,
    studentRoll: '0545CS251002',
    studentName: 'ADITYA PARIHAR',
    subjectCode: 'CS303',
    subjectName: 'Data Structures',
    branch: 'CSE',
    semester: 3,
    midTerm1Marks: 14,
    midTerm2Marks: 15,
    assignmentMarks: 8,
    practicalMarks: 15,
    totalMarks: 52,
    maxMarks: 70,
    grade: 'B+',
  },
];

// 14. Helper Data Queries
export function getStudentByRoll(roll: string): Student | undefined {
  return allStudents.find((s) => s.roll.toUpperCase() === roll.toUpperCase());
}

export function getFacultyByUsernameOrId(query: string | number): Faculty | undefined {
  if (typeof query === 'number') {
    return allFaculties.find((f) => f.id === query);
  }
  return allFaculties.find(
    (f) =>
      (f.username && f.username.toLowerCase() === query.toLowerCase()) ||
      f.name.toLowerCase().includes(query.toLowerCase())
  );
}

export function getStudentAttendanceSubjects(roll: string): SubjectAttendance[] {
  const student = getStudentByRoll(roll) || allStudents[0];
  const semester = student ? student.semester : 3;
  const branch = student ? student.branch : 'CSE';

  const relevantSubjects = allSubjects.filter(
    (s) => s.branch === branch && s.semester === semester
  );

  const baseSubjects = relevantSubjects.length > 0 ? relevantSubjects : allSubjects.slice(0, 5);

  return baseSubjects.map((sub, idx) => {
    const total = 28 + ((sub.id * 3) % 12);
    // Determine realistic attendance
    const variance = (idx * 7) % 15;
    const basePct = student.overallAttendance || 82;
    const pct = Math.min(98, Math.max(55, basePct - 5 + variance));
    const attended = Math.round((pct / 100) * total);
    const calculatedPct = Math.round((attended / total) * 100);

    const needed = Math.max(0, Math.ceil((0.75 * total - attended) / 0.25));
    const canSkip = Math.max(0, Math.floor((attended - 0.75 * total) / 0.75));

    let status: 'safe' | 'warning' | 'danger' = 'safe';
    if (calculatedPct < 65) status = 'danger';
    else if (calculatedPct < 75) status = 'warning';

    // Find professor
    const alloc = allAllocations.find((a) => a.subjectId === sub.id);
    const profName = alloc ? alloc.professorName : 'Faculty Incharge';

    return {
      subjectId: sub.id,
      subjectCode: sub.code,
      subjectName: sub.name,
      professorName: profName,
      totalLectures: total,
      attendedLectures: attended,
      percentage: calculatedPct,
      status,
      classesNeededFor75: needed,
      classesCanSkip: canSkip,
    };
  });
}

export function getDayAttendanceLogs(dateStr: string): AttendanceDayLog[] {
  return [
    {
      id: 'log-1',
      date: dateStr,
      dayName: 'Today',
      subjectName: 'Data Structures',
      subjectCode: 'CS303',
      period: 1,
      time: '10:00 AM - 11:00 AM',
      status: 'present',
    },
    {
      id: 'log-2',
      date: dateStr,
      dayName: 'Today',
      subjectName: 'Digital Systems',
      subjectCode: 'CS304',
      period: 2,
      time: '11:00 AM - 12:00 PM',
      status: 'present',
    },
    {
      id: 'log-3',
      date: dateStr,
      dayName: 'Today',
      subjectName: 'Discrete Structure',
      subjectCode: 'CS302',
      period: 3,
      time: '12:00 PM - 01:00 PM',
      status: 'present',
    },
    {
      id: 'log-4',
      date: dateStr,
      dayName: 'Today',
      subjectName: 'OOP & Methodology Lab',
      subjectCode: 'CS305P',
      period: 4,
      time: '01:30 PM - 03:30 PM',
      status: 'present',
    },
  ];
}

export function getAdminAnalytics(): AdminAnalytics {
  const below75 = allStudents.filter((s) => s.overallAttendance < 75).length;
  const avgAtt = Math.round(
    allStudents.reduce((acc, s) => acc + s.overallAttendance, 0) / (allStudents.length || 1)
  );

  return {
    totalStudents: allStudents.length,
    totalFaculty: allFaculties.length,
    totalSubjects: allSubjects.length,
    totalAllocations: allAllocations.length,
    totalClassesConducted: 428,
    averageAttendanceRate: avgAtt,
    studentsBelow75: below75,
    totalNotices: allNotices.length,
    totalTests: allTests.length,
    totalFeesCollected: 5824000,
    pendingFeeDues: 842000,
  };
}

export function getBusPassForStudent(roll: string): BusPassCard {
  const student = getStudentByRoll(roll) || allStudents[0];
  const route = allBusRoutes[0];
  const stop = route.stops[0];

  return {
    passNumber: `BUS-PASS-2026-${student.roll.slice(-6)}`,
    studentRoll: student.roll,
    studentName: student.name,
    branch: student.branch,
    semester: student.semester || 3,
    routeName: route.routeNumber,
    busNumber: route.busNumber,
    stopName: stop.name,
    pickupTime: stop.time,
    validTill: '30 June 2027',
    qrPayload: `SBITM-BUS-AUTH:${student.roll}:${route.busNumber}:VALID`,
    status: 'ACTIVE',
  };
}

export function getProfessorAllocations(
  user: any,
  allocations: SubjectAllocation[] = allAllocations
): SubjectAllocation[] {
  if (!user) return [];
  const uId = user.id ? Number(user.id) : null;
  const uUsername = (user.username || '').trim().toLowerCase();

  const cleanName = (user.name || '')
    .toLowerCase()
    .replace(/(pro\.|pro|prof\.|prof|dr\.|dr)/gi, '')
    .replace(/[^a-z0-9]/g, '');

  return allocations.filter((a) => {
    // 1. Match by Exact Professor ID
    if (uId && a.professorId && Number(a.professorId) === uId) {
      return true;
    }
    // 2. Match by Exact Username
    if (uUsername && a.professorUsername && a.professorUsername.toLowerCase() === uUsername) {
      return true;
    }
    // 3. Match by Normalized Full Name without titles
    if (cleanName.length >= 4) {
      const aCleanName = (a.professorName || '')
        .toLowerCase()
        .replace(/(pro\.|pro|prof\.|prof|dr\.|dr)/gi, '')
        .replace(/[^a-z0-9]/g, '');
      if (aCleanName && (aCleanName === cleanName || aCleanName.includes(cleanName) || cleanName.includes(aCleanName))) {
        return true;
      }
    }
    return false;
  });
}

// 15. Real Year-Wise Academic Sessions & Term Lifecycles
export const initialAcademicSessions: AcademicSessionConfig[] = [
  {
    id: 1,
    year: 1,
    yearLabel: '1st Year (B.Tech)',
    branch: 'ALL',
    academicSession: '2025-2026',
    semesterType: 'odd',
    currentSemester: 1,
    oddSemesterNumber: 1,
    evenSemesterNumber: 2,
    termStartDate: '15-Jul-2025',
    termEndDate: '10-Jan-2026',
    examStartDate: '15-Jan-2026',
    status: 'Active Teaching',
    totalStudents: 48,
    activeSubjectsCount: 6,
  },
  {
    id: 2,
    year: 2,
    yearLabel: '2nd Year (B.Tech)',
    branch: 'ALL',
    academicSession: '2025-2026',
    semesterType: 'odd',
    currentSemester: 3,
    oddSemesterNumber: 3,
    evenSemesterNumber: 4,
    termStartDate: '15-Jul-2025',
    termEndDate: '10-Jan-2026',
    examStartDate: '15-Jan-2026',
    status: 'Active Teaching',
    totalStudents: 52,
    activeSubjectsCount: 8,
  },
  {
    id: 3,
    year: 3,
    yearLabel: '3rd Year (B.Tech)',
    branch: 'ALL',
    academicSession: '2025-2026',
    semesterType: 'odd',
    currentSemester: 5,
    oddSemesterNumber: 5,
    evenSemesterNumber: 6,
    termStartDate: '15-Jul-2025',
    termEndDate: '10-Jan-2026',
    examStartDate: '15-Jan-2026',
    status: 'Active Teaching',
    totalStudents: 44,
    activeSubjectsCount: 8,
  },
  {
    id: 4,
    year: 4,
    yearLabel: '4th Year (B.Tech)',
    branch: 'ALL',
    academicSession: '2025-2026',
    semesterType: 'odd',
    currentSemester: 7,
    oddSemesterNumber: 7,
    evenSemesterNumber: 8,
    termStartDate: '01-Jul-2025',
    termEndDate: '15-Dec-2025',
    examStartDate: '20-Dec-2025',
    status: 'Examinations',
    totalStudents: 40,
    activeSubjectsCount: 6,
  },
];

