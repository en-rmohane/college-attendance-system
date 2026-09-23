import sys
import json
from app import app

def test_flask_api_directly():
    print("=== TESTING FLASK BACKEND & MOBILE API LIVE DATABASE ENDPOINTS ===")
    results = {}
    with app.test_client() as client:
        # 1. Ping
        res = client.get('/api/ping')
        results["ping"] = res.status_code == 200

        # 2. Login Admin
        res = client.post('/api/login', json={"username": "admin", "password": "any"})
        results["login_admin"] = res.status_code == 200 and res.get_json().get("success") == True

        # 3. Students List
        res = client.get('/api/students')
        studs = res.get_json().get('students', [])
        results["students_count"] = len(studs)

        # 4. Faculties List
        res = client.get('/api/faculties')
        facs = res.get_json().get('faculties', [])
        results["faculties_count"] = len(facs)

        # 5. Subject Allocations
        res = client.get('/api/subject-allocations')
        allocs = res.get_json().get('allocations', [])
        results["allocations_count"] = len(allocs)

        # 6. Notices (GET & POST Test)
        res = client.get('/api/notices')
        notices = res.get_json().get('notices', [])
        results["initial_notices_count"] = len(notices)

        # Create a test notice
        post_res = client.post('/api/notices', json={
            "title": "Automated Sync Test Notice",
            "message": "Testing database sync between web portal and mobile app.",
            "targetAudience": "all",
            "isImportant": True
        })
        results["notice_created"] = post_res.status_code == 200 and post_res.get_json().get("success") == True
        created_notice_id = post_res.get_json().get("notice", {}).get("id")

        # 7. Timetable
        res = client.get('/api/timetable')
        tt = res.get_json().get('timetable', [])
        results["timetable_count"] = len(tt)

        # 8. Tests
        res = client.get('/api/tests')
        tests = res.get_json().get('tests', [])
        results["tests_count"] = len(tests)

        # 9. Notes (GET & POST Test)
        res = client.get('/api/notes')
        notes = res.get_json().get('notes', [])
        results["initial_notes_count"] = len(notes)

        # Create a test note
        post_note_res = client.post('/api/notes', json={
            "title": "Unit 3: AI Machine Learning Algorithms",
            "description": "Supervised and Unsupervised Learning notes.",
            "subjectCode": "CS303",
            "professorId": 1
        })
        results["note_created"] = post_note_res.status_code == 200 and post_note_res.get_json().get("success") == True
        created_note_id = post_note_res.get_json().get("note_id")

        # 10. Transport Routes
        res = client.get('/api/transport/routes')
        routes = res.get_json().get('routes', [])
        results["routes_count"] = len(routes)

        # 11. Reports List
        res = client.get('/api/reports')
        reports = res.get_json().get('reports', [])
        results["reports_count"] = len(reports)

        # Cleanup test notice and test note if created
        if created_notice_id:
            del_res = client.delete(f'/api/notices/{created_notice_id}')
            results["notice_delete_tested"] = del_res.status_code == 200
        if created_note_id:
            del_res = client.delete(f'/api/notes/{created_note_id}')
            results["note_delete_tested"] = del_res.status_code == 200

    print("\nAPI TEST EXECUTION SUMMARY:")
    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    test_flask_api_directly()
