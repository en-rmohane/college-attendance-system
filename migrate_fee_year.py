import sqlite3
import os

for db_path in ['college_attendance.db', 'instance/college_attendance.db']:
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Drop and recreate fee_schedules & fee_installments to have clean multi-year schema
        cur.execute("DROP TABLE IF EXISTS fee_installments")
        cur.execute("DROP TABLE IF EXISTS fee_schedules")
        
        cur.execute("""
        CREATE TABLE fee_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            academic_year VARCHAR(50) NOT NULL DEFAULT '2026-27',
            student_year INTEGER NOT NULL DEFAULT 1,
            annual_fee FLOAT NOT NULL DEFAULT 55000.0,
            late_fee_per_day FLOAT NOT NULL DEFAULT 25.0,
            created_by INTEGER,
            created_at DATETIME,
            updated_at DATETIME,
            UNIQUE(academic_year, student_year)
        )
        """)
        
        cur.execute("""
        CREATE TABLE fee_installments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            schedule_id INTEGER REFERENCES fee_schedules(id) ON DELETE CASCADE,
            student_id INTEGER DEFAULT 0,
            academic_year_id INTEGER,
            academic_year_name VARCHAR(50) NOT NULL DEFAULT '2026-27',
            student_year INTEGER NOT NULL DEFAULT 1,
            installment_no INTEGER NOT NULL DEFAULT 1,
            title VARCHAR(100) NOT NULL,
            amount FLOAT NOT NULL DEFAULT 13750.0,
            paid_amount FLOAT NOT NULL DEFAULT 0.0,
            release_date DATE,
            due_date DATE NOT NULL,
            late_fee_rate FLOAT NOT NULL DEFAULT 25.0,
            late_fee_amount FLOAT NOT NULL DEFAULT 0.0,
            is_released BOOLEAN DEFAULT 0,
            released_by INTEGER,
            released_at DATETIME,
            status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        )
        """)
        
        conn.commit()
        conn.close()
        print(f"Recreated fee_schedules & fee_installments in {db_path}")

print("Clean multi-year migration completed successfully!")
