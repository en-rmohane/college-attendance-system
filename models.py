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
    branch = db.Column(db.String(10), nullable=True)
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
    branch = db.Column(db.String(10), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    is_active = db.Column(db.Boolean, default=True)


class CurrentSemester(db.Model):
    __tablename__ = 'current_semester'

    id = db.Column(db.Integer, primary_key=True)
    branch = db.Column(db.String(10), nullable=False)
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
    branch = db.Column(db.String(10), nullable=False)
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
    branch = db.Column(db.String(10), nullable=True)
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
    branch = db.Column(db.String(10), nullable=False)
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
    branch = db.Column(db.String(10), nullable=False)
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

        # ======================= AD BRANCH (AI & Data Science) =======================
        # ---------- 3rd Semester (AD) ----------
        {'branch': 'AD', 'year': 2, 'semester': 3, 'code': 'AD301', 'name': 'Technical Communication', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'AD', 'year': 2, 'semester': 3, 'code': 'AD302',
         'name': 'Probability and Statistics for Data Science', 'lectures': 3, 'tutorials': 1, 'practical': 0,
         'credits': 4},
        {'branch': 'AD', 'year': 2, 'semester': 3, 'code': 'AD303', 'name': 'Data Structures', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'AD', 'year': 2, 'semester': 3, 'code': 'AD304', 'name': 'Artificial Intelligence', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'AD', 'year': 2, 'semester': 3, 'code': 'AD305',
         'name': 'Object Oriented Programming & Methodology', 'lectures': 3, 'tutorials': 0, 'practical': 2,
         'credits': 4},
        {'branch': 'AD', 'year': 2, 'semester': 3, 'code': 'AD306',
         'name': 'Computer Workshop/Introduction to Python', 'lectures': 0, 'tutorials': 0, 'practical': 4,
         'credits': 2},

        # ---------- 4th Semester (AD) ----------
        {'branch': 'AD', 'year': 2, 'semester': 4, 'code': 'BT401', 'name': 'Mathematics III', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'AD', 'year': 2, 'semester': 4, 'code': 'AD402', 'name': 'Database Management Systems',
         'lectures': 4, 'tutorials': 0, 'practical': 2, 'credits': 5},
        {'branch': 'AD', 'year': 2, 'semester': 4, 'code': 'AD403',
         'name': 'Software Engineering with Agile Methodology', 'lectures': 4, 'tutorials': 0, 'practical': 2,
         'credits': 5},
        {'branch': 'AD', 'year': 2, 'semester': 4, 'code': 'AD404', 'name': 'Data Science', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'AD', 'year': 2, 'semester': 4, 'code': 'AD405', 'name': 'Operating Systems', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'AD', 'year': 2, 'semester': 4, 'code': 'AD406',
         'name': 'Data Analytics using tools', 'lectures': 0, 'tutorials': 0, 'practical': 4, 'credits': 2},

        # ---------- 5th Semester (AD) ----------
        {'branch': 'AD', 'year': 3, 'semester': 5, 'code': 'AD501', 'name': 'Theory of Computation', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 5, 'code': 'AD502', 'name': 'Machine Learning', 'lectures': 3,
         'tutorials': 0, 'practical': 2, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 5, 'code': 'AD503', 'name': 'Departmental Elective', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 5, 'code': 'AD504', 'name': 'Open Elective', 'lectures': 3,
         'tutorials': 0, 'practical': 0, 'credits': 3},
        {'branch': 'AD', 'year': 3, 'semester': 5, 'code': 'AD505', 'name': 'Departmental Elective Lab',
         'lectures': 0, 'tutorials': 0, 'practical': 4, 'credits': 2},
        {'branch': 'AD', 'year': 3, 'semester': 5, 'code': 'AD506', 'name': 'Linux Lab', 'lectures': 0,
         'tutorials': 0, 'practical': 4, 'credits': 2},

        # ---------- 6th Semester (AD) ----------
        {'branch': 'AD', 'year': 3, 'semester': 6, 'code': 'AD601', 'name': 'Deep Learning', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 6, 'code': 'AD602', 'name': 'Computer Networks', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 6, 'code': 'AD603', 'name': 'Departmental Elective', 'lectures': 4,
         'tutorials': 0, 'practical': 0, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 6, 'code': 'AD604', 'name': 'Open Elective', 'lectures': 4,
         'tutorials': 0, 'practical': 0, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 6, 'code': 'AD605', 'name': 'Departmental Elective Lab',
         'lectures': 0, 'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'AD', 'year': 3, 'semester': 6, 'code': 'AD606', 'name': 'Open Elective Lab', 'lectures': 0,
         'tutorials': 0, 'practical': 6, 'credits': 3},

        # ---------- 7th Semester (AD) ----------
        {'branch': 'AD', 'year': 4, 'semester': 7, 'code': 'AD701', 'name': 'AI for Computer Vision', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'AD', 'year': 4, 'semester': 7, 'code': 'AD702', 'name': 'Departmental Elective', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'AD', 'year': 4, 'semester': 7, 'code': 'AD703', 'name': 'Open Elective', 'lectures': 3,
         'tutorials': 0, 'practical': 0, 'credits': 3},
        {'branch': 'AD', 'year': 4, 'semester': 7, 'code': 'AD704', 'name': 'Departmental Elective Lab',
         'lectures': 0, 'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'AD', 'year': 4, 'semester': 7, 'code': 'AD705', 'name': 'Open Elective Lab', 'lectures': 0,
         'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'AD', 'year': 4, 'semester': 7, 'code': 'AD706', 'name': 'Major Project-I', 'lectures': 0,
         'tutorials': 0, 'practical': 8, 'credits': 4},

        # ---------- 8th Semester (AD) ----------
        {'branch': 'AD', 'year': 4, 'semester': 8, 'code': 'AD801', 'name': 'Big Data', 'lectures': 2,
         'tutorials': 1, 'practical': 2, 'credits': 4},
        {'branch': 'AD', 'year': 4, 'semester': 8, 'code': 'AD802', 'name': 'Departmental Elective', 'lectures': 3,
         'tutorials': 1, 'practical': 0, 'credits': 4},
        {'branch': 'AD', 'year': 4, 'semester': 8, 'code': 'AD803', 'name': 'Open Elective', 'lectures': 3,
         'tutorials': 0, 'practical': 0, 'credits': 3},
        {'branch': 'AD', 'year': 4, 'semester': 8, 'code': 'AD804',
         'name': 'Departmental/Open Elective Lab', 'lectures': 0, 'tutorials': 0, 'practical': 6, 'credits': 3},
        {'branch': 'AD', 'year': 4, 'semester': 8, 'code': 'AD805', 'name': 'Major Project-II', 'lectures': 0,
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
