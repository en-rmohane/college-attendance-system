import sqlite3
import json

conn = sqlite3.connect('instance/college_attendance.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [t[0] for t in cursor.fetchall()]
print('TABLES in instance/college_attendance.db:', tables)

db_dump = {}

for t in tables:
    cursor.execute(f'PRAGMA table_info("{t}")')
    cols = [c[1] for c in cursor.fetchall()]
    cursor.execute(f'SELECT * FROM "{t}"')
    rows = cursor.fetchall()
    row_dicts = [dict(zip(cols, r)) for r in rows]
    db_dump[t] = row_dicts
    print(f'{t}: {len(row_dicts)} rows')

with open('college_attendance_mobile/src/services/realDbDump.json', 'w', encoding='utf-8') as f:
    json.dump(db_dump, f, indent=2, default=str)

print('Successfully exported all tables to realDbDump.json')
