# Gmail Workspace OAuth Setup (Luxselle Shared Inbox)

Use this to connect supplier email sync to your **Luxselle Google Workspace mailbox** (not personal Gmail).

## Goal

Get these production values:
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `GMAIL_USER` (your Luxselle mailbox)

---

## 1) Use the Correct Google Account

1. Sign in to Google Cloud with your **Workspace admin** account.
2. Open your Luxselle project.
3. Confirm this project is under your Workspace org (recommended).

---

## 2) Configure OAuth Consent

1. Go to `Google Auth Platform > Audience`.
2. If available, set app to **Internal**.
3. Go to `Google Auth Platform > Data Access`.
4. Add scope:
   - `https://www.googleapis.com/auth/gmail.readonly`

Note:
- If app is `External` + `Testing`, refresh tokens can expire quickly.
- Internal Workspace setup is preferred for long-term stability.

---

## 3) Enable Gmail API

1. Go to `APIs & Services > Library`.
2. Search for **Gmail API**.
3. Click **Enable**.

---

## 4) Create OAuth Client

1. Go to `Google Auth Platform > Clients > Create client`.
2. Application type: **Web application**.
3. Name: `Luxselle Supplier Gmail Sync`.
4. Authorized redirect URI:
   - `https://developers.google.com/oauthplayground`
5. Create client.
6. Copy:
   - `Client ID`
   - `Client Secret`

---

## 5) Generate Refresh Token (for Luxselle Mailbox)

1. Open OAuth Playground:
   - `https://developers.google.com/oauthplayground`
2. Click gear icon:
   - enable **Use your own OAuth credentials**
   - paste your `Client ID` and `Client Secret`
3. In scopes, add:
   - `https://www.googleapis.com/auth/gmail.readonly`
4. Click **Authorize APIs**.
5. Sign in as your **Luxselle mailbox user**.
6. Click **Exchange authorization code for tokens**.
7. Copy the `refresh_token`.

---

## 6) Save Values in Railway

Set these backend variables:

```bash
SUPPLIER_EMAIL_ENABLED=true
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
GMAIL_USER=your-luxselle-mailbox@yourdomain.com
SUPPLIER_EMAIL_DEFAULT_QUERY=has:attachment newer_than:30d
SUPPLIER_EMAIL_MAX_ATTACHMENT_MB=10
```

---

## 7) Verify

1. Call `GET /api/suppliers/email/status`
2. Confirm:
   - `enabled: true`
   - `connected: true`
   - `mailbox` matches Luxselle mailbox
3. In Supplier Hub, click **Sync inbox now**.

---

## Troubleshooting

- `connected: false`:
  - check `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER`
- `invalid_grant`:
  - refresh token is invalid/expired; regenerate in OAuth Playground
- No emails imported:
  - check `SUPPLIER_EMAIL_DEFAULT_QUERY`
  - confirm supplier `sourceEmails` matches sender
  - confirm supplier has `importTemplate` configured
