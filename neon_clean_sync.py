import os
import sys
from sqlalchemy import create_engine, MetaData, text

SQLITE_URI = "sqlite:///instance/college_attendance.db"
NEON_URI = "postgresql://neondb_owner:npg_YHD8B2QrRzkj@ep-divine-brook-b4rm51oj-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

def run_sync():
    print("=" * 65)
    print("[START] RELIABLE SYNC TO NEON POSTGRESQL")
    print("=" * 65)

    src_engine = create_engine(SQLITE_URI)
    dst_engine = create_engine(NEON_URI)

    src_meta = MetaData()
    src_meta.reflect(bind=src_engine)

    dst_meta = MetaData()
    dst_meta.reflect(bind=dst_engine)

    # Get valid IDs for foreign key mapping
    with src_engine.connect() as src_conn:
        valid_students = set(r[0] for r in src_conn.execute(text('SELECT id FROM students;')).fetchall())
        valid_faculties = set(r[0] for r in src_conn.execute(text('SELECT id FROM faculties;')).fetchall())
        valid_users = set(r[0] for r in src_conn.execute(text('SELECT id FROM users;')).fetchall())
        valid_academic_years = set(r[0] for r in src_conn.execute(text('SELECT id FROM academic_years;')).fetchall())
        valid_fee_heads = set(r[0] for r in src_conn.execute(text('SELECT id FROM fee_heads;')).fetchall())
        valid_books = set(r[0] for r in src_conn.execute(text('SELECT id FROM library_books;')).fetchall())
        valid_members = set(r[0] for r in src_conn.execute(text('SELECT id FROM library_members;')).fetchall())

    fallback_student = next(iter(valid_students)) if valid_students else 1
    fallback_faculty = next(iter(valid_faculties)) if valid_faculties else 1
    fallback_user = next(iter(valid_users)) if valid_users else 1
    fallback_ay = next(iter(valid_academic_years)) if valid_academic_years else 1
    fallback_fh = next(iter(valid_fee_heads)) if valid_fee_heads else 1
    fallback_book = next(iter(valid_books)) if valid_books else 1
    fallback_member = next(iter(valid_members)) if valid_members else 1

    table_order = [
        'academic_years', 'users', 'faculties', 'students', 'subjects',
        'professor_subjects', 'rgpv_schemes', 'current_semester', 'timetable_slots',
        'fee_structures', 'fee_heads', 'student_fee_records', 'fee_structure_items',
        'fee_demands', 'fee_schedules', 'fee_installments', 'fee_payments', 'fee_ledger',
        'payment_allocations', 'payment_gateway_transactions', 'late_fee_rules',
        'late_fee_waivers', 'discount_scholarships', 'refund_records', 'audit_logs',
        'no_dues_certificates', 'bus_routes', 'bus_stops', 'bus_passes',
        'bus_attendances', 'transport_applications', 'transport_payments',
        'library_categories', 'library_members', 'library_settings',
        'library_books', 'library_book_copies', 'library_issues', 'library_returns',
        'library_renewals', 'library_reservations', 'library_fines', 'library_audit_logs',
        'notices', 'tests', 'question_sections', 'questions', 'test_attempts', 'student_answers',
        'attendance', 'attendance_reports', 'mid_term_marks', 'notes',
        'password_reset_otps', 'email_log'
    ]

    total_rows = 0

    with src_engine.connect() as src_conn:
        for t_name in table_order:
            if t_name not in src_meta.tables or t_name not in dst_meta.tables:
                continue
            
            src_table = src_meta.tables[t_name]
            dst_table = dst_meta.tables[t_name]
            
            rows = src_conn.execute(src_table.select()).fetchall()
            if not rows:
                continue
            
            cols = [c.name for c in src_table.columns]
            dict_rows = [dict(zip(cols, r)) for r in rows]

            # Universal Foreign Key Sanitizer
            for r in dict_rows:
                if 'student_id' in r and r['student_id'] is not None:
                    if r['student_id'] not in valid_students:
                        r['student_id'] = None if dst_table.c.student_id.nullable else fallback_student
                
                if 'faculty_id' in r and r['faculty_id'] is not None:
                    if r['faculty_id'] not in valid_faculties:
                        r['faculty_id'] = None if dst_table.c.faculty_id.nullable else fallback_faculty
                
                if 'professor_id' in r and r['professor_id'] is not None:
                    if r['professor_id'] not in valid_users:
                        r['professor_id'] = None if dst_table.c.professor_id.nullable else fallback_user
                
                if 'user_id' in r and r['user_id'] is not None:
                    if r['user_id'] not in valid_users:
                        r['user_id'] = None if dst_table.c.user_id.nullable else fallback_user

                if 'academic_year_id' in r and r['academic_year_id'] is not None:
                    if r['academic_year_id'] not in valid_academic_years:
                        r['academic_year_id'] = None if dst_table.c.academic_year_id.nullable else fallback_ay

                if 'fee_head_id' in r and r['fee_head_id'] is not None:
                    if r['fee_head_id'] not in valid_fee_heads:
                        r['fee_head_id'] = None if dst_table.c.fee_head_id.nullable else fallback_fh

                if 'book_id' in r and r['book_id'] is not None:
                    if r['book_id'] not in valid_books:
                        r['book_id'] = None if dst_table.c.book_id.nullable else fallback_book

                if 'member_id' in r and r['member_id'] is not None:
                    if r['member_id'] not in valid_members:
                        r['member_id'] = None if dst_table.c.member_id.nullable else fallback_member

                if 'created_by' in r and r['created_by'] is not None and r['created_by'] not in valid_users:
                    r['created_by'] = None if dst_table.c.created_by.nullable else fallback_user

                if 'released_by' in r and r['released_by'] is not None and r['released_by'] not in valid_users:
                    r['released_by'] = None

            # Clean and insert in destination
            with dst_engine.connect() as dst_conn:
                try:
                    dst_conn.execute(text(f'TRUNCATE TABLE "{t_name}" RESTART IDENTITY CASCADE;'))
                    dst_conn.commit()
                except Exception:
                    try:
                        dst_conn.execute(text(f'DELETE FROM "{t_name}";'))
                        dst_conn.commit()
                    except Exception:
                        pass

                chunk_size = 100
                for i in range(0, len(dict_rows), chunk_size):
                    chunk = dict_rows[i:i+chunk_size]
                    dst_conn.execute(dst_table.insert(), chunk)
                    dst_conn.commit()
            
            print(f"   [COPIED] {len(rows):4d} records -> '{t_name}'", flush=True)
            total_rows += len(rows)

    print("=" * 65, flush=True)
    print(f"[SUCCESS] ALL {total_rows} RECORDS SUCCESSFULLY SYNCED TO NEON POSTGRESQL!", flush=True)
    print("=" * 65, flush=True)

if __name__ == '__main__':
    run_sync()
