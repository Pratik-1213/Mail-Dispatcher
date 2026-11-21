import io
import pytest
from app import app, clean_password, EMAIL_REGEX, prepare_attachments, build_message

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_clean_password():
    assert clean_password("abcd efgh ijkl mnop") == "abcdefghijklmnop"
    assert clean_password("  secret123  ") == "secret123"
    assert clean_password("") == ""
    assert clean_password(None) == ""

def test_email_regex():
    assert EMAIL_REGEX.match("valid.email@example.com") is not None
    assert EMAIL_REGEX.match("user+tag@domain.co.in") is not None
    assert EMAIL_REGEX.match("invalid-email") is None
    assert EMAIL_REGEX.match("@nodomain.com") is None
    assert EMAIL_REGEX.match("noatsign.com") is None

def test_health_check_endpoints(client):
    res1 = client.get('/api/health')
    assert res1.status_code == 200
    data1 = res1.get_json()
    assert data1['status'] == 'awake'
    assert 'timestamp' in data1

    res2 = client.get('/api/ping')
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2['status'] == 'awake'

def test_index_route(client):
    response = client.get('/')
    assert response.status_code == 200

def test_verify_credentials_missing_fields(client):
    res = client.post('/api/verify', json={})
    assert res.status_code == 400
    data = res.get_json()
    assert data['success'] is False
    assert 'required' in data['error']

def test_verify_credentials_invalid_email(client):
    res = client.post('/api/verify', json={
        'sender_email': 'not-an-email',
        'sender_password': 'mypassword123'
    })
    assert res.status_code == 400
    data = res.get_json()
    assert data['success'] is False
    assert 'Invalid sender email format' in data['error']

def test_send_test_email_missing_fields(client):
    res = client.post('/api/send-test', data={})
    assert res.status_code == 400
    data = res.get_json()
    assert data['success'] is False
    assert 'required' in data['error']

def test_prepare_attachments_and_build_message():
    class MockFile:
        def __init__(self, filename, content):
            self.filename = filename
            self._content = content
        def read(self):
            return self._content

    mock_files = [
        MockFile('notes.txt', b'Hello world attachment')
    ]
    prepared = prepare_attachments(mock_files)
    assert len(prepared) == 1
    assert prepared[0]['filename'] == 'notes.txt'
    assert prepared[0]['size'] == len(b'Hello world attachment')

    msg = build_message(
        sender_email='sender@example.com',
        recipient='recipient@example.com',
        subject='Unit Test Subject',
        content='<p>Unit test content</p>',
        is_html=True,
        prepared_attachments=prepared
    )
    assert msg['From'] == 'sender@example.com'
    assert msg['To'] == 'recipient@example.com'
    assert msg['Subject'] == 'Unit Test Subject'
    # Check payload has 2 parts: html body and 1 attachment
    assert len(msg.get_payload()) == 2
