# setup_timetable_system.py
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Faculty, RGPVScheme, Subject, TimetableSlot
from datetime import datetime


def setup_complete_timetable_system():
    with app.app_context():
        print("🚀 Setting up Complete Timetable System...")

        # 1. Create all tables
        db.create_all()
        print("✅ Database tables created")

        # 2. Add sample faculties
        faculties_data = [
            {"name": "Dr. Rajesh Sharma", "email": "rajesh.sharma@college.com",
             "specialization": "Theory of Computation", "branches": "CSE,AD"},
            {"name": "Prof. Priya Singh", "email": "priya.singh@college.com", "specialization": "Database Systems",
             "branches": "CSE,AD"},
            {"name": "Dr. Amit Kumar", "email": "amit.kumar@college.com", "specialization": "Cyber Security",
             "branches": "CSE,AD"},
            {"name": "Prof. Neha Gupta", "email": "neha.gupta@college.com", "specialization": "Web Technologies",
             "branches": "CSE"},
            {"name": "Dr. Sanjay Patel", "email": "sanjay.patel@college.com", "specialization": "Machine Learning",
             "branches": "AD"},
            {"name": "Prof. Ravi Verma", "email": "ravi.verma@college.com", "specialization": "Computer Networks",
             "branches": "CSE,AD"},
            {"name": "Dr. Anjali Mehta", "email": "anjali.mehta@college.com",
             "specialization": "Artificial Intelligence", "branches": "AD"},
        ]

        for data in faculties_data:
            if not Faculty.query.filter_by(email=data['email']).first():
                faculty = Faculty(**data)
                db.session.add(faculty)
                print(f"✅ Added faculty: {data['name']}")

        db.session.commit()
        print("✅ All faculties added")

        # 3. Initialize RPGV Scheme
        initialize_rgpv_scheme()

        print("🎉 Timetable system setup completed!")


def initialize_rgpv_scheme():
    """Initialize RPGV scheme data"""
    print("📚 Initializing RPGV Scheme...")

    # CSE 3rd Year Scheme
    cse_scheme = [
        # Semester 5
        {'branch': 'CSE', 'year': 3, 'semester': 5, 'code': 'CS501', 'lectures': 4, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 5, 'code': 'CS502', 'lectures': 4, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 5, 'code': 'CS503', 'lectures': 4, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 5, 'code': 'CS504', 'lectures': 3, 'credits': 3},

        # Semester 6
        {'branch': 'CSE', 'year': 3, 'semester': 6, 'code': 'CS601', 'lectures': 4, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 6, 'code': 'CS602', 'lectures': 4, 'credits': 4},
        {'branch': 'CSE', 'year': 3, 'semester': 6, 'code': 'CS603', 'lectures': 4, 'credits': 4},
    ]

    # AD 3rd Year Scheme
    ad_scheme = [
        # Semester 5
        {'branch': 'AD', 'year': 3, 'semester': 5, 'code': 'AD501', 'lectures': 4, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 5, 'code': 'AD502', 'lectures': 4, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 5, 'code': 'AD503', 'lectures': 3, 'credits': 3},

        # Semester 6
        {'branch': 'AD', 'year': 3, 'semester': 6, 'code': 'AD601', 'lectures': 4, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 6, 'code': 'AD602', 'lectures': 4, 'credits': 4},
        {'branch': 'AD', 'year': 3, 'semester': 6, 'code': 'AD603', 'lectures': 3, 'credits': 3},
    ]

    # Add all schemes
    all_schemes = cse_scheme + ad_scheme

    for scheme_data in all_schemes:
        subject = Subject.query.filter_by(code=scheme_data['code']).first()
        if subject:
            existing_scheme = RGPVScheme.query.filter_by(
                branch=scheme_data['branch'],
                year=scheme_data['year'],
                semester=scheme_data['semester'],
                subject_id=subject.id
            ).first()

            if not existing_scheme:
                rgpv_scheme = RGPVScheme(
                    branch=scheme_data['branch'],
                    year=scheme_data['year'],
                    semester=scheme_data['semester'],
                    subject_id=subject.id,
                    lectures_per_week=scheme_data['lectures'],
                    credits=scheme_data['credits']
                )
                db.session.add(rgpv_scheme)
                print(
                    f"✅ Added scheme: {scheme_data['code']} - {scheme_data['branch']} Year{scheme_data['year']} Sem{scheme_data['semester']}")

    db.session.commit()
    print("✅ RPGV scheme initialized")


if __name__ == "__main__":
    setup_complete_timetable_system()