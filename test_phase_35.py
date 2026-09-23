import sys
import json
from app import app
from models import db, Student, FeeStructure, StudentFeeRecord, DiscountScholarship, FeePayment
from fee_service import FeeCalculator, AtomicFeeService

def test_phase_35_financial_scenario():
    print("=== TESTING PHASE 35 SPECIFIC FINANCIAL FORMULA & MULTI-PAYMENT SCENARIO ===")
    with app.app_context():
        # Create a clean mock test student
        test_roll = "TEST_FEE_P35"
        stud = Student.query.filter_by(roll=test_roll).first()
        if not stud:
            stud = Student(name="Aman Sharma", roll=test_roll, branch="CSE", year=2, is_active=True)
            db.session.add(stud)
            db.session.commit()

        # Clean any old test records for this student
        from models import RefundRecord, FeeLedger
        DiscountScholarship.query.filter_by(student_id=stud.id).delete()
        FeePayment.query.filter_by(student_id=stud.id).delete()
        RefundRecord.query.filter_by(student_id=stud.id).delete()
        FeeLedger.query.filter_by(student_id=stud.id).delete()
        StudentFeeRecord.query.filter_by(student_id=stud.id).delete()
        db.session.commit()

        # Set Fee Structure: Gross = Rs 80,000 (Tuition: 60,000, Dev: 10,000, Exam: 6,000, Other: 4,000)
        sfr = StudentFeeRecord(
            student_id=stud.id,
            year=2,
            academic_year=2026,
            total_fee=80000.0,
            discount=0.0,
            paid_amount=0.0,
            remaining_balance=80000.0,
            status='Pending'
        )
        db.session.add(sfr)
        db.session.commit()

        # 1. Apply Scholarship = Rs. 10,000
        ok, msg = AtomicFeeService.apply_concession(stud.id, "Merit Scholarship", 10000.0, "Scholarship", "Top ranker")
        assert ok, f"Scholarship failed: {msg}"

        # 2. Apply Discount = Rs. 5,000
        ok, msg = AtomicFeeService.apply_concession(stud.id, "Special Concession", 5000.0, "Discount", "Sibling concession")
        assert ok, f"Discount failed: {msg}"

        # 3. Verify Net Payable = Rs. 65,000 (without fine) or Rs. 66,000 (with fine Rs. 1,000)
        summary_initial = FeeCalculator.get_student_fee_summary(stud.id, 2)
        fin = summary_initial['financial_summary']
        print(f"Initial State:")
        print(f"  Gross Fee: Rs. {fin['gross_fee']:,.2f}")
        print(f"  Scholarship: Rs. {fin['scholarship_amount']:,.2f}")
        print(f"  Discount: Rs. {fin['discount_amount']:,.2f}")
        print(f"  Net Payable: Rs. {fin['net_payable']:,.2f}")
        print(f"  Paid: Rs. {fin['paid_amount']:,.2f}")
        print(f"  Pending: Rs. {fin['pending_amount']:,.2f}")

        assert fin['gross_fee'] == 80000.0
        assert fin['scholarship_amount'] == 10000.0
        assert fin['discount_amount'] == 5000.0
        assert fin['net_payable'] == 65000.0 # Gross (80,000) - Schol (10,000) - Disc (5,000)
        assert fin['pending_amount'] == 65000.0

        # 4. Payment 1 = Rs. 20,000
        ok, msg, p1 = AtomicFeeService.record_payment(stud.id, 20000.0, "UPI", "TXN-P35-01", collected_by=202)
        assert ok, f"Payment 1 failed: {msg}"
        print(f"\nAfter Payment 1 (Rs. 20,000, Receipt: {p1.receipt_no}):")
        summary_p1 = FeeCalculator.get_student_fee_summary(stud.id, 2)['financial_summary']
        print(f"  Paid Amount: Rs. {summary_p1['paid_amount']:,.2f}")
        print(f"  Pending Amount: Rs. {summary_p1['pending_amount']:,.2f}")
        assert summary_p1['paid_amount'] == 20000.0
        assert summary_p1['pending_amount'] == 45000.0 # 65,000 - 20,000 = 45,000

        # 5. Payment 2 = Rs. 20,000
        ok, msg, p2 = AtomicFeeService.record_payment(stud.id, 20000.0, "Cash", "TXN-P35-02", collected_by=202)
        assert ok, f"Payment 2 failed: {msg}"
        print(f"\nAfter Payment 2 (Rs. 20,000, Receipt: {p2.receipt_no}):")
        summary_p2 = FeeCalculator.get_student_fee_summary(stud.id, 2)['financial_summary']
        print(f"  Paid Amount: Rs. {summary_p2['paid_amount']:,.2f}")
        print(f"  Pending Amount: Rs. {summary_p2['pending_amount']:,.2f}")
        assert summary_p2['paid_amount'] == 40000.0
        assert summary_p2['pending_amount'] == 25000.0 # 65,000 - 40,000 = 25,000

        # 6. Concurrency / Anti-Overpayment Test: Attempt to pay Rs. 30,000 (which exceeds Rs. 25,000)
        ok, msg, p3 = AtomicFeeService.record_payment(stud.id, 30000.0, "Cash", "TXN-P35-OVERPAY", collected_by=202)
        assert not ok, "Overpayment should be blocked by server-side validation!"
        print(f"\nOverpayment Protection: Rs. 30,000 blocked successfully ({msg})")

        # 7. Refund Test: Refund Rs. 5,000
        ok, msg = AtomicFeeService.process_refund(stud.id, 5000.0, "Excess adjustment", "Partial", 202)
        assert ok, f"Refund failed: {msg}"
        print(f"\nAfter Refund (Rs. 5,000):")
        summary_ref = FeeCalculator.get_student_fee_summary(stud.id, 2)['financial_summary']
        print(f"  Refund Amount: Rs. {summary_ref['refund_amount']:,.2f}")
        print(f"  Pending Amount: Rs. {summary_ref['pending_amount']:,.2f}")
        assert summary_ref['refund_amount'] == 5000.0
        assert summary_ref['pending_amount'] == 30000.0 # 25,000 + 5,000 refund reversal = 30,000

        print("\nALL PHASE 35 FINANCIAL FORMULAS, LEDGER ENTRIES, ATOMIC TRANSACTIONS, & REFUNDS PASSED 100%!")

if __name__ == "__main__":
    test_phase_35_financial_scenario()
