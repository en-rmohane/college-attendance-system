# postgres_import.py - FIXED VERSION
import json
import os
from datetime import datetime
from app import app, db
from models import User, Student, Subject, ProfessorSubject, CurrentSemester, RGPVScheme, TimetableSlot, Test, Question, \
    TestAttempt, StudentAnswer, Notice


def parse_datetime(dt_str):
    """Convert string to datetime object"""
    if not dt_str:
        return None
    try:
        # Multiple format handle karo
        formats = [
            '%Y-%m-%d %H:%M:%S.%f',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d'
        ]

        for fmt in formats:
            try:
                return datetime.strptime(dt_str, fmt)
            except ValueError:
                continue
        return None
    except:
        return None


def import_to_postgres():
    print("🚀 Starting PostgreSQL Import...")

    with app.app_context():
        # Load transfer data
        with open('transfer_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        imported_counts = {}

        # 1. IMPORT USERS (Skip existing)
        users_data = data.get('users', [])
        user_count = 0
        for user_data in users_data:
            if not User.query.filter_by(email=user_data['email']).first():
                user = User(
                    username=user_data['username'],
                    fullname=user_data['fullname'],
                    email=user_data['email'],
                    role=user_data['role'],
                    branch=user_data['branch'],
                    student_roll=user_data.get('student_roll'),
                    email_verified=user_data.get('email_verified', True),
                    is_active=user_data.get('is_active', True),
                    profile_photo=user_data.get('profile_photo'),
                    created_at=parse_datetime(user_data.get('created_at'))
                )
                # Set temporary password
                user.set_password('temp123')
                db.session.add(user)
                user_count += 1

        db.session.commit()
        imported_counts['users'] = user_count
        print(f"✅ Users imported: {user_count}")

        # 2. IMPORT STUDENTS
        students_data = data.get('students', [])
        student_count = 0
        for student_data in students_data:
            if not Student.query.filter_by(roll=student_data['roll']).first():
                student = Student(
                    roll=student_data['roll'],
                    name=student_data['name'],
                    branch=student_data['branch'],
                    year=student_data['year'],
                    created_at=parse_datetime(student_data.get('created_at')),
                    is_active=student_data.get('is_active', True)
                )
                db.session.add(student)
                student_count += 1

        db.session.commit()
        imported_counts['students'] = student_count
        print(f"✅ Students imported: {student_count}")

        # 3. IMPORT SUBJECTS
        subjects_data = data.get('subjects', [])
        subject_count = 0
        for subject_data in subjects_data:
            if not Subject.query.filter_by(code=subject_data['code'], branch=subject_data['branch']).first():
                subject = Subject(
                    code=subject_data['code'],
                    name=subject_data['name'],
                    branch=subject_data['branch'],
                    semester=subject_data['semester'],
                    is_active=subject_data.get('is_active', True),
                    created_at=parse_datetime(subject_data.get('created_at'))
                )
                db.session.add(subject)
                subject_count += 1

        db.session.commit()
        imported_counts['subjects'] = subject_count
        print(f"✅ Subjects imported: {subject_count}")

        # 4. IMPORT PROFESSOR SUBJECTS (With proper ID mapping)
        prof_subjects_data = data.get('professor_subjects', [])
        prof_subject_count = 0

        for ps_data in prof_subjects_data:
            try:
                # Find professor by original ID (if exists) or get first professor
                original_prof_id = ps_data['professor_id']
                professor = User.query.filter_by(id=original_prof_id, role='professor').first()

                if not professor:
                    # Koi bhi professor use karo
                    professor = User.query.filter_by(role='professor').first()

                # Find subject by original ID or code
                original_subject_id = ps_data['subject_id']
                subject = Subject.query.filter_by(id=original_subject_id).first()

                if professor and subject:
                    if not ProfessorSubject.query.filter_by(professor_id=professor.id, subject_id=subject.id).first():
                        prof_subject = ProfessorSubject(
                            professor_id=professor.id,
                            subject_id=subject.id,
                            created_at=parse_datetime(ps_data.get('created_at'))
                        )
                        db.session.add(prof_subject)
                        prof_subject_count += 1
            except Exception as e:
                print(f"⚠️  Skipping professor_subject: {e}")
                continue

        db.session.commit()
        imported_counts['professor_subjects'] = prof_subject_count
        print(f"✅ Professor Subjects imported: {prof_subject_count}")

        # 5. IMPORT CURRENT SEMESTER
        current_semester_data = data.get('current_semester', [])
        cs_count = 0
        for cs_data in current_semester_data:
            if not CurrentSemester.query.filter_by(
                    branch=cs_data['branch'],
                    year=cs_data['year'],
                    is_active=True
            ).first():
                cs = CurrentSemester(
                    branch=cs_data['branch'],
                    year=cs_data['year'],
                    semester_type=cs_data['semester_type'],
                    academic_year=cs_data['academic_year'],
                    is_active=cs_data.get('is_active', True),
                    created_at=parse_datetime(cs_data.get('created_at'))
                )
                db.session.add(cs)
                cs_count += 1

        db.session.commit()
        imported_counts['current_semester'] = cs_count
        print(f"✅ Current Semester records: {cs_count}")

        # 6. IMPORT TESTS
        tests_data = data.get('tests', [])
        test_count = 0
        for test_data in tests_data:
            # Find subject by original ID
            original_subject_id = test_data['subject_id']
            subject = Subject.query.filter_by(id=original_subject_id).first()

            # Find professor by original ID
            original_prof_id = test_data['professor_id']
            professor = User.query.filter_by(id=original_prof_id, role='professor').first()

            if subject and professor:
                if not Test.query.filter_by(title=test_data['title'], subject_id=subject.id).first():
                    test = Test(
                        title=test_data['title'],
                        description=test_data.get('description'),
                        subject_id=subject.id,
                        professor_id=professor.id,
                        total_marks=test_data.get('total_marks', 100),
                        duration_minutes=test_data.get('duration_minutes', 60),
                        available_from=parse_datetime(test_data.get('available_from')),
                        available_until=parse_datetime(test_data.get('available_until')),
                        start_time=parse_datetime(test_data.get('start_time')),
                        end_time=parse_datetime(test_data.get('end_time')),
                        is_active=test_data.get('is_active', True),
                        instructions=test_data.get('instructions'),
                        status=test_data.get('status', 'draft'),
                        security_code=test_data.get('security_code'),
                        require_security_code=test_data.get('require_security_code', False),
                        created_at=parse_datetime(test_data.get('created_at'))
                    )
                    db.session.add(test)
                    test_count += 1

        db.session.commit()
        imported_counts['tests'] = test_count
        print(f"✅ Tests imported: {test_count}")

        print("\n🎯 IMPORT SUMMARY:")
        for table, count in imported_counts.items():
            print(f"   {table}: {count} records")

        print("\n✅ PostgreSQL Import Completed!")


if __name__ == '__main__':
    import_to_postgres()