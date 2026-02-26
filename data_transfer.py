# data_transfer.py - FIXED VERSION
import sqlite3
import os
import json
from datetime import datetime


def transfer_data_direct():
    print("Starting Direct Data Transfer to Render...")

    local_db_path = "instance/college_attendance.db"

    # Connect to local SQLite
    local_conn = sqlite3.connect(local_db_path)
    local_conn.row_factory = sqlite3.Row
    local_cursor = local_conn.cursor()

    # CORRECT TABLE NAMES - aapke actual table names
    tables_to_transfer = [
        'users',  # NOT 'user'
        'students',  # NOT 'student'
        'subjects',  # NOT 'subject'
        'professor_subjects',  # NOT 'professor_subject'
        'current_semester',
        'rgpv_schemes',
        'timetable_slots',
        'tests',
        'questions',
        'test_attempts',
        'student_answers',
        'notices',
        'attendance_reports'
    ]

    print(f"Transferring data from {len(tables_to_transfer)} important tables...")

    transfer_data = {}

    for table in tables_to_transfer:
        try:
            local_cursor.execute(f"SELECT * FROM {table}")
            rows = local_cursor.fetchall()
            table_data = [dict(row) for row in rows]
            transfer_data[table] = table_data
            print(f"OK {table}: {len(table_data)} records found")
        except Exception as e:
            print(f"Error reading {table}: {e}")

    local_conn.close()

    # Save to JSON file
    with open('transfer_data.json', 'w', encoding='utf-8') as f:
        json.dump(transfer_data, f, indent=2, default=str)

    print(f"\nData saved to transfer_data.json")
    print("Now upload this file to your Render app and run the import")

    # Show summary
    print("\nIMPORTANT DATA SUMMARY:")
    total_records = 0
    for table, data in transfer_data.items():
        if len(data) > 0:  # Only show tables with data
            print(f"   Package {table}: {len(data)} records")
            total_records += len(data)

    print(f"\nTOTAL: {total_records} records across {len(transfer_data)} tables")


if __name__ == '__main__':
    transfer_data_direct()