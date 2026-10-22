# Deployment Guide: Full-Stack on Render (Free Web Service)

Deploying the **Bulk Mail Sender** directly on **Render** gives you a unified application (frontend + backend + Gmail SMTP engine) on a single free HTTPS domain.

---

## Why Render Works (and Why Vercel Doesn't)
- **Vercel** is a serverless environment (AWS Lambda) that blocks outbound raw TCP connections on custom ports like **465 (SMTPS)** and **587 (SMTP)**.
- **Render** runs a full Linux container environment with an open network stack where Gmail's SMTP servers (`smtp.gmail.com:465`) work directly without network blocking.

---

## Step 1: Push Code to GitHub
Your repository is already connected and set up at:
`https://github.com/Pratik-1213/Mail-Dispatcher.git`

If you ever make local changes, push them using:
```bash
git add .
git commit -m "Update application"
git push origin main
```

---

## Step 2: Create Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click the blue **New +** button in the top right corner and select **Web Service**.
3. Under *Connect a repository*, choose **`Pratik-1213/Mail-Dispatcher`** and click **Connect**.
4. Configure the service settings:
   - **Name**: `mail-dispatcher` (or any name you prefer)
   - **Region**: Choose any region close to you (e.g. *Singapore*, *Frankfurt*, or *Oregon*)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (default `./`)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --workers 1 --threads 8 --timeout 300`
   - **Instance Type**: **Free**
5. Click **Create Web Service** at the bottom.

---

## Step 3: Access Your Live Application

1. Render will automatically build the environment and start the Gunicorn server (typically takes 1–2 minutes).
2. Once the build log says `Your service is live 🎉`, click your live URL at the top of the Render dashboard:
   ```
   https://mail-dispatcher-xxxx.onrender.com
   ```
3. Open the link, enter your Gmail address and 16-character App Password, and send a test email!

---

## How Render Free Tier Sleep Works

- Render's free tier spins down into sleep mode after 15 minutes of inactivity.
- **Wake Up Server Button**: In the top header, click **Wake Up Server** to wake the container if it was idle.
- **Auto Keep-Alive**: When the page is open in your browser, it automatically pings the server in the background every 10 minutes so Render **never goes to sleep** while you are composing your emails!
