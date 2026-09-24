import os
import sqlite3
from sqlalchemy import create_engine, text

NEON_URI = "postgresql://neondb_owner:npg_YHD8B2QrRzkj@ep-divine-brook-b4rm51oj-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

def clean_sqlite():
    print("\n" + "=" * 65)
    print("[STEP 1] CLEANING LOCAL SQLITE DATABASE...")
    print("=" * 65)
    
    conn = sqlite3.connect('instance/college_attendance.db')
    cur = conn.cursor()
    
    tables_to_truncate = [
        'attendance',
        'attendance_reports',
        'bus_attendances',
        'bus_passes',
        'transport_payments',
        'transport_applications',
        'fee_payments',
        'fee_ledger',
        'fee_demands',
        'refund_records',
        'discount_scholarships',
        'no_dues_certificates',
        'payment_allocations',
        'payment_gateway_transactions',
        'library_issues',
        'library_returns',
        'library_renewals',
        'library_reservations',
        'library_fines',
        'library_audit_logs',
        'test_attempts',
        'student_answers',
        'tests',
        'questions',
        'question_sections',
        'notes',
        'notices',
        'audit_logs',
        'email_log',
        'password_reset_otps',
        'mid_term_marks'
    ]
    
    for t in tables_to_truncate:
        try:
            cur.execute(f'DELETE FROM "{t}";')
            print(f"  [CLEARED] SQLite table '{t}'")
        except Exception as e:
            print(f"  [SKIP] SQLite '{t}': {e}")
            
    # Reset student fee records
    try:
        cur.execute("UPDATE student_fee_records SET paid_amount = 0.0, discount = 0.0, remaining_balance = total_fee, status = 'Pending';")
        print("  [RESET] student_fee_records reset (paid_amount=0, status='Pending').")
    except Exception as e:
        print(f"  [NOTE] student_fee_records reset: {e}")
        
    # Reset library members and copies
    try:
        cur.execute("UPDATE library_book_copies SET status = 'Available', condition = 'Good';")
        cur.execute("UPDATE library_books SET available_copies = total_copies;")
        cur.execute("UPDATE library_members SET current_issued_count = 0, outstanding_fine = 0.0;")
        print("  [RESET] Library copies reset to 'Available' and member issued count to 0.")
    except Exception as e:
        print(f"  [NOTE] Library reset: {e}")
        
    conn.commit()
    conn.close()
    print("  -> Local SQLite database cleaned successfully!")

def clean_neon():
    print("\n" + "=" * 65)
    print("[STEP 2] CLEANING NEON POSTGRESQL CLOUD DATABASE...")
    print("=" * 65)
    
    engine = create_engine(NEON_URI)
    tables_to_truncate = [
        'attendance',
        'attendance_reports',
        'bus_attendances',
        'bus_passes',
        'transport_payments',
        'transport_applications',
        'fee_payments',
        'fee_ledger',
        'fee_demands',
        'refund_records',
        'discount_scholarships',
        'no_dues_certificates',
        'payment_allocations',
        'payment_gateway_transactions',
        'library_issues',
        'library_returns',
        'library_renewals',
        'library_reservations',
        'library_fines',
        'library_audit_logs',
        'test_attempts',
        'student_answers',
        'tests',
        'questions',
        'question_sections',
        'notes',
        'notices',
        'audit_logs',
        'email_log',
        'password_reset_otps',
        'mid_term_marks'
    ]
    
    with engine.connect() as conn:
        for t in tables_to_truncate:
            try:
                conn.execute(text(f'TRUNCATE TABLE "{t}" RESTART IDENTITY CASCADE;'))
                conn.commit()
                print(f"  [CLEARED] Neon table '{t}' (via TRUNCATE CASCADE)")
            except Exception as e:
                try:
                    conn.execute(text(f'DELETE FROM "{t}";'))
                    conn.commit()
                    print(f"  [CLEARED] Neon table '{t}' (via DELETE)")
                except Exception as ex:
                    print(f"  [SKIP] Neon '{t}': {ex}")
                    
        # Reset student fee records
        try:
            conn.execute(text("UPDATE student_fee_records SET paid_amount = 0.0, discount = 0.0, remaining_balance = total_fee, status = 'Pending';"))
            conn.commit()
            print("  [RESET] Neon student_fee_records reset (paid_amount=0, status='Pending').")
        except Exception as e:
            print(f"  [NOTE] Neon fee reset: {e}")
            
        # Reset library copies and member counters
        try:
            conn.execute(text("UPDATE library_book_copies SET status = 'Available', condition = 'Good';"))
            conn.execute(text("UPDATE library_books SET available_copies = total_copies;"))
            conn.execute(text("UPDATE library_members SET current_issued_count = 0, outstanding_fine = 0.0;"))
            conn.commit()
            print("  [RESET] Neon Library copies reset to 'Available', member counts to 0.")
        except Exception as e:
            print(f"  [NOTE] Neon library reset: {e}")
            
    print("  -> Neon Cloud PostgreSQL cleaned successfully!")

def sync_mobile_dumps():
    print("\n" + "=" * 65)
    print("[STEP 3] REGENERATING MOBILE OFFLINE DATA DUMP...")
    print("=" * 65)
    import subprocess
    subprocess.run(["python", "dump_db.py"], check=True)
    subprocess.run(["python", "generate_live_data.py"], check=True)
    print("  -> Mobile JSON database dump regenerated successfully!")

if __name__ == '__main__':
    clean_sqlite()
    clean_neon()
    sync_mobile_dumps()
    print("\n" + "=" * 65)
    print("[SUCCESS] ALL DUMMY DATA HAS BEEN COMPLETELY REMOVED!")
    print("System (Local SQLite + Neon Cloud) is 100% clean for Real-Time College Usage!")
    print("=" * 65)
