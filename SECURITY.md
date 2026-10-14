# MyDistrict — Security Hardening Checklist

> Living document. Update as items are completed. Reference: `REQUIREMENTS.md` §2–§4.

---

## 🔴 Phase 1 — Critical (Before Real Data)

### S-01: KYC File Privacy
**Risk**: ID proofs, selfies, address proofs served publicly at `/uploads/kyc/*`
**Fix**:
- [ ] Set `STORAGE_DRIVER=s3` (or `minio` for local)
- [ ] Configure `S3_*` env vars
- [ ] Replace `upload.ts:23` `publicFileUrl()` → generate signed GET URL (15-min expiry)
- [ ] Admin portal: `GET /api/v1/admin/kyc/:fileId/signed-url` endpoint
- [ ] Remove `app.use("/uploads", express.static(uploadDir))` in prod
- [ ] Add bucket policy: deny public read; allow signed URLs only

**Validation**: `curl /uploads/kyc/<any-file>` → 403/404 in prod

---

### S-02: Refresh Token Rotation & Revocation
**Risk**: Long-lived refresh tokens (30d) never rotated; no revocation on logout/block
**Fix**:
- [ ] Add `RefreshToken` model:
  ```prisma
  model RefreshToken {
    id        String   @id @default(cuid())
    userId    String
    tokenHash String   // bcrypt hash
    expiresAt DateTime
    revokedAt DateTime?
    createdAt DateTime @default(now())
    @@index([userId])
  }
  ```
- [ ] On login: hash refresh token, store, return plaintext to client
- [ ] On `/auth/refresh`: verify hash, delete old, issue new pair (rotate)
- [ ] On `/auth/logout` + block/unblock: revoke all user's refresh tokens
- [ ] Add cleanup job: delete expired/revoked tokens daily

**Validation**: Reuse old refresh token → 401; block user → existing access token still works until expiry (15m), refresh fails immediately

---

### S-03: Admin 2FA
**Risk**: Super-admin protected by single-factor OTP only
**Fix**:
- [ ] Choose: TOTP (`otplib`) or WebAuthn (`@simplewebauthn/server`)
- [ ] Add `totpSecret` / `webauthnCredentials` to `User` model
- [ ] Admin login flow: OTP → if admin role → challenge 2FA → issue `adminToken`
- [ ] Enforce 2FA for `ADMIN`/`SUPER_ADMIN` in `requireAdmin` middleware
- [ ] Recovery codes (TOTP) or backup keys (WebAuthn)

**Validation**: Admin login without 2FA → 403

---

### S-04: Auth Endpoint Rate Limiting
**Risk**: Unlimited OTP send/verify → SMS cost abuse, brute force
**Fix**:
- [ ] Per-IP limit: 3 req/min, 10 req/hr on `/auth/send-otp`
- [ ] Per-phone limit: 1 req/min, 3 req/hr on `/auth/send-otp`
- [ ] Per-IP limit: 5 req/min on `/auth/verify-otp`
- [ ] Use `express-rate-limit` with custom key generator (IP + phone)
- [ ] Return `Retry-After` header; log violations

**Validation**: Burst requests → 429 with `Retry-After`

---

### S-05: Razorpay Webhook Verification
**Risk**: Unverified webhook → fake payment.captured events
**Fix**:
- [ ] Set `RAZORPAY_WEBHOOK_SECRET` in env
- [ ] `payments.ts:46`: verify `X-Razorpay-Signature` header:
  ```ts
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
  if (req.headers['x-razorpay-signature'] !== expected) return res.status(400).send('Invalid signature');
  ```
- [ ] Handle `payment.captured`, `payment.failed`, `refund.processed`
- [ ] Idempotency: store `razorpay_payment_id` processed; ignore duplicates

**Validation**: POST invalid signature → 400; valid → 200 + booking updated

---

### S-06: CORS Lockdown
**Risk**: `origin: true` reflects any `Origin` header with `credentials: true`
**Fix**:
- [ ] Define `ALLOWED_ORIGINS` env (comma-separated): `https://mydistrict.example,https://admin.mydistrict.example`
- [ ] In `index.ts`:
  ```ts
  const allowed = (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean);
  app.use(cors({ origin: allowed, credentials: true }));
  ```
- [ ] Preflight `OPTIONS` handled automatically

**Validation**: Request from `https://evil.com` → CORS error

---

### S-07: Fail-Fast on Missing Prod Secrets
**Risk**: Dev defaults used in production
**Fix**:
- [ ] In `jwt.ts` and `index.ts`:
  ```ts
  if (process.env.NODE_ENV === 'production') {
    ['JWT_ACCESS_SECRET','JWT_REFRESH_SECRET','JWT_ADMIN_SECRET','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET']
      .forEach(k => { if (!process.env[k]) throw new Error(`Missing required env: ${k}`); });
  }
  ```

**Validation**: Start API in prod without secrets → crash on boot

---

## 🟠 Phase 2 — High (Before Launch)

### S-08: Price Final Validation
**Risk**: Provider inflates `priceFinal` on completion
**Fix**:
- [ ] In `bookings.ts:82-90`: clamp `priceFinal` to `priceQuoted * 1.2` max
- [ ] Or require consumer explicit confirmation for any increase
- [ ] Log price changes in `AuditLog`

**Validation**: Provider submits `priceFinal: 9999` for ₹299 booking → rejected/clamped

---

### S-09: API Versioning Policy
**Risk**: Breaking changes without migration path
**Policy**:
- [ ] URL versioning: `/api/v1/`, `/api/v2/`
- [ ] Deprecation header: `Sunset: <date>`, `Link: <new-url>; rel="successor-version"`
- [ ] Minimum 3-month overlap; communicate via email + in-app banner
- [ ] Document in `docs/api-versioning.md`

---

## 🟡 Phase 3 — Medium (Post-Launch)

### S-11: Penetration Test
- [ ] Engage third-party for OWASP API Top 10 assessment
- [ ] Remediate critical/high within 30 days
- [ ] Annual re-test

### S-12: Per-User Rate Limits
- [ ] Token bucket per `userId` on booking/create, review, KYC submit
- [ ] Configurable via Redis (BullMQ)

### S-13: CSP Headers
- [ ] Next.js `headers()` in `next.config.js`:
  ```js
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.mydistrict.example https://api.razorpay.com;" }
    ]}];
  }
  ```

### S-14: Secrets Rotation
- [ ] Migrate secrets to HashiCorp Vault or AWS Secrets Manager
- [ ] Rotate JWT secrets quarterly (with grace period for existing tokens)
- [ ] Rotate Razorpay keys per their policy

---

## 📋 Security Audit Log

| Date | Auditor | Scope | Findings | Status |
|------|---------|-------|----------|--------|
| 2026-10-14 | Internal (AI) | Full codebase | 10 gaps (4 critical) | Documented |

---

## 🛡️ Secure Coding Standards (Enforced)

| Rule | Tool |
|------|------|
| All inputs validated via Zod schemas | `middleware/validate.ts` |
| No raw SQL / Prisma `$queryRawUnsafe` | Code review |
| Secrets never in code / logs | `.gitignore`, `dotenv` |
| Error messages don't leak internals | `index.ts:38-41` generic 500 |
| Dependencies scanned | `npm audit` in CI |
| Lockfile committed | `package-lock.json` in git |

---

## 🚨 Incident Response (Draft)

1. **Detect**: Alert on 429 spikes, 5xx spikes, webhook failures, auth anomalies
2. **Contain**: Revoke refresh tokens, block IPs, disable webhook endpoint
3. **Investigate**: Audit logs (`/admin/audit-logs`), DB forensics
4. **Notify**: Affected users (email/SMS), Razorpay if payment-related
5. **Recover**: Patch, rotate secrets, redeploy
6. **Postmortem**: Blameless, documented in `docs/postmortems/`

---

## ✅ Definition of Done (Security)

A feature is "secure" when:
- [ ] Input validation via shared Zod schema
- [ ] AuthZ checked (role + ownership)
- [ ] Audit log entry written
- [ ] No secrets in response
- [ ] Rate limited appropriately
- [ ] Tested with malicious payloads (SQLi, XSS, path traversal)
- [ ] Documented in this checklist