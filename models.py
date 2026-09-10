from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from sqlalchemy.orm import foreign

db = SQLAlchemy()


class User(db.Model, UserMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    fullname = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='student')
    branch = db.Column(db.String(100), nullable=True)
    student_roll = db.Column(db.String(20), unique=True, nullable=True)

    # extra useful fields (pehle waale waapas daal diye)
    email_verified = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    profile_photo = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def set_password(self, password):
        """Hash and set the password for the user"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify a password against the stored hash"""
        return check_password_hash(self.password_hash, password)


class Student(db.Model):
    __tablename__ = 'students'

    id = db.Column(db.Integer, primary_key=True)
    roll = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    branch = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    is_active = db.Column(db.Boolean, default=True)


class CurrentSemester(db.Model):
    __tablename__ = 'current_semester'

    id = db.Column(db.Integer, primary_key=True)
    branch = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    semester_type = db.Column(db.String(10), nullable=False)
    academic_year = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def __repr__(self):
        return f"<CurrentSemester {self.branch} Year{self.year} {self.academic_year} {self.semester_type}>"


class Subject(db.Model):
    __tablename__ = 'subjects'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    branch = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def __repr__(self):
        return f"<Subject {self.code} - {self.name}>"


class MidTermMarks(db.Model):
    __tablename__ = 'mid_term_marks'

    id = db.Column(db.Integer, primary_key=True)

    # Foreign keys
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    professor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    marks_obtained = db.Column(db.Float, nullable=False)
    total_marks = db.Column(db.Float, nullable=False, default=100)
    exam_type = db.Column(db.String(20), nullable=False, default='mid_term')
    semester = db.Column(db.Integer, nullable=False)
    academic_year = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    student = db.relationship('Student', backref=db.backref('mid_term_marks', lazy=True))
    subject = db.relationship('Subject', backref=db.backref('mid_term_marks', lazy=True))
    professor = db.relationship('User', backref=db.backref('mid_term_marks', lazy=True))

    def __repr__(self):
        return f"<MidTermMarks student={self.student_id} subject={self.subject_id} marks={self.marks_obtained}>"


class ProfessorSubject(db.Model):
    __tablename__ = 'professor_subjects'

    id = db.Column(db.Integer, primary_key=True)
    professor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)


class Attendance(db.Model):
    __tablename__ = 'attendance'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(10), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)


class AttendanceReport(db.Model):
    __tablename__ = 'attendance_reports'

    id = db.Column(db.Integer, primary_key=True)
    professor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    date = db.Column(db.Date, nullable=False)
    report_path = db.Column(db.String(500), nullable=True)
    report_type = db.Column(db.String(50), default='custom_csv')  # ADD THIS
    created_at = db.Column(db.DateTime, default=datetime.now)


class PasswordResetOTP(db.Model):
    __tablename__ = 'password_reset_otps'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    otp_code = db.Column(db.String(10), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

class EmailLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    recipient = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='Pending')
    error_message = db.Column(db.Text, nullable=True)  # <-- ADD THIS
    created_at = db.Column(db.DateTime, default=datetime.now)

class Faculty(db.Model):
    __tablename__ = 'faculties'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(15), nullable=True)
    designation = db.Column(db.String(50), nullable=False)
    branches = db.Column(db.String(200), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def __repr__(self):
        return f"<Faculty {self.name} - {self.designation}>"


class Notes(db.Model):
    __tablename__ = 'notes'

    id = db.Column(db.Integer, primary_key=True)
    professor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    file_path = db.Column(db.String(500))
    file_name = db.Column(db.String(200))
    file_size = db.Column(db.Integer)
    uploaded_at = db.Column(db.DateTime, default=datetime.now)
    is_active = db.Column(db.Boolean, default=True)

    professor = db.relationship('User', backref=db.backref('uploaded_notes', lazy=True))
    subject = db.relationship('Subject', backref=db.backref('notes', lazy=True))


class Notice(db.Model):
    __tablename__ = 'notices'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_audience = db.Column(db.String(20), nullable=False, default='all')
    branch = db.Column(db.String(100), nullable=True)
    year = db.Column(db.Integer, nullable=True)
    is_important = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    expires_at = db.Column(db.DateTime, nullable=True)
    seen_by = db.Column(db.Text, default='')

    creator = db.relationship('User', backref='created_notices')


class RGPVScheme(db.Model):
    __tablename__ = 'rgpv_schemes'

    id = db.Column(db.Integer, primary_key=True)
    branch = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    lectures_per_week = db.Column(db.Integer, nullable=False)
    tutorials_per_week = db.Column(db.Integer, default=0)
    practicals_per_week = db.Column(db.Integer, default=0)
    credits = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def __repr__(self):
        return f"<RGPVScheme {self.branch} Y{self.year}S{self.semester} - {self.credits} credits>"


class TimetableSlot(db.Model):
    __tablename__ = 'timetable_slots'

    id = db.Column(db.Integer, primary_key=True)
    branch = db.Column(db.String(100), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    semester = db.Column(db.Integer, nullable=False)
    day_of_week = db.Column(db.Integer, nullable=False)
    period_number = db.Column(db.Integer, nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculties.id'), nullable=False)
    room_number = db.Column(db.String(20), nullable=False)
    slot_type = db.Column(db.String(20), nullable=False, default='lecture')

    # ADD THESE 2 LINES FOR COMMON SUBJECTS FEATURE
    is_common = db.Column(db.Boolean, default=False)  # New field
    common_name = db.Column(db.String(100))  # New field

    created_at = db.Column(db.DateTime, default=datetime.now)

    def __repr__(self):
        return f"<TimetableSlot {self.branch} D{self.day_of_week}P{self.period_number}>"
# ========== SMART TEST MANAGEMENT MODELS ==========

class Test(db.Model):
    __tablename__ = 'tests'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    professor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    total_marks = db.Column(db.Integer, nullable=False, default=100)
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    security_code = db.Column(db.String(10), unique=True, nullable=True)  # Random ID
    require_security_code = db.Column(db.Boolean, default=False)  # Security enable/disable
    security_code_verified = db.Column(db.Boolean, default=False)

    # FLEXIBLE AVAILABILITY PERIOD
    available_from = db.Column(db.DateTime, nullable=False)
    available_until = db.Column(db.DateTime, nullable=False)

    # Timing fields
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)

    # SMART FEATURES
    auto_submit = db.Column(db.Boolean, default=True)
    prevent_tab_switch = db.Column(db.Boolean, default=True)
    allow_retake = db.Column(db.Boolean, default=False)

    is_active = db.Column(db.Boolean, default=True)
    instructions = db.Column(db.Text)
    question_types = db.Column(db.String(100), default='mcq')
    test_type = db.Column(db.String(20), default='mixed')
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Test status (draft/published)
    status = db.Column(db.String(20), default='draft')  # draft, published

    # Relationships
    subject = db.relationship('Subject', backref=db.backref('tests', lazy=True))
    professor = db.relationship('User', backref=db.backref('created_tests', lazy=True))
    questions = db.relationship('Question', backref='test', lazy=True, cascade='all, delete-orphan')
    attempts = db.relationship('TestAttempt', backref='test', lazy=True, cascade='all, delete-orphan')

    @property
    def calculated_total_marks(self):
        """Calculate total marks from questions"""
        return sum(question.marks for question in self.questions)

    @property
    def total_questions(self):
        """Get total number of questions"""
        return len(self.questions)

    def __repr__(self):
        return f'<Test {self.title}>'


class QuestionSection(db.Model):
    __tablename__ = 'question_sections'

    id = db.Column(db.Integer, primary_key=True)
    test_id = db.Column(db.Integer, db.ForeignKey('tests.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    question_type = db.Column(db.String(20), nullable=False, default='mcq')  # 'mcq', 'theory', 'mixed', 'coding'
    total_marks = db.Column(db.Float, default=0)
    instructions = db.Column(db.Text)
    section_order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationships
    questions = db.relationship('Question', backref='section', lazy=True, cascade='all, delete-orphan')


class Question(db.Model):
    __tablename__ = 'questions'

    id = db.Column(db.Integer, primary_key=True)
    test_id = db.Column(db.Integer, db.ForeignKey('tests.id'), nullable=False)
    section_id = db.Column(db.Integer, db.ForeignKey('question_sections.id'), nullable=True)
    question_type = db.Column(db.String(20), nullable=False, default='mcq')  # 'mcq', 'theory', 'coding'
    question_text = db.Column(db.Text, nullable=False)

    # MCQ Fields
    option_a = db.Column(db.String(500))
    option_b = db.Column(db.String(500))
    option_c = db.Column(db.String(500))
    option_d = db.Column(db.String(500))
    correct_answer = db.Column(db.String(1))  # 'A', 'B', 'C', 'D'

    # Theory Fields
    expected_answer = db.Column(db.Text)
    word_limit = db.Column(db.Integer, default=0)
    attachment_required = db.Column(db.Boolean, default=False)

    # Coding Fields
    code_template = db.Column(db.Text)
    test_cases = db.Column(db.Text)
    programming_language = db.Column(db.String(50))

    marks = db.Column(db.Float, nullable=False, default=1)
    question_order = db.Column(db.Integer, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationships
    student_answers = db.relationship('StudentAnswer', backref='question', lazy=True, cascade='all, delete-orphan')


class TestAttempt(db.Model):
    __tablename__ = 'test_attempts'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    test_id = db.Column(db.Integer, db.ForeignKey('tests.id'), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime)
    expected_end_time = db.Column(db.DateTime)  # Calculated end time (start + duration)
    submitted = db.Column(db.Boolean, default=False)
    total_marks_obtained = db.Column(db.Float, default=0)

    # Tab switch tracking
    tab_switch_count = db.Column(db.Integer, default=0)
    last_activity = db.Column(db.DateTime, default=datetime.now)

    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

    # Relationships
    student = db.relationship('Student', backref=db.backref('test_attempts', lazy=True))
    answers = db.relationship('StudentAnswer', backref='attempt', lazy=True, cascade='all, delete-orphan')


class StudentAnswer(db.Model):
    __tablename__ = 'student_answers'

    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('test_attempts.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)

    # Different answer types
    selected_answer = db.Column(db.String(1))  # For MCQ
    theory_answer = db.Column(db.Text)  # For theory questions
    code_answer = db.Column(db.Text)  # For coding questions
    attached_file = db.Column(db.String(500))  # File path for attachments

    is_correct = db.Column(db.Boolean, default=False)
    marks_obtained = db.Column(db.Float, default=0)
    evaluated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    evaluated_at = db.Column(db.DateTime)
    feedback = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.now)

    #  FIX: ADD UNIQUE CONSTRAINT TO PREVENT DUPLICATES
    __table_args__ = (
        db.UniqueConstraint('attempt_id', 'question_id', name='unique_attempt_question'),
    )

    # Relationships
    evaluator = db.relationship('User', backref=db.backref('evaluated_answers', lazy=True))

# ======================= RELATIONSHIPS / UTILITIES =======================

# User-Student relationship (User.student_roll -> Student.roll)
User.student_info = db.relationship(
    'Student',
    primaryjoin='User.student_roll == foreign(Student.roll)',
    uselist=False,
    viewonly=True
)

# Professor-Subject relationships
ProfessorSubject.professor = db.relationship('User', backref=db.backref('subject_allocations', lazy=True))
ProfessorSubject.subject = db.relationship('Subject', backref=db.backref('professor_allocations', lazy=True))

# Attendance relationships
Attendance.student = db.relationship('Student', backref=db.backref('attendance_records', lazy=True))
Attendance.subject = db.relationship('Subject', backref=db.backref('attendance_records', lazy=True))

# AttendanceReport relationships
AttendanceReport.professor = db.relationship('User', backref=db.backref('generated_reports', lazy=True))
AttendanceReport.subject = db.relationship('Subject', backref=db.backref('generated_reports', lazy=True))

# PasswordResetOTP relationship
PasswordResetOTP.user = db.relationship('User', backref=db.backref('password_reset_otps', lazy=True))

# RGPVScheme relationship
RGPVScheme.subject = db.relationship('Subject', backref=db.backref('rgpv_schemes', lazy=True))

# TimetableSlot relationships
TimetableSlot.subject = db.relationship('Subject', backref=db.backref('timetable_slots', lazy=True))
TimetableSlot.faculty = db.relationship('Faculty', backref=db.backref('timetable_slots', lazy=True))


def get_year_word(year_no):
    """Convert year number to word"""
    mapping = {1: "First", 2: "Second", 3: "Third", 4: "Fourth"}
    return mapping.get(year_no, f"Year {year_no}")


def initialize_rgpv_scheme_complete():
    """Initialize complete RGPV scheme based on the PDF files"""

    rgpv_scheme_data = [
        # ======================= CSE BRANCH =======================
        # ---------- 3rd Semester (CSE) ----------
        {'branch': 'CSE', 'year': 2, 'semester': 3, 'code': 'CS301', 'name': 'Energy & Environmental Engineering',
         'lectures': 3, 'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'CSE', 'year': 2, 'semester': 3, 'code': 'CS302', 'name': 'Discrete Structure', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'CSE', 'year': 2, 'semester': 3, 'code': 'CS303', 'name': 'Data Structure', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'CSE', 'year': 2, 'semester': 3, 'code': 'CS304', 'name': 'Digital Systems', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'CSE', 'year': 2, 'semester': 3, 'code': 'CS305',
         'name': 'Object Oriented Programming & Methodology', 'lectures': 3, 'tutorials': 0, 'practical': 2,
         'credits': 4},
        {'branch': 'CSE', 'year': 2, 'semester': 3, 'code': 'CS306', 'name': 'Computer Workshop', 'lectures': 0,
         'tutorials': 0, 'practical': 4, 'credits': 2},
        {'branch': 'CSE', 'year': 2, 'semester': 3, 'code': 'BT107', 'name': 'Internship-I', 'lectures': 0,
         'tutorials': 0, 'practical': 2, 'credits': 1},

        # ---------- 4th Semester (CSE) ----------
        {'branch': 'CSE', 'year': 2, 'semester': 4, 'code': 'BT401', 'name': 'Mathematics III', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'CSE', 'year': 2, 'semester': 4, 'code': 'CS402', 'name': 'Analysis Design of Algorithm',
         'lectures': 2, 'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'CSE', 'year': 2, 'semester': 4, 'code': 'CS403', 'name': 'Software Engineering', 'lectures': 3,
         'tutorials': 1, 'practical': 2, 'credits': 5},
        {'branch': 'CSE', 'year': 2, 'semester': 4, 'code': 'CS404', 'name': 'Computer Organization & Architecture',
         'lectures': 3, 'tutorials': 1, 'practical': 2, 'credits': 5},
        {'branch': 'CSE', 'year': 2, 'semester': 4, 'code': 'CS405', 'name': 'Operating Systems', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'CSE', 'year': 2, 'semester': 4, 'code': 'CS406', 'name': 'Programming Practices', 'lectures': 0,
         'tutorials': 0, 'practical': 4, 'credits': 2},

        # ---------- 5th Semester (CSE) ----------
        {'branch': 'CSE', 'year': 3, 'semester': 5, 'code': 'CS501', 'name': 'Theory of Computation', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 5, 'code': 'CS502', 'name': 'Database Management Systems',
         'lectures': 3, 'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 5, 'code': 'CS503', 'name': 'Departmental Elective', 'lectures': 3,
         'tutorials': 0, 'practical': 0, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 5, 'code': 'CS504', 'name': 'Open Elective', 'lectures': 3,
         'tutorials': 0, 'practical': 0, 'credits': 3},
        {'branch': 'CSE', 'year': 3, 'semester': 5, 'code': 'CS505', 'name': 'Lab (Linux)', 'lectures': 0,
         'tutorials': 0, 'practical': 4, 'credits': 2},
        {'branch': 'CSE', 'year': 3, 'semester': 5, 'code': 'CS506', 'name': 'Lab (Python)', 'lectures': 0,
         'tutorials': 0, 'practical': 4, 'credits': 2},

        # ---------- 6th Semester (CSE) ----------
        {'branch': 'CSE', 'year': 3, 'semester': 6, 'code': 'CS601', 'name': 'Machine Learning', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 6, 'code': 'CS602', 'name': 'Computer Networks', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 6, 'code': 'CS603', 'name': 'Departmental Elective', 'lectures': 4,
         'tutorials': 0, 'practical': 0, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 6, 'code': 'CS604', 'name': 'Open Elective', 'lectures': 4,
         'tutorials': 0, 'practical': 0, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 6, 'code': 'CS605', 'name': 'Data Analytics Lab', 'lectures': 0,
         'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'CSE', 'year': 3, 'semester': 6, 'code': 'CS606', 'name': 'Skill Development Lab', 'lectures': 0,
         'tutorials': 0, 'practical': 6, 'credits': 3},

        # ---------- 7th Semester (CSE) ----------
        {'branch': 'CSE', 'year': 4, 'semester': 7, 'code': 'CS701', 'name': 'Software Architectures', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'CSE', 'year': 4, 'semester': 7, 'code': 'CS702', 'name': 'Departmental Elective', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'CSE', 'year': 4, 'semester': 7, 'code': 'CS703', 'name': 'Open Elective', 'lectures': 3,
         'tutorials': 0, 'practical': 0, 'credits': 3},
        {'branch': 'CSE', 'year': 4, 'semester': 7, 'code': 'CS704', 'name': 'Departmental Elective Lab',
         'lectures': 0, 'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'CSE', 'year': 4, 'semester': 7, 'code': 'CS705', 'name': 'Open Elective Lab', 'lectures': 0,
         'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'CSE', 'year': 4, 'semester': 7, 'code': 'CS706', 'name': 'Major Project-I', 'lectures': 0,
         'tutorials': 0, 'practical': 8, 'credits': 4},

        # ---------- 8th Semester (CSE) ----------
        {'branch': 'CSE', 'year': 4, 'semester': 8, 'code': 'CS801', 'name': 'Internet of Things', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'CSE', 'year': 4, 'semester': 8, 'code': 'CS802', 'name': 'Departmental Elective', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'CSE', 'year': 4, 'semester': 8, 'code': 'CS803', 'name': 'Open Elective', 'lectures': 3,
         'tutorials': 0, 'practical': 0, 'credits': 3},
        {'branch': 'CSE', 'year': 4, 'semester': 8, 'code': 'CS804', 'name': 'D/O Elective Lab', 'lectures': 0,
         'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'CSE', 'year': 4, 'semester': 8, 'code': 'CS805', 'name': 'Major Project-II', 'lectures': 0,
         'tutorials': 0, 'practical': 8, 'credits': 4},

        # ======================= Artificial Intelligence and Data Science BRANCH =======================
        # ---------- 3rd Semester (AD) ----------
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 3, 'code': 'AD301', 'name': 'Technical Communication', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 3, 'code': 'AD302',
         'name': 'Probability and Statistics for Data Science', 'lectures': 3, 'tutorials': 1, 'practical': 0,
         'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 3, 'code': 'AD303', 'name': 'Data Structures', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 3, 'code': 'AD304', 'name': 'Artificial Intelligence', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 3, 'code': 'AD305',
         'name': 'Object Oriented Programming & Methodology', 'lectures': 3, 'tutorials': 0, 'practical': 2,
         'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 3, 'code': 'AD306',
         'name': 'Computer Workshop/Introduction to Python', 'lectures': 0, 'tutorials': 0, 'practical': 4,
         'credits': 2},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 3, 'code': 'BT107',
         'name': 'Internship-I', 'lectures': 0, 'tutorials': 0, 'practical': 2,
         'credits': 1},

        # ---------- 4th Semester (AD) ----------
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 4, 'code': 'BT401', 'name': 'Mathematics III', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 4, 'code': 'AD402', 'name': 'Database Management Systems',
         'lectures': 4, 'tutorials': 0, 'practical': 2, 'credits': 5},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 4, 'code': 'AD403',
         'name': 'Software Engineering with Agile Methodology', 'lectures': 4, 'tutorials': 0, 'practical': 2,
         'credits': 5},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 4, 'code': 'AD404', 'name': 'Data Science', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 4, 'code': 'AD405', 'name': 'Operating Systems', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 2, 'semester': 4, 'code': 'AD406',
         'name': 'Data Analytics using tools', 'lectures': 0, 'tutorials': 0, 'practical': 4, 'credits': 2},

        # ---------- 5th Semester (AD) ----------
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 5, 'code': 'AD501', 'name': 'Theory of Computation', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 5, 'code': 'AD502', 'name': 'Machine Learning', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 5, 'code': 'AD503', 'name': 'Departmental Elective', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 5, 'code': 'AD504', 'name': 'Open Elective', 'lectures': 3,
         'tutorials': 0, 'practical': 0, 'credits': 3},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 5, 'code': 'AD505', 'name': 'Departmental Elective Lab',
         'lectures': 0, 'tutorials': 0, 'practical': 4, 'credits': 2},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 5, 'code': 'AD506', 'name': 'Linux Lab', 'lectures': 0,
         'tutorials': 0, 'practical': 4, 'credits': 2},

        # ---------- 6th Semester (AD) ----------
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 6, 'code': 'AD601', 'name': 'Deep Learning', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 6, 'code': 'AD602', 'name': 'Computer Networks', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 6, 'code': 'AD603', 'name': 'Departmental Elective', 'lectures': 4,
         'tutorials': 0, 'practical': 0, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 6, 'code': 'AD604', 'name': 'Open Elective', 'lectures': 4,
         'tutorials': 0, 'practical': 0, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 6, 'code': 'AD605', 'name': 'Departmental Elective Lab',
         'lectures': 0, 'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 3, 'semester': 6, 'code': 'AD606', 'name': 'Open Elective Lab', 'lectures': 0,
         'tutorials': 0, 'practical': 6, 'credits': 3},

        # ---------- 7th Semester (AD) ----------
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 7, 'code': 'AD701', 'name': 'AI for Computer Vision', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 7, 'code': 'AD702', 'name': 'Departmental Elective', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 7, 'code': 'AD703', 'name': 'Open Elective', 'lectures': 3,
         'tutorials': 0, 'practical': 0, 'credits': 3},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 7, 'code': 'AD704', 'name': 'Departmental Elective Lab',
         'lectures': 0, 'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 7, 'code': 'AD705', 'name': 'Open Elective Lab', 'lectures': 0,
         'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 7, 'code': 'AD706', 'name': 'Major Project-I', 'lectures': 0,
         'tutorials': 0, 'practical': 8, 'credits': 4},

        # ---------- 8th Semester (AD) ----------
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 8, 'code': 'AD801', 'name': 'Big Data', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 8, 'code': 'AD802', 'name': 'Departmental Elective', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 8, 'code': 'AD803', 'name': 'Open Elective', 'lectures': 3,
         'tutorials': 0, 'practical': 0, 'credits': 3},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 8, 'code': 'AD804',
         'name': 'Departmental/Open Elective Lab', 'lectures': 0, 'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'Artificial Intelligence and Data Science', 'year': 4, 'semester': 8, 'code': 'AD805', 'name': 'Major Project-II', 'lectures': 0,
         'tutorials': 0, 'practical': 8, 'credits': 4},
    ]

    added_count = 0
    for scheme_data in rgpv_scheme_data:
        subject = Subject.query.filter_by(
            code=scheme_data['code'],
            branch=scheme_data['branch'],
            semester=scheme_data['semester']
        ).first()

        if subject:
            existing_scheme = RGPVScheme.query.filter_by(
                branch=scheme_data['branch'],
                year=scheme_data['year'],
                semester=scheme_data['semester'],
                subject_id=subject.id
            ).first()

            if not existing_scheme:
                rgpv_scheme = RGPVScheme(
                    branch=scheme_data['branch'],
                    year=scheme_data['year'],
                    semester=scheme_data['semester'],
                    subject_id=subject.id,
                    lectures_per_week=scheme_data['lectures'],
                    tutorials_per_week=scheme_data['tutorials'],
                    practicals_per_week=scheme_data['practical'],
                    credits=scheme_data['credits']
                )
                db.session.add(rgpv_scheme)
                added_count += 1

    if added_count > 0:
        db.session.commit()
        print(f" RGPV scheme initialized: {added_count} subjects added")
    else:
        print("ℹ RGPV scheme already up to date")

    return added_count


class FeeStructure(db.Model):
    __tablename__ = 'fee_structures'

    id = db.Column(db.Integer, primary_key=True)
    branch = db.Column(db.String(100), nullable=False)  # 'CSE', 'AD', 'ALL'
    year = db.Column(db.Integer, nullable=False)        # 1, 2, 3, 4
    academic_year = db.Column(db.Integer, nullable=False, default=2026)
    tuition_fee = db.Column(db.Float, nullable=False, default=45000.0)
    development_fee = db.Column(db.Float, nullable=False, default=5000.0)
    exam_fee = db.Column(db.Float, nullable=False, default=3000.0)
    other_charges = db.Column(db.Float, nullable=False, default=2000.0)
    total_fee = db.Column(db.Float, nullable=False, default=55000.0)
    due_date = db.Column(db.Date, nullable=True)
    late_fee_per_day = db.Column(db.Float, nullable=False, default=50.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    def __repr__(self):
        return f"<FeeStructure {self.branch} Year {self.year} Total: ₹{self.total_fee}>"


class StudentFeeRecord(db.Model):
    __tablename__ = 'student_fee_records'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    year = db.Column(db.Integer, nullable=False)        # 1, 2, 3, 4
    academic_year = db.Column(db.Integer, nullable=False, default=2026)
    total_fee = db.Column(db.Float, nullable=False, default=55000.0)
    discount = db.Column(db.Float, nullable=False, default=0.0)
    paid_amount = db.Column(db.Float, nullable=False, default=0.0)
    remaining_balance = db.Column(db.Float, nullable=False, default=55000.0)
    status = db.Column(db.String(20), nullable=False, default='Pending') # Paid, Partial, Pending, Overdue
    due_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)

    student = db.relationship('Student', backref=db.backref('fee_records', lazy=True))

    def update_balance(self):
        effective_total = self.total_fee - self.discount
        self.remaining_balance = max(0.0, effective_total - self.paid_amount)
        if self.remaining_balance <= 0:
            self.status = 'Paid'
        elif self.paid_amount > 0:
            self.status = 'Partial'
        else:
            self.status = 'Pending'


class FeePayment(db.Model):
    __tablename__ = 'fee_payments'

    id = db.Column(db.Integer, primary_key=True)
    receipt_no = db.Column(db.String(50), unique=True, nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    academic_year = db.Column(db.Integer, nullable=False, default=2026)
    amount_paid = db.Column(db.Float, nullable=False)
    late_fee_paid = db.Column(db.Float, nullable=False, default=0.0)
    payment_mode = db.Column(db.String(50), nullable=False, default='UPI') # UPI, Card, Net Banking, Cash, Cheque, DD
    transaction_id = db.Column(db.String(100), nullable=True)
    payment_date = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(20), nullable=False, default='Success')
    collected_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    student = db.relationship('Student', backref=db.backref('payments', lazy=True))
    collector = db.relationship('User', backref=db.backref('collected_payments', lazy=True))


# ==================== ENTERPRISE ERP FEE MANAGEMENT MODELS ====================

class AcademicYear(db.Model):
    __tablename__ = 'academic_years'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)  # e.g. "2025-26", "2026-27"
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    is_current = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)


class FeeHead(db.Model):
    __tablename__ = 'fee_heads'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)  # Tuition Fee, Exam Fee, etc.
    code = db.Column(db.String(50), unique=True, nullable=False)
    is_mandatory = db.Column(db.Boolean, default=True)
    is_taxable = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)


class FeeStructureItem(db.Model):
    __tablename__ = 'fee_structure_items'

    id = db.Column(db.Integer, primary_key=True)
    fee_structure_id = db.Column(db.Integer, db.ForeignKey('fee_structures.id'), nullable=False)
    fee_head_id = db.Column(db.Integer, db.ForeignKey('fee_heads.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False, default=0.0)

    fee_structure = db.relationship('FeeStructure', backref=db.backref('items', lazy=True, cascade='all, delete-orphan'))
    fee_head = db.relationship('FeeHead', backref=db.backref('structure_items', lazy=True))


class FeeDemand(db.Model):
    __tablename__ = 'fee_demands'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey('academic_years.id'), nullable=True)
    fee_head_id = db.Column(db.Integer, db.ForeignKey('fee_heads.id'), nullable=True)
    year = db.Column(db.Integer, nullable=False, default=1)
    original_amount = db.Column(db.Float, nullable=False)
    discount_amount = db.Column(db.Float, nullable=False, default=0.0)
    net_amount = db.Column(db.Float, nullable=False)
    paid_amount = db.Column(db.Float, nullable=False, default=0.0)
    pending_amount = db.Column(db.Float, nullable=False)
    due_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='Pending') # Pending, Partial, Paid, Overdue, Cancelled, Waived
    created_at = db.Column(db.DateTime, default=datetime.now)

    student = db.relationship('Student', backref=db.backref('demands', lazy=True))
    fee_head = db.relationship('FeeHead', backref=db.backref('demands', lazy=True))
    academic_year_rel = db.relationship('AcademicYear', backref=db.backref('demands', lazy=True))


class FeeInstallment(db.Model):
    __tablename__ = 'fee_installments'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey('academic_years.id'), nullable=True)
    installment_no = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    paid_amount = db.Column(db.Float, nullable=False, default=0.0)
    due_date = db.Column(db.Date, nullable=False)
    late_fee_amount = db.Column(db.Float, nullable=False, default=0.0)
    status = db.Column(db.String(20), nullable=False, default='Upcoming') # Upcoming, Pending, Partial, Paid, Overdue

    student = db.relationship('Student', backref=db.backref('installments', lazy=True))


class FeeLedger(db.Model):
    __tablename__ = 'fee_ledger'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    entry_date = db.Column(db.DateTime, default=datetime.now, nullable=False)
    entry_type = db.Column(db.String(50), nullable=False) # DEMAND, PAYMENT, DISCOUNT, LATE_FEE, WAIVER, REFUND, REVERSAL
    debit = db.Column(db.Float, nullable=False, default=0.0)
    credit = db.Column(db.Float, nullable=False, default=0.0)
    balance = db.Column(db.Float, nullable=False, default=0.0)
    reference_no = db.Column(db.String(100), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    remarks = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    student = db.relationship('Student', backref=db.backref('ledger_entries', lazy=True))
    user = db.relationship('User', backref=db.backref('ledger_actions', lazy=True))


class PaymentAllocation(db.Model):
    __tablename__ = 'payment_allocations'

    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.Integer, db.ForeignKey('fee_payments.id'), nullable=False)
    demand_id = db.Column(db.Integer, db.ForeignKey('fee_demands.id'), nullable=False)
    allocated_amount = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    payment = db.relationship('FeePayment', backref=db.backref('allocations', lazy=True))
    demand = db.relationship('FeeDemand', backref=db.backref('allocations', lazy=True))


class PaymentGatewayTransaction(db.Model):
    __tablename__ = 'payment_gateway_transactions'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(100), unique=True, nullable=False)
    payment_id = db.Column(db.String(100), nullable=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    gateway_name = db.Column(db.String(50), nullable=False, default='Simulated')
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(10), default='INR')
    signature = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), nullable=False, default='Initiated') # Initiated, Success, Failed, WebhookReceived
    raw_payload = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)


class LateFeeRule(db.Model):
    __tablename__ = 'late_fee_rules'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    rule_type = db.Column(db.String(20), nullable=False, default='DAILY') # FIXED, DAILY, PERCENTAGE, SLAB
    grace_period_days = db.Column(db.Integer, nullable=False, default=5)
    rate_amount = db.Column(db.Float, nullable=False, default=50.0) # Rs 50/day or 2% or Rs 500 flat
    max_late_fee = db.Column(db.Float, nullable=False, default=5000.0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)


class LateFeeWaiver(db.Model):
    __tablename__ = 'late_fee_waivers'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    student = db.relationship('Student', backref=db.backref('late_fee_waivers', lazy=True))
    approver = db.relationship('User', backref=db.backref('approved_waivers', lazy=True))


class DiscountScholarship(db.Model):
    __tablename__ = 'discount_scholarships'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    title = db.Column(db.String(150), nullable=False)
    type = db.Column(db.String(50), nullable=False, default='Scholarship') # Merit, Scholarship, Staff Ward, Concession
    amount = db.Column(db.Float, nullable=False)
    reason = db.Column(db.Text, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)

    student = db.relationship('Student', backref=db.backref('discounts', lazy=True))
    approver = db.relationship('User', backref=db.backref('approved_discounts', lazy=True))


class RefundRecord(db.Model):
    __tablename__ = 'refund_records'

    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.Integer, db.ForeignKey('fee_payments.id'), nullable=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    refund_type = db.Column(db.String(50), nullable=False, default='Cancellation') # Full, Partial, Excess, Cancellation
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='Approved') # Requested, Approved, Processed, Rejected
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    student = db.relationship('Student', backref=db.backref('refunds', lazy=True))
    payment = db.relationship('FeePayment', backref=db.backref('refunds', lazy=True))
    approver = db.relationship('User', backref=db.backref('approved_refunds', lazy=True))


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    role = db.Column(db.String(50), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    entity = db.Column(db.String(100), nullable=False)
    entity_id = db.Column(db.String(100), nullable=True)
    old_value = db.Column(db.Text, nullable=True)
    new_value = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.now, nullable=False)

    user = db.relationship('User', backref=db.backref('audit_logs', lazy=True))


class NoDuesCertificate(db.Model):
    __tablename__ = 'no_dues_certificates'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    certificate_no = db.Column(db.String(50), unique=True, nullable=False)
    academic_year_name = db.Column(db.String(50), nullable=False, default='2025-26')
    status = db.Column(db.String(20), nullable=False, default='CLEARED') # CLEARED, PENDING
    issued_date = db.Column(db.DateTime, default=datetime.now)
    issued_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    student = db.relationship('Student', backref=db.backref('no_dues_certs', lazy=True))


# ==================== TRANSPORT & BUS MANAGEMENT MODELS ====================

class BusRoute(db.Model):
    __tablename__ = 'bus_routes'

    id = db.Column(db.Integer, primary_key=True)
    route_number = db.Column(db.String(50), unique=True, nullable=False)  # e.g., "R-01", "ROUTE-A"
    route_name = db.Column(db.String(100), nullable=False)  # e.g., "Betul to College via Kothi Bazar"
    start_point = db.Column(db.String(100), nullable=False)
    end_point = db.Column(db.String(100), nullable=False, default="College Campus")
    vehicle_number = db.Column(db.String(50), nullable=False)  # e.g., "MP-48-B-1234"
    driver_name = db.Column(db.String(100), nullable=False)
    driver_phone = db.Column(db.String(20), nullable=False)
    incharge_name = db.Column(db.String(100), nullable=True)
    incharge_phone = db.Column(db.String(20), nullable=True)
    capacity = db.Column(db.Integer, nullable=False, default=45)
    default_annual_fee = db.Column(db.Float, nullable=False, default=12000.0)
    morning_departure_time = db.Column(db.String(20), nullable=True, default="07:45 AM")
    evening_departure_time = db.Column(db.String(20), nullable=True, default="05:15 PM")
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    stops = db.relationship('BusStop', backref='route', lazy=True, cascade='all, delete-orphan', order_by='BusStop.sequence_order')
    passes = db.relationship('BusPass', backref='route', lazy=True)


class BusStop(db.Model):
    __tablename__ = 'bus_stops'

    id = db.Column(db.Integer, primary_key=True)
    route_id = db.Column(db.Integer, db.ForeignKey('bus_routes.id'), nullable=False)
    stop_name = db.Column(db.String(100), nullable=False)
    morning_pickup_time = db.Column(db.String(20), nullable=False)  # e.g., "08:15 AM"
    evening_drop_time = db.Column(db.String(20), nullable=False)   # e.g., "05:45 PM"
    stop_fee = db.Column(db.Float, nullable=False, default=12000.0)
    sequence_order = db.Column(db.Integer, nullable=False, default=1)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    passes = db.relationship('BusPass', backref='stop', lazy=True)


class BusPass(db.Model):
    __tablename__ = 'bus_passes'

    id = db.Column(db.Integer, primary_key=True)
    pass_number = db.Column(db.String(50), unique=True, nullable=False)  # e.g., "BP-2026-0042"
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    route_id = db.Column(db.Integer, db.ForeignKey('bus_routes.id'), nullable=False)
    stop_id = db.Column(db.Integer, db.ForeignKey('bus_stops.id'), nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey('academic_years.id'), nullable=True)
    academic_year_name = db.Column(db.String(50), nullable=False, default="2025-26")
    
    pass_type = db.Column(db.String(50), nullable=False, default="Annual")  # Annual, Semester
    issue_date = db.Column(db.Date, nullable=False, default=datetime.now)
    valid_upto = db.Column(db.Date, nullable=False)
    
    fee_amount = db.Column(db.Float, nullable=False, default=12000.0)
    paid_amount = db.Column(db.Float, nullable=False, default=0.0)
    fee_status = db.Column(db.String(20), nullable=False, default="Pending")  # Pending, Partial, Paid
    
    status = db.Column(db.String(20), nullable=False, default="Active")  # Active, Suspended, Expired, Cancelled
    qr_token = db.Column(db.String(100), unique=True, nullable=False)
    remarks = db.Column(db.Text, nullable=True)
    issued_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)

    student = db.relationship('Student', backref=db.backref('bus_passes', lazy=True))
    issuer = db.relationship('User', backref=db.backref('issued_bus_passes', lazy=True))
    academic_year_rel = db.relationship('AcademicYear', backref=db.backref('bus_passes', lazy=True))


class BusAttendance(db.Model):
    __tablename__ = 'bus_attendances'

    id = db.Column(db.Integer, primary_key=True)
    bus_pass_id = db.Column(db.Integer, db.ForeignKey('bus_passes.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    route_id = db.Column(db.Integer, db.ForeignKey('bus_routes.id'), nullable=False)
    attendance_date = db.Column(db.Date, nullable=False, default=datetime.now)
    trip_type = db.Column(db.String(20), nullable=False, default="Pickup")  # Pickup, Drop
    status = db.Column(db.String(20), nullable=False, default="Boarded")    # Boarded, Absent
    recorded_at = db.Column(db.DateTime, default=datetime.now)
    recorded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    bus_pass = db.relationship('BusPass', backref=db.backref('attendance_records', lazy=True))
    student = db.relationship('Student', backref=db.backref('bus_attendances', lazy=True))
    route_rel = db.relationship('BusRoute', backref=db.backref('attendances', lazy=True))


class TransportApplication(db.Model):
    __tablename__ = 'transport_applications'

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('students.id'), nullable=False)
    route_id = db.Column(db.Integer, db.ForeignKey('bus_routes.id'), nullable=False)
    stop_id = db.Column(db.Integer, db.ForeignKey('bus_stops.id'), nullable=False)
    academic_year_id = db.Column(db.Integer, db.ForeignKey('academic_years.id'), nullable=True)
    application_date = db.Column(db.DateTime, default=datetime.now)
    status = db.Column(db.String(20), nullable=False, default="Pending")  # Pending, Approved, Rejected
    admin_remarks = db.Column(db.Text, nullable=True)
    processed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    processed_at = db.Column(db.DateTime, nullable=True)

    student = db.relationship('Student', backref=db.backref('transport_applications', lazy=True))
    route = db.relationship('BusRoute', backref=db.backref('applications', lazy=True))
    stop = db.relationship('BusStop', backref=db.backref('applications', lazy=True))



