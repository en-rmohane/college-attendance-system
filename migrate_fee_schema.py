import sqlite3
import os
import sys

def migrate():
    db_paths = [
        'college_attendance.db',
        'instance/college_attendance.db'
    ]
    for db_path in db_paths:
        if not os.path.exists(db_path):
            continue
        print(f"Migrating database schema in: {db_path}")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 1. Check fee_installments columns
        cursor.execute("PRAGMA table_info(fee_installments);")
        columns = [row[1] for row in cursor.fetchall()]
        
        needed_installments_cols = {
            "schedule_id": "INTEGER",
            "academic_year_name": "VARCHAR(50) DEFAULT '2026-27'",
            "release_date": "DATE",
            "late_fee_rate": "FLOAT DEFAULT 25.0",
            "is_released": "BOOLEAN DEFAULT 0",
            "released_by": "INTEGER",
            "released_at": "DATETIME"
        }
        for col, col_type in needed_installments_cols.items():
            if col not in columns:
                print(f"  Adding column {col} to fee_installments...")
                cursor.execute(f"ALTER TABLE fee_installments ADD COLUMN {col} {col_type};")

        # 2. Check fee_payments columns
        cursor.execute("PRAGMA table_info(fee_payments);")
        pay_columns = [row[1] for row in cursor.fetchall()]
        needed_pay_cols = {
            "academic_year_name": "VARCHAR(50) DEFAULT '2026-27'",
            "installment_no": "INTEGER DEFAULT 1",
            "base_amount": "FLOAT DEFAULT 13750.0",
            "late_days": "INTEGER DEFAULT 0",
            "late_fee_rate": "FLOAT DEFAULT 25.0",
            "discount_amount": "FLOAT DEFAULT 0.0",
            "net_amount": "FLOAT DEFAULT 13750.0",
            "payment_status": "VARCHAR(20) DEFAULT 'SUCCESS'",
            "approval_status": "VARCHAR(30) DEFAULT 'APPROVED'",
            "rejection_reason": "TEXT",
            "is_locked": "BOOLEAN DEFAULT 0",
            "qr_token": "VARCHAR(100)",
            "approved_by": "INTEGER",
            "approved_at": "DATETIME"
        }
        for col, col_type in needed_pay_cols.items():
            if col not in pay_columns:
                print(f"  Adding column {col} to fee_payments...")
                cursor.execute(f"ALTER TABLE fee_payments ADD COLUMN {col} {col_type};")

        # 3. Create fee_schedules table if not exists
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS fee_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year VARCHAR(50) UNIQUE NOT NULL,
            annual_fee FLOAT NOT NULL DEFAULT 55000.0,
            late_fee_per_day FLOAT NOT NULL DEFAULT 25.0,
            created_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 4. Create transport_payments table if not exists
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS transport_payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receipt_no VARCHAR(50) UNIQUE NOT NULL,
            student_id INTEGER NOT NULL,
            route_id INTEGER NOT NULL,
            stop_id INTEGER NOT NULL,
            academic_year VARCHAR(50) NOT NULL DEFAULT '2026-27',
            annual_fee FLOAT NOT NULL DEFAULT 15000.0,
            amount_paid FLOAT NOT NULL DEFAULT 15000.0,
            payment_mode VARCHAR(50) NOT NULL DEFAULT 'UPI',
            transaction_id VARCHAR(100),
            payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            payment_status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
            approval_status VARCHAR(30) NOT NULL DEFAULT 'PENDING_APPROVAL',
            rejection_reason TEXT,
            is_locked BOOLEAN DEFAULT 0,
            qr_token VARCHAR(100) UNIQUE,
            collected_by INTEGER,
            approved_by INTEGER,
            approved_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """)

        conn.commit()
        conn.close()
        print(f"[OK] Database migration completed successfully for {db_path}!")

if __name__ == '__main__':
    migrate()
