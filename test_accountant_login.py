from app import app, login_limiter
client = app.test_client()

login_limiter.failed_attempts.clear()
login_limiter.lockouts.clear()

tests = [
    ('accountant', 'accountant123'),
    ('accountant@college.com', 'accountant123'),
    ('accounts', 'accountant123'),
    ('accounts@sbitm.edu.in', 'accountant123'),
    ('accountant@sbitm.edu.in', 'accountant123'),
]

for username, pwd in tests:
    res = client.post('/login', data={'email': username, 'password': pwd}, follow_redirects=True)
    print(f'Login with "{username}": Status {res.status_code}, Landed on: {res.request.path}')
