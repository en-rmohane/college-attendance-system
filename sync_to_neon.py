"""
Automated Migration Script: SQLite -> Neon PostgreSQL
"""
import os
import sys
from sqlalchemy import create_engine, MetaData, Table, text

SQLITE_URI = "sqlite:///instance/college_attendance.db"
NEON_URI = "postgresql://neondb_owner:npg_YHD8B2QrRzkj@ep-divine-brook-b4rm51oj-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Fix psycopg2 / psycopg URL prefix if necessary
if NEON_URI.startswith("postgres://"):
    NEON_URI = NEON_URI.replace("postgres://", "postgresql://", 1)

def migrate():
    print("=" * 65)
    print("[START] MIGRATING COLLEGE ATTENDANCE SYSTEM TO NEON POSTGRESQL")
    print("=" * 65)

    os.environ['DATABASE_URL'] = NEON_URI
    
    print("1. Connecting to SQLite local database...")
    src_engine = create_engine(SQLITE_URI)
    src_meta = MetaData()
    src_meta.reflect(bind=src_engine)
    print(f"   [OK] SQLite connected ({len(src_meta.tables)} tables found)")

    print("2. Connecting to Neon PostgreSQL cloud database...")
    dst_engine = create_engine(NEON_URI)
    
    # Test connection
    with dst_engine.connect() as conn:
        res = conn.execute(text("SELECT version();")).fetchone()
        print(f"   [OK] Connected to Neon PostgreSQL: {res[0][:45]}...")

    print("3. Creating all tables in Neon PostgreSQL...")
    from app import app, db
    with app.app_context():
        db.create_all()
    print("   [OK] All tables successfully created on Neon!")

    dst_meta = MetaData()
    dst_meta.reflect(bind=dst_engine)

    table_order = [
        'academic_years', 'users', 'faculties', 'students', 'subjects',
        'professor_subjects', 'rgpv_schemes', 'current_semester', 'timetable_slots',
        'fee_structures', 'fee_heads', 'fee_structure_items', 'student_fee_records',
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

    with src_engine.connect() as src_conn, dst_engine.connect() as dst_conn:
        for t_name in table_order:
            if t_name not in src_meta.tables or t_name not in dst_meta.tables:
                continue
            
            src_table = src_meta.tables[t_name]
            dst_table = dst_meta.tables[t_name]
            
            rows = src_conn.execute(src_table.select()).fetchall()
            if not rows:
                continue
            
            cols = [c.name for c in src_table.columns]
            
            # Clean destination table first
            try:
                dst_conn.execute(text(f'TRUNCATE TABLE "{t_name}" RESTART IDENTITY CASCADE;'))
                dst_conn.commit()
            except Exception:
                try:
                    dst_conn.execute(text(f'DELETE FROM "{t_name}";'))
                    dst_conn.commit()
                except Exception:
                    pass

            dict_rows = [dict(zip(cols, r)) for r in rows]
            chunk_size = 50
            for i in range(0, len(dict_rows), chunk_size):
                chunk = dict_rows[i:i+chunk_size]
                dst_conn.execute(dst_table.insert(), chunk)
                dst_conn.commit()
            
            print(f"   [COPIED] {len(rows):4d} records -> '{t_name}'")
            total_rows += len(rows)

    print("=" * 65)
    print(f"[SUCCESS] ALL {total_rows} RECORDS SUCCESSFULLY MIGRATED TO NEON!")
    print("=" * 65)

if __name__ == '__main__':
    migrate()
