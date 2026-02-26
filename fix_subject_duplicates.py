# fix_subject_duplicates.py
import os
from app import app, db
from models import Subject, Attendance, Test, ProfessorSubject
from sqlalchemy import text

def merge_subjects():
    print("Starting Subject Deduplication and Merging...")

    with app.app_context():
        # Define the subjects to merge
        # Standard: CS603, Duplicate: CS603(C)
        standard_code = "CS603"
        duplicate_code = "CS603(C)"
        branch = "CSE"
        semester = 6

        standard = Subject.query.filter_by(code=standard_code, branch=branch, semester=semester).first()
        duplicate = Subject.query.filter_by(code=duplicate_code, branch=branch, semester=semester).first()

        if not standard:
            print(f"Error: Standard subject {standard_code} not found.")
            return
        
        if not duplicate:
            print(f"Info: Duplicate subject {duplicate_code} not found. Maybe already resolved.")
            return

        print(f"Found Standard Subject: '{standard.name}' (ID: {standard.id}, Code: {standard.code})")
        print(f"Found Duplicate Subject: '{duplicate.name}' (ID: {duplicate.id}, Code: {duplicate.code})")

        # 1. Merge Attendance
        attendance_count = Attendance.query.filter_by(subject_id=duplicate.id).count()
        if attendance_count > 0:
            print(f"Moving {attendance_count} attendance records to standard subject...")
            # Use raw SQL to update efficiently
            db.session.execute(
                text("UPDATE attendance SET subject_id = :standard_id WHERE subject_id = :duplicate_id"),
                {"standard_id": standard.id, "duplicate_id": duplicate.id}
            )

        # 2. Merge Tests
        test_count = Test.query.filter_by(subject_id=duplicate.id).count()
        if test_count > 0:
            print(f"Moving {test_count} tests to standard subject...")
            db.session.execute(
                text("UPDATE tests SET subject_id = :standard_id WHERE subject_id = :duplicate_id"),
                {"standard_id": standard.id, "duplicate_id": duplicate.id}
            )

        # 3. Merge Professor Assignments
        prof_assignments = ProfessorSubject.query.filter_by(subject_id=duplicate.id).all()
        for assignment in prof_assignments:
            # Check if professor is already assigned to standard
            exists = ProfessorSubject.query.filter_by(
                professor_id=assignment.professor_id, 
                subject_id=standard.id
            ).first()
            if not exists:
                print(f"Moving professor assignment (Prof ID: {assignment.professor_id}) to standard subject...")
                assignment.subject_id = standard.id
            else:
                print(f"Professor (Prof ID: {assignment.professor_id}) already assigned to standard. Deleting duplicate assignment.")
                db.session.delete(assignment)

        # 4. Final Cleanup: Delete Duplicate Subject
        print(f"Deleting duplicate subject record '{duplicate.code}'...")
        db.session.delete(duplicate)

        try:
            db.session.commit()
            print("\nSUCCESS: Subjects merged and deduplicated successfully!")
        except Exception as e:
            db.session.rollback()
            print(f"\nERROR during commit: {e}")

if __name__ == "__main__":
    merge_subjects()
