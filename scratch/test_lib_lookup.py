import sys
import os
sys.path.insert(0, os.path.abspath('.'))

from app import app
from library_service import LibraryCirculationService, LibraryMemberService, LibraryCatalogService, LibraryBook, LibraryBookCopy, LibraryMember, Student, User

with app.app_context():
    print("--- Testing Member Lookups ---")
    st_sample = Student.query.first()
    print("First student in DB:", st_sample.roll if st_sample else None, st_sample.name if st_sample else None)
    
    test_rolls = [
        st_sample.roll if st_sample else "0545CS251001",
        "0545CS231001",
        "0545AD231001",
        "0545AD241001",
        "librarian",
        "admin",
        "random_unknown"
    ]
    for r in test_rolls:
        mem = LibraryMemberService.get_member_by_code_or_roll(r)
        print(f"Roll '{r}' -> Member:", mem.member_code if mem else "NOT FOUND")

    print("\n--- Testing Book Copy Lookups ---")
    bk_sample = LibraryBook.query.first()
    print("First book in DB:", bk_sample.title if bk_sample else None, bk_sample.book_code if bk_sample else None)
    
    cp_sample = LibraryBookCopy.query.first()
    print("First copy in DB:", cp_sample.accession_no if cp_sample else None, cp_sample.status if cp_sample else None)
    
    test_books = [
        cp_sample.accession_no if cp_sample else "CS-0001-001",
        bk_sample.book_code if bk_sample else "CS-0001",
        bk_sample.title if bk_sample else "Computer Networks",
        "BAR-" + (cp_sample.accession_no if cp_sample else "CS-0001-001"),
        "1",
        "Operating Systems",
        "NonExistentBook"
    ]
    for b in test_books:
        copy = LibraryCatalogService.find_copy_by_scan(b)
        print(f"Book '{b}' -> Copy:", copy.accession_no if copy else "NOT FOUND", f"(Status: {copy.status})" if copy else "")

    print("\n--- Testing Issue Execution ---")
    if st_sample and bk_sample:
        # Try issuing with roll + title
        ok, msg, slip = LibraryCirculationService.issue_book(st_sample.roll, bk_sample.title)
        print(f"Issue with Title Result: ok={ok}, msg='{msg}'")
