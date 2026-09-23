"""
Script to import 2nd Year, 3rd Year, and 4th Year AI&DS (Artificial Intelligence and Data Science) students
and create corresponding Student and User account records.
"""

from app import app, db
from models import Student, User
from werkzeug.security import generate_password_hash

# Student datasets extracted directly from official college records
YEAR_4_STUDENTS = [
    ("0545AD231001", "ABHISHEK GAYAKWAD"),
    ("0545AD231002", "AMIT KUMAR PAWAR"),
    ("0545AD231003", "ANSH KHANDARE"),
    ("0545AD231004", "ANUSH VERMA"),
    ("0545AD231005", "DISHA PANKAR"),
    ("0545AD231007", "HARSHITA MOTWANI"),
    ("0545AD231009", "JAY TIWARI"),
    ("0545AD231010", "MOHIT MALVIYA"),
    ("0545AD231011", "NANDANI MOTWANI"),
    ("0545AD231012", "NISHITA BARDE"),
    ("0545AD231014", "RUPESH FARKADE"),
    ("0545AD231015", "SHWETA BARASKAR"),
    ("0545AD231016", "VISHAL SABLE"),
    ("0545AD231017", "YACHIKA RANE"),
    ("0545AD231019", "YOGESH SAHU"),
    ("0545AD243D01", "ARCHANA"),
    ("0545AD243D04", "TANUPRIYA"),
    ("0863IS231017", "GITANJALI NARWARE"),
]

YEAR_3_STUDENTS = [
    ("0545AD241002", "AASTHA MALVIYA"),
    ("0545AD241003", "ANANYA SHARMA"),
    ("0545AD241004", "ANJALI KAUSHIK"),
    ("0545AD241005", "ARNAV GUPTA"),
    ("0545AD241008", "CHANDNI BAMNEY"),
    ("0545AD241009", "DIVYANKA BOBADE"),
    ("0545AD241011", "GAUTAM RATHORE"),
    ("0545AD241012", "GUNJAN AMARGHADE"),
    ("0545AD241014", "HARSHIT KUMAR KHATARKAR"),
    ("0545AD241015", "HARSHIT LOKHANDE"),
    ("0545AD241016", "HARSHIT MAKODE"),
    ("0545AD241017", "KANAKNANDANI GANGARE"),
    ("0545AD241019", "KHUSHBOO PINJARE"),
    ("0545AD241020", "KRISH GHORSE"),
    ("0545AD241021", "KRISHNAKANT LILHORE"),
    ("0545AD241023", "LAXMI AMRUTE"),
    ("0545AD241024", "MAYANK HAJARE"),
    ("0545AD241025", "MAYUR GIRHARE"),
    ("0545AD241029", "PRACHI KAWDETI"),
    ("0545AD241030", "PRAVESH CHAURASIYA"),
    ("0545AD241031", "PRAVIN PARIHAR"),
    ("0545AD241032", "ROSHNEE CHOUHAN"),
    ("0545AD241034", "SWATI CHOURSE"),
    ("0545AD241035", "YASH DESHMUKH"),
    ("0545AD241036", "YASHRAJ PAL"),
    ("0545EX241011", "TARUN PUNDE"),
    ("0545ME241001", "AATIF SHEKH"),
    ("0545AD231018", "YASH RATHORE"),
]

YEAR_2_STUDENTS = [
    ("0545AD251001", "AADITYA UGHADE"),
    ("0545AD251002", "AMAN PAL"),
    ("0545AD251003", "ANJALI SABLE"),
    ("0545AD251004", "ANURAG NARWARE"),
    ("0545AD251005", "ARYAN VISHWAKARMA"),
    ("0545AD251006", "AYAN ALI SHAH"),
    ("0545AD251007", "AYUSH KALMBE"),
    ("0545AD251008", "BHAGYASHRI SOLANKI"),
    ("0545AD251009", "BHUMIKA DIWAN"),
    ("0545AD251010", "DHANSHREE NAGORE"),
    ("0545AD251011", "DIVYA NAIK"),
    ("0545AD251012", "DIVYANSHA DHOTE"),
    ("0545AD251013", "DIVYANSHI DIWAN"),
    ("0545AD251014", "GAURAV RATHORE"),
    ("0545AD251015", "GEETANJALI PAWAR"),
    ("0545AD251016", "GOURAV BOBADE"),
    ("0545AD251017", "HARSH DANDHODE"),
    ("0545AD251018", "HARSH DHAKAD"),
    ("0545AD251019", "HARSH MISHRA"),
    ("0545AD251020", "JATIN KAVRETI"),
    ("0545AD251021", "JAY DHADSE"),
    ("0545AD251022", "JAYA VERMA"),
    ("0545AD251023", "KEERTI DAVANDEY"),
    ("0545AD251024", "KRISHTI PAWAR"),
    ("0545AD251025", "LALIT THAKRE"),
    ("0545AD251026", "LASHIKA SURYAWANSHI"),
    ("0545AD251027", "LOVELESH MAHATE"),
    ("0545AD251028", "MAHIMA JAIN"),
    ("0545AD251029", "MO REHAN KHAN"),
    ("0545AD251030", "NANDANI"),
    ("0545AD251031", "NAVIN GHORSE"),
    ("0545AD251032", "NEHA SONI"),
    ("0545AD251033", "PAYAL DHOLE"),
    ("0545AD251034", "PRACHI GAWANDE"),
    ("0545AD251035", "PRANJAL SABLE"),
    ("0545AD251036", "PRIYANSH DHOTE"),
    ("0545AD251037", "RAJESHVARI YADAV"),
    ("0545AD251038", "RISHABH DHOTE"),
    ("0545AD251039", "RITESH PARIHAR"),
    ("0545AD251040", "RIYA VARATHE"),
    ("0545AD251041", "SAMEER MAGARDE"),
    ("0545AD251042", "SATYADEEP VISHWAKARMA"),
    ("0545AD251043", "SHEKH REHAN"),
    ("0545AD251044", "SHRIOM SAHU"),
    ("0545AD251045", "SHUBHAM KAPSE"),
    ("0545AD251046", "TANUL YADAV"),
    ("0545AD251047", "YASH SAHU"),
    ("0545AD251048", "YATI PAWAR"),
    ("0545AD251049", "YUSHI LOKHANDE"),
]

def import_students():
    with app.app_context():
        print("=" * 60)
        print("[START] IMPORTING AI&DS (AD) STUDENTS INTO SYSTEM")
        print("=" * 60)

        groups = [
            ("Year 4 (4th Year)", 4, YEAR_4_STUDENTS),
            ("Year 3 (3rd Year)", 3, YEAR_3_STUDENTS),
            ("Year 2 (2nd Year)", 2, YEAR_2_STUDENTS),
        ]

        total_added_students = 0
        total_updated_students = 0
        total_created_users = 0

        for label, year, student_list in groups:
            print(f"\nProcessing {label} - {len(student_list)} students...")
            added_year = 0
            updated_year = 0
            users_year = 0

            for roll, name in student_list:
                roll = roll.strip().upper()
                name = name.strip().upper()

                # 1. Update or Insert Student
                student = Student.query.filter_by(roll=roll).first()
                if student:
                    student.name = name
                    student.branch = 'AD'
                    student.year = year
                    student.is_active = True
                    updated_year += 1
                else:
                    student = Student(
                        roll=roll,
                        name=name,
                        branch='AD',
                        year=year,
                        is_active=True
                    )
                    db.session.add(student)
                    added_year += 1

                # 2. Update or Insert User Account
                user = User.query.filter((User.student_roll == roll) | (User.username == roll)).first()
                if not user:
                    user = User(
                        username=roll,
                        fullname=name,
                        email=f"{roll.lower()}@college.com",
                        role='student',
                        branch='AD',
                        student_roll=roll,
                        email_verified=True,
                        is_active=True
                    )
                    user.set_password(roll)
                    db.session.add(user)
                    users_year += 1
                else:
                    user.fullname = name
                    user.branch = 'AD'
                    user.student_roll = roll
                    user.is_active = True

            db.session.commit()
            print(f"   [OK] Added {added_year} new students, updated {updated_year} existing.")
            print(f"   [OK] Created {users_year} new student login accounts (Password = Roll No).")

            total_added_students += added_year
            total_updated_students += updated_year
            total_created_users += users_year

        print("\n" + "=" * 60)
        print("[SUCCESS] IMPORT COMPLETED SUCCESSFULLY!")
        print(f"Total New Students Added: {total_added_students}")
        print(f"Total Existing Students Updated: {total_updated_students}")
        print(f"Total User Login Accounts Created: {total_created_users}")
        print("Total AI&DS Records in System:")
        
        counts = db.session.query(Student.year, db.func.count(Student.id)).filter_by(branch='AD').group_by(Student.year).all()
        for yr, cnt in sorted(counts):
            print(f"   - Year {yr}: {cnt} students")
        print("=" * 60)

if __name__ == '__main__':
    import_students()
