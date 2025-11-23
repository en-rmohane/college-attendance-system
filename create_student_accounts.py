import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import User, Student


def create_student_accounts():
    with app.app_context():
        print("🔄 Starting student accounts creation...")

        # Check current status
        total_students = Student.query.count()
        student_users = User.query.filter_by(role='student').count()

        print(f"📊 Before Fix:")
        print(f"Total Students: {total_students}")
        print(f"Student User Accounts: {student_users}")

        # Get all students
        students = Student.query.all()
        created_count = 0

        print(f"🔄 Creating accounts for {len(students)} students...")

        for student in students:
            # Check if account already exists
            existing_user = User.query.filter_by(student_roll=student.roll).first()

            if not existing_user:
                try:
                    # Create new user account
                    student_user = User(
                        username=student.roll,
                        fullname=student.name,
                        email=f"{student.roll.lower()}@college.com",
                        role='student',
                        branch=student.branch,
                        student_roll=student.roll,
                        email_verified=True
                    )
                    # Set password to roll number
                    student_user.set_password(student.roll)
                    db.session.add(student_user)
                    created_count += 1
                    print(f"✅ Created: {student.roll}")

                except Exception as e:
                    print(f"❌ Error with {student.roll}: {str(e)}")
            else:
                print(f"ℹ️ Already exists: {student.roll}")

        # Commit all changes
        if created_count > 0:
            db.session.commit()
            print(f"🎉 SUCCESS: Created {created_count} student accounts!")
        else:
            print("ℹ️ No new accounts created")

        # Verify after fix
        student_users_after = User.query.filter_by(role='student').count()
        print(f"📊 After Fix:")
        print(f"Student User Accounts: {student_users_after}")


if __name__ == "__main__":
    create_student_accounts()