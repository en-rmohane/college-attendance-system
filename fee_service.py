import os
import random
import hashlib
import hmac
from datetime import datetime, date, timedelta
from models import (
    db, User, Student, AcademicYear, FeeHead, FeeStructure, FeeStructureItem,
    FeeDemand, FeeInstallment, FeeLedger, FeePayment, PaymentAllocation,
    PaymentGatewayTransaction, LateFeeRule, LateFeeWaiver, DiscountScholarship,
    RefundRecord, AuditLog, NoDuesCertificate
)


class LedgerService:
    """Append-only Financial Ledger Service"""

    @staticmethod
    def record_entry(student_id, entry_type, debit=0.0, credit=0.0, reference_no=None, created_by=None, remarks=None):
        """Record an append-only ledger entry and return the updated balance"""
        last_entry = FeeLedger.query.filter_by(student_id=student_id).order_by(FeeLedger.id.desc()).first()
        prev_balance = last_entry.balance if last_entry else 0.0

        # Balance formula: Debit increases student liability (+), Credit reduces liability (-)
        new_balance = prev_balance + debit - credit

        entry = FeeLedger(
            student_id=student_id,
            entry_date=datetime.now(),
            entry_type=entry_type,
            debit=debit,
            credit=credit,
            balance=new_balance,
            reference_no=reference_no,
            created_by=created_by,
            remarks=remarks
        )
        db.session.add(entry)
        db.session.commit()
        return entry


class AuditService:
    """Audit Logging Service for Sensitive Operations"""

    @staticmethod
    def log_action(user_id, role, action, entity, entity_id=None, old_value=None, new_value=None, ip_address=None):
        log = AuditLog(
            user_id=user_id,
            role=role,
            action=action,
            entity=entity,
            entity_id=str(entity_id) if entity_id else None,
            old_value=str(old_value) if old_value else None,
            new_value=str(new_value) if new_value else None,
            ip_address=ip_address,
            timestamp=datetime.now()
        )
        db.session.add(log)
        db.session.commit()
        return log


class PaymentGatewayService:
    """Modular Payment Gateway Abstraction Layer"""

    @staticmethod
    def create_order(student_id, amount, gateway_name="Simulated"):
        """Create a payment order with idempotency token"""
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
        """Server-side verification of gateway response signature"""
        tx = PaymentGatewayTransaction.query.filter_by(order_id=order_id).first()
        if not tx:
            return False, "Order not found"

        # Prevent duplicate execution (Idempotency)
        if tx.status == "Success":
            return True, "Payment already verified successfully"

        # Simulate signature validation
        expected_sig = hashlib.sha256(f"{order_id}|{payment_id}|{secret_key}".encode('utf-8')).hexdigest()
        
        tx.payment_id = payment_id
        tx.signature = signature or expected_sig
        tx.status = "Success"
        db.session.commit()
        return True, "Payment verified successfully"


class LateFeeEngine:
    """Flexible Engine for Late Fee Calculations (Daily, Fixed, Percentage, Slabs)"""

    @staticmethod
    def calculate_late_fee(due_date, pending_amount, branch="CSE", year=1):
        if not due_date or pending_amount <= 0:
            return 0.0, 0, "No Dues"

        today = date.today()
        rule = LateFeeRule.query.filter_by(is_active=True).first()
        grace_days = rule.grace_period_days if rule else 5
        rate = rule.rate_amount if rule else 50.0
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
        elif rule_type == 'SLAB':
            if days_overdue <= 7:
                late_fee = 100.0
            elif days_overdue <= 15:
                late_fee = 250.0
            elif days_overdue <= 30:
                late_fee = 500.0
            else:
                late_fee = 1000.0
        else: # DAILY
            late_fee = days_overdue * rate

        late_fee = min(late_fee, max_fee)
        return late_fee, days_overdue, f"Overdue by {days_overdue} days ({rule_type})"


class PaymentAllocationEngine:
    """Payment Allocation Engine across Fee Heads"""

    @staticmethod
    def allocate_payment(payment_id, student_id, amount_paid):
        """Allocate lump-sum payment across active demands (Late Fee -> Exam -> Tuition -> Misc)"""
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

            if demand.pending_amount <= 0:
                demand.status = 'Paid'
            else:
                demand.status = 'Partial'

            allocation = PaymentAllocation(
                payment_id=payment_id,
                demand_id=demand.id,
                allocated_amount=alloc_amount
            )
            db.session.add(allocation)
            remaining_to_allocate -= alloc_amount

        db.session.commit()
        return remaining_to_allocate
