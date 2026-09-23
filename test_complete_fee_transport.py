import os
import sys
from datetime import datetime, date, timedelta

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Initialize Flask App Context
from app import app
from models import (
    db, User, Student, FeeSchedule, FeeInstallment, FeePayment, FeeLedger,
    StudentFeeRecord, BusRoute, BusStop, BusPass, TransportPayment, AuditLog
)
from fee_service import FeeScheduleService, FeeCalculator, AtomicFeeService, TransportFeeService

def run_tests():
    with app.app_context():
        print("=" * 70)
        print("RUNNING COMPREHENSIVE COLLEGE FEE & TRANSPORT SYSTEM VERIFICATION")
        print("=" * 70)

        # Ensure tables exist
        db.create_all()

        # 1. TEST FEE SCHEDULE & 4 INSTALLMENTS PER YEAR (1st, 2nd, 3rd, 4th Year)
        print("\n[TEST 1] Fee Schedule & 4 Installments for 1st, 2nd, 3rd, 4th Year Validation")
        for yr in [1, 2, 3, 4]:
            schedule, installments = FeeScheduleService.get_or_create_schedule("2026-27", student_year=yr, annual_fee=55000.0, late_fee_rate=25.0)
            assert schedule is not None, f"Schedule creation failed for Year {yr}"
            assert schedule.student_year == yr, f"Expected student_year {yr}"
            assert len(installments) == 4, f"Expected 4 installments for Year {yr}"
            inst_sum = sum(i.amount for i in installments)
            assert abs(inst_sum - 55000.0) < 0.01, f"Sum mismatch for Year {yr}: {inst_sum} != 55000"
            print(f"  Year {yr} Schedule initialized: Inst #1 Due: {installments[0].due_date}, Inst #2 Due: {installments[1].due_date}")

        # 2. TEST SUM VALIDATION ON ACCOUNTANT UPDATE
        print("\n[TEST 2] Sum Validation on Accountant Schedule Update")
        invalid_installments = [
            {"installment_no": 1, "amount": 10000},
            {"installment_no": 2, "amount": 10000},
            {"installment_no": 3, "amount": 10000},
            {"installment_no": 4, "amount": 10000}, # Sum = 40,000 != 55,000
        ]
        success, msg = FeeScheduleService.update_schedule("2026-27", student_year=1, annual_fee=55000.0, late_fee_rate=25.0, installments_data=invalid_installments)
        assert not success, "Update should fail when installments sum != annual fee"
        print(f"  Sum validation enforced correctly: {msg}")

        # Test valid update with custom dates
        valid_installments = [
            {"installment_no": 1, "amount": 13750, "due_date": "2026-07-20", "release_date": "2026-07-01", "title": "Term 1 Admission"},
            {"installment_no": 2, "amount": 13750, "due_date": "2026-09-20", "release_date": "2026-09-01", "title": "Term 2 Mid-Term"},
            {"installment_no": 3, "amount": 13750, "due_date": "2026-11-20", "release_date": "2026-11-01", "title": "Term 3 Pre-Final"},
            {"installment_no": 4, "amount": 13750, "due_date": "2027-01-20", "release_date": "2027-01-01", "title": "Term 4 Final Clearance"},
        ]
        success, msg = FeeScheduleService.update_schedule("2026-27", student_year=1, annual_fee=55000.0, late_fee_rate=25.0, installments_data=valid_installments)
        assert success, "Valid update failed"
        print(f"  Accountant edited Year 1 dates & titles successfully: {msg}")

        # 3. TEST INSTALLMENT RELEASE SYSTEM PER YEAR
        print("\n[TEST 3] Accountant Installment Release System per Student Year")
        success, msg = FeeScheduleService.release_installment("2026-27", installment_no=3, student_year=2, user_id=1)
        assert success, "Release failed"
        sched_yr2, _ = FeeScheduleService.get_or_create_schedule("2026-27", student_year=2)
        inst3_yr2 = FeeInstallment.query.filter_by(schedule_id=sched_yr2.id, installment_no=3).first()
        assert inst3_yr2.is_released == True, "Inst 3 for Year 2 should be released"
        assert inst3_yr2.status == "RELEASED", "Inst 3 status should be RELEASED"
        print(f"  Installment 3 for Year 2 released successfully. Status: {inst3_yr2.status}")

        # 4. TEST LATE FEE CALCULATION (₹25/day after due date)
        print("\n[TEST 4] Late Fee Calculation (₹25/day)")
        test_student = Student.query.filter_by(roll="0545CS231001").first()
        if not test_student:
            test_student = Student(roll="0545CS231001", name="Ravi Kumar", branch="CSE", year=2, is_active=True)
            db.session.add(test_student)
            db.session.commit()

        # Clear any prior test payments for clean test
        FeePayment.query.filter_by(student_id=test_student.id, academic_year_name="2026-27").delete()
        db.session.commit()

        # Set installment 2 due date in the past for testing late fee on student's year schedule
        sched_yr2, _ = FeeScheduleService.get_or_create_schedule("2026-27", student_year=test_student.year)
        inst2 = FeeInstallment.query.filter_by(schedule_id=sched_yr2.id, installment_no=2).first()
        past_due = date.today() - timedelta(days=5)
        inst2.due_date = past_due
        inst2.is_released = True
        inst2.late_fee_rate = 25.0
        db.session.commit()

        summary = FeeCalculator.get_student_fee_summary(test_student.id, "2026-27")
        inst2_summary = next(i for i in summary['installments'] if i['installment_no'] == 2)
        assert inst2_summary['late_days'] == 5, f"Expected 5 late days, got {inst2_summary['late_days']}"
        assert inst2_summary['late_fee'] == 125.0, f"Expected ₹125 late fee (5 * 25), got {inst2_summary['late_fee']}"
        assert inst2_summary['net_payable'] == inst2.amount + 125.0, f"Net payable mismatch"
        print(f"  5 Late Days @ ₹25/day => Late Fee: ₹{inst2_summary['late_fee']:.2f}, Net Payable: ₹{inst2_summary['net_payable']:.2f}")

        # 5. TEST ONLINE PAYMENT INITIATION & APPROVAL QUEUE
        print("\n[TEST 5] Online Fee Payment & Accountant Approval Workflow")
        # Clear any prior test payments for clean test
        FeePayment.query.filter_by(student_id=test_student.id, academic_year_name="2026-27").delete()
        db.session.commit()

        success, msg, payment = AtomicFeeService.initiate_online_fee_payment(
            student_id=test_student.id,
            installment_no=2,
            academic_year="2026-27",
            payment_mode="UPI",
            transaction_id="TXN-TEST-12345"
        )
        assert success, f"Online payment initiation failed: {msg}"
        assert payment.approval_status == "PENDING_APPROVAL", "Payment should be pending approval"
        assert payment.late_fee_paid == 125.0, "Late fee should be frozen at initiation"
        assert payment.amount_paid == inst2.amount + 125.0, "Amount paid should freeze net amount"
        print(f"  Online payment initiated: ID={payment.id}, Amount=₹{payment.amount_paid:.2f} (Late: ₹{payment.late_fee_paid:.2f}), Status={payment.approval_status}")

        # Verify Student Dashboard shows PAYMENT_PENDING_APPROVAL
        summary_after_pay = FeeCalculator.get_student_fee_summary(test_student.id, "2026-27")
        inst2_after = next(i for i in summary_after_pay['installments'] if i['installment_no'] == 2)
        assert inst2_after['status'] == "PAYMENT_PENDING_APPROVAL", f"Expected PAYMENT_PENDING_APPROVAL, got {inst2_after['status']}"
        print(f"  Student dashboard reflects: {inst2_after['status']}")

        # Accountant Approves Payment
        print("\n[TEST 6] Atomic Accountant Approval Transaction")
        success, msg, approved_p = AtomicFeeService.approve_fee_payment(payment.id, accountant_id=202)
        assert success, f"Approval failed: {msg}"
        assert approved_p.approval_status == "APPROVED", "Approval status should be APPROVED"
        assert approved_p.receipt_no.startswith("FEE/2026/"), f"Receipt number format mismatch: {approved_p.receipt_no}"
        assert approved_p.is_locked == True, "Approved payment receipt must be LOCKED"
        
        # Verify Ledger Entry
        ledger_entry = FeeLedger.query.filter_by(reference_no=approved_p.receipt_no).first()
        assert ledger_entry is not None, "Ledger credit entry missing"
        assert ledger_entry.credit == approved_p.amount_paid, "Ledger credit amount mismatch"
        print(f"  Payment APPROVED! Official Receipt: {approved_p.receipt_no}")
        print(f"  Ledger Credit Entry Created: Ref={ledger_entry.reference_no}, Credit=₹{ledger_entry.credit:,.2f}")

        # 7. TEST CASH PAYMENT COUNTER
        print("\n[TEST 7] Accountant Cash Collection Desk")
        success, msg, cash_payment = AtomicFeeService.record_cash_payment(
            student_id=test_student.id,
            installment_no=1,
            amount_paid=13750.0,
            collected_by=202,
            remarks="Cash collection at counter desk",
            academic_year="2026-27"
        )
        assert success, f"Cash collection failed: {msg}"
        assert cash_payment.approval_status == "APPROVED", "Cash payment should be approved immediately"
        assert cash_payment.receipt_no.startswith("FEE/2026/"), "Cash receipt format mismatch"
        assert cash_payment.is_locked == True, "Cash receipt must be locked"
        print(f"  Cash Receipt Generated: {cash_payment.receipt_no} (₹{cash_payment.amount_paid:,.2f})")

        # 8. TEST TRANSPORT ROUTES & FEES
        print("\n[TEST 8] Transport Routes Configuration")
        routes = TransportFeeService.get_or_seed_routes()
        assert len(routes) >= 3, "Expected at least 3 transport routes"
        betul = next(r for r in routes if "Betul" in r.route_name)
        multai = next(r for r in routes if "Multai" in r.route_name)
        pandhurna = next(r for r in routes if "Pandhurna" in r.route_name)
        
        assert betul.default_annual_fee == 15000.0, f"Betul fee should be ₹15,000, got {betul.default_annual_fee}"
        assert multai.default_annual_fee == 25000.0, f"Multai fee should be ₹25,000, got {multai.default_annual_fee}"
        assert pandhurna.default_annual_fee == 30000.0, f"Pandhurna fee should be ₹30,000, got {pandhurna.default_annual_fee}"
        print(f"  Betul Route: ₹{betul.default_annual_fee:,.2f}/yr")
        print(f"  Multai Route: ₹{multai.default_annual_fee:,.2f}/yr")
        print(f"  Pandhurna Route: ₹{pandhurna.default_annual_fee:,.2f}/yr")

        # 9. TEST TRANSPORT PAYMENT & BUS PASS WORKFLOW
        print("\n[TEST 9] Transport Payment & Active Bus Pass Generation Workflow")
        # Clean prior transport data for student
        TransportPayment.query.filter_by(student_id=test_student.id).delete()
        BusPass.query.filter_by(student_id=test_student.id).delete()
        db.session.commit()

        # Student pays Betul route
        success, msg, trans_pay = TransportFeeService.initiate_transport_payment(
            student_id=test_student.id,
            route_id=betul.id,
            payment_mode="UPI",
            transaction_id="TXN-BUS-ONLINE-999"
        )
        assert success, f"Transport payment initiation failed: {msg}"
        assert trans_pay.approval_status == "PENDING_APPROVAL", "Transport payment must be pending approval"
        
        # Verify Student DOES NOT have an active bus pass yet
        status_before_app = TransportFeeService.get_student_transport_status(test_student.id, "2026-27")
        assert status_before_app['status'] == "PAYMENT_VERIFICATION_PENDING", f"Expected PAYMENT_VERIFICATION_PENDING, got {status_before_app['status']}"
        print(f"  Transport payment initiated. Student status: {status_before_app['status']} (NO active pass issued yet)")

        # Accountant Approves Transport Payment
        print("\n[TEST 10] Accountant Approves Transport Payment -> Pass Activated")
        success, msg, bus_pass = TransportFeeService.approve_transport_payment(trans_pay.id, accountant_id=202)
        assert success, f"Transport approval failed: {msg}"
        assert bus_pass.status == "Active", "Bus Pass must be ACTIVE"
        assert bus_pass.pass_number.startswith("BP-2026-"), f"Pass number format mismatch: {bus_pass.pass_number}"
        assert bus_pass.qr_token.startswith("PASS-"), "QR token must be secure pass token"
        print(f"  Transport Approved! Active Digital Bus Pass: {bus_pass.pass_number}")
        print(f"  Secure QR Token: {bus_pass.qr_token}")

        # Verify Student Dashboard shows ACTIVE pass
        status_after_app = TransportFeeService.get_student_transport_status(test_student.id, "2026-27")
        assert status_after_app['status'] == "ACTIVE", f"Expected ACTIVE, got {status_after_app['status']}"
        assert status_after_app['bus_pass']['pass_number'] == bus_pass.pass_number
        print(f"  Student Dashboard reflects: ACTIVE Bus Pass {status_after_app['bus_pass']['pass_number']}")

        # 11. TEST QR CODE VERIFICATION
        print("\n[TEST 11] Public / Staff QR Pass Verification")
        verify_result = TransportFeeService.verify_bus_pass_qr(bus_pass.qr_token)
        assert verify_result['valid'] == True, "Verification failed"
        assert verify_result['status'] == "VALID — ACTIVE PASS", "Status mismatch"
        assert verify_result['student_name'] == test_student.name
        print(f"  QR Verification Output: {verify_result['status']} for {verify_result['student_name']} (Bus: {verify_result['bus_number']})")

        print("\n" + "=" * 70)
        print("ALL 11 PRODUCTION VERIFICATION TESTS PASSED SUCCESSFULLY (100%)")
        print("=" * 70)

if __name__ == '__main__':
    run_tests()
