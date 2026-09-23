from app import app, login_limiter
client = app.test_client()

login_limiter.failed_attempts.clear()
login_limiter.lockouts.clear()

tests = [
    ('librarian', 'librarian123'),
    ('librarian@sbitm.edu.in', 'librarian123'),
    ('library', 'librarian123'),
    ('librarian@college.com', 'librarian123'),
]

for username, pwd in tests:
    res = client.post('/login', data={'email': username, 'password': pwd}, follow_redirects=True)
    print(f'Login with "{username}": Status {res.status_code}, Landed on: {res.request.path}')
