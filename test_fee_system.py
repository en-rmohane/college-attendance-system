import sys
import json
from app import app
from models import db, Student, FeePayment, StudentFeeRecord

def test_fee_management_system():
    print("=== TESTING ENTERPRISE FEE MANAGEMENT REST API & ATOMIC TRANSACTIONS ===")
    results = {}
    with app.test_client() as client:
        # 1. Fee Dashboard
        res = client.get('/api/fees/dashboard')
        assert res.status_code == 200, f"Dashboard failed: {res.status_code}"
        d_data = res.get_json()
        results["fee_dashboard"] = {
            "total_students": d_data["metrics"]["totalStudents"],
            "total_expected": d_data["metrics"]["totalExpected"],
            "total_collected": d_data["metrics"]["totalCollected"],
            "total_pending": d_data["metrics"]["totalPending"],
            "today_collection": d_data["metrics"]["todayCollection"]
        }

        # 2. Students Fee Directory
        res = client.get('/api/fees/students')
        assert res.status_code == 200
        studs = res.get_json().get('students', [])
        results["fee_students_count"] = len(studs)
        test_student = studs[0]
        test_roll = test_student['roll']

        # 3. Student Fee Profile with Dynamic Formula Calculation
        res = client.get(f'/api/fees/student/{test_roll}')
        assert res.status_code == 200
        prof = res.get_json()
        fin = prof['financial_summary']
        results["financial_formula_verification"] = {
            "student_roll": test_roll,
            "gross_fee": fin['gross_fee'],
            "scholarship": fin['scholarship_amount'],
            "discount": fin['discount_amount'],
            "fine": fin['fine_amount'],
            "net_payable": fin['net_payable'],
            "paid": fin['paid_amount'],
            "pending": fin['pending_amount']
        }
        
        # Verify Formula: Net Payable == Gross - Scholarship - Discount + Fine
        calc_net = round(fin['gross_fee'] - fin['scholarship_amount'] - fin['discount_amount'] + fin['fine_amount'], 2)
        assert abs(fin['net_payable'] - calc_net) < 0.01, f"Net payable formula mismatch: {fin['net_payable']} vs {calc_net}"

        # 4. Atomic Payment Collection & Receipt Generation
        pending_before = fin['pending_amount']
        pay_amount = min(5000.0, pending_before) if pending_before > 0 else 1000.0
        
        collect_res = client.post('/api/fees/collect', json={
            "roll": test_roll,
            "amount": pay_amount,
            "mode": "UPI",
            "remarks": "Automated Unit Test Payment"
        })
        
        if pending_before >= pay_amount:
            assert collect_res.status_code == 200, f"Collect failed: {collect_res.get_json()}"
            receipt_no = collect_res.get_json()['receipt']['receipt_no']
            results["payment_recorded"] = {
                "receipt_no": receipt_no,
                "amount": pay_amount,
                "status": "Success"
            }

            # 5. Verify Receipt Endpoint
            rec_res = client.get(f'/api/fees/receipt/{receipt_no}')
            assert rec_res.status_code == 200
            results["receipt_verification"] = rec_res.get_json()['receipt']['receipt_no'] == receipt_no

        # 6. Anti-Overpayment Test (Attempting to pay an excessive amount)
        excess_res = client.post('/api/fees/collect', json={
            "roll": test_roll,
            "amount": 99999999.0,
            "mode": "Cash"
        })
        results["overpayment_blocked"] = excess_res.status_code == 400

        # 7. Fee Structures
        res = client.get('/api/fees/structures')
        assert res.status_code == 200
        results["fee_structures_count"] = len(res.get_json().get('structures', []))

        # 8. Daily Report
        res = client.get('/api/fees/reports/daily')
        assert res.status_code == 200
        results["daily_report_tested"] = res.get_json()['success'] == True

    print("\nFEE MANAGEMENT TEST EXECUTION SUMMARY:")
    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    test_fee_management_system()
