# cPanel Deployment Guide (Automated via GitHub Actions)

This guide walks you through automatically deploying the **Columbia Care** Next.js application to **cPanel** using a GitHub Actions workflow that requires **only 3 repository secrets**:

- `HOST` — Your cPanel FTP host / server address
- `FTP` — Your cPanel FTP username
- `PASS` — Your cPanel FTP password

---

## 1. Overview & Architecture

This application is built with **Next.js (App Router)** and contains dynamic features such as Server Actions (`src/app/actions/tour.ts`, `src/app/admin/actions.ts`), email triggers via Resend, and Supabase database interactions.

### How it works:

1. **GitHub Actions** runs on every push to your `main` branch.
2. It installs dependencies with `pnpm`, builds a self-contained production bundle using Next.js **standalone mode**, and creates an application restart trigger (`tmp/restart.txt`).
3. It uploads the build directly to your cPanel host via FTP using your 3 repository secrets: `HOST`, `FTP`, and `PASS`.
4. **cPanel's Node.js engine (Phusion Passenger)** detects the update and serves the app.

---

## 2. Step 1: Configure cPanel

### A. Create the FTP Account

1. Log in to your **cPanel** dashboard.
2. Navigate to **Files** > **FTP Accounts**.
3. Under **Add FTP Account**:
   - **Log in**: Choose a username (e.g. `columbia-deployer`).
   - **Password / Password (Again)**: Generate a secure password.
   - **Directory**: Set this to **`columbia`** (which maps to `/home/columbmq/columbia`).
     _(Do not use `public_html` — cPanel blocks Node.js apps from residing directly in `public_html`)_.
   - **Quota**: Set to **Unlimited**.
4. Click **Create FTP Account**.

> [!NOTE]
> Save these 3 credentials:
>
> - **Host**: Usually `ftp.yourdomain.com` or your cPanel server's IP address.
> - **Username**: The full username created (e.g. `columbia-deployer@yourdomain.com`).
> - **Password**: The password you generated.

---

### B. Configure Node.js in cPanel

1. In cPanel, go to **Software** > **Setup Node.js App**.
2. Click **Create Application**:
   - **Node.js version**: Choose **`20.x`** or **`22.x`**.
   - **Application mode**: Select **`Production`**.
   - **Application root**: Enter **`columbia`** _(cPanel will resolve this to `/home/columbmq/columbia`). Never use `public_html` here._
   - **Application URL**: Select your domain from the dropdown and leave the path box blank (so it serves your main website).
   - **Application startup file**: Enter **`server.js`**.
3. Under **Environment variables**, click **Add Variable** for your production variables (from `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://columbiacareafh.com`)
   - `RESEND_API_KEY` (optional)
   - `RESEND_FROM` (optional)
   - `OWNER_NOTIFICATION_EMAIL` (optional)
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (optional)
   - `TURNSTILE_SECRET_KEY` (optional)
   - `PORT`: (defaults to Passenger environment, or set `3000`)
4. Click **Create** to initialize the app.

> [!TIP]
> **Installing Dependencies in cPanel:**
> Rather than uploading heavy `node_modules` over FTP, run this command in your cPanel terminal inside `/home/columbmq/columbia`:
>
> ```bash
> npm install --omit=dev --legacy-peer-deps
> ```
>
> This installs only runtime dependencies quickly and prevents npm's peer-dependency crash.

---

## 3. Step 2: Configure the 3 GitHub Secrets

In your GitHub repository:

1. Go to **Settings** > **Secrets and variables** > **Actions**.
2. Click **New repository secret** and add the following 3 secrets:

| Secret Name | Description                         | Example Value                            |
| :---------- | :---------------------------------- | :--------------------------------------- |
| `HOST`      | FTP Server hostname or IP address   | `ftp.columbiacareafh.com` or `192.0.2.1` |
| `FTP`       | Full FTP Username created in cPanel | `columbia-deployer@columbiacareafh.com`  |
| `PASS`      | FTP Account Password                | `YourSecureFtpPassword123!`              |

_(No other secrets are needed in GitHub. All app credentials remain securely inside your cPanel environment variables)._

---

## 4. Codebase Status: Already Configured for You

You do **not** need to touch any code files. The following have already been configured in this repository:

1. **`output: "standalone"`** is already active in [`next.config.ts`](../next.config.ts).
2. **The automated deployment workflow** is already set up in [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).

All that is left for you to do is the **cPanel setup** and adding the **3 repository secrets** in GitHub.

---

## 5. Deployment Workflow Reference

The workflow file [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) is already created in the repository:

```yaml
name: Deploy to cPanel

on:
  push:
    branches: [main]
  workflow_dispatch: # Allows manual trigger from GitHub Actions tab

concurrency:
  group: deploy-cpanel
  cancel-in-progress: true

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Next.js standalone application
        run: pnpm build

      - name: Prepare deployment bundle
        run: |
          # Create a clean deployment folder
          mkdir -p deploy-dist

          # Copy standalone output (includes server.js, node_modules, and hidden .next metadata)
          cp -r .next/standalone/. deploy-dist/

          # Next.js standalone requires .next/static and public copied into the root
          mkdir -p deploy-dist/.next/static
          cp -r .next/static/. deploy-dist/.next/static/
          if [ -d "public" ]; then
            cp -r public deploy-dist/
          fi

          # Signal cPanel Passenger to automatically restart the Node.js application
          mkdir -p deploy-dist/tmp
          touch deploy-dist/tmp/restart.txt

      - name: Deploy via FTP to cPanel
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.HOST }}
          username: ${{ secrets.FTP }}
          password: ${{ secrets.PASS }}
          local-dir: ./deploy-dist/
          server-dir: ./
          dangerous-clean-slate: false # Set to true only if you want to wipe files removed from git
          exclude: |
            **/.git*
            **/.git*/**
```

---

## 6. cPanel `.htaccess` Configuration

When you create a Node.js app in cPanel, cPanel automatically writes an `.htaccess` file pointing traffic to Phusion Passenger.

If your host requires manual configuration or if you need to enforce HTTPS and clean routing, ensure your application root has an `.htaccess` file with:

```apache
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN
PassengerAppRoot "/home/columbmq/columbia"
PassengerBaseURI "/"
PassengerNodejs "/home/columbmq/nodevenv/columbia/20/bin/node"
PassengerAppType node
PassengerStartupFile server.js
# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END

# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

_(Replace `/home/YOUR_CPANEL_USER/columbia` with the exact path shown at the top of your cPanel "Setup Node.js App" page)._

---

## 7. How the Deployment Lifecycle Works

1. You push a commit to the `main` branch.
2. GitHub Actions fires:
   - Builds the production bundle on GitHub's fast Ubuntu runners.
   - Bundles all necessary files into `deploy-dist`.
   - Creates `tmp/restart.txt`.
   - Uploads via FTP using `secrets.HOST`, `secrets.FTP`, and `secrets.PASS`.
3. When the FTP upload completes:
   - cPanel's Passenger service observes that `tmp/restart.txt` has a new timestamp.
   - Passenger smoothly restarts the Node.js process with zero downtime.
4. Your live site is now running the new code.

---

## 8. Troubleshooting Checklist

| Issue                                                               | Cause                                                             | Solution                                                                                                                                                                                                               |
| :------------------------------------------------------------------ | :---------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FTP Connection Failed / Timeout**                                 | Firewall or wrong host/port                                       | Use the direct server IP instead of `ftp.yourdomain.com`, or ensure Port 21 is reachable.                                                                                                                              |
| **Login Incorrect (530)**                                           | Incomplete username or bad password                               | In cPanel, FTP usernames are usually full email format: `username@domain.com`. Verify in cPanel > FTP Accounts.                                                                                                        |
| **Files uploaded to wrong directory**                               | FTP directory path                                                | In cPanel FTP Accounts, ensure the directory matches the Application Root of your Node.js App.                                                                                                                         |
| **App not restarting after push**                                   | Missing `restart.txt` trigger                                     | Check that `tmp/restart.txt` exists in your application root. You can also click **Restart** inside cPanel's Node.js App interface.                                                                                    |
| **503 / 500 Internal Server Error**                                 | Missing environment variables or node version mismatch            | Check the `stderr.log` file in your application folder on cPanel. Verify all required environment variables are set in cPanel > Setup Node.js App.                                                                     |
| **npm error `Cannot read properties of null (reading 'edgesOut')`** | Clicked "Run NPM Install" in cPanel or ran `npm install` manually | **Do not run npm install on cPanel.** The standalone build uploaded via GitHub Actions already contains all needed dependencies. If a broken `node_modules` was created, remove it or let GitHub Actions overwrite it. |
