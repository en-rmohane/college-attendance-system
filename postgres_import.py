# postgres_import.py - IDEMPOTENT VERSION
import json
import os
from datetime import datetime
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from app import app, db
from models import (User, Student, Subject, ProfessorSubject, CurrentSemester, 
                    RGPVScheme, TimetableSlot, Test, Question, TestAttempt, 
                    StudentAnswer, Notice, Attendance, AttendanceReport, 
                    QuestionSection, Faculty)

def parse_datetime(dt_str):
    if not dt_str or dt_str == 'None':
        return None
    formats = ['%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%d %H:%M:%S', '%Y-%m-%d']
    for fmt in formats:
        try:
            return datetime.strptime(dt_str, fmt)
        except ValueError:
            continue
    return None

def safe_add(obj):
    try:
        db.session.add(obj)
        db.session.flush()
        return True
    except IntegrityError:
        db.session.rollback()
        return False

def import_to_postgres():
    print("Starting IDEMPOTENT PostgreSQL Import...")
    if not os.path.exists('transfer_data.json'):
        print("Error: transfer_data.json not found!")
        return

    with app.app_context():
        with open('transfer_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        user_map = {}
        student_map = {}
        subject_map = {}
        faculty_map = {}
        test_map = {}

        # 1. USERS
        print("Importing Users...")
        for u in data.get('users', []):
            existing = User.query.filter(or_(User.email == u['email'], User.username == u['username'])).first()
            if not existing:
                new_u = User(
                    username=u['username'], fullname=u['fullname'], email=u['email'],
                    role=u['role'], branch=u.get('branch'), student_roll=u.get('student_roll'),
                    email_verified=u.get('email_verified', True), is_active=u.get('is_active', True),
                    profile_photo=u.get('profile_photo'), created_at=parse_datetime(u.get('created_at'))
                )
                if u.get('password_hash'): new_u.password_hash = u['password_hash']
                else: new_u.set_password('temp123')
                if safe_add(new_u): user_map[u['id']] = new_u.id
            else:
                user_map[u['id']] = existing.id
        db.session.commit()

        # 2. STUDENTS
        print("Importing Students...")
        for s in data.get('students', []):
            existing = Student.query.filter_by(roll=s['roll']).first()
            if not existing:
                new_s = Student(
                    roll=s['roll'], name=s['name'], branch=s['branch'], year=s['year'],
                    created_at=parse_datetime(s.get('created_at')), is_active=s.get('is_active', True)
                )
                if safe_add(new_s): student_map[s['id']] = new_s.id
            else:
                student_map[s['id']] = existing.id
        db.session.commit()

        # 3. SUBJECTS
        print("Importing Subjects...")
        for sub in data.get('subjects', []):
            existing = Subject.query.filter_by(code=sub['code'], branch=sub['branch'], semester=sub['semester']).first()
            if not existing:
                new_sub = Subject(
                    code=sub['code'], name=sub['name'], branch=sub['branch'],
                    semester=sub['semester'], is_active=sub.get('is_active', True),
                    created_at=parse_datetime(sub.get('created_at'))
                )
                if safe_add(new_sub): subject_map[sub['id']] = new_sub.id
            else:
                subject_map[sub['id']] = existing.id
        db.session.commit()

        # 4. FACULTY
        print("Importing Faculty...")
        for f in data.get('faculties', []):
            existing = Faculty.query.filter_by(email=f['email']).first()
            if not existing:
                new_f = Faculty(
                    name=f['name'], email=f['email'], phone=f.get('phone'),
                    designation=f['designation'], branches=f['branches'],
                    is_active=f.get('is_active', True), created_at=parse_datetime(f.get('created_at'))
                )
                if safe_add(new_f): faculty_map[f['id']] = new_f.id
            else:
                faculty_map[f['id']] = existing.id
        db.session.commit()

        # 5. PROFESSOR SUBJECTS
        print("Linking Professors to Subjects...")
        for ps in data.get('professor_subjects', []):
            prof_id = user_map.get(ps['professor_id'])
            subj_id = subject_map.get(ps['subject_id'])
            if prof_id and subj_id:
                if not ProfessorSubject.query.filter_by(professor_id=prof_id, subject_id=subj_id).first():
                    safe_add(ProfessorSubject(professor_id=prof_id, subject_id=subj_id))
        db.session.commit()

        # 6. TESTS & QUESTIONS
        print("Importing Tests and Questions...")
        for t in data.get('tests', []):
            subj_id = subject_map.get(t['subject_id'])
            prof_id = user_map.get(t['professor_id'])
            if subj_id and prof_id:
                existing_t = Test.query.filter_by(title=t['title'], subject_id=subj_id).first()
                if not existing_t:
                    new_t = Test(
                        title=t['title'], description=t.get('description'), subject_id=subj_id,
                        professor_id=prof_id, total_marks=t['total_marks'], duration_minutes=t['duration_minutes'],
                        security_code=t.get('security_code'), require_security_code=t.get('require_security_code', False),
                        available_from=parse_datetime(t.get('available_from')), available_until=parse_datetime(t.get('available_until')),
                        start_time=parse_datetime(t.get('start_time')), end_time=parse_datetime(t.get('end_time')),
                        auto_submit=t.get('auto_submit', True), prevent_tab_switch=t.get('prevent_tab_switch', True),
                        allow_retake=t.get('allow_retake', False), is_active=t.get('is_active', True),
                        status=t.get('status', 'draft'), created_at=parse_datetime(t.get('created_at'))
                    )
                    if safe_add(new_t): test_map[t['id']] = new_t.id
                else:
                    test_map[t['id']] = existing_t.id
        
        for q in data.get('questions', []):
            t_id = test_map.get(q['test_id'])
            if t_id:
                db.session.add(Question(
                    test_id=t_id, question_type=q['question_type'], question_text=q['question_text'],
                    option_a=q.get('option_a'), option_b=q.get('option_b'), option_c=q.get('option_c'), 
                    option_d=q.get('option_d'), correct_answer=q.get('correct_answer'),
                    marks=q.get('marks', 1), question_order=q.get('question_order', 0)
                ))
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()

        # 7. ATTENDANCE
        print("Importing Attendance...")
        for a in data.get('attendance', []):
            s_id = student_map.get(a['student_id'])
            sub_id = subject_map.get(a['subject_id'])
            if s_id and sub_id:
                dt = parse_datetime(a['date']).date() if a['date'] else None
                if dt:
                    safe_add(Attendance(student_id=s_id, subject_id=sub_id, date=dt, status=a['status']))
        db.session.commit()

        # 8. NOTICES
        print("Importing Notices...")
        for n in data.get('notices', []):
            creator_id = user_map.get(n['created_by'])
            if creator_id:
                safe_add(Notice(
                    title=n['title'], message=n['message'], created_by=creator_id,
                    target_audience=n['target_audience'], branch=n.get('branch'),
                    year=n.get('year'), is_important=n.get('is_important', False),
                    created_at=parse_datetime(n.get('created_at'))
                ))
        db.session.commit()

        print("\nCOMPREHENSIVE IMPORT SUMMARY:")
        print(f"   Users matched/imported: {len(user_map)}")
        print(f"   Students matched/imported: {len(student_map)}")
        print(f"   Subjects matched/imported: {len(subject_map)}")
        print(f"   Tests matched/imported: {len(test_map)}")
        print("\nPostgreSQL Import Completed Idempotently!")

if __name__ == '__main__':
    import_to_postgres()