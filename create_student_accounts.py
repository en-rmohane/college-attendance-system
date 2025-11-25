import os
import sys
from werkzeug.security import generate_password_hash

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db


def initialize_database():
    """Pehle database tables create karo"""
    with app.app_context():
        try:
            print("🔄 Creating database tables...")
            db.create_all()
            print("✅ Database tables created successfully!")

            # Check if tables exist
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            print(f"📊 Existing tables: {tables}")

        except Exception as e:
            print(f"❌ Error creating tables: {e}")


def create_student_accounts():
    """Phir student accounts create karo"""
    with app.app_context():
        try:
            from models import Student, User

            print("🚀 Starting student accounts creation...")

            # Check if students table has data
            student_count = Student.query.count()
            print(f"📊 Students in database: {student_count}")

            if student_count == 0:
                print("❌ No students found in database!")
                print("Please add students first via admin panel or CSV import")
                return

            # Get all students
            students = Student.query.filter(Student.roll.isnot(None)).filter(Student.roll != '').all()

            print(f"📊 Processing {len(students)} students...")

            created_count = 0
            skipped_count = 0

            for student in students:
                # Check if user already exists
                existing_user = User.query.filter_by(student_roll=student.roll).first()

                if existing_user:
                    print(f"⏭️  Skipped: {student.roll} - {student.name}")
                    skipped_count += 1
                    continue

                # Create new user account
                student_user = User(
                    username=student.roll,
                    fullname=student.name,
                    email=f"{student.roll.lower()}@college.com",
                    role='student',
                    branch=student.branch,
                    student_roll=student.roll,
                    email_verified=True,
                    is_active=True
                )
                student_user.set_password(student.roll)

                db.session.add(student_user)
                created_count += 1
                print(f"✅ Created: {student.roll} - {student.name}")

            db.session.commit()

            print(f"\n🎉 COMPLETED:")
            print(f"✅ Created: {created_count} new accounts")
            print(f"⏭️  Skipped: {skipped_count} existing accounts")

        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    initialize_database()
    create_student_accounts()