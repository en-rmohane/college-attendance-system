import os
from sqlalchemy import create_engine, text

NEON_URI = "postgresql://neondb_owner:npg_YHD8B2QrRzkj@ep-divine-brook-b4rm51oj-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require"

sqlite_paths = [
    "sqlite:///instance/college_attendance.db",
    "sqlite:///college_attendance.db"
]

tables_to_clear = [
    "library_fines",
    "library_returns",
    "library_renewals",
    "library_issues",
    "library_reservations",
    "library_audit_logs",
    "library_book_copies",
    "library_books"
]

def clean_engine(engine, name):
    print(f"\n--- Cleaning {name} ---")
    try:
        with engine.connect() as conn:
            for table in tables_to_clear:
                try:
                    conn.execute(text(f"DELETE FROM {table}"))
                    print(f"  [OK] Cleared table: {table}")
                except Exception as ex:
                    print(f"  [SKIP] Table {table}: {ex}")
            conn.commit()
            
            b_count = conn.execute(text("SELECT count(*) FROM library_books")).scalar()
            c_count = conn.execute(text("SELECT count(*) FROM library_book_copies")).scalar()
            print(f"  Result -> library_books: {b_count}, library_book_copies: {c_count}")
    except Exception as e:
        print(f"  [ERROR] {name}: {e}")

if __name__ == '__main__':
    # Clean SQLite
    for path in sqlite_paths:
        clean_engine(create_engine(path), path)
    
    # Clean Neon PostgreSQL
    clean_engine(create_engine(NEON_URI), "Neon Cloud PostgreSQL")
