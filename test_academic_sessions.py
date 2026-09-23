import mobile_api
from app import app

client = app.test_client()

# 1. GET academic sessions
res = client.get('/api/academic-sessions')
print('GET /api/academic-sessions status:', res.status_code)
data = res.get_json()
print('Sessions count:', len(data.get('sessions', [])))
for s in data.get('sessions', []):
    print(f"Year {s.get('year')}: {s.get('semester_type')} Sem (Sem {s.get('active_semester')}), End Date: {s.get('end_date')}")

# 2. UPDATE academic session for Year 4
up_res = client.post('/api/academic-sessions/update', json={
    'year': 4,
    'branch': 'CSE',
    'semester_type': 'EVEN',
    'academic_year': '2025-2026',
    'start_date': '2026-01-01',
    'end_date': '2026-05-15',
    'exam_start_date': '2026-05-20',
})
print('UPDATE Year 4 status:', up_res.status_code, up_res.get_json().get('message'))

# 3. VERIFY Year 4 is now EVEN Sem 8
res2 = client.get('/api/academic-sessions')
data2 = res2.get_json()
for s in data2.get('sessions', []):
    if s.get('year') == 4:
        print('Verified Year 4 updated active semester:', s.get('active_semester'), s.get('semester_type'), s.get('end_date'))

# 4. PROMOTE / TOGGLE Year 4 back to ODD
prom_res = client.post('/api/academic-sessions/promote', json={'year': 4})
print('PROMOTE Year 4 status:', prom_res.status_code, prom_res.get_json().get('message'))

res3 = client.get('/api/academic-sessions')
data3 = res3.get_json()
for s in data3.get('sessions', []):
    if s.get('year') == 4:
        print('Verified Year 4 back to:', s.get('active_semester'), s.get('semester_type'))
