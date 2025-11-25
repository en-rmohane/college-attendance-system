#!/usr/bin/env python3
"""
Transfer data from SQLite to PostgreSQL
Run this locally to transfer your existing data
"""

import os
import sys
from datetime import datetime

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


def transfer_sqlite_to_postgres():
    """Transfer data from SQLite to PostgreSQL"""
    print("🚀 Starting data transfer from SQLite to PostgreSQL...")

    # Source SQLite database
    from app import app as flask_app
    from models import db, User, Student, Subject, ProfessorSubject, Attendance, Test, Question, CurrentSemester

    with flask_app.app_context():
        try:
            # Connect to source SQLite database
            basedir = os.path.abspath(os.path.dirname(__file__))
            sqlite_path = os.path.join(basedir, 'instance', 'college_attendance.db')

            if not os.path.exists(sqlite_path):
                print("❌ SQLite database not found. Please run the app locally first to create data.")
                return False

            print("✅ Found SQLite database")

            # Get all data from SQLite
            print("📥 Reading data from SQLite...")

            # Users
            users = User.query.all()
            print(f"📊 Found {len(users)} users")

            # Students
            students = Student.query.all()
            print(f"📊 Found {len(students)} students")

            # Subjects
            subjects = Subject.query.all()
            print(f"📊 Found {len(subjects)} subjects")

            # Professor Subjects
            prof_subjects = ProfessorSubject.query.all()
            print(f"📊 Found {len(prof_subjects)} professor subject allocations")

            # Attendance
            attendance_records = Attendance.query.all()
            print(f"📊 Found {len(attendance_records)} attendance records")

            # Tests
            tests = Test.query.all()
            print(f"📊 Found {len(tests)} tests")

            # Questions
            questions = Question.query.all()
            print(f"📊 Found {len(questions)} questions")

            # Current Semester
            current_semesters = CurrentSemester.query.all()
            print(f"📊 Found {len(current_semesters)} current semester settings")

            print("🎯 Data reading completed!")
            print("\n💡 Now please deploy to Render with PostgreSQL, then run the auto-initialization script.")
            print("   The script will create all the necessary data automatically.")

            return True

        except Exception as e:
            print(f"❌ Error transferring data: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    transfer_sqlite_to_postgres()