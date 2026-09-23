import sqlite3
import json
import os

DB_PATH = "instance/college_attendance.db"
if not os.path.exists(DB_PATH):
    DB_PATH = "college_attendance.db"

def inspect_database():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = [row['name'] for row in cursor.fetchall()]

    print(f"=== DATABASE AUDIT: {DB_PATH} ===")
    print(f"Total tables found: {len(tables)}\n")

    audit_data = {}

    fee_tables = [
        'users', 'students', 'fee_structures', 'student_fee_records',
        'fee_payments', 'fee_demands', 'fee_installments', 'fee_ledger',
        'discount_scholarships', 'refund_records', 'audit_logs',
        'no_dues_certificates', 'academic_years', 'fee_heads', 'late_fee_rules'
    ]

    for tbl in tables:
        cursor.execute(f"SELECT COUNT(*) as cnt FROM {tbl}")
        count = cursor.fetchone()['cnt']
        
        # Get schema columns
        cursor.execute(f"PRAGMA table_info({tbl})")
        cols = [{"cid": col['cid'], "name": col['name'], "type": col['type'], "notnull": col['notnull'], "pk": col['pk']} for col in cursor.fetchall()]
        
        audit_data[tbl] = {
            "row_count": count,
            "columns": cols
        }

    print("--- TABLE ROW COUNTS ---")
    for tbl, data in sorted(audit_data.items()):
        print(f"  {tbl.ljust(30)}: {data['row_count']} rows")

    print("\n--- SPECIFIC FINANCIAL AUDIT ---")
    
    # Check fee_structures
    if 'fee_structures' in tables:
        cursor.execute("SELECT * FROM fee_structures")
        structures = [dict(row) for row in cursor.fetchall()]
        print(f"\n1. fee_structures ({len(structures)} records):")
        for fs in structures:
            print(f"   - ID {fs.get('id')}: Branch={fs.get('branch')}, Year={fs.get('year')}, Tuition={fs.get('tuition_fee')}, Total={fs.get('total_fee')}, DueDate={fs.get('due_date')}")

    # Check student_fee_records
    if 'student_fee_records' in tables:
        cursor.execute("SELECT COUNT(*) as total_recs, SUM(total_fee) as sum_total, SUM(discount) as sum_disc, SUM(paid_amount) as sum_paid, SUM(remaining_balance) as sum_rem FROM student_fee_records")
        sfr_stats = dict(cursor.fetchone())
        print(f"\n2. student_fee_records summary:")
        print(f"   - Total records: {sfr_stats['total_recs']}")
        print(f"   - Sum Total Fee: Rs. {sfr_stats['sum_total'] or 0:,.2f}")
        print(f"   - Sum Discount: Rs. {sfr_stats['sum_disc'] or 0:,.2f}")
        print(f"   - Sum Paid: Rs. {sfr_stats['sum_paid'] or 0:,.2f}")
        print(f"   - Sum Remaining Balance: Rs. {sfr_stats['sum_rem'] or 0:,.2f}")

    # Check fee_payments
    if 'fee_payments' in tables:
        cursor.execute("SELECT COUNT(*) as total_payments, SUM(amount_paid) as sum_paid, SUM(late_fee_paid) as sum_late FROM fee_payments")
        pay_stats = dict(cursor.fetchone())
        print(f"\n3. fee_payments summary:")
        print(f"   - Total payments: {pay_stats['total_payments']}")
        print(f"   - Sum Amount Paid: Rs. {pay_stats['sum_paid'] or 0:,.2f}")
        print(f"   - Sum Late Fee Paid: Rs. {pay_stats['sum_late'] or 0:,.2f}")
        
        cursor.execute("SELECT id, receipt_no, student_id, amount_paid, payment_mode, transaction_id, status, payment_date FROM fee_payments ORDER BY id DESC LIMIT 5")
        recent_pays = [dict(row) for row in cursor.fetchall()]
        print(f"   - Sample recent payments:")
        for p in recent_pays:
            print(f"     * #{p['receipt_no']} (ID {p['id']}): Student {p['student_id']}, Rs. {p['amount_paid']}, Mode: {p['payment_mode']}, Status: {p['status']}")

    # Check fee_ledger
    if 'fee_ledger' in tables:
        cursor.execute("SELECT COUNT(*) as total_entries, SUM(debit) as sum_debit, SUM(credit) as sum_credit FROM fee_ledger")
        ledger_stats = dict(cursor.fetchone())
        print(f"\n4. fee_ledger summary:")
        print(f"   - Total ledger entries: {ledger_stats['total_entries']}")
        print(f"   - Sum Debits: Rs. {ledger_stats['sum_debit'] or 0:,.2f}")
        print(f"   - Sum Credits: Rs. {ledger_stats['sum_credit'] or 0:,.2f}")

    # Check users with role 'accountant' or 'fee_manager'
    if 'users' in tables:
        cursor.execute("SELECT id, username, fullname, email, role FROM users WHERE role IN ('accountant', 'fee_manager', 'admin')")
        mgmt_users = [dict(row) for row in cursor.fetchall()]
        print(f"\n5. Management & Admin Users:")
        for u in mgmt_users:
            print(f"   - ID {u['id']}: Username={u['username']}, Name={u['fullname']}, Role={u['role']}")

    conn.close()

if __name__ == "__main__":
    inspect_database()
