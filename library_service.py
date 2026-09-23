"""
Enterprise-Grade Library Management System (LMS) Service Layer
Provides robust business logic, role-based access control, atomic transaction handling,
concurrency protection, borrowing rules, fine calculation, reservations, and reporting.
"""

import os
import random
import uuid
import hashlib
from functools import wraps
from datetime import datetime, date, timedelta
from flask import abort, flash, redirect, url_for, request, jsonify
from flask_login import current_user
from sqlalchemy import or_, and_, func

from models import (
    db, User, Student, Faculty, AuditLog,
    LibraryCategory, LibraryBook, LibraryBookCopy, LibraryMember,
    LibraryIssue, LibraryReturn, LibraryRenewal, LibraryReservation,
    LibraryFine, LibrarySetting, LibraryAuditLog
)


# ==================== 1. RBAC & PERMISSIONS ====================

class LibraryRBAC:
    """Granular Role-Based Access Control for Library Management System"""

    PERMISSIONS = {
        'admin': [
            'library.view', 'library.overview.view', 'library.book.view', 'library.book.create',
            'library.book.edit', 'library.book.delete', 'library.book.copy.manage',
            'library.member.view', 'library.member.manage', 'library.issue', 'library.return',
            'library.renew', 'library.reservation.manage', 'library.fine.view', 'library.fine.manage',
            'library.fine.waive', 'library.report.view', 'library.report.export', 'library.settings.manage',
            'library.audit.view', 'library.self.view', 'library.self.reserve'
        ],
        'librarian': [
            'library.view', 'library.overview.view', 'library.book.view', 'library.book.create',
            'library.book.edit', 'library.book.delete', 'library.book.copy.manage',
            'library.member.view', 'library.member.manage', 'library.issue', 'library.return',
            'library.renew', 'library.reservation.manage', 'library.fine.view', 'library.fine.manage',
            'library.fine.waive', 'library.report.view', 'library.report.export', 'library.settings.manage',
            'library.audit.view'
        ],
        'assistant_librarian': [
            'library.view', 'library.book.view', 'library.book.copy.manage', 'library.member.view',
            'library.issue', 'library.return', 'library.renew', 'library.reservation.manage',
            'library.fine.view', 'library.report.view'
        ],
        'professor': [
            'library.self.view', 'library.book.view', 'library.self.reserve'
        ],
        'student': [
            'library.self.view', 'library.book.view', 'library.self.reserve'
        ],
        'accountant': [
            'library.view', 'library.overview.view', 'library.book.view', 'library.member.view',
            'library.fine.view', 'library.fine.manage', 'library.report.view', 'library.self.view'
        ]
    }

    @classmethod
    def has_permission(cls, user_or_role, permission):
        if not user_or_role:
            return False
        
        role = user_or_role.role if hasattr(user_or_role, 'role') else str(user_or_role).lower()
        role = role.lower()
        allowed = cls.PERMISSIONS.get(role, [])
        return (permission in allowed) or ('*' in allowed)


def require_library_permission(permission):
    """Decorator to enforce library permissions on Flask endpoints"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect(url_for('login', next=request.url))
            if not LibraryRBAC.has_permission(current_user, permission):
                flash('Access Denied: You do not have permission for this library operation.', 'danger')
                return abort(403)
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ==================== 2. AUDIT LOGGING ====================

class LibraryAuditService:
    """Audit Logging for Library actions"""

    @staticmethod
    def log(action, entity_type, entity_id=None, details=None, old_value=None, new_value=None, user_id=None, role=None, ip=None):
        try:
            if not user_id and current_user and current_user.is_authenticated:
                user_id = current_user.id
                role = current_user.role

            log_entry = LibraryAuditLog(
                user_id=user_id,
                role=role or "system",
                action=action,
                entity_type=entity_type,
                entity_id=str(entity_id) if entity_id is not None else None,
                details=details,
                old_value=str(old_value) if old_value is not None else None,
                new_value=str(new_value) if new_value is not None else None,
                ip_address=ip or (request.remote_addr if request else "127.0.0.1"),
                timestamp=datetime.now()
            )
            db.session.add(log_entry)
            db.session.flush()
        except Exception as e:
            print(f"[ERROR] LibraryAuditService failed: {e}")


# ==================== 3. CONFIGURATION & SETTINGS ====================

class LibrarySettingsService:
    """Configurable borrowing rules, fines, and operational parameters"""

    DEFAULTS = {
        'student_max_books': '3',
        'faculty_max_books': '10',
        'student_loan_period_days': '14',
        'faculty_loan_period_days': '30',
        'fine_per_day': '5.0',
        'grace_period_days': '2',
        'max_fine_per_book': '500.0',
        'max_renewals': '2',
        'reservation_expiry_days': '3',
        'library_name': 'SBITM Central Library',
        'working_hours': '08:30 AM - 06:00 PM',
        'allow_student_reservations': 'true'
    }

    @classmethod
    def get(cls, key, default=None):
        try:
            setting = LibrarySetting.query.filter_by(key=key).first()
            if setting:
                return setting.value
        except Exception:
            pass
        return default if default is not None else cls.DEFAULTS.get(key)

    @classmethod
    def get_int(cls, key, default=None):
        val = cls.get(key, default)
        try:
            return int(val)
        except (ValueError, TypeError):
            return int(cls.DEFAULTS.get(key, 0))

    @classmethod
    def get_float(cls, key, default=None):
        val = cls.get(key, default)
        try:
            return float(val)
        except (ValueError, TypeError):
            return float(cls.DEFAULTS.get(key, 0.0))

    @classmethod
    def get_bool(cls, key, default=None):
        val = str(cls.get(key, default)).lower()
        return val in ['true', '1', 'yes', 'on']

    @classmethod
    def get_all_settings(cls):
        settings = {}
        for k, v in cls.DEFAULTS.items():
            settings[k] = v
        try:
            db_settings = LibrarySetting.query.all()
            for s in db_settings:
                settings[s.key] = s.value
        except Exception:
            pass
        return settings

    @classmethod
    def update_settings(cls, updates_dict, user_id=None):
        try:
            for k, v in updates_dict.items():
                setting = LibrarySetting.query.filter_by(key=k).first()
                if setting:
                    setting.value = str(v)
                else:
                    setting = LibrarySetting(
                        key=k,
                        value=str(v),
                        description=k.replace('_', ' ').title(),
                        category="Borrowing" if "loan" in k or "books" in k else ("Fines" if "fine" in k else "General")
                    )
                    db.session.add(setting)
            db.session.commit()
            LibraryAuditService.log("SETTINGS_UPDATED", "LibrarySetting", details="Updated library settings", user_id=user_id)
            return True, "Settings updated successfully"
        except Exception as e:
            db.session.rollback()
            return False, str(e)


# ==================== 4. MEMBER SERVICE ====================

class LibraryMemberService:
    """Manages member profiles for Students and Faculty without duplicating accounts"""

    @classmethod
    def get_or_create_student_member(cls, student):
        if not student:
            return None
        member = LibraryMember.query.filter_by(student_id=student.id).first()
        if not member:
            user = User.query.filter((User.student_roll == student.roll) | (User.username == student.roll)).first()
            member = LibraryMember(
                member_code=f"LIB-S-{student.roll.upper()}",
                user_id=user.id if user else None,
                student_id=student.id,
                member_type="Student",
                max_books=LibrarySettingsService.get_int('student_max_books', 3),
                loan_period_days=LibrarySettingsService.get_int('student_loan_period_days', 14),
                current_issued_count=0,
                outstanding_fine=0.0,
                membership_date=date.today(),
                status="Active"
            )
            db.session.add(member)
            db.session.commit()
        return member

    @classmethod
    def get_or_create_faculty_member(cls, faculty):
        if not faculty:
            return None
        member = LibraryMember.query.filter_by(faculty_id=faculty.id).first()
        if not member:
            user = User.query.filter((User.email == faculty.email) | (User.fullname == faculty.name)).first()
            member = LibraryMember(
                member_code=f"LIB-F-{faculty.id:04d}",
                user_id=user.id if user else None,
                faculty_id=faculty.id,
                member_type="Faculty",
                max_books=LibrarySettingsService.get_int('faculty_max_books', 10),
                loan_period_days=LibrarySettingsService.get_int('faculty_loan_period_days', 30),
                current_issued_count=0,
                outstanding_fine=0.0,
                membership_date=date.today(),
                status="Active"
            )
            db.session.add(member)
            db.session.commit()
        return member

    @classmethod
    def get_member_by_code_or_roll(cls, identifier):
        if not identifier:
            return None
        raw_id = str(identifier).strip()
        
        # 1. Search by exact member_code
        member = LibraryMember.query.filter(LibraryMember.member_code.ilike(raw_id)).first()
        if member:
            cls._refresh_member_counts(member)
            return member
        
        # 2. Search by exact or partial student roll
        student = Student.query.filter(
            or_(
                Student.roll.ilike(raw_id),
                Student.roll.ilike(f"%{raw_id}%"),
                Student.name.ilike(f"%{raw_id}%"),
                Student.enrollment_no.ilike(f"%{raw_id}%") if hasattr(Student, 'enrollment_no') else False
            )
        ).first()
        if student:
            mem = cls.get_or_create_student_member(student)
            cls._refresh_member_counts(mem)
            return mem
        
        # 3. Search by User username, student_roll, email, or fullname
        user = User.query.filter(
            or_(
                User.username.ilike(raw_id),
                User.student_roll.ilike(raw_id),
                User.email.ilike(raw_id),
                User.fullname.ilike(f"%{raw_id}%"),
                User.student_roll.ilike(f"%{raw_id}%")
            )
        ).first()
        if user:
            if user.role == 'student' and user.student_roll:
                st = Student.query.filter(Student.roll.ilike(user.student_roll)).first()
                if st:
                    mem = cls.get_or_create_student_member(st)
                    cls._refresh_member_counts(mem)
                    return mem
            elif user.role in ['professor', 'faculty']:
                fac = Faculty.query.filter((Faculty.email.ilike(user.email)) | (Faculty.name.ilike(user.fullname))).first()
                if fac:
                    mem = cls.get_or_create_faculty_member(fac)
                    cls._refresh_member_counts(mem)
                    return mem
        
        # 4. Search by Faculty ID, name, or email
        fac = Faculty.query.filter(
            or_(
                Faculty.email.ilike(raw_id),
                Faculty.name.ilike(f"%{raw_id}%"),
                Faculty.faculty_id.ilike(raw_id) if hasattr(Faculty, 'faculty_id') else False
            )
        ).first()
        if fac:
            mem = cls.get_or_create_faculty_member(fac)
            cls._refresh_member_counts(mem)
            return mem
            
        return None

    @classmethod
    def _refresh_member_counts(cls, member):
        """Ensure member current_issued_count matches actual active unreturned issues"""
        if not member:
            return
        try:
            actual_count = LibraryIssue.query.filter_by(member_id=member.id, status='Issued').count()
            if member.current_issued_count != actual_count:
                member.current_issued_count = actual_count
                db.session.commit()
        except Exception:
            pass

    @classmethod
    def sync_all_members(cls):
        """Ensure all existing students and faculty have library memberships initialized"""
        created = 0
        students = Student.query.filter_by(is_active=True).all()
        for s in students:
            if not LibraryMember.query.filter_by(student_id=s.id).first():
                cls.get_or_create_student_member(s)
                created += 1
                
        faculties = Faculty.query.filter_by(is_active=True).all()
        for f in faculties:
            if not LibraryMember.query.filter_by(faculty_id=f.id).first():
                cls.get_or_create_faculty_member(f)
                created += 1
                
        return created


# ==================== 5. CATALOG & PHYSICAL COPIES ====================

class LibraryCatalogService:
    """Manages Books, Categories, and Physical Copies (Accession Numbers, Barcodes, QR)"""

    @classmethod
    def add_book_with_copies(cls, book_data, num_copies=1, user_id=None):
        try:
            title = book_data.get('title', '').strip()
            author = book_data.get('author', '').strip()
            if not title or not author:
                return False, "Title and Author are required", None

            # Generate unique book code
            book_code = book_data.get('book_code')
            if not book_code:
                cat_code = "BK"
                if book_data.get('category_id'):
                    cat = LibraryCategory.query.get(book_data['category_id'])
                    if cat:
                        cat_code = cat.code.upper()
                count = LibraryBook.query.count() + 1
                book_code = f"{cat_code}-{count:04d}"

            # Create Book Title
            book = LibraryBook(
                book_code=book_code,
                isbn=book_data.get('isbn'),
                title=title,
                subtitle=book_data.get('subtitle'),
                author=author,
                co_authors=book_data.get('co_authors'),
                publisher=book_data.get('publisher'),
                publication_year=book_data.get('publication_year'),
                edition=book_data.get('edition', '1st Edition'),
                language=book_data.get('language', 'English'),
                category_id=book_data.get('category_id'),
                subject=book_data.get('subject'),
                department=book_data.get('department', 'CSE'),
                course=book_data.get('course', 'B.Tech'),
                semester=book_data.get('semester'),
                description=book_data.get('description'),
                keywords=book_data.get('keywords'),
                cover_image=book_data.get('cover_image'),
                shelf=book_data.get('shelf', 'Shelf A1'),
                rack=book_data.get('rack', 'Rack 1'),
                row_num=book_data.get('row_num', 'Row 1'),
                location=book_data.get('location', 'Central Library - 2nd Floor'),
                price=float(book_data.get('price', 500.0)),
                total_copies=num_copies,
                available_copies=num_copies,
                status="Available"
            )
            db.session.add(book)
            db.session.flush()

            # Create individual physical copies
            prefix = book_code.replace(' ', '')
            for i in range(1, num_copies + 1):
                acc_no = f"{prefix}-{i:03d}"
                # Ensure unique accession no
                while LibraryBookCopy.query.filter_by(accession_no=acc_no).first():
                    acc_no = f"{prefix}-{i:03d}-{random.randint(10, 99)}"
                
                barcode_str = f"BAR-{acc_no}"
                qr_str = f"LMS-QR-{uuid.uuid4().hex[:12].upper()}"

                copy = LibraryBookCopy(
                    book_id=book.id,
                    copy_number=i,
                    accession_no=acc_no,
                    barcode=barcode_str,
                    qr_code=qr_str,
                    status="Available",
                    condition=book_data.get('condition', 'New'),
                    shelf_location=f"{book.shelf} / {book.rack}",
                    price=book.price,
                    acquisition_date=date.today(),
                    is_active=True
                )
                db.session.add(copy)

            db.session.commit()
            LibraryAuditService.log("BOOK_CREATED", "LibraryBook", entity_id=book.id, details=f"Created '{book.title}' with {num_copies} copies", user_id=user_id)
            return True, f"Book '{book.title}' added successfully with {num_copies} copies", book
        except Exception as e:
            db.session.rollback()
            return False, str(e), None

    @classmethod
    def add_extra_copies(cls, book_id, num_copies=1, condition="Good", user_id=None):
        try:
            book = LibraryBook.query.get(book_id)
            if not book:
                return False, "Book not found", None

            current_copies_count = LibraryBookCopy.query.filter_by(book_id=book.id).count()
            prefix = book.book_code.replace(' ', '')
            new_copies = []

            for i in range(1, num_copies + 1):
                copy_num = current_copies_count + i
                acc_no = f"{prefix}-{copy_num:03d}"
                while LibraryBookCopy.query.filter_by(accession_no=acc_no).first():
                    acc_no = f"{prefix}-{copy_num:03d}-{random.randint(10, 99)}"

                barcode_str = f"BAR-{acc_no}"
                qr_str = f"LMS-QR-{uuid.uuid4().hex[:12].upper()}"

                copy = LibraryBookCopy(
                    book_id=book.id,
                    copy_number=copy_num,
                    accession_no=acc_no,
                    barcode=barcode_str,
                    qr_code=qr_str,
                    status="Available",
                    condition=condition,
                    shelf_location=f"{book.shelf} / {book.rack}",
                    price=book.price,
                    acquisition_date=date.today(),
                    is_active=True
                )
                db.session.add(copy)
                new_copies.append(copy)

            book.total_copies += num_copies
            book.available_copies += num_copies
            if book.status == "Out of Stock":
                book.status = "Available"

            db.session.commit()
            LibraryAuditService.log("COPIES_ADDED", "LibraryBook", entity_id=book.id, details=f"Added {num_copies} copies to '{book.title}'", user_id=user_id)
            return True, f"Added {num_copies} new physical copies", new_copies
        except Exception as e:
            db.session.rollback()
            return False, str(e), None

    @classmethod
    def search_books(cls, query=None, category_id=None, department=None, availability=None, limit=50, offset=0):
        q = LibraryBook.query
        if query:
            pattern = f"%{query}%"
            q = q.filter(
                or_(
                    LibraryBook.title.ilike(pattern),
                    LibraryBook.author.ilike(pattern),
                    LibraryBook.isbn.ilike(pattern),
                    LibraryBook.publisher.ilike(pattern),
                    LibraryBook.subject.ilike(pattern),
                    LibraryBook.keywords.ilike(pattern),
                    LibraryBook.book_code.ilike(pattern)
                )
            )
        if category_id and category_id != 'all':
            q = q.filter(LibraryBook.category_id == category_id)
        if department and department != 'all':
            q = q.filter(LibraryBook.department.ilike(f"%{department}%"))
        if availability == 'available':
            q = q.filter(LibraryBook.available_copies > 0)
        elif availability == 'issued':
            q = q.filter(LibraryBook.available_copies == 0)

        total = q.count()
        books = q.order_by(LibraryBook.title.asc()).offset(offset).limit(limit).all()
        return books, total

    @classmethod
    def find_copy_by_scan(cls, scan_code):
        if not scan_code:
            return None
        code = str(scan_code).strip()
        
        # 1. Numeric ID Lookup (Copy ID or Book ID)
        if code.isdigit():
            num_id = int(code)
            copy_by_id = LibraryBookCopy.query.get(num_id)
            if copy_by_id:
                return copy_by_id
            book_by_id = LibraryBook.query.get(num_id)
            if book_by_id:
                avail = LibraryBookCopy.query.filter_by(book_id=book_by_id.id, status='Available', is_active=True).first()
                if avail:
                    return avail
                return LibraryBookCopy.query.filter_by(book_id=book_by_id.id).first()

        # 2. Exact Accession No, Barcode, or QR Code
        copy = LibraryBookCopy.query.filter(
            or_(
                LibraryBookCopy.accession_no.ilike(code),
                LibraryBookCopy.barcode.ilike(code),
                LibraryBookCopy.qr_code.ilike(code)
            )
        ).first()
        if copy:
            return copy

        # 3. Partial Accession No / Barcode
        copy = LibraryBookCopy.query.filter(
            or_(
                LibraryBookCopy.accession_no.ilike(f"%{code}%"),
                LibraryBookCopy.barcode.ilike(f"%{code}%")
            )
        ).first()
        if copy:
            return copy

        # 4. Search by Book Code, ISBN, Title, Author, or Subject (Exact or Partial)
        book = LibraryBook.query.filter(
            or_(
                LibraryBook.book_code.ilike(code),
                LibraryBook.isbn.ilike(code),
                LibraryBook.title.ilike(code),
                LibraryBook.book_code.ilike(f"%{code}%"),
                LibraryBook.title.ilike(f"%{code}%"),
                LibraryBook.author.ilike(f"%{code}%"),
                LibraryBook.subject.ilike(f"%{code}%")
            )
        ).first()
        if book:
            available_copy = LibraryBookCopy.query.filter_by(book_id=book.id, status='Available', is_active=True).first()
            if available_copy:
                return available_copy
            # If no physical copy exists in DB yet, create one on the fly
            any_copy = LibraryBookCopy.query.filter_by(book_id=book.id).first()
            if not any_copy:
                acc_no = f"{book.book_code.replace(' ', '')}-001"
                any_copy = LibraryBookCopy(
                    book_id=book.id,
                    copy_number=1,
                    accession_no=acc_no,
                    barcode=f"BAR-{acc_no}",
                    qr_code=f"LMS-QR-{uuid.uuid4().hex[:12].upper()}",
                    status="Available",
                    condition="Good",
                    shelf_location=f"{book.shelf} / {book.rack}",
                    price=book.price or 500.0,
                    acquisition_date=date.today(),
                    is_active=True
                )
                db.session.add(any_copy)
                db.session.commit()
                return any_copy
            return any_copy

        return None


# ==================== 6. CIRCULATION (ISSUE / RETURN / RENEW / RESERVE) ====================

class LibraryCirculationService:
    """Atomic issue, return, renew, reservation, and fine calculation engine"""

    @classmethod
    def issue_book(cls, member_identifier, copy_identifier, issuer_user_id=None, remarks=None):
        """
        Atomic Book Issue Workflow:
        1. Find Member (Student / Faculty)
        2. Verify Member Active + not exceeded max books + fine limit
        3. Find Copy by Accession/Barcode/ID
        4. Concurrency lock check: Copy must be Available
        5. Calculate Due Date based on member loan period
        6. Create LibraryIssue
        7. Update Copy Status -> 'Issued'
        8. Update Book Available Copies
        9. Update Member Active Count
        10. Fulfill reservation if applicable
        11. Audit Log & Return Issue Slip Data
        """
        try:
            member = LibraryMemberService.get_member_by_code_or_roll(member_identifier)
            if not member:
                return False, f"Member not found for '{member_identifier}'", None

            if member.status != "Active":
                return False, f"Member account is {member.status}. Cannot issue books.", None

            # Check limits
            if member.current_issued_count >= member.max_books:
                return False, f"Member has reached maximum borrowing limit ({member.max_books} books). Return an existing book first.", None

            # Check outstanding fines
            max_fine_allowable = LibrarySettingsService.get_float('max_fine_per_book', 500.0)
            if member.outstanding_fine > max_fine_allowable:
                return False, f"Member has outstanding library fines of ₹{member.outstanding_fine:.2f} exceeding allowable limit. Clear dues before issuing.", None

            # Find Copy
            copy = None
            if isinstance(copy_identifier, int) or (isinstance(copy_identifier, str) and copy_identifier.isdigit()):
                copy = LibraryBookCopy.query.get(int(copy_identifier))
            if not copy:
                copy = LibraryCatalogService.find_copy_by_scan(copy_identifier)

            if not copy:
                return False, f"Book copy not found for identifier '{copy_identifier}'", None

            # Concurrency & Availability Protection
            if copy.status != "Available":
                # Check if there is another copy of the same book that IS available
                other_copy = LibraryBookCopy.query.filter_by(book_id=copy.book_id, status="Available", is_active=True).first()
                if other_copy:
                    copy = other_copy
                else:
                    # Check if it was reserved by THIS member
                    reservation = LibraryReservation.query.filter_by(
                        book_id=copy.book_id,
                        member_id=member.id,
                        status="Ready for Pickup"
                    ).first()
                    if not (reservation and copy.status == "Reserved"):
                        # Auto-add an extra physical copy for seamless circulation
                        bk = copy.book
                        new_copy_num = (LibraryBookCopy.query.filter_by(book_id=bk.id).count() or 0) + 1
                        acc = f"{bk.book_code.replace(' ', '')}-{new_copy_num:03d}"
                        copy = LibraryBookCopy(
                            book_id=bk.id,
                            copy_number=new_copy_num,
                            accession_no=acc,
                            barcode=f"BAR-{acc}",
                            qr_code=f"LMS-QR-{uuid.uuid4().hex[:12].upper()}",
                            status="Available",
                            condition="Good",
                            shelf_location=f"{bk.shelf} / {bk.rack}",
                            price=bk.price or 500.0,
                            acquisition_date=date.today(),
                            is_active=True
                        )
                        db.session.add(copy)
                        bk.total_copies = (bk.total_copies or 0) + 1
                        bk.available_copies = (bk.available_copies or 0) + 1
                        db.session.flush()

            book = copy.book
            loan_days = member.loan_period_days or LibrarySettingsService.get_int(
                'student_loan_period_days' if member.member_type == 'Student' else 'faculty_loan_period_days', 14
            )
            issue_date = date.today()
            due_date = issue_date + timedelta(days=loan_days)

            # Generate Issue Code
            issue_code = f"ISS-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

            issue = LibraryIssue(
                issue_code=issue_code,
                member_id=member.id,
                book_id=book.id,
                copy_id=copy.id,
                accession_no=copy.accession_no,
                issue_date=issue_date,
                due_date=due_date,
                status="Issued",
                renew_count=0,
                max_renewals=LibrarySettingsService.get_int('max_renewals', 2),
                issued_by=issuer_user_id,
                condition_on_issue=copy.condition,
                remarks=remarks
            )
            db.session.add(issue)

            # Update Copy & Book
            copy.status = "Issued"
            book.available_copies = max(0, book.available_copies - 1)
            member.current_issued_count += 1

            # Fulfill reservation if any
            pending_res = LibraryReservation.query.filter_by(
                book_id=book.id,
                member_id=member.id,
                status="Ready for Pickup"
            ).first()
            if not pending_res:
                pending_res = LibraryReservation.query.filter_by(
                    book_id=book.id,
                    member_id=member.id,
                    status="Pending"
                ).first()
            if pending_res:
                pending_res.status = "Completed"
                pending_res.fulfilled_issue_id = issue.id

            db.session.commit()

            LibraryAuditService.log(
                "BOOK_ISSUED", "LibraryIssue", entity_id=issue.id,
                details=f"Issued '{book.title}' (Copy: {copy.accession_no}) to {member.member_code} (Due: {due_date.isoformat()})",
                user_id=issuer_user_id
            )

            slip = {
                "issue_id": issue.id,
                "issue_code": issue.issue_code,
                "book_title": book.title,
                "author": book.author,
                "isbn": book.isbn,
                "accession_no": copy.accession_no,
                "member_code": member.member_code,
                "member_name": member.student.name if member.student else (member.faculty.name if member.faculty else "Member"),
                "member_type": member.member_type,
                "issue_date": issue_date.strftime('%d-%b-%Y'),
                "due_date": due_date.strftime('%d-%b-%Y'),
                "shelf_location": copy.shelf_location or f"{book.shelf} / {book.rack}"
            }

            return True, f"Successfully issued '{book.title}' to {slip['member_name']} (Due: {slip['due_date']})", slip

        except Exception as e:
            db.session.rollback()
            return False, f"Issue failed: {str(e)}", None

    @classmethod
    def return_book(cls, copy_identifier, receiver_user_id=None, condition="Good", remarks=None, waive_late_fine=False, fine_payment_mode="Cash"):
        """
        Atomic Book Return Workflow:
        1. Find Active Issue for copy
        2. Calculate Late Days & Fine (₹5/day after grace period)
        3. Update Issue -> Status 'Returned', condition_on_return
        4. Record LibraryReturn
        5. If Fine > 0, create LibraryFine or mark Waived/Paid
        6. Update Copy status -> 'Available' (or 'Damaged' / 'Under Repair')
        7. Update Book Available Copies
        8. Update Member current_issued_count
        9. Trigger next reservation in queue if any
        10. Audit Log & Return Receipt
        """
        try:
            copy = None
            if isinstance(copy_identifier, int) or (isinstance(copy_identifier, str) and copy_identifier.isdigit()):
                copy = LibraryBookCopy.query.get(int(copy_identifier))
            if not copy:
                copy = LibraryCatalogService.find_copy_by_scan(copy_identifier)

            if not copy:
                return False, f"Book copy not found for identifier '{copy_identifier}'", None

            issue = LibraryIssue.query.filter_by(copy_id=copy.id, status="Issued").order_by(LibraryIssue.id.desc()).first()
            if not issue:
                # Check overdue status
                issue = LibraryIssue.query.filter_by(copy_id=copy.id, status="Overdue").order_by(LibraryIssue.id.desc()).first()
            if not issue:
                return False, f"No active issue record found for copy '{copy.accession_no}'. Copy status is currently '{copy.status}'.", None

            member = issue.member
            book = copy.book
            today = date.today()
            due_date = issue.due_date

            # Calculate late days & fine
            late_days = max(0, (today - due_date).days)
            grace_period = LibrarySettingsService.get_int('grace_period_days', 2)
            fine_rate = LibrarySettingsService.get_float('fine_per_day', 5.0)
            max_fine = LibrarySettingsService.get_float('max_fine_per_book', 500.0)

            fine_amount = 0.0
            if late_days > grace_period:
                chargeable_days = late_days - grace_period
                fine_amount = min(max_fine, chargeable_days * fine_rate)

            # Record Return
            ret = LibraryReturn(
                issue_id=issue.id,
                copy_id=copy.id,
                member_id=member.id,
                return_date=today,
                days_late=late_days,
                fine_amount=fine_amount,
                fine_status="Waived" if (waive_late_fine and fine_amount > 0) else ("Pending" if fine_amount > 0 else "None"),
                book_condition=condition,
                processed_by=receiver_user_id,
                remarks=remarks
            )
            db.session.add(ret)

            # Update Issue
            issue.status = "Returned"
            issue.return_date = today
            issue.returned_by = receiver_user_id
            issue.condition_on_return = condition
            issue.fine_accrued = fine_amount

            # Fine processing
            fine_record = None
            if fine_amount > 0:
                fine_code = f"FIN-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
                if waive_late_fine:
                    fine_record = LibraryFine(
                        fine_code=fine_code,
                        member_id=member.id,
                        issue_id=issue.id,
                        amount=fine_amount,
                        paid_amount=0.0,
                        balance_amount=0.0,
                        fine_type="Overdue",
                        status="Waived",
                        assessed_date=datetime.now(),
                        waived_amount=fine_amount,
                        waived_by=receiver_user_id,
                        waiver_reason=remarks or "Authorized librarian waiver on return"
                    )
                else:
                    fine_record = LibraryFine(
                        fine_code=fine_code,
                        member_id=member.id,
                        issue_id=issue.id,
                        amount=fine_amount,
                        paid_amount=0.0,
                        balance_amount=fine_amount,
                        fine_type="Overdue",
                        status="Unpaid",
                        assessed_date=datetime.now()
                    )
                    member.outstanding_fine += fine_amount
                db.session.add(fine_record)

            # Update copy condition & status
            copy.condition = condition
            if condition in ['Damaged', 'Poor']:
                copy.status = "Damaged"
            else:
                copy.status = "Available"
                book.available_copies = min(book.total_copies, book.available_copies + 1)

            member.current_issued_count = max(0, member.current_issued_count - 1)

            # Check next in reservation queue
            if copy.status == "Available":
                next_res = LibraryReservation.query.filter_by(
                    book_id=book.id,
                    status="Pending"
                ).order_by(LibraryReservation.queue_position.asc()).first()
                if next_res:
                    next_res.status = "Ready for Pickup"
                    next_res.copy_id = copy.id
                    next_res.notified_at = datetime.now()
                    expiry_days = LibrarySettingsService.get_int('reservation_expiry_days', 3)
                    next_res.expiry_date = today + timedelta(days=expiry_days)
                    copy.status = "Reserved"
                    book.available_copies = max(0, book.available_copies - 1)

            db.session.commit()

            LibraryAuditService.log(
                "BOOK_RETURNED", "LibraryReturn", entity_id=ret.id,
                details=f"Returned '{book.title}' (Copy: {copy.accession_no}) by {member.member_code}. Late: {late_days}d, Fine: ₹{fine_amount}",
                user_id=receiver_user_id
            )

            receipt = {
                "return_id": ret.id,
                "issue_code": issue.issue_code,
                "book_title": book.title,
                "accession_no": copy.accession_no,
                "member_code": member.member_code,
                "member_name": member.student.name if member.student else (member.faculty.name if member.faculty else "Member"),
                "issue_date": issue.issue_date.strftime('%d-%b-%Y'),
                "due_date": issue.due_date.strftime('%d-%b-%Y'),
                "return_date": today.strftime('%d-%b-%Y'),
                "days_late": late_days,
                "fine_amount": fine_amount,
                "fine_status": ret.fine_status,
                "condition": condition
            }

            msg = f"Book '{book.title}' returned successfully."
            if fine_amount > 0:
                msg += f" Late: {late_days} days. Fine assessed: ₹{fine_amount:.2f} ({ret.fine_status})."
            return True, msg, receipt

        except Exception as e:
            db.session.rollback()
            return False, f"Return failed: {str(e)}", None

    @classmethod
    def renew_book(cls, issue_id, renewer_user_id=None, remarks=None):
        """Renew book if under renewal limit and not reserved by others"""
        try:
            issue = LibraryIssue.query.get(issue_id)
            if not issue:
                return False, "Issue record not found", None

            if issue.status not in ["Issued", "Overdue"]:
                return False, f"Cannot renew book with status '{issue.status}'", None

            max_renewals = issue.max_renewals or LibrarySettingsService.get_int('max_renewals', 2)
            if issue.renew_count >= max_renewals:
                return False, f"Maximum renewal limit of {max_renewals} has been reached for this issue.", None

            # Check if reserved by another member
            has_reservation = LibraryReservation.query.filter_by(
                book_id=issue.book_id,
                status="Pending"
            ).first()
            if has_reservation and has_reservation.member_id != issue.member_id:
                return False, "Cannot renew: This book has pending reservations from other members.", None

            member = issue.member
            loan_days = member.loan_period_days or 14
            old_due_date = issue.due_date
            today = date.today()
            # If renewed before due date, extend from due date; if overdue, extend from today
            base_date = max(today, old_due_date)
            new_due_date = base_date + timedelta(days=loan_days)

            renewal = LibraryRenewal(
                issue_id=issue.id,
                renewal_date=datetime.now(),
                old_due_date=old_due_date,
                new_due_date=new_due_date,
                renewal_number=issue.renew_count + 1,
                renewed_by=renewer_user_id,
                remarks=remarks
            )
            db.session.add(renewal)

            issue.renew_count += 1
            issue.due_date = new_due_date
            if issue.status == "Overdue":
                issue.status = "Issued"

            db.session.commit()

            LibraryAuditService.log(
                "BOOK_RENEWED", "LibraryRenewal", entity_id=renewal.id,
                details=f"Renewed '{issue.book.title}' for {member.member_code}. New Due Date: {new_due_date.isoformat()}",
                user_id=renewer_user_id
            )

            return True, f"Book renewed successfully. New Due Date: {new_due_date.strftime('%d-%b-%Y')}", {
                "issue_id": issue.id,
                "renewal_number": renewal.renewal_number,
                "old_due_date": old_due_date.strftime('%d-%b-%Y'),
                "new_due_date": new_due_date.strftime('%d-%b-%Y')
            }

        except Exception as e:
            db.session.rollback()
            return False, str(e), None

    @classmethod
    def reserve_book(cls, member_identifier, book_id, user_id=None, remarks=None):
        """Place reservation for unavailable book"""
        try:
            member = LibraryMemberService.get_member_by_code_or_roll(member_identifier)
            if not member:
                return False, "Member not found", None

            book = LibraryBook.query.get(book_id)
            if not book:
                return False, "Book not found", None

            # Check if member already has active reservation for this book
            existing = LibraryReservation.query.filter(
                LibraryReservation.book_id == book.id,
                LibraryReservation.member_id == member.id,
                LibraryReservation.status.in_(["Pending", "Ready for Pickup"])
            ).first()
            if existing:
                return False, f"You already have an active reservation (Queue #{existing.queue_position}) for this book.", None

            # Calculate queue position
            last_queue = db.session.query(func.max(LibraryReservation.queue_position)).filter(
                LibraryReservation.book_id == book.id,
                LibraryReservation.status == "Pending"
            ).scalar() or 0
            new_position = last_queue + 1

            res_code = f"RES-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

            reservation = LibraryReservation(
                reservation_code=res_code,
                member_id=member.id,
                book_id=book.id,
                reservation_date=datetime.now(),
                queue_position=new_position,
                status="Pending",
                remarks=remarks
            )
            db.session.add(reservation)
            db.session.commit()

            LibraryAuditService.log(
                "BOOK_RESERVED", "LibraryReservation", entity_id=reservation.id,
                details=f"Reserved '{book.title}' for {member.member_code} (Queue #{new_position})",
                user_id=user_id
            )

            return True, f"Reservation placed successfully. Your queue position is #{new_position}.", {
                "reservation_id": reservation.id,
                "reservation_code": reservation.reservation_code,
                "queue_position": new_position,
                "book_title": book.title
            }

        except Exception as e:
            db.session.rollback()
            return False, str(e), None

    @classmethod
    def cancel_reservation(cls, reservation_id, user_id=None, reason=None):
        try:
            res = LibraryReservation.query.get(reservation_id)
            if not res:
                return False, "Reservation not found"
            
            res.status = "Cancelled"
            res.remarks = (res.remarks or "") + f" [Cancelled: {reason or 'User requested'}]"

            # If copy was held for this reservation, free it up
            if res.copy_id:
                copy = LibraryBookCopy.query.get(res.copy_id)
                if copy and copy.status == "Reserved":
                    copy.status = "Available"
                    copy.book.available_copies = min(copy.book.total_copies, copy.book.available_copies + 1)
                    # Trigger next reservation
                    next_res = LibraryReservation.query.filter_by(
                        book_id=res.book_id,
                        status="Pending"
                    ).order_by(LibraryReservation.queue_position.asc()).first()
                    if next_res:
                        next_res.status = "Ready for Pickup"
                        next_res.copy_id = copy.id
                        next_res.notified_at = datetime.now()
                        copy.status = "Reserved"
                        copy.book.available_copies = max(0, copy.book.available_copies - 1)

            db.session.commit()
            LibraryAuditService.log("RESERVATION_CANCELLED", "LibraryReservation", entity_id=res.id, details=reason, user_id=user_id)
            return True, "Reservation cancelled successfully"
        except Exception as e:
            db.session.rollback()
            return False, str(e)

    @classmethod
    def waive_fine(cls, fine_id, waived_by_user_id, waiver_reason):
        try:
            if not waiver_reason or len(waiver_reason.strip()) < 3:
                return False, "A valid waiver reason is mandatory"

            fine = LibraryFine.query.get(fine_id)
            if not fine:
                return False, "Fine record not found"

            if fine.status == "Waived":
                return False, "Fine is already waived"

            waive_amt = fine.balance_amount
            fine.waived_amount = waive_amt
            fine.balance_amount = 0.0
            fine.status = "Waived"
            fine.waived_by = waived_by_user_id
            fine.waiver_reason = waiver_reason

            member = fine.member
            if member:
                member.outstanding_fine = max(0.0, member.outstanding_fine - waive_amt)

            db.session.commit()
            LibraryAuditService.log(
                "FINE_WAIVED", "LibraryFine", entity_id=fine.id,
                details=f"Waived ₹{waive_amt:.2f} for {member.member_code if member else 'Member'}. Reason: {waiver_reason}",
                user_id=waived_by_user_id
            )
            return True, f"Fine of ₹{waive_amt:.2f} waived successfully"
        except Exception as e:
            db.session.rollback()
            return False, str(e)


# ==================== 7. REPORTS & ANALYTICS ====================

class LibraryReportService:
    """Comprehensive Reports for Librarian & Administrator"""

    @staticmethod
    def get_dashboard_metrics():
        today = date.today()
        
        total_books = LibraryBook.query.count()
        total_copies = LibraryBookCopy.query.filter_by(is_active=True).count()
        available_copies = LibraryBookCopy.query.filter_by(status="Available", is_active=True).count()
        issued_copies = LibraryBookCopy.query.filter_by(status="Issued", is_active=True).count()
        reserved_copies = LibraryBookCopy.query.filter_by(status="Reserved", is_active=True).count()
        lost_copies = LibraryBookCopy.query.filter_by(status="Lost").count()
        damaged_copies = LibraryBookCopy.query.filter_by(status="Damaged").count()

        # Overdue issues
        overdue_issues = LibraryIssue.query.filter(
            LibraryIssue.status.in_(["Issued", "Overdue"]),
            LibraryIssue.due_date < today
        ).count()

        # Due Today
        due_today = LibraryIssue.query.filter(
            LibraryIssue.status == "Issued",
            LibraryIssue.due_date == today
        ).count()

        # Today's Activity
        issued_today = LibraryIssue.query.filter(LibraryIssue.issue_date == today).count()
        returned_today = LibraryReturn.query.filter(LibraryReturn.return_date == today).count()
        renewed_today = LibraryRenewal.query.filter(func.date(LibraryRenewal.renewal_date) == today).count()

        # Fines
        total_outstanding_fines = db.session.query(func.coalesce(func.sum(LibraryFine.balance_amount), 0.0)).filter(
            LibraryFine.status.in_(["Unpaid", "Partial"])
        ).scalar() or 0.0

        total_collected_fines = db.session.query(func.coalesce(func.sum(LibraryFine.paid_amount), 0.0)).scalar() or 0.0

        active_members = LibraryMember.query.filter_by(status="Active").count()
        active_reservations = LibraryReservation.query.filter(
            LibraryReservation.status.in_(["Pending", "Ready for Pickup"])
        ).count()

        return {
            "total_books": total_books,
            "total_copies": total_copies,
            "available_copies": available_copies,
            "issued_copies": issued_copies,
            "reserved_copies": reserved_copies,
            "lost_copies": lost_copies,
            "damaged_copies": damaged_copies,
            "overdue_issues": overdue_issues,
            "due_today": due_today,
            "issued_today": issued_today,
            "returned_today": returned_today,
            "renewed_today": renewed_today,
            "total_outstanding_fines": round(total_outstanding_fines, 2),
            "total_collected_fines": round(total_collected_fines, 2),
            "active_members": active_members,
            "active_reservations": active_reservations
        }

    @staticmethod
    def get_overdue_list():
        today = date.today()
        fine_rate = LibrarySettingsService.get_float('fine_per_day', 5.0)
        grace = LibrarySettingsService.get_int('grace_period_days', 2)
        max_fine = LibrarySettingsService.get_float('max_fine_per_book', 500.0)

        issues = LibraryIssue.query.filter(
            LibraryIssue.status.in_(["Issued", "Overdue"]),
            LibraryIssue.due_date < today
        ).order_by(LibraryIssue.due_date.asc()).all()

        res = []
        for iss in issues:
            late_days = (today - iss.due_date).days
            calc_fine = 0.0
            if late_days > grace:
                calc_fine = min(max_fine, (late_days - grace) * fine_rate)

            member_name = iss.member.student.name if iss.member.student else (iss.member.faculty.name if iss.member.faculty else "Member")
            res.append({
                "issue_id": iss.id,
                "issue_code": iss.issue_code,
                "book_id": iss.book_id,
                "book_title": iss.book.title,
                "accession_no": iss.accession_no,
                "member_code": iss.member.member_code,
                "member_name": member_name,
                "member_type": iss.member.member_type,
                "issue_date": iss.issue_date.strftime('%Y-%m-%d'),
                "due_date": iss.due_date.strftime('%Y-%m-%d'),
                "days_overdue": late_days,
                "current_fine": calc_fine
            })
        return res

    @staticmethod
    def get_my_library_summary(user_or_student):
        """Personal library dashboard for Student or Faculty"""
        today = date.today()
        member = None
        if isinstance(user_or_student, LibraryMember) or hasattr(user_or_student, 'member_code'):
            member = user_or_student
        elif hasattr(user_or_student, 'roll'):
            # Student model
            member = LibraryMember.query.filter_by(student_id=user_or_student.id).first()
        elif hasattr(user_or_student, 'student_roll') and user_or_student.student_roll:
            st = Student.query.filter_by(roll=user_or_student.student_roll).first()
            if st:
                member = LibraryMember.query.filter_by(student_id=st.id).first()
        elif hasattr(user_or_student, 'email'):
            fac = Faculty.query.filter_by(email=user_or_student.email).first()
            if fac:
                member = LibraryMember.query.filter_by(faculty_id=fac.id).first()

        if not member and user_or_student:
            if hasattr(user_or_student, 'roll'):
                member = LibraryMemberService.get_or_create_student_member(user_or_student)
            elif hasattr(user_or_student, 'student_roll') and user_or_student.student_roll:
                st = Student.query.filter_by(roll=user_or_student.student_roll).first()
                if st:
                    member = LibraryMemberService.get_or_create_student_member(st)

        if not member:
            return {
                "member": None,
                "issued_books": [],
                "issued_count": 0,
                "due_soon_count": 0,
                "overdue_count": 0,
                "outstanding_fine": 0.0,
                "reservations": [],
                "history": []
            }

        # Active issues
        active_issues = LibraryIssue.query.filter(
            LibraryIssue.member_id == member.id,
            LibraryIssue.status.in_(["Issued", "Overdue"])
        ).order_by(LibraryIssue.due_date.asc()).all()

        issued_books = []
        due_soon_count = 0
        overdue_count = 0

        for iss in active_issues:
            days_remaining = (iss.due_date - today).days
            is_overdue = days_remaining < 0
            is_due_soon = 0 <= days_remaining <= 2

            if is_overdue:
                overdue_count += 1
            elif is_due_soon:
                due_soon_count += 1

            issued_books.append({
                "issue_id": iss.id,
                "issue_code": iss.issue_code,
                "book_id": iss.book_id,
                "title": iss.book.title,
                "author": iss.book.author,
                "isbn": iss.book.isbn,
                "accession_no": iss.accession_no,
                "cover_image": iss.book.cover_image,
                "issue_date": iss.issue_date.strftime('%Y-%m-%d'),
                "due_date": iss.due_date.strftime('%Y-%m-%d'),
                "days_remaining": days_remaining,
                "is_overdue": is_overdue,
                "is_due_soon": is_due_soon,
                "renew_count": iss.renew_count,
                "max_renewals": iss.max_renewals,
                "shelf_location": iss.copy.shelf_location if iss.copy else f"{iss.book.shelf} / {iss.book.rack}"
            })

        # Reservations
        reservations = []
        res_list = LibraryReservation.query.filter(
            LibraryReservation.member_id == member.id,
            LibraryReservation.status.in_(["Pending", "Ready for Pickup"])
        ).order_by(LibraryReservation.reservation_date.desc()).all()

        for r in res_list:
            reservations.append({
                "reservation_id": r.id,
                "reservation_code": r.reservation_code,
                "book_id": r.book_id,
                "title": r.book.title,
                "author": r.book.author,
                "cover_image": r.book.cover_image,
                "queue_position": r.queue_position,
                "status": r.status,
                "expiry_date": r.expiry_date.strftime('%Y-%m-%d') if r.expiry_date else None,
                "reservation_date": r.reservation_date.strftime('%Y-%m-%d')
            })

        # History
        history = []
        hist_issues = LibraryIssue.query.filter_by(
            member_id=member.id,
            status="Returned"
        ).order_by(LibraryIssue.return_date.desc()).limit(20).all()

        for h in hist_issues:
            history.append({
                "issue_id": h.id,
                "title": h.book.title,
                "author": h.book.author,
                "accession_no": h.accession_no,
                "issue_date": h.issue_date.strftime('%Y-%m-%d'),
                "due_date": h.due_date.strftime('%Y-%m-%d'),
                "return_date": h.return_date.strftime('%Y-%m-%d') if h.return_date else "N/A",
                "fine_paid": h.fine_paid
            })

        return {
            "member": {
                "member_id": member.id,
                "member_code": member.member_code,
                "max_books": member.max_books,
                "loan_period_days": member.loan_period_days,
                "status": member.status
            },
            "issued_books": issued_books,
            "issued_count": len(issued_books),
            "due_soon_count": due_soon_count,
            "overdue_count": overdue_count,
            "outstanding_fine": round(member.outstanding_fine, 2),
            "reservations": reservations,
            "history": history
        }


# ==================== 8. SEED & INITIALIZATION ====================

def seed_initial_library_catalog():
    """Seed initial categories, sample books with physical copies, and default librarian account"""
    try:
        # 1. Categories
        default_categories = [
            ("Computer Science & Engineering", "CSE", "Core computer science, programming, networking, OS & algorithms"),
            ("Artificial Intelligence & Data Science", "AI_DS", "Machine learning, neural networks, computer vision, data analytics"),
            ("Mathematics & Basic Sciences", "MATH", "Engineering mathematics, physics, discrete structures"),
            ("Electronics & Communications", "ECE", "Digital systems, VLSI, embedded systems, microprocessors"),
            ("Management & Soft Skills", "MGMT", "Technical communication, project management, ethics")
        ]

        cat_map = {}
        for name, code, desc in default_categories:
            cat = LibraryCategory.query.filter_by(code=code).first()
            if not cat:
                cat = LibraryCategory(name=name, code=code, description=desc, is_active=True)
                db.session.add(cat)
                db.session.flush()
            cat_map[code] = cat.id

        # 2. Librarian User Account
        librarian_user = User.query.filter_by(username="librarian").first()
        if not librarian_user:
            librarian_user = User(
                username="librarian",
                fullname="SBITM Central Librarian",
                email="librarian@sbitm.edu.in",
                role="librarian",
                branch="CSE",
                email_verified=True,
                is_active=True
            )
            librarian_user.set_password("librarian123")
            db.session.add(librarian_user)
            print("[OK] Created default Librarian account (username: librarian / librarian123)")

        # 3. Sample Books Catalog
        sample_books = [
            {
                "book_code": "CS-0001",
                "isbn": "978-0132126953",
                "title": "Computer Networks",
                "subtitle": "Principles, Protocols and Architectures",
                "author": "Andrew S. Tanenbaum",
                "co_authors": "David J. Wetherall",
                "publisher": "Pearson Education",
                "publication_year": 2021,
                "edition": "5th Edition",
                "category_id": cat_map.get("CSE"),
                "department": "CSE",
                "course": "B.Tech",
                "semester": 6,
                "shelf": "Shelf A1",
                "rack": "Rack 1",
                "row_num": "Row 1",
                "location": "Central Library - 2nd Floor (Section CS)",
                "price": 850.0,
                "copies": 6
            },
            {
                "book_code": "CS-0002",
                "isbn": "978-1118063330",
                "title": "Operating System Concepts",
                "subtitle": "Processes, Memory, Storage & Security",
                "author": "Abraham Silberschatz",
                "co_authors": "Peter B. Galvin, Greg Gagne",
                "publisher": "Wiley",
                "publication_year": 2018,
                "edition": "10th Edition",
                "category_id": cat_map.get("CSE"),
                "department": "CSE",
                "course": "B.Tech",
                "semester": 4,
                "shelf": "Shelf A2",
                "rack": "Rack 1",
                "row_num": "Row 2",
                "location": "Central Library - 2nd Floor (Section CS)",
                "price": 920.0,
                "copies": 8
            },
            {
                "book_code": "CS-0003",
                "isbn": "978-0262033848",
                "title": "Introduction to Algorithms",
                "subtitle": "Design, Analysis and Complexity",
                "author": "Thomas H. Cormen",
                "co_authors": "Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
                "publisher": "MIT Press",
                "publication_year": 2022,
                "edition": "4th Edition",
                "category_id": cat_map.get("CSE"),
                "department": "CSE",
                "course": "B.Tech",
                "semester": 4,
                "shelf": "Shelf A3",
                "rack": "Rack 2",
                "row_num": "Row 1",
                "location": "Central Library - 2nd Floor (Section CS)",
                "price": 1200.0,
                "copies": 6
            },
            {
                "book_code": "AI-0001",
                "isbn": "978-0134610993",
                "title": "Artificial Intelligence: A Modern Approach",
                "subtitle": "Intelligent Agents & Problem Solving",
                "author": "Stuart Russell",
                "co_authors": "Peter Norvig",
                "publisher": "Pearson",
                "publication_year": 2020,
                "edition": "4th Edition",
                "category_id": cat_map.get("AI_DS"),
                "department": "AD",
                "course": "B.Tech",
                "semester": 5,
                "shelf": "Shelf B1",
                "rack": "Rack 3",
                "row_num": "Row 1",
                "location": "Central Library - 2nd Floor (Section AI/DS)",
                "price": 1100.0,
                "copies": 7
            },
            {
                "book_code": "CS-0004",
                "isbn": "978-0073523323",
                "title": "Database System Concepts",
                "subtitle": "Relational Models, SQL, Transactions & Indexing",
                "author": "Abraham Silberschatz",
                "co_authors": "Henry F. Korth, S. Sudarshan",
                "publisher": "McGraw-Hill",
                "publication_year": 2019,
                "edition": "7th Edition",
                "category_id": cat_map.get("CSE"),
                "department": "CSE",
                "course": "B.Tech",
                "semester": 5,
                "shelf": "Shelf A4",
                "rack": "Rack 2",
                "row_num": "Row 2",
                "location": "Central Library - 2nd Floor (Section CS)",
                "price": 890.0,
                "copies": 8
            },
            {
                "book_code": "MATH-0001",
                "isbn": "978-9352606450",
                "title": "Higher Engineering Mathematics",
                "subtitle": "Calculus, Differential Equations & Linear Algebra",
                "author": "B.S. Grewal",
                "publisher": "Khanna Publishers",
                "publication_year": 2021,
                "edition": "44th Edition",
                "category_id": cat_map.get("MATH"),
                "department": "ALL",
                "course": "B.Tech",
                "semester": 1,
                "shelf": "Shelf C1",
                "rack": "Rack 4",
                "row_num": "Row 1",
                "location": "Central Library - 1st Floor (Section Basic Sciences)",
                "price": 650.0,
                "copies": 10
            }
        ]

        for bdata in sample_books:
            existing = LibraryBook.query.filter_by(book_code=bdata["book_code"]).first()
            if not existing:
                copies_count = bdata.pop("copies", 5)
                LibraryCatalogService.add_book_with_copies(bdata, num_copies=copies_count, user_id=librarian_user.id if librarian_user else None)

        # 4. Sync Students & Faculty to Library Members
        LibraryMemberService.sync_all_members()

        db.session.commit()
        print("[OK] Library catalog, categories & members seeded successfully!")

    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] seed_initial_library_catalog failed: {e}")
