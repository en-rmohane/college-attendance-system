import sqlite3

# Database connection
conn = sqlite3.connect('instance/college_attendance.db')
cursor = conn.cursor()

try:
    # Add new columns
    cursor.execute("ALTER TABLE timetable_slots ADD COLUMN is_common BOOLEAN DEFAULT FALSE")
    cursor.execute("ALTER TABLE timetable_slots ADD COLUMN common_name VARCHAR(100)")
    conn.commit()
    print("✅ Columns added successfully!")
except Exception as e:
    print(f"❌ Error: {e}")
finally:
    conn.close()