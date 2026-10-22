# Deployment Guide: Render & Vercel

This guide explains how to deploy the **Bulk Mail Sender** application using **Render** (free cloud Python backend) and **Vercel** (optional fast global frontend).

---

## Why Render for the Backend?

Sending bulk emails with document attachments and real-time streaming progress requires persistent TCP connections (SMTP on SSL port 465) and long-lived streaming connections (SSE). 
- **Render** runs a full Python environment with Gunicorn that supports persistent SMTP connections and streaming.
- **Render Free Tier Sleep Behavior**: Free services on Render automatically spin down / go to sleep after 15 minutes of inactivity. When a request comes in, a cold start takes ~25–45 seconds.

### How the New "Wake Up Server" Feature Solves This:
1. **Status Pill**: Shows whether the server is **Online (Awake)**, **Waking Up**, or **Sleeping**.
2. **Wake Up Server Button**: Located in the top header. You can click it before sending your campaign to pre-warm the Render container.
3. **Automatic Keep-Alive**: When enabled, the open web page automatically pings the backend every 10 minutes so Render **never goes to sleep** while you are composing your emails!

---

## Deployment Option 1: Full-Stack on Render (Simplest, Recommended)

In this setup, Render hosts both the user interface and the Python email engine.

### Step 1: Push Code to GitHub
1. Create a repository on GitHub (e.g. `bulk-mail-sender`), set it to **Private** or **Public**.
2. Run in terminal:
   ```bash
   git add .
   git commit -m "Update deployment files"
   git remote add origin https://github.com/<YOUR_USERNAME>/bulk-mail-sender.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Create Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** > **Web Service**.
2. Select your GitHub repository.
3. Settings:
   - **Name**: `bulk-mail-sender`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --workers 1 --threads 8 --timeout 300`
   - **Plan**: **Free**
4. Click **Create Web Service**.
5. Once deployed, open your live URL: `https://bulk-mail-sender-xxxx.onrender.com`.

---

## Deployment Option 2: Frontend on Vercel + Backend on Render

If you deploy your project to **Vercel** and your backend to **Render**:

### Step 1: Deploy Backend on Render
1. Deploy your repository on Render as a Web Service.
2. Copy your Render service URL (e.g., `https://mail-dispatcher-xyz.onrender.com`).

### Step 2: Deploy to Vercel & Add Environment Variable
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and import your `Pratik-1213/Mail-Dispatcher` repository.
2. In the **Environment Variables** section on Vercel, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `RENDER_BACKEND_URL` | `https://your-backend.onrender.com` | Your live Render backend URL |

3. Click **Deploy**.

> **How it works**: Vercel reads `RENDER_BACKEND_URL` from your environment variables and automatically points all frontend requests (health check, SMTP verify, attachments, bulk dispatch) to your Render backend without needing any manual configuration in the browser!


---

## User Credentials Security

- The application **does not contain hardcoded credentials**.
- Each user simply enters their own Gmail address and their 16-character Google App Password in the form.
- The **Remember my credentials on this device** checkbox saves the credentials only in the user's private browser `localStorage` so they don't have to re-enter them on their own computer, without exposing them to other users.
