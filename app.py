import os
import re
import time
import json
import smtplib
import mimetypes
from datetime import datetime
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from flask_cors import CORS

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
# Enable CORS so if frontend is hosted on Vercel, it can communicate seamlessly with Render backend
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Maximum upload size: 25MB (standard Gmail limit is 25MB for total message size)
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$')

# Empty by default; only populated if administrator explicitly sets them via environment variables
DEFAULT_SENDER_EMAIL = os.environ.get('DEFAULT_SENDER_EMAIL', '')
DEFAULT_SENDER_PASSWORD = os.environ.get('DEFAULT_SENDER_PASSWORD', '')
RENDER_BACKEND_URL = os.environ.get('RENDER_BACKEND_URL', os.environ.get('BACKEND_URL', ''))

import socket

def create_ipv4_socket(host: str, port: int, timeout: float = 12):
    """Specifically resolve and connect via IPv4 to prevent serverless/Linux [Errno 101] Network is unreachable."""
    addr_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
    last_err = None
    for res in addr_info:
        af, socktype, proto, _, sa = res
        sock = None
        try:
            sock = socket.socket(af, socktype, proto)
            if timeout is not None:
                sock.settimeout(timeout)
            sock.connect(sa)
            return sock
        except OSError as e:
            last_err = e
            if sock:
                sock.close()
    if last_err:
        raise last_err
    raise OSError(f"Could not connect to {host}:{port} via IPv4")

class IPv4SMTP_SSL(smtplib.SMTP_SSL):
    def _get_socket(self, host, port, timeout):
        sock = create_ipv4_socket(host, port, timeout)
        server_hostname = self._host if self._host else host
        return self.context.wrap_socket(sock, server_hostname=server_hostname)

class IPv4SMTP(smtplib.SMTP):
    def _get_socket(self, host, port, timeout):
        return create_ipv4_socket(host, port, timeout)

def get_smtp_connection(sender_email: str, sender_password: str):
    """Establishes authenticated connection to Gmail SMTP using multi-strategy fallback (IPv4 SSL 465 -> IPv4 TLS 587 -> Standard)."""
    pwd = clean_password(sender_password)
    last_err = None

    # Strategy 1: IPv4 SMTP_SSL on Port 465 (Gmail SSL)
    try:
        server = IPv4SMTP_SSL("smtp.gmail.com", 465, timeout=12)
        server.login(sender_email.strip(), pwd)
        return server
    except smtplib.SMTPAuthenticationError:
        raise
    except Exception as e:
        last_err = e

    # Strategy 2: IPv4 SMTP on Port 587 (Gmail STARTTLS)
    try:
        server = IPv4SMTP("smtp.gmail.com", 587, timeout=12)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(sender_email.strip(), pwd)
        return server
    except smtplib.SMTPAuthenticationError:
        raise
    except Exception as e:
        last_err = e

    # Strategy 3: Standard library smtplib fallback
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=12)
        server.login(sender_email.strip(), pwd)
        return server
    except smtplib.SMTPAuthenticationError:
        raise
    except Exception as e:
        err_str = str(e) or str(last_err)
        if "101" in err_str or "unreachable" in err_str.lower() or "110" in err_str or "timed out" in err_str.lower():
            raise OSError(
                "Direct SMTP connection is blocked by this serverless host (Vercel). "
                "Please deploy your backend to Render (where SMTP is fully supported), then in Vercel Settings or in the app's top header gear icon, paste your Render backend URL."
            )
        raise e

@app.route('/')
def index():
    return render_template(
        'index.html',
        default_email=DEFAULT_SENDER_EMAIL,
        default_password=DEFAULT_SENDER_PASSWORD,
        render_backend_url=RENDER_BACKEND_URL
    )

@app.route('/api/config')
def get_config():
    return jsonify({
        'render_backend_url': RENDER_BACKEND_URL
    })


# -------------------------------------------------------------
# Health Check / Wake Up endpoint (Wakes up sleeping Render container)
# -------------------------------------------------------------
@app.route('/api/health')
@app.route('/api/ping')
def health_check():
    return jsonify({
        'status': 'awake',
        'message': 'Render backend service is awake and ready.',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/verify', methods=['POST'])
def verify_credentials():
    data = request.get_json(silent=True) or {}
    email = (data.get('sender_email') or '').strip()
    password = data.get('sender_password') or ''

    if not email or not password:
        return jsonify({'success': False, 'error': 'Both sender email and app password are required.'}), 400

    if not EMAIL_REGEX.match(email):
        return jsonify({'success': False, 'error': 'Invalid sender email format.'}), 400

    try:
        server = get_smtp_connection(email, password)
        server.quit()
        return jsonify({
            'success': True,
            'message': f'Successfully authenticated with Gmail SMTP server for {email}.'
        })
    except smtplib.SMTPAuthenticationError:
        return jsonify({
            'success': False,
            'error': 'Authentication failed. Please check that your email address and 16-character App Password are correct.'
        }), 401
    except smtplib.SMTPConnectError:
        return jsonify({
            'success': False,
            'error': 'Failed to connect to Gmail SMTP server. Please check your network connection.'
        }), 503
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Connection error: {str(e)}'
        }), 500

def prepare_attachments(files):
    """Read files once into memory to avoid repeated disk or stream reads."""
    prepared = []
    for f in files:
        if not f or not f.filename:
            continue
        filename = os.path.basename(f.filename)
        content_type, _ = mimetypes.guess_type(filename)
        if not content_type:
            content_type = 'application/octet-stream'
        main_type, sub_type = content_type.split('/', 1)
        data = f.read()
        prepared.append({
            'filename': filename,
            'main_type': main_type,
            'sub_type': sub_type,
            'data': data,
            'size': len(data)
        })
    return prepared

def build_message(sender_email, recipient, subject, content, is_html, prepared_attachments):
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient
    msg['Subject'] = subject

    # Attach text/html body
    body_subtype = 'html' if is_html else 'plain'
    msg.attach(MIMEText(content, body_subtype, 'utf-8'))

    # Attach documents
    for att in prepared_attachments:
        part = MIMEBase(att['main_type'], att['sub_type'])
        part.set_payload(att['data'])
        encoders.encode_base64(part)
        part.add_header('Content-Disposition', 'attachment', filename=att['filename'])
        msg.attach(part)

    return msg

@app.route('/api/send-test', methods=['POST'])
def send_test_email():
    sender_email = (request.form.get('sender_email') or '').strip()
    sender_password = request.form.get('sender_password') or ''
    subject = request.form.get('subject') or 'Test Email from Bulk Mail Sender'
    content = request.form.get('content') or 'This is a test email sent from the Bulk Mail Sender application.'
    is_html = request.form.get('is_html') == 'true'

    if not sender_email or not sender_password:
        return jsonify({'success': False, 'error': 'Sender email and app password are required.'}), 400

    try:
        files = request.files.getlist('files')
        attachments = prepare_attachments(files)
        msg = build_message(sender_email, sender_email, f"[TEST] {subject}", content, is_html, attachments)

        server = get_smtp_connection(sender_email, sender_password)
        server.send_message(msg)
        server.quit()

        return jsonify({
            'success': True,
            'message': f'Test email delivered successfully to your inbox ({sender_email}).'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/send-bulk', methods=['POST'])
def send_bulk_emails():
    sender_email = (request.form.get('sender_email') or '').strip()
    sender_password = request.form.get('sender_password') or ''
    subject = (request.form.get('subject') or '').strip()
    content = request.form.get('content') or ''
    is_html = request.form.get('is_html') == 'true'

    # Delay between sends
    try:
        delay = float(request.form.get('delay') or 1.2)
        delay = max(0.1, min(delay, 10.0))
    except ValueError:
        delay = 1.2

    # Parse recipients
    recipients_raw = request.form.get('recipients') or '[]'
    try:
        recipients = json.loads(recipients_raw)
    except Exception:
        # Fallback to comma/newline split
        recipients = [r.strip() for r in re.split(r'[\r\n,;]+', recipients_raw) if r.strip()]

    # Clean and de-duplicate while maintaining order
    seen = set()
    valid_recipients = []
    for r in recipients:
        cleaned = r.strip().lower()
        if EMAIL_REGEX.match(cleaned) and cleaned not in seen:
            seen.add(cleaned)
            valid_recipients.append(cleaned)

    if not sender_email or not sender_password:
        return jsonify({'error': 'Sender email and password are required.'}), 400

    if not valid_recipients:
        return jsonify({'error': 'No valid recipient email addresses found.'}), 400

    if not subject:
        return jsonify({'error': 'Email subject is required.'}), 400

    # Cache files in memory once
    files = request.files.getlist('files')
    attachments = prepare_attachments(files)

    def generate_events():
        total = len(valid_recipients)
        yield f"data: {json.dumps({'type': 'init', 'total': total, 'delay': delay})}\n\n"

        sent_count = 0
        failed_count = 0
        server = None

        try:
            server = get_smtp_connection(sender_email, sender_password)
        except Exception as e:
            yield f"data: {json.dumps({'type': 'fatal_error', 'error': f'Failed to connect to SMTP: {str(e)}'})}\n\n"
            return

        for idx, recipient in enumerate(valid_recipients, 1):
            now_str = datetime.now().strftime("%H:%M:%S")
            try:
                msg = build_message(sender_email, recipient, subject, content, is_html, attachments)
                server.send_message(msg)
                sent_count += 1
                yield f"data: {json.dumps({'type': 'progress', 'index': idx, 'total': total, 'recipient': recipient, 'status': 'sent', 'time': now_str})}\n\n"
            except Exception as e:
                failed_count += 1
                err_msg = str(e)
                yield f"data: {json.dumps({'type': 'progress', 'index': idx, 'total': total, 'recipient': recipient, 'status': 'failed', 'error': err_msg, 'time': now_str})}\n\n"
                # If connection dropped, attempt quick reconnect for subsequent items
                try:
                    server.quit()
                except Exception:
                    pass
                try:
                    server = get_smtp_connection(sender_email, sender_password)
                except Exception:
                    pass

            if idx < total and delay > 0:
                time.sleep(delay)

        if server:
            try:
                server.quit()
            except Exception:
                pass

        yield f"data: {json.dumps({'type': 'complete', 'total': total, 'sent': sent_count, 'failed': failed_count})}\n\n"

    return Response(stream_with_context(generate_events()), mimetype='text/event-stream', headers={
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5050))
    print(f"[*] Bulk Mail Sender server running at http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
