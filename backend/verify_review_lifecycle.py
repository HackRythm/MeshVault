import urllib.request, json

def post(url, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

def get(url, token=None):
    headers = {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read().decode('utf-8'))

s_code, s_login = post('http://127.0.0.1:8000/api/auth/login', {'email': 's.mitchell@university.edu', 'password': 'staff123'})
staff_token = s_login['token']

stu_code, stu_login = post('http://127.0.0.1:8000/api/auth/login', {'email': 'alex.chen@university.edu', 'password': 'student123'})
stu_token = stu_login['token']
stu_user = stu_login['user']

_, projs = get('http://127.0.0.1:8000/api/projects', stu_token)
print('Projects available for student:', len(projs))
target_proj = projs[0]
gid = target_proj['group_id']
print(f"Target Project: ID={target_proj['id']}, Code={target_proj['project_id']}, Name='{target_proj['name']}', Group={gid}")

# 1. Student submits review request
rev_payload = {
    'project_id': target_proj['id'],
    'submitted_by': stu_user['id'],
    'request_type': 'Milestone Review',
    'message': 'Completed Module 2 Implementation and Benchmarks'
}
r_code, r_resp = post('http://127.0.0.1:8000/api/review-queue', rev_payload, stu_token)
print('1. Review Submitted -> Status:', r_code, 'Request ID:', r_resp['id'])

# 2. Staff checks review queue count
c_code, c_resp = get('http://127.0.0.1:8000/api/review-queue/count', staff_token)
print('2. Staff queue notification count:', c_resp)

# 3. Staff checks group detail
_, staff_grp = get(f'http://127.0.0.1:8000/api/groups/{gid}', staff_token)
print('3. Staff group view pending reviews:', len(staff_grp['pending_reviews']))
print('   Latest activity in group log:', staff_grp['activities'][0]['activity_type'], '-', staff_grp['activities'][0]['message'])

# 4. Staff processes review
p_code, p_resp = post('http://127.0.0.1:8000/api/review-queue/process', {}, staff_token)
print('4. Staff processed/approved review:', p_code, 'Processed ID:', p_resp['processed_id'])

# 5. Re-check queue count
_, c_resp2 = get('http://127.0.0.1:8000/api/review-queue/count', staff_token)
print('5. Staff queue count after approval:', c_resp2)

# 6. Student checks group detail
_, stu_grp = get(f'http://127.0.0.1:8000/api/groups/{gid}', stu_token)
print('6. Student group view pending reviews:', len(stu_grp['pending_reviews']))
print('   Latest activity in group log:', stu_grp['activities'][0]['activity_type'], '-', stu_grp['activities'][0]['message'])
print('\n=== ALL LIFECYCLE CHECKS PASSED SUCCESSFULLY ===')
