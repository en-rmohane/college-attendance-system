import unittest
from app import app, db
from models import User, Student
from library_service import LibraryRBAC, LibraryMemberService, LibraryCatalogService, LibraryCirculationService, LibraryReportService

class TestAccountantLibraryClearance(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        cls.client = app.test_client()

    def test_01_accountant_rbac_permissions(self):
        """Verify Accountant has all necessary permissions for student dues clearance, catalog and reports."""
        self.assertTrue(LibraryRBAC.has_permission('accountant', 'library.view'))
        self.assertTrue(LibraryRBAC.has_permission('accountant', 'library.overview.view'))
        self.assertTrue(LibraryRBAC.has_permission('accountant', 'library.book.view'))
        self.assertTrue(LibraryRBAC.has_permission('accountant', 'library.member.view'))
        self.assertTrue(LibraryRBAC.has_permission('accountant', 'library.fine.view'))
        self.assertTrue(LibraryRBAC.has_permission('accountant', 'library.report.view'))
        self.assertTrue(LibraryRBAC.has_permission('accountant', 'library.self.view'))

    def test_02_web_librarian_dashboard_accountant_access(self):
        """Verify accountant can access /librarian/dashboard on Web Portal."""
        with app.app_context():
            accountant = User.query.filter_by(role='accountant').first()
            if not accountant:
                accountant = User.query.filter_by(username='accountant').first()

            if accountant:
                with self.client.session_transaction() as sess:
                    sess['_user_id'] = str(accountant.id)
                    sess['_fresh'] = True

                res = self.client.get('/librarian/dashboard')
                self.assertEqual(res.status_code, 200)
                self.assertIn(b'Central Library & LMS Dashboard', res.data)

    def test_03_api_member_dossier_lookup_by_enrollment(self):
        """Verify API lookup for student library dossier by enrollment/roll number."""
        with app.app_context():
            res_mem = self.client.get('/api/library/members')
            self.assertEqual(res_mem.status_code, 200)
            mem_data = res_mem.get_json()
            self.assertTrue(mem_data.get('success'))
            members = mem_data.get('members', [])
            self.assertIsInstance(members, list)

            if len(members) > 0:
                first_mem = members[0]
                ident = first_mem.get('roll') or first_mem.get('member_code')
                if ident:
                    res = self.client.get(f'/api/library/members/{ident}')
                    self.assertEqual(res.status_code, 200)
                    data = res.get_json()
                    self.assertTrue(data.get('success'))
                    self.assertIn('member', data)
                    self.assertIn('issued_books', data)
                    self.assertIn('history', data)

    def test_04_api_book_catalog_search(self):
        """Verify API book search and filtering."""
        with app.app_context():
            res = self.client.get('/api/library/books')
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertTrue(data.get('success'))
            self.assertIn('books', data)

    def test_06_web_enrollment_search_dossier(self):
        """Verify Web Portal searching by Student Enrollment Roll No."""
        with app.app_context():
            accountant = User.query.filter_by(role='accountant').first() or User.query.filter_by(username='accountant').first()
            first_student = Student.query.first()
            roll = first_student.roll if first_student else '0545CS251001'

            if accountant:
                with self.client.session_transaction() as sess:
                    sess['_user_id'] = str(accountant.id)
                    sess['_fresh'] = True

                # Search with student roll
                res = self.client.get(f'/librarian/dashboard?roll={roll}')
                self.assertEqual(res.status_code, 200)
                self.assertIn(b'LIBRARY CLEARANCE', res.data)
                self.assertIn(roll.encode(), res.data)

    def test_07_ajax_student_dossier_endpoint(self):
        """Verify Web AJAX endpoint for instant student clearance dossier."""
        with app.app_context():
            accountant = User.query.filter_by(role='accountant').first() or User.query.filter_by(username='accountant').first()
            first_student = Student.query.first()
            roll = first_student.roll if first_student else '0545CS251001'

            if accountant:
                with self.client.session_transaction() as sess:
                    sess['_user_id'] = str(accountant.id)
                    sess['_fresh'] = True

                res = self.client.get(f'/librarian/ajax-student-dossier/{roll}')
                self.assertEqual(res.status_code, 200)
                data = res.get_json()
                self.assertTrue(data.get('success'))
                self.assertIn('member', data)
                self.assertIn('issued_books', data)
                self.assertIn('is_clear', data)

if __name__ == '__main__':
    unittest.main()
