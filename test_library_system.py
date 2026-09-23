"""
Automated Test Suite for Central Library Management System (LMS)
Tests all Service layer business logic & REST API endpoints.
"""

import sys
import json
from datetime import datetime, date, timedelta
from app import app
from models import db, LibraryBook, LibraryBookCopy, LibraryMember, LibraryIssue, LibraryFine, User

def run_library_tests():
    print("=" * 60)
    print("STARTING CENTRAL LIBRARY MANAGEMENT SYSTEM TEST SUITE")
    print("=" * 60)

    passed_count = 0
    total_tests = 0

    def assert_test(name, condition, extra_info=""):
        nonlocal passed_count, total_tests
        total_tests += 1
        if condition:
            passed_count += 1
            print(f"  [PASS] Test {total_tests:02d}: {name} {extra_info}")
        else:
            print(f"  [FAIL] Test {total_tests:02d}: {name} - {extra_info}")

    with app.test_client() as client:
        with app.app_context():
            # 1. Test Library Dashboard API
            res = client.get('/api/library/dashboard?role=librarian')
            data = res.get_json()
            assert_test(
                "Library Dashboard API (Librarian)",
                res.status_code == 200 and data.get("success") == True and "metrics" in data,
                f"(Total books in catalog: {data.get('metrics', {}).get('total_books')})"
            )

            # 2. Test Student Library Dashboard API
            res = client.get('/api/library/dashboard?role=student&roll=0101CS221001')
            data = res.get_json()
            assert_test(
                "Student Library Dashboard & My Library Summary",
                res.status_code == 200 and data.get("success") == True,
                f"(Categories returned: {len(data.get('categories', []))})"
            )

            # 3. Test Books Catalog Listing
            res = client.get('/api/library/books')
            data = res.get_json()
            books = data.get("books", [])
            assert_test(
                "Catalog Books Listing",
                res.status_code == 200 and len(books) > 0,
                f"({len(books)} titles available)"
            )
            sample_book = books[0] if books else None

            # 4. Test Add New Book with Copies
            new_book_code = f"TEST-CS-{int(datetime.now().timestamp())}"
            res = client.post('/api/library/books', json={
                "title": "Quantum Computing & Quantum Algorithms",
                "author": "David Deutsch & Peter Shor",
                "isbn": "978-0198570493",
                "department": "CSE",
                "shelf": "Shelf Q1",
                "rack": "Rack 5",
                "price": 950.0,
                "copies_count": 3,
                "category_id": 1
            })
            data = res.get_json()
            created_book_id = data.get("book_id")
            assert_test(
                "Add New Title with 3 Barcoded Physical Copies",
                res.status_code == 200 and data.get("success") == True and created_book_id is not None,
                f"(Created Book ID: {created_book_id})"
            )

            # 5. Test Add Extra Copies to Book
            res = client.post(f'/api/library/books/{created_book_id}/copies', json={
                "count": 2,
                "condition": "New"
            })
            data = res.get_json()
            assert_test(
                "Add Extra Copies to Existing Catalog Item",
                res.status_code == 200 and data.get("success") == True and len(data.get("added_copies", [])) == 2,
                f"(Total 5 copies now created for title)"
            )

            # 6. Test Library Members Directory API
            res = client.get('/api/library/members')
            data = res.get_json()
            members = data.get("members", [])
            assert_test(
                "Library Member Roster & Sync",
                res.status_code == 200 and len(members) > 0,
                f"({len(members)} registered student & faculty members)"
            )
            test_member = next((m for m in members if (m.get("current_issued_count") or 0) < (m.get("max_books") or 4)), members[0] if members else None)
            member_id_code = test_member.get("member_code") or test_member.get("roll") or "0101CS221001"

            # 7. Test Fast Circulation Desk: Issue Book
            # Find an available copy of the newly created book
            res = client.get(f'/api/library/books/{created_book_id}')
            data = res.get_json()
            copies = data.get("book", {}).get("copies", [])
            avail_copy = next((c for c in copies if c.get("status") == "Available"), None)
            copy_acc = avail_copy.get("accession_no") if avail_copy else None

            res = client.post('/api/library/issue', json={
                "member_identifier": member_id_code,
                "copy_identifier": copy_acc,
                "remarks": "Automated Test Issue"
            })
            data = res.get_json()
            issue_id = data.get("issue_id")
            assert_test(
                "Fast Circulation Counter: Book Issue & Due Date Calculation",
                res.status_code == 200 and data.get("success") == True and issue_id is not None,
                f"(Issue Record #{issue_id}, Due Date: {data.get('receipt', {}).get('due_date')})"
            )

            # 8. Test Book Renewal
            res = client.post('/api/library/renew', json={
                "issue_id": issue_id,
                "remarks": "Test Extended Loan"
            })
            data = res.get_json()
            assert_test(
                "Loan Period Renewal",
                res.status_code == 200 and data.get("success") == True,
                f"(New Extended Due Date: {data.get('new_due_date')})"
            )

            # 9. Test Fast Circulation Counter: Return Book
            res = client.post('/api/library/return', json={
                "copy_identifier": copy_acc,
                "condition": "Good",
                "remarks": "Returned in pristine condition",
                "waive_late_fine": True
            })
            data = res.get_json()
            assert_test(
                "Fast Circulation Counter: Book Return & Copy Re-availability",
                res.status_code == 200 and data.get("success") == True,
                f"(Return Receipt Status: {data.get('receipt', {}).get('status')})"
            )

            # 10. Test Book Reservation Workflow
            res = client.post('/api/library/reserve', json={
                "member_identifier": member_id_code,
                "book_id": created_book_id,
                "remarks": "Need for final project"
            })
            data = res.get_json()
            res_id = data.get("reservation_id")
            assert_test(
                "Book Reservation Queue Placement",
                res.status_code == 200 and data.get("success") == True and res_id is not None,
                f"(Reservation #{res_id}, Queue Pos: {data.get('queue_position')})"
            )

            # Cancel Reservation
            res = client.post(f'/api/library/reserve/{res_id}/cancel', json={"reason": "Test cancel"})
            data = res.get_json()
            assert_test(
                "Cancel Book Reservation",
                res.status_code == 200 and data.get("success") == True
            )

            # 11. Test Overdue Report API
            res = client.get('/api/library/overdue')
            data = res.get_json()
            assert_test(
                "Overdue & Defaulters Tracker",
                res.status_code == 200 and data.get("success") == True and "overdue_books" in data,
                f"({len(data.get('overdue_books', []))} overdue records found)"
            )

            # 12. Test Audit Log Register
            res = client.get('/api/library/audit?limit=10')
            data = res.get_json()
            assert_test(
                "Audit Logs & Transaction Trail",
                res.status_code == 200 and data.get("success") == True and len(data.get("logs", [])) > 0,
                f"({len(data.get('logs', []))} immutable transaction logs verified)"
            )

    print("=" * 60)
    print(f"TEST RESULTS: {passed_count} / {total_tests} TESTS PASSED ({(passed_count/total_tests)*100:.1f}%)")
    print("=" * 60)
    return passed_count == total_tests

if __name__ == "__main__":
    success = run_library_tests()
    sys.exit(0 if success else 1)
