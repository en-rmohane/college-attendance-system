import { UserProfile } from '../types';

export const demoUsers: Record<string, UserProfile> = {
  admin: {
    id: 1,
    username: 'admin',
    name: 'Administrator (SBITM)',
    email: 'admin@sbitm.edu.in',
    phone: '+91 94250 88200',
    role: 'admin',
    department: 'Central Campus Administration',
    designation: 'Principal & System Superadministrator',
  },
  professor: {
    id: 203,
    username: 'pankaj',
    name: 'DR. PANKAJ SINGH SISODIYA',
    email: 'pankajsinghsisodiya@college.com',
    phone: '+91 98930 11422',
    role: 'professor',
    department: 'Computer Science & Engineering (CSE & AD)',
    designation: 'Associate Professor & Academic Head',
    branch: 'CSE',
  },
  student: {
    id: 101,
    username: '0545CS231001',
    name: 'AANCHAL MALVIYA',
    email: '0545cs231001@sbitm.edu.in',
    phone: '+91 94072 65431',
    role: 'student',
    branch: 'CSE',
    roll: '0545CS231001',
    year: 2,
    semester: 3,
    academicYear: '2025-2026',
    department: 'Computer Science & Engineering',
  },
};
