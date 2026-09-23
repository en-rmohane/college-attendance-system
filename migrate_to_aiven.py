"""
Transfer all data directly from local SQLite to PostgreSQL.
Usage:
    export DATABASE_URL="postgresql://user:password@host:port/dbname?sslmode=require"
    python migrate_to_aiven.py
"""
import os
import sys
from sqlalchemy import create_engine, MetaData, Table, text

SQLITE_URI = "sqlite:///instance/college_attendance.db"
POSTGRES_URI = os.environ.get('DATABASE_URL')

def sync_sqlite_to_postgres():
    if not POSTGRES_URI:
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("Please set DATABASE_URL before running this script.")
        return

    print("Connecting to SQLite source...")
    src_engine = create_engine(SQLITE_URI)
    src_meta = MetaData()
    src_meta.reflect(bind=src_engine)

    print("Connecting to PostgreSQL destination...")
    dst_engine = create_engine(POSTGRES_URI)

    from app import app, db
    with app.app_context():
        print("Creating all tables in PostgreSQL if not exist...")
        db.create_all()

    # Priority order of tables
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

    dst_meta = MetaData()
    dst_meta.reflect(bind=dst_engine)

    with src_engine.connect() as src_conn, dst_engine.connect() as dst_conn:
        for t_name in table_order:
            if t_name not in src_meta.tables or t_name not in dst_meta.tables:
                continue
            src_table = src_meta.tables[t_name]
            dst_table = dst_meta.tables[t_name]
            rows = src_conn.execute(src_table.select()).fetchall()
            if not rows:
                continue
            
            print(f"Syncing table '{t_name}': {len(rows)} records...")
            cols = [c.name for c in src_table.columns]
            
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
            
            print(f"  [OK] Successfully copied {len(rows)} rows to '{t_name}'")

    print("\n[SUCCESS] ALL DATA SUCCESSFULLY TRANSFERRED TO POSTGRESQL!")

if __name__ == '__main__':
    sync_sqlite_to_postgres()
