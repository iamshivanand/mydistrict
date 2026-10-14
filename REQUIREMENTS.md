# MyDistrict Services Marketplace — Requirements & Gap Tracker

## 1. Functional Requirements

### ✅ Implemented (Core MVP)
| ID | Feature | Location | Status |
|----|---------|----------|--------|
| F-01 | Multi-district support (District, Pincode models) | `prisma/schema.prisma:83-100` | Done |
| F-02 | Service catalog (Category → Service) with admin CRUD | `routes/catalog.ts`, `admin/app/catalog/page.tsx` | Done |
| F-03 | Provider KYC onboarding (OTP + ID front/back + address proof + selfie + certificates + consent) | `routes/providers.ts:51-114`, `web/app/become-provider/page.tsx` | Done |
| F-04 | Admin approval queue (approve/reject/suspend + audit log) | `routes/admin.ts:16-51`, `admin/app/providers/page.tsx` | Done |
| F-05 | Booking lifecycle (REQUESTED → CONFIRMED → IN_PROGRESS → COMPLETED + completion OTP) | `routes/bookings.ts:11-96` | Done |
| F-06 | Dual payment modes (Razorpay online + offline cash/UPI) | `routes/payments.ts`, `routes/bookings.ts:32` | Done (stub) |
| F-07 | Ratings & reviews (1-5, once per booking, aggregates) | `routes/bookings.ts:106-124` | Done |
| F-08 | User blocking (consumer/provider) + audit trail | `routes/admin.ts:68-85` | Done |
| F-09 | Separate admin portal (own JWT, role-gated) | `admin/`, `middleware/auth.ts:45` | Done |
| F-10 | Provider discovery with filters (district, service, rating, pincode) | `routes/providers.ts:11-31` | Done |
| F-11 | Provider pricing management | `routes/providers.ts:122-133` | Done |
| F-12 | Consumer booking cancellation | `routes/bookings.ts:69-75` | Done |

### ❌ Missing / Partial
| ID | Feature | Notes |
|----|---------|-------|
| F-13 | **Provider location on map for consumers** | ProviderDetail shows link only; no embedded map component |
| F-14 | **Enforce `requiresLocation` per category** | Schema exists; onboarding UI doesn't enforce lat/lng when `requiresLocation=true` |
| F-15 | **Razorpay webhook verification** | `payments.ts:46` is TODO; need server-to-server confirmation |
| F-16 | **Push/SMS notifications** | `Notification` model + in-app create only; no worker |
| F-17 | **Provider availability slots** | Free-text `scheduledAt` only; no slot grid |
| F-18 | **Multi-language (Hindi/English)** | Not in scope |
| F-19 | **Admin 2FA (TOTP/WebAuthn)** | Single-factor OTP only |
| F-20 | **Price final validation** | Provider can set any `priceFinal` on completion |

---

## 2. Security Requirements (from Audit)

### Critical (Must fix before real data)
| ID | Issue | Fix |
|----|-------|-----|
| S-01 | KYC files served publicly at `/uploads/kyc/*` | Move to S3/MinIO with signed URLs (15-min expiry); admin-only access |
| S-02 | No refresh token rotation / revocation | Store refresh token hash in DB; rotate on use; revoke on block/logout |
| S-03 | Admin portal lacks 2FA | Add TOTP or WebAuthn for ADMIN/SUPER_ADMIN |
| S-04 | No rate limiting on auth endpoints | Per-IP + per-phone limits on `/send-otp` (3/min) and `/verify-otp` (5/min) |
| S-05 | Razorpay webhook unverified | Verify `X-Razorpay-Signature` HMAC |
| S-06 | CORS `origin: true` allows any origin with credentials | Restrict to known web/admin domains |

### High (Fix before launch)
| ID | Issue | Fix |
|----|-------|-----|
| S-07 | JWT secrets have dev defaults; fail fast in prod | Throw on missing secrets in `NODE_ENV=production` |
| S-08 | `priceFinal` not validated on completion | Clamp to `priceQuoted ± 20%` or require consumer confirmation |
| S-09 | No API versioning deprecation strategy | Document policy; use `/api/v1/` consistently |
| S-10 | Password hashing unused (phone-only auth) | Document phone-only; add bcrypt if passwords added |

### Medium (Post-launch hardening)
| ID | Issue | Fix |
|----|-------|-----|
| S-11 | OWASP API Top 10 penetration test | Schedule third-party audit |
| S-12 | Per-user rate limits (not just IP) | On booking/create, review |
| S-13 | CSP headers on Next.js apps | `next.config.js → headers()` |
| S-14 | Secrets rotation (Vault / AWS Secrets Manager) | Automate rotation |

---

## 3. Environment Variables Checklist

| Variable | Used in Code | Required for Prod | Notes |
|----------|--------------|-------------------|-------|
| `DATABASE_URL` | ✅ | ✅ | Postgres 16 |
| `REDIS_URL` | ⚠️ Defined, **not used** | ✅ | For BullMQ queue (Phase 2) |
| `JWT_ACCESS_SECRET` | ✅ | ✅ | 32+ chars |
| `JWT_REFRESH_SECRET` | ✅ | ✅ | 32+ chars |
| `JWT_ADMIN_SECRET` | ✅ | ✅ | 32+ chars |
| `OTP_MODE` | ✅ | ✅ | `mock` or `prod` |
| `MSG91_AUTH_KEY` | ❌ Not wired | ✅ | Or Twilio/Firebase |
| `MSG91_TEMPLATE_ID` | ❌ Not wired | ✅ | |
| `RAZORPAY_KEY_ID` | ✅ (stub works without) | ✅ | |
| `RAZORPAY_KEY_SECRET` | ✅ | ✅ | |
| `RAZORPAY_WEBHOOK_SECRET` | ❌ Not used | ✅ | For webhook verification |
| `STORAGE_DRIVER` | ❌ Not wired | ✅ | `local` or `s3` |
| `S3_ENDPOINT` | ❌ Not wired | If S3 | MinIO/R2/S3 |
| `S3_BUCKET` | ❌ Not wired | If S3 | `mydistrict-kyc` |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | ❌ Not wired | If S3 | |
| `S3_REGION` | ❌ Not wired | If S3 | `ap-south-1` |
| `NEXT_PUBLIC_API_URL` | ✅ | ✅ | `https://api.mydistrict.example/api/v1` |

---

## 4. Hardening Roadmap

### Phase 1 — Before Any Real User Data (1–2 days)
- [ ] S-01: KYC files → S3/MinIO signed URLs
- [ ] S-02: Refresh token rotation + revocation
- [ ] S-04: Rate limit `/send-otp` & `/verify-otp` per IP + phone
- [ ] S-05: Razorpay webhook HMAC verification
- [ ] S-06: CORS lockdown to known domains
- [ ] S-07: Fail-fast on missing prod secrets

### Phase 2 — Before Launch (1 week)
- [ ] S-03: Admin 2FA (TOTP via `otplib`)
- [ ] S-08: Price final validation (±20% clamp)
- [ ] F-15: Razorpay webhook handler (BullMQ worker)
- [ ] F-16: Notification dispatcher (SMS + push)
- [ ] F-14: Enforce `requiresLocation` in onboarding
- [ ] S-09: API versioning policy doc

### Phase 3 — Post-Launch
- [ ] S-11: Penetration test
- [ ] S-12: Per-user rate limits
- [ ] S-13: CSP headers
- [ ] S-14: Secrets rotation automation

---

## 5. Architecture Decisions (Recorded)

| Decision | Rationale |
|----------|-----------|
| Phone-only auth (OTP) | Lower friction for Indian market; no password reset flows |
| Separate admin portal + admin JWT | Clean RBAC boundary; IP allowlist ready |
| Monorepo (npm workspaces) | Shared types, single Prisma schema, Docker Compose |
| Docker Compose for dev | One command spins up PG, Redis, API, Web, Admin |
| Prisma ORM | Type-safe DB, migrations, seed |
| Zod schemas in shared package | Single source of truth for validation (API + web + admin + mobile) |
| Completion OTP (6-digit) | Prevents fake completion; provider asks consumer at doorstep |
| `CASH_DUE` / `CASH_COLLECTED` states | Tracks offline payments without gateway |

---

## 6. Open Decisions (Need Input)

1. **OTP provider**: MSG91 vs Twilio vs Firebase Auth?
2. **File storage**: AWS S3 vs MinIO (self-hosted) vs Cloudflare R2?
3. **Admin 2FA**: TOTP (Google Authenticator) or WebAuthn (YubiKey/passkeys)?
4. **Booking slots**: Fixed availability windows or free-text `scheduledAt` sufficient for MVP?
5. **Notifications worker**: BullMQ + Redis now, or defer to Phase 2?
6. **Budget for paid services**: Razorpay (txn fees), MSG91 (₹/SMS), S3 (storage/transfer)?