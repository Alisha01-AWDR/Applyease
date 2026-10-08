import os, sys, uuid
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault('DATABASE_URL','postgresql+psycopg://applyease:applyease@localhost:5432/applyease')
os.environ.setdefault('JWT_SECRET','test-secret')
os.environ.setdefault('APP_ENV','test')
os.environ.setdefault('TEST_RESET_TOKEN','test-reset')
from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)

def test_health():
    r=client.get('/health'); assert r.status_code==200 and r.json()['ok'] is True

def test_auth_and_submit_gate():
    email=f'test-phase10-{uuid.uuid4().hex[:8]}@example.com'; password='A-strong-test-password-123!'
    r=client.post('/auth/register',json={'name':'Test User','email':email,'password':password})
    assert r.status_code in (200,409)
    if r.status_code==409: r=client.post('/auth/login',json={'email':email,'password':password})
    assert r.status_code==200
    token=r.json()['access_token']; headers={'Authorization':f'Bearer {token}'}
    jobs=client.get('/jobs',headers=headers); assert jobs.status_code==200
    job=next(x for x in jobs.json() if x['id']=='acme-data')
    draft=client.patch('/applications/acme-data/draft',headers=headers,json={'step':7,'answers':{'name':'Test User','email':email,'phone':'+91 98765 43210','resume':'resume.pdf','authorization':'Yes','why':'I am interested in this role because I enjoy working with data and clear communication.'}})
    assert draft.status_code==200
    blocked=client.post('/applications/acme-data/submit',headers=headers,json={}); assert blocked.status_code==409  # no confirmation recorded yet
    pdf=b'%PDF-1.4\n% demo resume\n'
    upload=client.post('/files/resume?job_id=acme-data',headers=headers,files={'upload':('resume.pdf',pdf,'application/pdf')})
    assert upload.status_code==200
    confirmed=client.post('/applications/acme-data/confirm',headers=headers,json={'acknowledge':True,'confirmation_method':'keyboard'}); assert confirmed.status_code==200
    submitted=client.post('/applications/acme-data/submit',headers=headers,json={}); assert submitted.status_code==200


def test_incomplete_application_is_rejected():
    email=f'test-incomplete-{uuid.uuid4().hex[:8]}@example.com'; password='A-strong-test-password-123!'
    r=client.post('/auth/register',json={'name':'Test User','email':email,'password':password}); assert r.status_code==200
    headers={'Authorization':f"Bearer {r.json()['access_token']}"}
    assert client.patch('/applications/acme-data/draft',headers=headers,json={'step':2,'answers':{'name':'Test User'}}).status_code==200
    assert client.post('/applications/acme-data/confirm',headers=headers,json={'acknowledge':True,'confirmation_method':'keyboard'}).status_code==400
    assert client.post('/applications/acme-data/submit',headers=headers,json={}).status_code==400
