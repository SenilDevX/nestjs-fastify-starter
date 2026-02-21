# Frontend Integration Guide — Auth Module

Base URL: `{{API_URL}}/auth`

All authenticated endpoints require: `Authorization: Bearer <accessToken>`

Password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character.

---

## Response Wrapper

All successful responses are wrapped:
```json
{ "success": true, "data": { ... } }
```

All error responses are wrapped:
```json
{ "success": false, "error": { "statusCode": 401, "message": "Invalid credentials" } }
```

`message` can be a string or an array of strings (for validation errors).

---

## 1. Registration

```
POST /auth/register
Public | Rate limit: 5/min
```

**Request**
```json
{ "email": "user@example.com", "password": "P@ssw0rd" }
```

**Response** `201`
```json
{
  "success": true,
  "data": { "id": "...", "email": "user@example.com" }
}
```

---

## 2. Login

```
POST /auth/login
Public | Rate limit: 10/min
```

**Request**
```json
{ "email": "user@example.com", "password": "P@ssw0rd" }
```

**Response — standard user** `200`
```json
{
  "success": true,
  "data": { "accessToken": "...", "refreshToken": "..." }
}
```

**Response — 2FA enabled** `200`
```json
{
  "success": true,
  "data": { "requiresTwoFactor": true, "tempToken": "..." }
}
```

Store the `tempToken` — it's needed for `/auth/2fa/authenticate` and expires in 5 minutes.

**Response — admin-created user (no 2FA yet)** `200`
```json
{
  "success": true,
  "data": { "accessToken": "...", "refreshToken": "..." }
}
```

New users get full tokens since 2FA isn't enabled yet. Check `/auth/me` for onboarding flags.

---

## 3. Token Refresh

```
POST /auth/refresh
Public | Rate limit: 20/min
```

**Request**
```json
{ "refreshToken": "..." }
```

**Response** `200`
```json
{
  "success": true,
  "data": { "accessToken": "...", "refreshToken": "..." }
}
```

The old refresh token is invalidated. Always store the new pair.

---

## 4. Get Profile

```
GET /auth/me
Authenticated
```

**Response** `200`
```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "user@example.com",
    "isTwoFactorEnabled": false,
    "mustSetupTwoFactor": true,
    "mustChangePassword": true,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### Onboarding flags

| Flag | Meaning |
|---|---|
| `mustSetupTwoFactor: true` | User must complete 2FA setup before proceeding |
| `mustChangePassword: true` | User must change their temporary password |

**Frontend enforcement order:**
1. If `mustSetupTwoFactor` is `true` → show 2FA setup screen first
2. If `mustChangePassword` is `true` → show change password screen second
3. Both `false` → user is fully onboarded

---

## 5. Admin: Create User

```
POST /auth/create-user
Authenticated | Rate limit: 5/min
```

**Request**
```json
{ "email": "newuser@example.com", "requireTwoFactorSetup": true }
```

`requireTwoFactorSetup` is optional (defaults to `false`). When `true`, the user must set up 2FA during onboarding.

**Response** `201`
```json
{
  "success": true,
  "data": { "id": "...", "email": "newuser@example.com" }
}
```

The user receives a welcome email with a temporary password.

---

## 6. Two-Factor Authentication

### 6a. Setup 2FA

```
POST /auth/2fa/setup
Authenticated
```

**Response** `200`
```json
{
  "success": true,
  "data": { "qrCodeUrl": "data:image/png;base64,...", "secret": "JBSWY3DPEHPK3PXP" }
}
```

Display the `qrCodeUrl` as an image for the user to scan with their authenticator app. Show `secret` as a manual entry fallback.

### 6b. Confirm 2FA Setup

```
POST /auth/2fa/confirm
Authenticated | Rate limit: 5/min
```

**Request**
```json
{ "token": "123456" }
```

**Response** `200`
```json
{
  "success": true,
  "data": { "message": "Two-factor authentication enabled" }
}
```

If the user had `mustSetupTwoFactor: true`, this clears the flag. No logout occurs — the session stays alive.

### 6c. Authenticate with 2FA (on login)

```
POST /auth/2fa/authenticate
Authenticated (temp token) | Rate limit: 5/min
```

Use the `tempToken` from login as the Bearer token.

**Request**
```json
{ "token": "123456" }
```

**Response** `200`
```json
{
  "success": true,
  "data": { "accessToken": "...", "refreshToken": "..." }
}
```

Replace the temp token with these full tokens.

### 6d. Disable 2FA

```
POST /auth/2fa/disable
Authenticated | Rate limit: 5/min
```

**Request**
```json
{ "password": "P@ssw0rd", "token": "123456" }
```

**Response** `200`
```json
{
  "success": true,
  "data": { "message": "Two-factor authentication disabled" }
}
```

---

## 7. Change Password

```
POST /auth/change-password
Authenticated | Rate limit: 5/min
```

**Request**
```json
{ "currentPassword": "OldP@ssw0rd", "newPassword": "N3wP@ssw0rd" }
```

**Response** `200`
```json
{
  "success": true,
  "data": { "message": "Password changed successfully" }
}
```

**Behavior:**
- **During onboarding** (`mustChangePassword` was `true`): flag is cleared, session stays alive. No re-login needed.
- **Normal change**: all sessions are invalidated. Redirect to login.

---

## 8. Forgot Password

```
POST /auth/forgot-password
Public | Rate limit: 3/min
```

**Request**
```json
{ "email": "user@example.com" }
```

**Response** `200`
```json
{
  "success": true,
  "data": { "message": "If that email is registered, a reset link has been sent" }
}
```

Always returns success (prevents email enumeration). The email contains a link to: `{{CLIENT_URL}}/reset-password?token=...`

---

## 9. Reset Password

```
POST /auth/reset-password
Public | Rate limit: 5/min
```

Extract the `token` from the URL query param.

**Request**
```json
{ "token": "a1b2c3d4...", "password": "N3wP@ssw0rd" }
```

**Response** `200`
```json
{
  "success": true,
  "data": { "message": "Password reset successfully" }
}
```

All sessions are invalidated. Redirect to login.

---

## 10. Change Email

```
POST /auth/change-email
Authenticated | Rate limit: 5/min
```

**Request**
```json
{ "newEmail": "new@example.com", "password": "P@ssw0rd" }
```

**Response** `200`
```json
{
  "success": true,
  "data": { "message": "Email updated successfully" }
}
```

All sessions are invalidated. Redirect to login.

---

## 11. Logout

### Single session

```
POST /auth/logout
Authenticated
```

**Request**
```json
{ "refreshToken": "..." }
```

**Response** `200`

### All sessions

```
POST /auth/logout-all
Authenticated
```

**Response** `200`

---

## Onboarding Flow (Admin-Created Users)

```
1. Admin calls POST /auth/create-user { email, requireTwoFactorSetup: true }
2. User receives email with temporary password
3. User logs in → gets full { accessToken, refreshToken }
4. Frontend calls GET /auth/me → reads flags
5. If mustSetupTwoFactor: true →
   a. POST /auth/2fa/setup → show QR code
   b. POST /auth/2fa/confirm { token } → flag cleared
6. If mustChangePassword: true →
   a. POST /auth/change-password { currentPassword, newPassword } → flag cleared
7. User is fully onboarded — no logouts during the entire flow
```

---

## Error Examples

**Invalid credentials**
```json
{
  "success": false,
  "error": { "statusCode": 401, "message": "Invalid credentials" }
}
```

**Validation error**
```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": [
      "email must be an email",
      "password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ]
  }
}
```

**Conflict**
```json
{
  "success": false,
  "error": { "statusCode": 409, "message": "Email already registered" }
}
```

Common status codes:
- `400` — validation error / bad request
- `401` — invalid credentials / expired token
- `409` — email already exists
- `429` — rate limited
