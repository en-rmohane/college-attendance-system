from app import app
from models import db, Subject, User, Student, CurrentSemester, Notice, RGPVScheme, TimetableSlot

def bulk_update_and_add_subjects():
    with app.app_context():
        print("🚀 Starting bulk update and subject addition...")
        
        # 1. Rename Branches
        old_names = ['AD', 'Data Analytics (AD)', 'Data Analytic', 'Data Analytics']
        new_name = 'Artificial Intelligence and Data Science'
        
        models_to_update = [User, Student, CurrentSemester, Subject, Notice, RGPVScheme, TimetableSlot]
        
        for model in models_to_update:
            records = model.query.filter(model.branch.in_(old_names)).all()
            for record in records:
                record.branch = new_name
            print(f"✓ Updated {len(records)} records in {model.__tablename__}")
        
        db.session.commit()
        print(f"✅ Branch renamed to '{new_name}'")

        # 2. Add Subjects
        # Data format: (code, name, branch, year, semester, is_lab)
        subject_data = [
            # ======================= CSE BRANCH =======================
            # Sem 3
            ("CS301", "Energy & Environmental Engineering", "CSE", 2, 3, False),
            ("CS302", "Discrete Structure", "CSE", 2, 3, False),
            ("CS303", "Data Structure", "CSE", 2, 3, False),
            ("CS303P", "Data Structure Lab", "CSE", 2, 3, True),
            ("CS304", "Digital Systems", "CSE", 2, 3, False),
            ("CS304P", "Digital Systems Lab", "CSE", 2, 3, True),
            ("CS305", "Object Oriented Programming & Methodology", "CSE", 2, 3, False),
            ("CS305P", "Object Oriented Programming & Methodology Lab", "CSE", 2, 3, True),
            ("CS306", "Computer Workshop", "CSE", 2, 3, True),
            
            # Sem 4
            ("BT401", "Mathematics III", "CSE", 2, 4, False),
            ("CS402", "Analysis & Design of Algorithm", "CSE", 2, 4, False),
            ("CS403", "Software Engineering", "CSE", 2, 4, False),
            ("CS403P", "Software Engineering Lab", "CSE", 2, 4, True),
            ("CS404", "Computer Organization & Architecture", "CSE", 2, 4, False),
            ("CS404P", "Computer Organization & Architecture Lab", "CSE", 2, 4, True),
            ("CS405", "Operating Systems", "CSE", 2, 4, False),
            ("CS405P", "Operating Systems Lab", "CSE", 2, 4, True),
            ("CS406", "Programming Practices", "CSE", 2, 4, True),
            
            # Sem 5
            ("CS501", "Theory of Computation", "CSE", 3, 5, False),
            ("CS502", "Database Management Systems", "CSE", 3, 5, False),
            ("CS502P", "Database Management Systems Lab", "CSE", 3, 5, True),
            ("CS503(A)", "Data Analytics", "CSE", 3, 5, False),
            ("CS503(B)", "Pattern Recognition", "CSE", 3, 5, False),
            ("CS503(C)", "Cyber Security", "CSE", 3, 5, False),
            ("CS504(A)", "Internet and Web Technology", "CSE", 3, 5, False),
            ("CS504(B)", "Object Oriented Programming", "CSE", 3, 5, False),
            ("CS504(C)", "Introduction to Database Management Systems", "CSE", 3, 5, False),
            ("CS505", "Linux Lab", "CSE", 3, 5, True),
            ("CS506", "Python Lab", "CSE", 3, 5, True),
            ("CS507", "Evaluation of Internship-II", "CSE", 3, 5, False),
            ("CS508", "Minor Project-I", "CSE", 3, 5, True),
            
            # Sem 6
            ("CS601", "Machine Learning", "CSE", 3, 6, False),
            ("CS601P", "Machine Learning Lab", "CSE", 3, 6, True),
            ("CS602", "Computer Networks", "CSE", 3, 6, False),
            ("CS602P", "Computer Networks Lab", "CSE", 3, 6, True),
            ("CS603(A)", "Advanced Computer Architecture", "CSE", 3, 6, False),
            ("CS603(B)", "Computer Graphics & Visualization", "CSE", 3, 6, False),
            ("CS603(C)", "Compiler Design", "CSE", 3, 6, False),
            ("CS604(A)", "Knowledge Management", "CSE", 3, 6, False),
            ("CS604(B)", "Project Management", "CSE", 3, 6, False),
            ("CS604(C)", "Rural Technology & Community Development", "CSE", 3, 6, False),
            ("CS605", "Data Analytics Lab", "CSE", 3, 6, True),
            ("CS606", "Skill Development Lab", "CSE", 3, 6, True),
            ("CS608", "Minor Project-II", "CSE", 3, 6, True),
            
            # Sem 7
            ("CS701", "Software Architectures", "CSE", 4, 7, False),
            ("CS701P", "Software Architectures Lab", "CSE", 4, 7, True),
            ("CS702(A)", "Computational Intelligence", "CSE", 4, 7, False),
            ("CS702(B)", "Deep & Reinforcement Learning", "CSE", 4, 7, False),
            ("CS702(C)", "Wireless & Mobile Computing", "CSE", 4, 7, False),
            ("CS702(D)", "Big Data", "CSE", 4, 7, False),
            ("CS703(A)", "Cryptography & Information Security", "CSE", 4, 7, False),
            ("CS703(B)", "Data Mining & Warehousing", "CSE", 4, 7, False),
            ("CS703(C)", "Agile Software Development", "CSE", 4, 7, False),
            ("CS703(D)", "Disaster Management", "CSE", 4, 7, False),
            ("CS704", "Departmental Elective Lab", "CSE", 4, 7, True),
            ("CS705", "Open Elective Lab", "CSE", 4, 7, True),
            ("CS706", "Major Project-I", "CSE", 4, 7, True),
            ("CS607", "Evaluation of Internship-III", "CSE", 4, 7, False),
            
            # Sem 8
            ("CS801", "Internet of Things", "CSE", 4, 8, False),
            ("CS801P", "Internet of Things Lab", "CSE", 4, 8, True),
            ("CS802(A)", "Block Chain Technologies", "CSE", 4, 8, False),
            ("CS802(B)", "Cloud Computing", "CSE", 4, 8, False),
            ("CS802(C)", "High Performance Computing", "CSE", 4, 8, False),
            ("CS802(D)", "Object Oriented Software Engineering", "CSE", 4, 8, False),
            ("CS803(A)", "Image Processing & Computer Vision", "CSE", 4, 8, False),
            ("CS803(B)", "Game Theory with Engineering Applications", "CSE", 4, 8, False),
            ("CS803(C)", "Internet of Things", "CSE", 4, 8, False),
            ("CS803(D)", "Managing Innovation & Entrepreneurship", "CSE", 4, 8, False),
            ("CS804", "D/O Elective Lab", "CSE", 4, 8, True),
            ("CS805", "Major Project-II", "CSE", 4, 8, True),

            # ======================= AI & DS BRANCH =======================
            # Sem 3
            ("AD301", "Technical Communication", new_name, 2, 3, False),
            ("AD302", "Probability & Statistics for Data Science", new_name, 2, 3, False),
            ("AD303", "Data Structures", new_name, 2, 3, False),
            ("AD303P", "Data Structures Lab", new_name, 2, 3, True),
            ("AD304", "Artificial Intelligence", new_name, 2, 3, False),
            ("AD304P", "Artificial Intelligence Lab", new_name, 2, 3, True),
            ("AD305", "Object Oriented Programming & Methodology", new_name, 2, 3, False),
            ("AD305P", "Object Oriented Programming & Methodology Lab", new_name, 2, 3, True),
            ("AD306", "Computer Workshop / Python", new_name, 2, 3, True),
            
            # Sem 4
            ("BT401", "Mathematics III", new_name, 2, 4, False),
            ("AD402", "Database Management Systems", new_name, 2, 4, False),
            ("AD402P", "Database Management Systems Lab", new_name, 2, 4, True),
            ("AD403", "Software Engineering with Agile Methodology", new_name, 2, 4, False),
            ("AD403P", "Software Engineering Lab", new_name, 2, 4, True),
            ("AD404", "Data Science", new_name, 2, 4, False),
            ("AD404P", "Data Science Lab", new_name, 2, 4, True),
            ("AD405", "Operating Systems", new_name, 2, 4, False),
            ("AD405P", "Operating Systems Lab", new_name, 2, 4, True),
            ("AD406", "Data Analytics using Tools", new_name, 2, 4, True),
            
            # Sem 5
            ("AD501", "Theory of Computation", new_name, 3, 5, False),
            ("AD502", "Machine Learning", new_name, 3, 5, False),
            ("AD502P", "Machine Learning Lab", new_name, 3, 5, True),
            ("AD503(A)", "Internet & Web Technology", new_name, 3, 5, False),
            ("AD503(B)", "Computer Graphics & Multimedia", new_name, 3, 5, False),
            ("AD503(C)", "Computer Organization & Architecture", new_name, 3, 5, False),
            ("AD504(A)", "Management Information System", new_name, 3, 5, False),
            ("AD504(B)", "Game Theory with Engineering Applications", new_name, 3, 5, False),
            ("AD504(C)", "Operations Research", new_name, 3, 5, False),
            ("AD505", "Departmental Elective Lab", new_name, 3, 5, True),
            ("AD506", "Linux Lab", new_name, 3, 5, True),
            ("AD508", "Minor Project-I", new_name, 3, 5, True),
            
            # Sem 6
            ("AD601", "Deep Learning", new_name, 3, 6, False),
            ("AD601P", "Deep Learning Lab", new_name, 3, 6, True),
            ("AD602", "Computer Networks", new_name, 3, 6, False),
            ("AD602P", "Computer Networks Lab", new_name, 3, 6, True),
            ("AD603(A)", "Data Mining & Warehousing", new_name, 3, 6, False),
            ("AD603(B)", "Digital Image Processing", new_name, 3, 6, False),
            ("AD603(C)", "Information Retrieval", new_name, 3, 6, False),
            ("AD604(A)", "Internet of Things", new_name, 3, 6, False),
            ("AD604(B)", "Block Chain Technologies", new_name, 3, 6, False),
            ("AD604(C)", "Compiler Design", new_name, 3, 6, False),
            ("AD605", "Departmental Elective Lab", new_name, 3, 6, True),
            ("AD606", "Open Elective Lab", new_name, 3, 6, True),
            ("AD608", "Minor Project-II", new_name, 3, 6, True),
            
            # Sem 7
            ("AD701", "AI for Computer Vision", new_name, 4, 7, False),
            ("AD701P", "AI for Computer Vision Lab", new_name, 4, 7, True),
            ("AD702(A)", "Cloud Computing", new_name, 4, 7, False),
            ("AD702(B)", "Business Intelligence", new_name, 4, 7, False),
            ("AD702(C)", "Computational Intelligence", new_name, 4, 7, False),
            ("AD702(D)", "Predictive Analytics", new_name, 4, 7, False),
            ("AD703(A)", "Data Visualization", new_name, 4, 7, False),
            ("AD703(B)", "Mobile Application Development", new_name, 4, 7, False),
            ("AD703(C)", "Advanced Statistical Analytics", new_name, 4, 7, False),
            ("AD703(D)", "Social Media & Web Analytics", new_name, 4, 7, False),
            ("AD704", "Departmental Elective Lab", new_name, 4, 7, True),
            ("AD705", "Open Elective Lab", new_name, 4, 7, True),
            ("AD706", "Major Project-I", new_name, 4, 7, True),
            ("AD607", "Evaluation of Internship-III", new_name, 4, 7, False),
            
            # Sem 8
            ("AD801", "Big Data", new_name, 4, 8, False),
            ("AD801P", "Big Data Lab", new_name, 4, 8, True),
            ("AD802(A)", "Natural Language Processing", new_name, 4, 8, False),
            ("AD802(B)", "Reinforcement Learning", new_name, 4, 8, False),
            ("AD802(C)", "Robotic Process Automation", new_name, 4, 8, False),
            ("AD803(A)", "AI for Remote Sensing", new_name, 4, 8, False),
            ("AD803(B)", "Augmented & Virtual Reality", new_name, 4, 8, False),
            ("AD803(C)", "Managing Innovation & Entrepreneurship", new_name, 4, 8, False),
            ("AD804", "Departmental / Open Elective Lab", new_name, 4, 8, True),
            ("AD805", "Major Project-II", new_name, 4, 8, True),
        ]

        added_count = 0
        updated_count = 0
        
        for code, name, branch, year, semester, is_lab in subject_data:
            # Check if subject already exists
            existing = Subject.query.filter_by(code=code, branch=branch, semester=semester).first()
            if not existing:
                new_sub = Subject(
                    code=code,
                    name=name,
                    branch=branch,
                    semester=semester,
                    is_active=True
                )
                db.session.add(new_sub)
                added_count += 1
            else:
                # Update name if it changed
                if existing.name != name:
                    existing.name = name
                    updated_count += 1

        db.session.commit()
        print(f"✅ Subject import complete: {added_count} added, {updated_count} updated.")

if __name__ == "__main__":
    bulk_update_and_add_subjects()
