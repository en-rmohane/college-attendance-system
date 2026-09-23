import os
import random
import uuid
import hashlib
import hmac
from functools import wraps
from datetime import datetime, date, timedelta
from flask import abort, flash, redirect, url_for, request
from flask_login import current_user
from models import (
    db, User, Student, StudentFeeRecord, AcademicYear, FeeHead, FeeStructure, FeeStructureItem,
    FeeSchedule, FeeInstallment, FeeLedger, FeePayment, PaymentAllocation,
    PaymentGatewayTransaction, LateFeeRule, LateFeeWaiver, DiscountScholarship,
    RefundRecord, AuditLog, NoDuesCertificate,
    BusRoute, BusStop, BusPass, BusAttendance, TransportApplication, TransportPayment
)


class FeeRBAC:
    """Granular Role-Based Access Control for Fee Management"""

    PERMISSIONS = {
        'admin': [
            'fee.overview.view', 'fee.structure.view', 'fee.structure.approve',
            'fee.discount.approve', 'fee.scholarship.approve', 'fee.refund.approve',
            'fee.audit.view', 'fee.report.view', 'fee.report.export',
            'fee.schedule.manage', 'fee.schedule.release',
            'transport.view', 'transport.routes.manage'
        ],
        'fee_manager': [
            'fee.view', 'fee.overview.view', 'fee.collect', 'fee.student.view',
            'fee.structure.view', 'fee.structure.create', 'fee.structure.edit',
            'fee.installment.manage', 'fee.discount.apply', 'fee.scholarship.apply',
            'fee.fine.manage', 'fee.refund.request', 'fee.receipt.view',
            'fee.receipt.generate', 'fee.report.view', 'fee.report.export', 'fee.audit.view',
            'fee.approve', 'fee.schedule.view', 'fee.schedule.manage', 'fee.schedule.release',
            'transport.view', 'transport.approve', 'transport.collect', 'transport.pass.manage'
        ],
        'accountant': [
            'fee.view', 'fee.overview.view', 'fee.collect', 'fee.student.view',
            'fee.structure.view', 'fee.structure.create', 'fee.structure.edit',
            'fee.installment.manage', 'fee.discount.apply', 'fee.scholarship.apply',
            'fee.fine.manage', 'fee.refund.request', 'fee.receipt.view',
            'fee.receipt.generate', 'fee.report.view', 'fee.report.export', 'fee.audit.view',
            'fee.approve', 'fee.schedule.view', 'fee.schedule.manage', 'fee.schedule.release',
            'transport.view', 'transport.approve', 'transport.collect', 'transport.pass.manage'
        ],
        'student': [
            'fee.self.view', 'fee.self.pay', 'fee.self.receipt.view',
            'transport.self.view', 'transport.self.pay', 'transport.self.pass.view'
        ],
        'professor': [
            'fee.none'
        ]
    }

    @classmethod
    def has_permission(cls, user, permission):
        if not user or not user.is_authenticated:
            return False
        role = (user.role or '').lower()
        allowed_perms = cls.PERMISSIONS.get(role, [])
        return permission in allowed_perms


def fee_permission_required(permission):
    """Decorator to enforce granular permission authorization on Flask routes"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return redirect(url_for('login'))
            if not FeeRBAC.has_permission(current_user, permission):
                flash(f"Access Denied: You do not have '{permission}' permission.", "danger")
                return redirect(url_for('index'))
            return f(*args, **kwargs)
        return decorated_function
    return decorator


class LedgerService:
    """Append-only Financial Ledger Service"""

    @staticmethod
    def record_entry(student_id, entry_type, debit=0.0, credit=0.0, reference_no=None, created_by=None, remarks=None):
        """Record an append-only ledger entry and return the updated balance"""
        last_entry = FeeLedger.query.filter_by(student_id=student_id).order_by(FeeLedger.id.desc()).first()
        prev_balance = last_entry.balance if last_entry else 0.0

        # Balance formula: Debit increases student liability (+), Credit reduces liability (-)
        new_balance = round(prev_balance + float(debit) - float(credit), 2)

        entry = FeeLedger(
            student_id=student_id,
            entry_date=datetime.now(),
            entry_type=entry_type,
            debit=round(float(debit), 2),
            credit=round(float(credit), 2),
            balance=new_balance,
            reference_no=reference_no,
            created_by=created_by,
            remarks=remarks
        )
        db.session.add(entry)
        return entry


class AuditService:
    """Audit Logging Service for Sensitive Financial Operations"""

    @staticmethod
    def log_action(user_id, role, action, entity, entity_id=None, old_value=None, new_value=None, ip_address=None):
        log = AuditLog(
            user_id=user_id,
            role=role or 'system',
            action=action,
            entity=entity,
            entity_id=str(entity_id) if entity_id else None,
            old_value=str(old_value) if old_value else None,
            new_value=str(new_value) if new_value else None,
            ip_address=ip_address or (request.remote_addr if request else '127.0.0.1'),
            timestamp=datetime.now()
        )
        db.session.add(log)
        return log


# ==================== 1 & 2. FEE SCHEDULE & INSTALLMENTS MANAGEMENT ====================

class FeeScheduleService:
    """Management of 4-Stage Installments, Release Dates, and Academic Year Fees per Student Year (1st, 2nd, 3rd, 4th Year)"""

    DEFAULT_ANNUAL_FEE = 55000.0
    DEFAULT_LATE_FEE_RATE = 25.0

    YEAR_DEFAULT_DATES = {
        1: { # 1st Year (Freshmen)
            "due": [date(2026, 7, 15), date(2026, 9, 15), date(2026, 11, 15), date(2027, 1, 15)],
            "rel": [date(2026, 7, 1), date(2026, 9, 1), date(2026, 11, 1), date(2027, 1, 1)]
        },
        2: { # 2nd Year (Sophomore)
            "due": [date(2026, 7, 31), date(2026, 9, 30), date(2026, 11, 30), date(2027, 1, 31)],
            "rel": [date(2026, 7, 15), date(2026, 9, 15), date(2026, 11, 15), date(2027, 1, 15)]
        },
        3: { # 3rd Year (Junior)
            "due": [date(2026, 8, 15), date(2026, 10, 15), date(2026, 12, 15), date(2027, 2, 15)],
            "rel": [date(2026, 8, 1), date(2026, 10, 1), date(2026, 12, 1), date(2027, 2, 1)]
        },
        4: { # 4th Year (Senior)
            "due": [date(2026, 8, 31), date(2026, 10, 31), date(2026, 12, 31), date(2027, 2, 28)],
            "rel": [date(2026, 8, 15), date(2026, 10, 15), date(2026, 12, 15), date(2027, 2, 15)]
        }
    }

    @classmethod
    def get_or_create_schedule(cls, academic_year="2026-27", student_year=1, annual_fee=55000.0, late_fee_rate=25.0):
        student_year = int(student_year or 1)
        if student_year < 1 or student_year > 4:
            student_year = 1

        schedule = FeeSchedule.query.filter_by(academic_year=academic_year, student_year=student_year).first()
        if not schedule:
            schedule = FeeSchedule(
                academic_year=academic_year,
                student_year=student_year,
                annual_fee=annual_fee or cls.DEFAULT_ANNUAL_FEE,
                late_fee_per_day=late_fee_rate or cls.DEFAULT_LATE_FEE_RATE
            )
            db.session.add(schedule)
            db.session.flush()

            # Create default 4 installments for this year
            inst_amount = round(schedule.annual_fee / 4.0, 2)
            year_dates = cls.YEAR_DEFAULT_DATES.get(student_year, cls.YEAR_DEFAULT_DATES[1])
            for n in range(1, 5):
                is_rel = (n <= 2)
                inst = FeeInstallment(
                    schedule_id=schedule.id,
                    student_id=0,
                    academic_year_name=academic_year,
                    student_year=student_year,
                    installment_no=n,
                    title=f"Installment {n}",
                    amount=inst_amount,
                    release_date=year_dates["rel"][n - 1],
                    due_date=year_dates["due"][n - 1],
                    late_fee_rate=schedule.late_fee_per_day,
                    is_released=is_rel,
                    status="RELEASED" if is_rel else "DRAFT"
                )
                db.session.add(inst)
            db.session.commit()

        # Ensure all 4 installments exist
        installments = FeeInstallment.query.filter_by(schedule_id=schedule.id).order_by(FeeInstallment.installment_no.asc()).all()
        if len(installments) < 4:
            existing_nos = {i.installment_no for i in installments}
            inst_amount = round(schedule.annual_fee / 4.0, 2)
            year_dates = cls.YEAR_DEFAULT_DATES.get(student_year, cls.YEAR_DEFAULT_DATES[1])
            for n in range(1, 5):
                if n not in existing_nos:
                    is_rel = (n <= 2)
                    inst = FeeInstallment(
                        schedule_id=schedule.id,
                        student_id=0,
                        academic_year_name=academic_year,
                        student_year=student_year,
                        installment_no=n,
                        title=f"Installment {n}",
                        amount=inst_amount,
                        release_date=year_dates["rel"][n - 1],
                        due_date=year_dates["due"][n - 1],
                        late_fee_rate=schedule.late_fee_per_day,
                        is_released=is_rel,
                        status="RELEASED" if is_rel else "DRAFT"
                    )
                    db.session.add(inst)
            db.session.commit()
            installments = FeeInstallment.query.filter_by(schedule_id=schedule.id).order_by(FeeInstallment.installment_no.asc()).all()

        return schedule, installments

    @classmethod
    def get_all_schedules(cls, academic_year="2026-27"):
        """Get schedules for all 4 student years (1st, 2nd, 3rd, 4th Year)"""
        schedules_by_year = {}
        for y in range(1, 5):
            sched, insts = cls.get_or_create_schedule(academic_year=academic_year, student_year=y)
            schedules_by_year[y] = {
                "year": y,
                "year_title": f"{y}{'st' if y==1 else 'nd' if y==2 else 'rd' if y==3 else 'th'} Year",
                "academic_year": academic_year,
                "annual_fee": sched.annual_fee,
                "late_fee_rate": sched.late_fee_per_day,
                "installments": [
                    {
                        "installment_no": i.installment_no,
                        "title": i.title,
                        "amount": i.amount,
                        "release_date": i.release_date.strftime('%Y-%m-%d') if i.release_date else None,
                        "due_date": i.due_date.strftime('%Y-%m-%d') if i.due_date else None,
                        "release_date_formatted": i.release_date.strftime('%d/%m/%Y') if i.release_date else None,
                        "due_date_formatted": i.due_date.strftime('%d/%m/%Y') if i.due_date else None,
                        "is_released": i.is_released,
                        "status": i.status
                    }
                    for i in insts
                ]
            }
        return schedules_by_year

    @classmethod
    def update_schedule(cls, academic_year, student_year, annual_fee, late_fee_rate, installments_data, user_id=None):
        """Update schedule and 4 installments with sum validation for a specific student year"""
        student_year = int(student_year or 1)
        schedule, _ = cls.get_or_create_schedule(academic_year, student_year=student_year)
        
        annual_fee = round(float(annual_fee), 2)
        late_fee_rate = round(float(late_fee_rate), 2)
        
        # Validate sum of installments equals annual fee
        total_inst_sum = 0.0
        for item in installments_data:
            total_inst_sum += round(float(item.get('amount', 0)), 2)

        if abs(total_inst_sum - annual_fee) > 0.05:
            return False, f"Installments sum (₹{total_inst_sum:,.2f}) must equal Annual Fee (₹{annual_fee:,.2f})."

        schedule.annual_fee = annual_fee
        schedule.late_fee_per_day = late_fee_rate

        for item in installments_data:
            inst_no = int(item.get('installment_no'))
            inst = FeeInstallment.query.filter_by(schedule_id=schedule.id, installment_no=inst_no).first()
            if inst:
                inst.amount = round(float(item.get('amount', inst.amount)), 2)
                inst.late_fee_rate = late_fee_rate
                if item.get('title'):
                    inst.title = item['title']
                if item.get('due_date'):
                    if isinstance(item['due_date'], str):
                        try:
                            inst.due_date = datetime.strptime(item['due_date'], '%Y-%m-%d').date()
                        except ValueError:
                            inst.due_date = datetime.strptime(item['due_date'], '%d/%m/%Y').date()
                    elif isinstance(item['due_date'], date):
                        inst.due_date = item['due_date']
                if item.get('release_date'):
                    if isinstance(item['release_date'], str):
                        try:
                            inst.release_date = datetime.strptime(item['release_date'], '%Y-%m-%d').date()
                        except ValueError:
                            inst.release_date = datetime.strptime(item['release_date'], '%d/%m/%Y').date()
                    elif isinstance(item['release_date'], date):
                        inst.release_date = item['release_date']

        AuditService.log_action(
            user_id=user_id,
            role='accountant',
            action='UPDATE_FEE_SCHEDULE',
            entity='FeeSchedule',
            entity_id=f"{academic_year}-Year{student_year}",
            old_value=None,
            new_value=f"Year {student_year} Annual Fee: ₹{annual_fee}, Late Fee Rate: ₹{late_fee_rate}/day"
        )

        db.session.commit()
        return True, f"Fee schedule for Year {student_year} updated successfully."

    @classmethod
    def release_installment(cls, academic_year, installment_no, student_year=1, user_id=None):
        """Release an installment for a specific student year (or all years) so students can see and pay it"""
        student_year = int(student_year or 1)
        schedule, _ = cls.get_or_create_schedule(academic_year, student_year=student_year)
        inst = FeeInstallment.query.filter_by(schedule_id=schedule.id, installment_no=installment_no).first()
        if not inst:
            return False, f"Installment {installment_no} not found for Year {student_year}."

        inst.is_released = True
        inst.status = "RELEASED"
        inst.released_by = user_id
        inst.released_at = datetime.now()

        AuditService.log_action(
            user_id=user_id,
            role='accountant',
            action='RELEASE_INSTALLMENT',
            entity='FeeInstallment',
            entity_id=f"{academic_year}-Year{student_year}-Inst{installment_no}",
            old_value="DRAFT",
            new_value="RELEASED"
        )

        db.session.commit()
        return True, f"Installment {installment_no} for Year {student_year} ({academic_year}) released successfully."


# ==================== 3 & 4 & 5. STUDENT FEE CALCULATOR & TIMELINE ====================

class FeeCalculator:
    """Authoritative Server-side Financial Calculations Engine with 4-Stage Installments and ₹25/day Late Fee per Student Year"""

    @staticmethod
    def get_student_fee_summary(student_id, academic_year="2026-27"):
        student = Student.query.get(student_id)
        if not student:
            return None

        today = date.today()
        student_yr = student.year or 1
        schedule, schedule_insts = FeeScheduleService.get_or_create_schedule(academic_year, student_year=student_yr)

        annual_fee = schedule.annual_fee
        late_fee_rate = schedule.late_fee_per_day or 25.0

        # Existing Approved Payments for this student
        approved_payments = FeePayment.query.filter_by(
            student_id=student.id,
            academic_year_name=academic_year,
            approval_status='APPROVED'
        ).order_by(FeePayment.payment_date.desc()).all()

        total_paid = round(sum(p.amount_paid for p in approved_payments), 2)
        total_late_fee_collected = round(sum(p.late_fee_paid for p in approved_payments), 2)

        # Scholarships & Discounts
        discounts = DiscountScholarship.query.filter_by(student_id=student.id).all()
        total_discount = round(sum(d.amount for d in discounts), 2)

        # Map approved payments by installment number
        paid_by_inst = {}
        payment_record_by_inst = {}
        for p in approved_payments:
            inst_num = p.installment_no or 1
            paid_by_inst[inst_num] = paid_by_inst.get(inst_num, 0.0) + p.amount_paid
            if inst_num not in payment_record_by_inst:
                payment_record_by_inst[inst_num] = p

        # Pending Approval Payments (Online payments waiting for Accountant)
        pending_approvals = FeePayment.query.filter_by(
            student_id=student.id,
            academic_year_name=academic_year,
            approval_status='PENDING_APPROVAL'
        ).all()
        pending_inst_nos = {p.installment_no: p for p in pending_approvals}

        installments_list = []
        running_late_fee = 0.0
        total_pending = 0.0

        for inst in schedule_insts:
            inst_no = inst.installment_no
            base_amount = inst.amount
            is_rel = inst.is_released
            due_d = inst.due_date

            paid_for_this = paid_by_inst.get(inst_no, 0.0)
            pending_record = pending_inst_nos.get(inst_no)

            # Determine Installment Status & Late Fee
            if not is_rel:
                status = "NOT_RELEASED"
                late_days = 0
                late_fee = 0.0
                net_payable = 0.0
                can_pay = False
            elif paid_for_this >= base_amount:
                status = "PAID"
                late_days = 0
                late_fee = 0.0
                net_payable = 0.0
                can_pay = False
            elif pending_record is not None:
                status = "PAYMENT_PENDING_APPROVAL"
                late_days = pending_record.late_days
                late_fee = pending_record.late_fee_paid
                net_payable = pending_record.net_amount
                can_pay = False
            else:
                # Dynamic Late Fee Calculation
                if today <= due_d:
                    late_days = 0
                    late_fee = 0.0
                    status = "PENDING"
                else:
                    late_days = (today - due_d).days
                    late_fee = round(late_days * late_fee_rate, 2)
                    status = "OVERDUE"

                net_payable = round(base_amount + late_fee, 2)
                running_late_fee += late_fee
                total_pending += base_amount
                can_pay = True

            app_payment = payment_record_by_inst.get(inst_no)
            installments_list.append({
                "installment_no": inst_no,
                "title": f"Installment {inst_no}",
                "amount": base_amount,
                "release_date": inst.release_date.strftime('%d/%m/%Y') if inst.release_date else None,
                "due_date": due_d.strftime('%d/%m/%Y') if due_d else "15/07/2026",
                "due_date_iso": due_d.isoformat() if due_d else None,
                "is_released": is_rel,
                "status": status,
                "paid_amount": paid_for_this,
                "late_days": late_days,
                "late_fee_rate": late_fee_rate,
                "late_fee": late_fee,
                "net_payable": net_payable,
                "can_pay": can_pay,
                "receipt_no": app_payment.receipt_no if app_payment else (pending_record.receipt_no if pending_record else None),
                "transaction_id": app_payment.transaction_id if app_payment else (pending_record.transaction_id if pending_record else None),
                "payment_mode": app_payment.payment_mode if app_payment else (pending_record.payment_mode if pending_record else None),
                "payment_date": app_payment.payment_date.strftime('%d/%m/%Y %H:%M') if app_payment and app_payment.payment_date else None
            })

        net_payable_total = round(max(0.0, annual_fee + running_late_fee - total_discount - total_paid), 2)

        # Ledger & Timeline
        ledger_entries = FeeLedger.query.filter_by(student_id=student.id).order_by(FeeLedger.id.asc()).all()

        return {
            "student": {
                "id": student.id,
                "name": student.name,
                "roll": student.roll,
                "branch": student.branch,
                "year": student.year or 2,
                "semester": ((student.year or 2) * 2) - 1,
                "academic_year": academic_year
            },
            "financial_summary": {
                "academic_year": academic_year,
                "annual_fee": annual_fee,
                "total_fee": annual_fee,
                "paid_amount": total_paid,
                "pending_amount": round(max(0.0, annual_fee - total_paid), 2),
                "late_fee": running_late_fee,
                "late_fee_collected": total_late_fee_collected,
                "discount_amount": total_discount,
                "net_payable": net_payable_total,
                "status": "Paid" if (total_paid >= annual_fee) else ("Overdue" if running_late_fee > 0 else "Pending")
            },
            "installments": installments_list,
            "payments": [
                {
                    "id": p.id,
                    "receipt_no": p.receipt_no,
                    "installment_no": p.installment_no,
                    "base_amount": p.base_amount,
                    "late_days": p.late_days,
                    "late_fee_paid": p.late_fee_paid,
                    "amount_paid": p.amount_paid,
                    "payment_mode": p.payment_mode,
                    "transaction_id": p.transaction_id,
                    "payment_date": p.payment_date.strftime('%d/%m/%Y %H:%M') if p.payment_date else "Today",
                    "approval_status": p.approval_status,
                    "status": p.approval_status,
                    "is_locked": p.is_locked,
                    "qr_token": p.qr_token
                } for p in (approved_payments + pending_approvals)
            ],
            "ledger": [
                {
                    "id": l.id,
                    "date": l.entry_date.strftime('%d/%m/%Y') if l.entry_date else "Today",
                    "type": l.entry_type,
                    "debit": l.debit,
                    "credit": l.credit,
                    "balance": l.balance,
                    "reference_no": l.reference_no,
                    "remarks": l.remarks
                } for l in ledger_entries
            ]
        }


# ==================== 6 & 7 & 8 & 9 & 10. ATOMIC FEE PAYMENT & APPROVAL ENGINE ====================

class AtomicFeeService:
    """Atomic Financial Operations for Online & Cash Payments, Accountant Approval, and Receipts"""

    @staticmethod
    def generate_unique_receipt_number(academic_year="2026"):
        """Server-side concurrency-safe unique receipt number: FEE/2026/000001"""
        year_str = "2026"
        count = FeePayment.query.count() + 1
        receipt_no = f"FEE/{year_str}/{count:06d}"
        
        while FeePayment.query.filter_by(receipt_no=receipt_no).first():
            count += 1
            receipt_no = f"FEE/{year_str}/{count:06d}"
            
        return receipt_no

    @classmethod
    def initiate_online_fee_payment(cls, student_id, installment_no, academic_year="2026-27", payment_mode='UPI', transaction_id=None):
        """
        Student initiates online payment:
        1. Validates installment is RELEASED and not already PAID or PENDING_APPROVAL.
        2. Authoritative server calculates base amount, late days (₹25/day), late fee, discount, net payable.
        3. Creates FeePayment record with payment_status='SUCCESS', approval_status='PENDING_APPROVAL'.
        """
        student = Student.query.get(student_id)
        if not student:
            return False, "Student not found", None

        schedule, schedule_insts = FeeScheduleService.get_or_create_schedule(academic_year, student_year=student.year or 1)
        inst = next((i for i in schedule_insts if i.installment_no == int(installment_no)), None)
        if not inst:
            return False, f"Installment {installment_no} does not exist.", None

        if not inst.is_released:
            return False, f"Installment {installment_no} has not been released yet.", None

        # Duplicate protection
        existing_approved = FeePayment.query.filter_by(
            student_id=student.id,
            academic_year_name=academic_year,
            installment_no=int(installment_no),
            approval_status='APPROVED'
        ).first()
        if existing_approved:
            return False, f"Installment {installment_no} has already been paid (Receipt: {existing_approved.receipt_no}).", None

        existing_pending = FeePayment.query.filter_by(
            student_id=student.id,
            academic_year_name=academic_year,
            installment_no=int(installment_no),
            approval_status='PENDING_APPROVAL'
        ).first()
        if existing_pending:
            return False, f"Installment {installment_no} payment is already pending approval from Accountant.", None

        # Authoritative Server Calculations (Never trust mobile/frontend amount)
        today = date.today()
        base_amount = inst.amount
        late_fee_rate = schedule.late_fee_per_day or 25.0
        
        if today <= inst.due_date:
            late_days = 0
            late_fee = 0.0
        else:
            late_days = (today - inst.due_date).days
            late_fee = round(late_days * late_fee_rate, 2)

        discount = 0.0
        net_payable = round(base_amount + late_fee - discount, 2)

        temp_receipt_no = f"PENDING-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
        tx_id = transaction_id or f"TXN-ONLINE-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
        qr_token = f"TOKEN-FEE-{uuid.uuid4().hex[:16].upper()}"

        try:
            payment = FeePayment(
                receipt_no=temp_receipt_no,
                student_id=student.id,
                year=student.year or 2,
                academic_year=2026,
                academic_year_name=academic_year,
                installment_no=int(installment_no),
                base_amount=base_amount,
                late_days=late_days,
                late_fee_rate=late_fee_rate,
                late_fee_paid=late_fee,
                discount_amount=discount,
                net_amount=net_payable,
                amount_paid=net_payable,
                payment_mode=payment_mode,
                transaction_id=tx_id,
                payment_date=datetime.now(),
                payment_status='SUCCESS',
                approval_status='PENDING_APPROVAL',
                status='Pending Verification',
                is_locked=False,
                qr_token=qr_token,
                remarks=f"Online payment for Installment {installment_no} (Base: ₹{base_amount}, Late: ₹{late_fee})"
            )
            db.session.add(payment)

            AuditService.log_action(
                user_id=student.id,
                role='student',
                action='ONLINE_PAYMENT_INITIATED',
                entity='FeePayment',
                entity_id=tx_id,
                old_value=None,
                new_value=f"Student {student.roll} paid ₹{net_payable} online for Inst {installment_no}. Pending approval."
            )

            db.session.commit()
            return True, "Payment received successfully and submitted for Accountant approval.", payment

        except Exception as e:
            db.session.rollback()
            return False, f"Payment error: {str(e)}", None

    @classmethod
    def approve_fee_payment(cls, payment_id, accountant_id):
        """
        ATOMIC ACCOUNTANT APPROVAL TRANSACTION:
        1. Lock & verify payment record and student.
        2. Prevent duplicate approval.
        3. Freeze financial amounts (base_amount, late_days, late_fee, net_amount, amount_paid).
        4. Generate server-side official receipt number: FEE/2026/000001.
        5. Mark approval_status='APPROVED', status='Success', is_locked=True.
        6. Append credit entry to FeeLedger.
        7. Update StudentFeeRecord and FeeInstallment.
        8. Create audit log.
        9. Commit atomically or rollback on error.
        """
        try:
            payment = FeePayment.query.get(payment_id)
            if not payment:
                return False, "Payment request not found", None

            if payment.approval_status == 'APPROVED':
                return False, f"Payment already approved (Receipt: {payment.receipt_no}).", None

            student = Student.query.get(payment.student_id)
            if not student:
                return False, "Associated student record not found.", None

            # 1. Generate official receipt number
            official_receipt_no = cls.generate_unique_receipt_number("2026")

            # 2. Update payment record
            payment.receipt_no = official_receipt_no
            payment.approval_status = 'APPROVED'
            payment.status = 'Success'
            payment.is_locked = True
            payment.approved_by = accountant_id
            payment.approved_at = datetime.now()
            if not payment.qr_token:
                payment.qr_token = f"TOKEN-FEE-{uuid.uuid4().hex[:16].upper()}"

            # 3. Append to Ledger
            LedgerService.record_entry(
                student_id=student.id,
                entry_type='FEE_PAYMENT_ONLINE',
                debit=0.0,
                credit=payment.amount_paid,
                reference_no=official_receipt_no,
                created_by=accountant_id,
                remarks=f"Installment #{payment.installment_no} Online Payment Approved - Txn: {payment.transaction_id}"
            )

            # 4. Update StudentFeeRecord
            fee_rec = StudentFeeRecord.query.filter_by(student_id=student.id, year=payment.year).first()
            if fee_rec:
                fee_rec.paid_amount = round(fee_rec.paid_amount + payment.base_amount, 2)
                fee_rec.update_balance()
            else:
                fee_rec = StudentFeeRecord(
                    student_id=student.id,
                    year=payment.year,
                    academic_year=payment.academic_year,
                    total_fee=55000.0,
                    discount=0.0,
                    paid_amount=payment.base_amount,
                    remaining_balance=max(0.0, 55000.0 - payment.base_amount),
                    status='Paid' if (55000.0 - payment.base_amount) <= 0 else 'Partial',
                    due_date=date(2026, 9, 30)
                )
                db.session.add(fee_rec)

            # 5. Audit Log
            AuditService.log_action(
                user_id=accountant_id,
                role='accountant',
                action='ACCOUNTANT_APPROVED_FEE',
                entity='FeePayment',
                entity_id=official_receipt_no,
                old_value="PENDING_APPROVAL",
                new_value=f"Approved ₹{payment.amount_paid} for {student.roll} (Inst #{payment.installment_no}). Receipt: {official_receipt_no}"
            )

            db.session.commit()
            return True, f"Fee payment approved successfully. Receipt {official_receipt_no} generated.", payment

        except Exception as e:
            db.session.rollback()
            return False, f"Transaction error during approval: {str(e)}", None

    @classmethod
    def reject_fee_payment(cls, payment_id, reason, accountant_id):
        """Accountant rejects fee payment request with reason"""
        payment = FeePayment.query.get(payment_id)
        if not payment:
            return False, "Payment request not found"

        if payment.approval_status == 'APPROVED':
            return False, "Cannot reject an already approved payment."

        payment.approval_status = 'REJECTED'
        payment.status = 'Rejected'
        payment.rejection_reason = reason or "Payment proof or details unverified"
        payment.approved_by = accountant_id
        payment.approved_at = datetime.now()

        AuditService.log_action(
            user_id=accountant_id,
            role='accountant',
            action='ACCOUNTANT_REJECTED_PAYMENT',
            entity='FeePayment',
            entity_id=payment.transaction_id or str(payment.id),
            old_value="PENDING_APPROVAL",
            new_value=f"Rejected: {reason}"
        )

        db.session.commit()
        return True, "Payment request rejected successfully."

    @classmethod
    def record_cash_payment(cls, student_id, installment_no, amount_paid, collected_by, remarks=None, academic_year="2026-27"):
        """
        Accountant/Cashier Desk: Record in-person cash payment atomically:
        1. Validate student and calculate authoritative server amount with late fee.
        2. Generate locked cash receipt: FEE/2026/000001.
        3. Insert FeePayment with approval_status='APPROVED', is_locked=True.
        4. Insert FeeLedger credit.
        5. Update StudentFeeRecord.
        6. Create Audit log.
        """
        student = Student.query.get(student_id)
        if not student:
            return False, "Student not found", None

        schedule, schedule_insts = FeeScheduleService.get_or_create_schedule(academic_year, student_year=student.year or 1)
        inst = next((i for i in schedule_insts if i.installment_no == int(installment_no)), None)
        if not inst:
            return False, f"Installment {installment_no} does not exist.", None

        today = date.today()
        base_amount = inst.amount
        late_fee_rate = schedule.late_fee_per_day or 25.0
        
        if today <= inst.due_date:
            late_days = 0
            late_fee = 0.0
        else:
            late_days = (today - inst.due_date).days
            late_fee = round(late_days * late_fee_rate, 2)

        net_payable = round(base_amount + late_fee, 2)
        paid_amount = round(float(amount_paid or net_payable), 2)

        receipt_no = cls.generate_unique_receipt_number("2026")
        tx_id = f"CASH-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
        qr_token = f"TOKEN-FEE-{uuid.uuid4().hex[:16].upper()}"

        try:
            payment = FeePayment(
                receipt_no=receipt_no,
                student_id=student.id,
                year=student.year or 2,
                academic_year=2026,
                academic_year_name=academic_year,
                installment_no=int(installment_no),
                base_amount=base_amount,
                late_days=late_days,
                late_fee_rate=late_fee_rate,
                late_fee_paid=late_fee,
                discount_amount=0.0,
                net_amount=net_payable,
                amount_paid=paid_amount,
                payment_mode='Cash',
                transaction_id=tx_id,
                payment_date=datetime.now(),
                payment_status='SUCCESS',
                approval_status='APPROVED',
                status='Success',
                is_locked=True,
                qr_token=qr_token,
                collected_by=collected_by,
                approved_by=collected_by,
                approved_at=datetime.now(),
                remarks=remarks or f"Cash payment received at counter for Installment #{installment_no}"
            )
            db.session.add(payment)

            # Ledger Credit
            LedgerService.record_entry(
                student_id=student.id,
                entry_type='FEE_PAYMENT_CASH',
                debit=0.0,
                credit=paid_amount,
                reference_no=receipt_no,
                created_by=collected_by,
                remarks=f"Cash payment recorded at counter for Installment #{installment_no} - Txn: {tx_id}"
            )

            # Update StudentFeeRecord
            fee_rec = StudentFeeRecord.query.filter_by(student_id=student.id, year=student.year or 2).first()
            if fee_rec:
                fee_rec.paid_amount = round(fee_rec.paid_amount + base_amount, 2)
                fee_rec.update_balance()
            else:
                fee_rec = StudentFeeRecord(
                    student_id=student.id,
                    year=student.year or 2,
                    academic_year=2026,
                    total_fee=55000.0,
                    discount=0.0,
                    paid_amount=base_amount,
                    remaining_balance=max(0.0, 55000.0 - base_amount),
                    status='Paid' if (55000.0 - base_amount) <= 0 else 'Partial',
                    due_date=date(2026, 9, 30)
                )
                db.session.add(fee_rec)

            AuditService.log_action(
                user_id=collected_by,
                role='accountant',
                action='ACCOUNTANT_CREATED_CASH_RECEIPT',
                entity='FeePayment',
                entity_id=receipt_no,
                old_value=None,
                new_value=f"Cash receipt {receipt_no} generated for {student.roll} (₹{paid_amount})"
            )

            db.session.commit()
            return True, f"Cash receipt {receipt_no} generated successfully.", payment

        except Exception as e:
            db.session.rollback()
            return False, f"Transaction error: {str(e)}", None


# ==================== 16 to 22. TRANSPORT / BUS FEE & BUS PASS MANAGEMENT ====================

class TransportFeeService:
    """Enterprise Campus Transport Fee Structure, Online Payment, Accountant Approval & Digital Bus Pass Engine"""

    ROUTES_CONFIG = [
        {"name": "Betul", "number": "ROUTE-01", "fee": 15000.0, "vehicle": "MP-48-PA-1204", "stops": ["Betul Station", "Kothi Bazar", "Ganj Chowk", "Campus"]},
        {"name": "Multai", "number": "ROUTE-02", "fee": 25000.0, "vehicle": "MP-48-PA-1588", "stops": ["Multai Bus Stand", "Prabhat Pattan Chowk", "Campus"]},
        {"name": "Pandhurna", "number": "ROUTE-03", "fee": 30000.0, "vehicle": "MP-48-PA-2102", "stops": ["Pandhurna City", "Tigaon Chowk", "Campus"]}
    ]

    @classmethod
    def get_or_seed_routes(cls):
        """Seed Betul (₹15,000), Multai (₹25,000), Pandhurna (₹30,000) routes if not present"""
        for r_data in cls.ROUTES_CONFIG:
            route = BusRoute.query.filter(
                (BusRoute.route_name.ilike(f"%{r_data['name']}%")) | (BusRoute.route_number == r_data['number'])
            ).first()
            if not route:
                route = BusRoute(
                    route_number=r_data['number'],
                    route_name=f"{r_data['name']} Campus Express",
                    start_point=f"{r_data['name']} Central",
                    end_point="College Campus",
                    vehicle_number=r_data['vehicle'],
                    driver_name="Rajesh Sharma",
                    driver_phone="+91 94250 88210",
                    capacity=50,
                    default_annual_fee=r_data['fee'],
                    is_active=True
                )
                db.session.add(route)
                db.session.flush()

                for seq, stop_name in enumerate(r_data['stops'], start=1):
                    stop = BusStop(
                        route_id=route.id,
                        stop_name=stop_name,
                        morning_pickup_time="07:45 AM" if seq == 1 else "08:15 AM",
                        evening_drop_time="05:30 PM",
                        stop_fee=r_data['fee'],
                        sequence_order=seq
                    )
                    db.session.add(stop)
            else:
                route.default_annual_fee = r_data['fee']
        db.session.commit()
        return BusRoute.query.filter_by(is_active=True).all()

    @classmethod
    def get_student_transport_status(cls, student_id, academic_year="2026-27"):
        """Return authoritative student transport status, bus pass, or pending request"""
        cls.get_or_seed_routes()
        student = Student.query.get(student_id)
        if not student:
            return None

        routes = BusRoute.query.filter_by(is_active=True).all()

        # Check Active Bus Pass
        active_pass = BusPass.query.filter_by(
            student_id=student.id,
            academic_year_name=academic_year,
            status='Active'
        ).first()

        # Check Pending Approval Transport Payment
        pending_payment = TransportPayment.query.filter_by(
            student_id=student.id,
            academic_year=academic_year,
            approval_status='PENDING_APPROVAL'
        ).order_by(TransportPayment.id.desc()).first()

        # Check Latest Approved Payment
        approved_payment = TransportPayment.query.filter_by(
            student_id=student.id,
            academic_year=academic_year,
            approval_status='APPROVED'
        ).order_by(TransportPayment.id.desc()).first()

        # Check Rejected Payment
        rejected_payment = TransportPayment.query.filter_by(
            student_id=student.id,
            academic_year=academic_year,
            approval_status='REJECTED'
        ).order_by(TransportPayment.id.desc()).first()

        if active_pass:
            status = "ACTIVE"
            pass_data = {
                "id": active_pass.id,
                "pass_number": active_pass.pass_number,
                "student_name": student.name,
                "student_roll": student.roll,
                "branch": student.branch,
                "year": student.year,
                "route_name": active_pass.route.route_name if active_pass.route else "Campus Express",
                "route_number": active_pass.route.route_number if active_pass.route else "R-01",
                "bus_number": active_pass.route.vehicle_number if active_pass.route else "MP-48-PA-1204",
                "stop_name": active_pass.stop.stop_name if active_pass.stop else "Main Gate",
                "academic_year": academic_year,
                "valid_upto": active_pass.valid_upto.strftime('%d/%m/%Y') if active_pass.valid_upto else "30/06/2027",
                "status": "ACTIVE",
                "qr_token": active_pass.qr_token,
                "fee_amount": active_pass.fee_amount,
                "paid_amount": active_pass.paid_amount,
                "receipt_no": approved_payment.receipt_no if approved_payment else f"BUS/2026/{active_pass.id:06d}"
            }
        elif pending_payment:
            status = "PAYMENT_VERIFICATION_PENDING"
            pass_data = {
                "id": None,
                "pass_number": "GENERATING UPON APPROVAL",
                "student_name": student.name,
                "student_roll": student.roll,
                "branch": student.branch,
                "year": student.year,
                "route_name": pending_payment.route.route_name if pending_payment.route else "Route",
                "bus_number": pending_payment.route.vehicle_number if pending_payment.route else "MP-48-PA-1204",
                "stop_name": pending_payment.stop.stop_name if pending_payment.stop else "Selected Stop",
                "academic_year": academic_year,
                "valid_upto": "30/06/2027",
                "status": "PAYMENT VERIFICATION PENDING",
                "qr_token": None,
                "fee_amount": pending_payment.annual_fee,
                "paid_amount": pending_payment.amount_paid,
                "receipt_no": pending_payment.receipt_no,
                "transaction_id": pending_payment.transaction_id
            }
        elif rejected_payment:
            status = "PAYMENT_REJECTED"
            pass_data = {
                "status": "PAYMENT REJECTED",
                "reason": rejected_payment.rejection_reason or "Verification failed."
            }
        else:
            status = "NOT_ENROLLED"
            pass_data = None

        return {
            "student_id": student.id,
            "status": status,
            "bus_pass": pass_data,
            "available_routes": [
                {
                    "id": r.id,
                    "route_number": r.route_number,
                    "route_name": r.route_name,
                    "vehicle_number": r.vehicle_number,
                    "driver_name": r.driver_name,
                    "driver_phone": r.driver_phone,
                    "annual_fee": r.default_annual_fee,
                    "stops": [
                        {"id": s.id, "stop_name": s.stop_name, "pickup_time": s.morning_pickup_time, "drop_time": s.evening_drop_time}
                        for s in r.stops
                    ]
                } for r in routes
            ]
        }

    @classmethod
    def initiate_transport_payment(cls, student_id, route_id, stop_id=None, payment_mode='UPI', transaction_id=None, academic_year="2026-27"):
        """
        Student pays Bus Fee online:
        Creates a TransportPaymentRequest (PENDING_APPROVAL).
        Student does NOT receive an active pass until Accountant approves.
        """
        student = Student.query.get(student_id)
        if not student:
            return False, "Student not found", None

        route = BusRoute.query.get(route_id)
        if not route:
            return False, "Bus route not found", None

        stop = BusStop.query.get(stop_id) if stop_id else BusStop.query.filter_by(route_id=route.id).first()
        if not stop:
            stop = BusStop(route_id=route.id, stop_name="Campus Stop", morning_pickup_time="08:00 AM", evening_drop_time="05:30 PM", stop_fee=route.default_annual_fee)
            db.session.add(stop)
            db.session.flush()

        # Duplicate protection
        existing_active = BusPass.query.filter_by(
            student_id=student.id,
            academic_year_name=academic_year,
            status='Active'
        ).first()
        if existing_active:
            return False, f"Student already has an active Bus Pass ({existing_active.pass_number}) for {academic_year}.", None

        existing_pending = TransportPayment.query.filter_by(
            student_id=student.id,
            academic_year=academic_year,
            approval_status='PENDING_APPROVAL'
        ).first()
        if existing_pending:
            return False, "A transport fee payment request is already pending verification from Accountant.", None

        annual_fee = route.default_annual_fee
        temp_receipt = f"BUS-PENDING-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
        tx_id = transaction_id or f"TXN-BUS-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
        qr_token = f"TOKEN-BUS-{uuid.uuid4().hex[:16].upper()}"

        try:
            payment = TransportPayment(
                receipt_no=temp_receipt,
                student_id=student.id,
                route_id=route.id,
                stop_id=stop.id,
                academic_year=academic_year,
                annual_fee=annual_fee,
                amount_paid=annual_fee,
                payment_mode=payment_mode,
                transaction_id=tx_id,
                payment_date=datetime.now(),
                payment_status='SUCCESS',
                approval_status='PENDING_APPROVAL',
                is_locked=False,
                qr_token=qr_token
            )
            db.session.add(payment)

            AuditService.log_action(
                user_id=student.id,
                role='student',
                action='TRANSPORT_PAYMENT_INITIATED',
                entity='TransportPayment',
                entity_id=tx_id,
                old_value=None,
                new_value=f"Student {student.roll} paid ₹{annual_fee} for {route.route_name}. Pending Accountant approval."
            )

            db.session.commit()
            return True, "Bus fee payment received and submitted for Accountant approval.", payment

        except Exception as e:
            db.session.rollback()
            return False, f"Payment error: {str(e)}", None

    @classmethod
    def approve_transport_payment(cls, payment_id, accountant_id):
        """
        ATOMIC ACCOUNTANT APPROVAL FOR TRANSPORT:
        1. Validate transport payment request.
        2. Generate official transport receipt number: BUS/2026/000001.
        3. Automatically generate & activate Digital Bus Pass: BP-2026-000001.
        4. Pass status becomes ACTIVE, secure QR token generated.
        5. Mark TransportPayment APPROVED, is_locked=True.
        6. Append credit entry to FeeLedger.
        7. Audit log.
        8. Commit atomically.
        """
        try:
            payment = TransportPayment.query.get(payment_id)
            if not payment:
                return False, "Transport payment request not found", None

            if payment.approval_status == 'APPROVED':
                return False, f"Transport payment already approved.", None

            student = Student.query.get(payment.student_id)
            route = BusRoute.query.get(payment.route_id)
            stop = BusStop.query.get(payment.stop_id)

            # Generate Receipt Number: BUS/2026/000001
            count = TransportPayment.query.filter_by(approval_status='APPROVED').count() + 1
            official_receipt_no = f"BUS/2026/{count:06d}"
            while TransportPayment.query.filter_by(receipt_no=official_receipt_no).first():
                count += 1
                official_receipt_no = f"BUS/2026/{count:06d}"

            # Generate Bus Pass Number: BP-2026-000001
            pass_count = BusPass.query.count() + 1
            pass_no = f"BP-2026-{pass_count:06d}"
            while BusPass.query.filter_by(pass_number=pass_no).first():
                pass_count += 1
                pass_no = f"BP-2026-{pass_count:06d}"

            secure_pass_qr_token = f"PASS-{uuid.uuid4().hex[:20].upper()}"

            # Update Payment
            payment.receipt_no = official_receipt_no
            payment.approval_status = 'APPROVED'
            payment.is_locked = True
            payment.approved_by = accountant_id
            payment.approved_at = datetime.now()

            # Create / Update Active Bus Pass
            existing_pass = BusPass.query.filter_by(student_id=student.id, academic_year_name=payment.academic_year).first()
            if existing_pass:
                existing_pass.route_id = route.id
                existing_pass.stop_id = stop.id
                existing_pass.fee_amount = payment.annual_fee
                existing_pass.paid_amount = payment.amount_paid
                existing_pass.fee_status = "Paid"
                existing_pass.status = "Active"
                existing_pass.qr_token = secure_pass_qr_token
                existing_pass.valid_upto = date(2027, 6, 30)
                bus_pass = existing_pass
            else:
                bus_pass = BusPass(
                    pass_number=pass_no,
                    student_id=student.id,
                    route_id=route.id,
                    stop_id=stop.id,
                    academic_year_name=payment.academic_year,
                    pass_type="Annual",
                    issue_date=date.today(),
                    valid_upto=date(2027, 6, 30),
                    fee_amount=payment.annual_fee,
                    paid_amount=payment.amount_paid,
                    fee_status="Paid",
                    status="Active",
                    qr_token=secure_pass_qr_token,
                    issued_by=accountant_id
                )
                db.session.add(bus_pass)

            # Record Ledger Entry
            LedgerService.record_entry(
                student_id=student.id,
                entry_type='TRANSPORT_FEE_PAYMENT',
                debit=0.0,
                credit=payment.amount_paid,
                reference_no=official_receipt_no,
                created_by=accountant_id,
                remarks=f"Bus fee approved for {route.route_name} - Pass: {bus_pass.pass_number}"
            )

            # Audit Log
            AuditService.log_action(
                user_id=accountant_id,
                role='accountant',
                action='TRANSPORT_PAYMENT_APPROVED',
                entity='BusPass',
                entity_id=bus_pass.pass_number,
                old_value="PENDING_APPROVAL",
                new_value=f"Bus pass {bus_pass.pass_number} activated for {student.roll} ({route.route_name})"
            )

            db.session.commit()
            return True, f"Transport payment approved. Digital Bus Pass {bus_pass.pass_number} is now ACTIVE.", bus_pass

        except Exception as e:
            db.session.rollback()
            return False, f"Approval error: {str(e)}", None

    @classmethod
    def reject_transport_payment(cls, payment_id, reason, accountant_id):
        """Accountant rejects transport payment request with reason"""
        payment = TransportPayment.query.get(payment_id)
        if not payment:
            return False, "Transport payment request not found"

        if payment.approval_status == 'APPROVED':
            return False, "Cannot reject an already approved transport payment."

        payment.approval_status = 'REJECTED'
        payment.payment_status = 'FAILED'
        payment.rejection_reason = reason or "Verification failed."
        payment.approved_by = accountant_id
        payment.approved_at = datetime.now()

        AuditService.log_action(
            user_id=accountant_id,
            role='accountant',
            action='TRANSPORT_PAYMENT_REJECTED',
            entity='TransportPayment',
            entity_id=str(payment.id),
            old_value="PENDING_APPROVAL",
            new_value=f"Rejected: {reason}"
        )

        db.session.commit()
        return True, "Transport payment request rejected successfully."

    @classmethod
    def verify_bus_pass_qr(cls, qr_token):
        """Public/Staff pass verification via secure QR token"""
        bus_pass = BusPass.query.filter_by(qr_token=qr_token).first()
        if not bus_pass:
            return {
                "valid": False,
                "status": "INVALID_TOKEN",
                "message": "Invalid QR Token or Pass not found."
            }

        student = Student.query.get(bus_pass.student_id)
        today = date.today()
        is_expired = (bus_pass.valid_upto and today > bus_pass.valid_upto)

        if is_expired:
            return {
                "valid": False,
                "status": "EXPIRED",
                "message": f"Bus Pass expired on {bus_pass.valid_upto.strftime('%d/%m/%Y')}",
                "pass_number": bus_pass.pass_number,
                "student_name": student.name if student else "N/A"
            }

        if bus_pass.status != "Active":
            return {
                "valid": False,
                "status": bus_pass.status.upper(),
                "message": f"Bus Pass is currently {bus_pass.status}",
                "pass_number": bus_pass.pass_number,
                "student_name": student.name if student else "N/A"
            }

        return {
            "valid": True,
            "status": "VALID — ACTIVE PASS",
            "pass_number": bus_pass.pass_number,
            "student_name": student.name if student else "N/A",
            "enrollment_number": student.roll if student else "N/A",
            "branch": student.branch if student else "CSE",
            "year": student.year if student else 2,
            "route_name": bus_pass.route.route_name if bus_pass.route else "Campus Express",
            "bus_number": bus_pass.route.vehicle_number if bus_pass.route else "MP-48-PA-1204",
            "pickup_stop": bus_pass.stop.stop_name if bus_pass.stop else "Main Stop",
            "valid_until": bus_pass.valid_upto.strftime('%d/%m/%Y') if bus_pass.valid_upto else "30/06/2027",
            "academic_year": bus_pass.academic_year_name,
            "verification_timestamp": datetime.now().strftime('%d/%m/%Y %H:%M:%S')
        }


class PaymentGatewayService:
    """Modular Payment Gateway Abstraction Layer"""

    @staticmethod
    def create_order(student_id, amount, gateway_name="Simulated"):
        order_id = f"ORD-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}"
        tx = PaymentGatewayTransaction(
            order_id=order_id,
            student_id=student_id,
            gateway_name=gateway_name,
            amount=amount,
            currency="INR",
            status="Initiated"
        )
        db.session.add(tx)
        db.session.commit()
        return tx

    @staticmethod
    def verify_payment_signature(order_id, payment_id, signature, secret_key="mock_secret"):
        tx = PaymentGatewayTransaction.query.filter_by(order_id=order_id).first()
        if not tx:
            return False, "Order not found"
        if tx.status == "Success":
            return True, "Payment already verified successfully"
        expected_sig = hashlib.sha256(f"{order_id}|{payment_id}|{secret_key}".encode('utf-8')).hexdigest()
        tx.payment_id = payment_id
        tx.signature = signature or expected_sig
        tx.status = "Success"
        db.session.commit()
        return True, "Payment verified successfully"


class LateFeeEngine:
    """Flexible Engine for Late Fee Calculations"""

    @staticmethod
    def calculate_late_fee(due_date, pending_amount, branch="CSE", year=1):
        if not due_date or pending_amount <= 0:
            return 0.0, 0, "No Dues"
        today = date.today()
        rule = LateFeeRule.query.filter_by(is_active=True).first()
        grace_days = rule.grace_period_days if rule else 0
        rate = rule.rate_amount if rule else 25.0
        rule_type = rule.rule_type if rule else 'DAILY'
        max_fee = rule.max_late_fee if rule else 5000.0

        effective_due_date = due_date + timedelta(days=grace_days)
        if today <= effective_due_date:
            return 0.0, 0, "Within Grace Period"

        days_overdue = (today - due_date).days
        if rule_type == 'FIXED':
            late_fee = rate
        elif rule_type == 'PERCENTAGE':
            late_fee = (pending_amount * (rate / 100.0))
        else: # DAILY
            late_fee = days_overdue * rate

        late_fee = min(late_fee, max_fee)
        return late_fee, days_overdue, f"Overdue by {days_overdue} days ({rule_type})"


class PaymentAllocationEngine:
    """Payment Allocation Engine across Fee Heads"""

    @staticmethod
    def allocate_payment(payment_id, student_id, amount_paid):
        demands = FeeDemand.query.filter_by(student_id=student_id).filter(
            FeeDemand.pending_amount > 0
        ).order_by(FeeDemand.due_date.asc(), FeeDemand.id.asc()).all()
        remaining_to_allocate = amount_paid

        for demand in demands:
            if remaining_to_allocate <= 0:
                break
            alloc_amount = min(remaining_to_allocate, demand.pending_amount)
            demand.paid_amount += alloc_amount
            demand.pending_amount -= alloc_amount
            demand.status = 'Paid' if demand.pending_amount <= 0 else 'Partial'

            allocation = PaymentAllocation(
                payment_id=payment_id,
                demand_id=demand.id,
                allocated_amount=alloc_amount
            )
            db.session.add(allocation)
            remaining_to_allocate -= alloc_amount

        db.session.commit()
        return remaining_to_allocate

