# Bulk Mail Sender — Gmail SMTP Web Application

A lightweight, single-page web application for sending personalized bulk emails directly through your Gmail account with document attachments, live delivery feedback, and recipient list import.

---

## Features

- **Single Page Light Theme Interface**: Clean, professional, and accessible light design built without stereotypical AI templates or decorative emojis.
- **Direct Gmail SMTP Integration**: Secure SSL connection via `smtp.gmail.com:465`.
- **Preconfigured Credentials Support**: Configured with your Gmail address and 16-character App Password with real-time connection verification and show/hide password toggle.
- **Document Attachments**: Drag-and-drop or file browser upload for documents (PDF, Word, Excel, images, etc.) with file size display and removal options (up to 25 MB).
- **Flexible Recipient Input**:
  - Paste comma-separated, semicolon-separated, or newline-separated email lists.
  - Import recipient lists directly from `.csv` or `.txt` files.
  - Automatic email validation, duplicate removal, and live count indicator.
- **Email Content Composer**:
  - Rich Plain Text or HTML formatting modes.
  - Live "Preview" tab to inspect rendered content before sending.
- **Safety Features**:
  - "Send Test to Myself" button to verify email formatting and attachments before launching a bulk campaign.
  - Confirmation review modal before firing bulk emails.
  - Configurable dispatch interval (0.5s - 3.0s) to safeguard against Gmail spam filters and rate limiting.
- **Live Dispatch Console**:
  - Real-time progress bar and percentage counter.
  - Live table feed of delivered and failed emails with exact server response details.
  - One-click CSV export of the delivery log.

---

## How to Run

### Option 1: Quick Start (Windows)
Double-click `start.bat` in this folder.

### Option 2: Command Line
1. Ensure Python is installed (Python 3.8+).
2. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the application:
   ```bash
   python app.py
   ```
4. Open your browser and navigate to:
   ```
   http://127.0.0.1:5050
   ```

---

## Gmail App Password Setup

If you ever need to change or regenerate your Gmail App Password:
1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
2. Ensure **2-Step Verification** is enabled.
3. Under *2-Step Verification*, select **App passwords** (or search for "App passwords").
4. Create a new password for "Mail" / "Windows Computer".
5. Copy the 16-character code into the **App Password** field in the web app.
