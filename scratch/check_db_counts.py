import sqlite3
from sqlalchemy import create_engine, text

NEON_URI = "postgresql://neondb_owner:npg_YHD8B2QrRzkj@ep-divine-brook-b4rm51oj-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

def check_sqlite():
    conn = sqlite3.connect('instance/college_attendance.db')
    cur = conn.cursor()
    tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall() if not r[0].startswith('sqlite_')]
    print("=== LOCAL SQLITE DATABASE COUNTS ===")
    for t in sorted(tables):
        cnt = cur.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
        print(f"  {t:30}: {cnt}")
    conn.close()

def check_neon():
    engine = create_engine(NEON_URI)
    print("\n=== NEON POSTGRESQL CLOUD DATABASE COUNTS ===")
    with engine.connect() as conn:
        res = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).fetchall()
        for r in sorted(res):
            t = r[0]
            try:
                cnt = conn.execute(text(f'SELECT count(*) FROM "{t}"')).scalar()
                print(f"  {t:30}: {cnt}")
            except Exception as e:
                print(f"  {t:30}: error ({e})")

if __name__ == '__main__':
    check_sqlite()
    check_neon()
