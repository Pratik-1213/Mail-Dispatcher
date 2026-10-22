# Step-by-Step Guide: Deploying to Render (Free Cloud Web Service)

This guide walks you through deploying the **Bulk Mail Sender** application to [Render](https://render.com) so you can access it anywhere from any device.

---

## Prerequisites
1. A free [GitHub](https://github.com) account.
2. A free [Render](https://render.com) account (you can sign up with GitHub).

---

## Step 1: Push Your Code to GitHub

1. Open your browser and go to [GitHub - New Repository](https://github.com/new).
2. Enter a repository name (e.g. `bulk-mail-sender`).
3. Choose **Private** (recommended for security) or **Public**, then click **Create repository**.
4. In your terminal / command prompt, run the following commands (replace `YOUR_USERNAME` with your GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/bulk-mail-sender.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create a Web Service on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top right corner and select **Web Service**.
3. Under **Connect a repository**, find your `bulk-mail-sender` repository and click **Connect**.
4. Configure the settings:
   - **Name**: `bulk-mail-sender` (or any name you like)
   - **Region**: Choose the closest region (e.g., *Singapore*, *Frankfurt*, *Oregon*)
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --workers 1 --threads 8 --timeout 300`
   - **Instance Type**: **Free**

---

## Step 3: Add Environment Variables (Secure Credentials)

Scroll down to the **Environment Variables** section on Render and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `DEFAULT_SENDER_EMAIL` | `pratik1213.coep@gmail.com` | Your default Gmail address |
| `DEFAULT_SENDER_PASSWORD` | `xker rbhl byno rvig` | Your Gmail App Password |
| `PYTHON_VERSION` | `3.11.9` | Recommended Python runtime on Render |

---

## Step 4: Deploy

1. Click **Create Web Service** at the bottom.
2. Render will automatically:
   - Clone your repository.
   - Install Python dependencies via `pip`.
   - Start the high-performance Gunicorn WSGI server.
3. Once the build completes, Render will provide a free live HTTPS URL:
   ```
   https://bulk-mail-sender-xxxx.onrender.com
   ```
4. Click your live URL and test sending an email!

---

## Continuous Deployment
Whenever you make changes to your code and run `git push origin main`, Render will automatically re-build and re-deploy your latest version without any manual steps.
