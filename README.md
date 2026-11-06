# Locker — password manager (Phase 2: encrypted locker)

Next.js App Router + MongoDB/Mongoose password manager.

Current scope:

- Register / login with an email and password.
- User passwords are hashed with **bcrypt** (12 salt rounds) before storage.
- Authentication uses a signed **JWT** in an `httpOnly` cookie. The token is also
  returned in the JSON response so Postman/API clients can use
  `Authorization: Bearer <token>`.
- Every user owns one **LOCKER** containing an array of identifiers
  (`{ identifier, credential }`).
- Both `identifier` and `credential` are encrypted with **AES-256-GCM** before
  they are written to MongoDB. The API only returns plaintext to the
  authenticated owner.
- `proxy.ts` rejects unauthenticated requests to protected API routes before
  they reach the handlers, and every handler verifies the token again.

## Setup

1. Add the required values to `.env.local` (see `.env.example`):

   ```bash
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/locker?retryWrites=true&w=majority
   MONGODB_DB=locker
   AUTH_SECRET=<random secret>
   CREDENTIALS_ENCRYPTION_KEY=<64 hex characters>
   ```

   Generate the secrets with:

   ```bash
   openssl rand -hex 32
   ```

   `MONGODB_DB` is optional when the URI already includes a database name.

   **Back up `CREDENTIALS_ENCRYPTION_KEY` somewhere safe.** It is not stored in
   MongoDB. Losing it means the encrypted locker data can no longer be
   decrypted, even with a database backup.

2. If you have locker rows from before encryption was added, encrypt them once:

   ```bash
   npm run migrate:encrypt
   ```

   The script rewrites only plaintext values, leaves existing ciphertext alone,
   and is safe to run more than once.

3. Run the dev server:

   ```bash
   npm run dev
   ```

Collections created automatically: `users` and `lockers`.

## Test UI

A small UI is included so the backend can be exercised without Postman:

- `/` is the only page. The Server Component reads the session cookie:
  - signed out: sign in / create account panel (register auto-signs in);
  - signed in: profile summary, add-credential form, and the saved credentials
    list with reveal, edit, and delete controls.
- The fixed header contains the brand and a day/night theme toggle. The choice
  is saved in `localStorage` and applied before first paint.
- Mutations call the same `/api/locker/identifiers` endpoints used by Postman.
- Old `/login`, `/register`, and `/dashboard` URLs permanently redirect to `/`.

The page re-checks the session in the Server Component before querying the
database. `proxy.ts` guards the API routes.

## Encryption at rest

Locker fields are encrypted transparently by `models/Locker.ts`:

- Algorithm: **AES-256-GCM** (authenticated encryption).
- A fresh random **12-byte IV** per value.
- The field name (`locker:v1:identifier` or `locker:v1:credential`) is bound as
  **AAD**, so ciphertext cannot be moved between fields without failing.
- Stored format: `enc:v1:<iv b64>:<auth tag b64>:<ciphertext b64>`.
- The key comes from `CREDENTIALS_ENCRYPTION_KEY` (32 bytes). The app throws a
  clear error if it is missing or the wrong length.
- Legacy plaintext rows are still readable, and `npm run migrate:encrypt`
  converts them in place.

Mongoose schema setters encrypt on write and getters decrypt on read, so route
handlers and Server Components work with plaintext while MongoDB only stores
ciphertext. Reads of locker data intentionally use hydrated documents because
`.lean({ getters: true })` does not run getters on nested subdocuments.

## Data model

```
USER                                    LOCKER
_id            ObjectId                 _id            ObjectId
email          String (unique)          userId         ObjectId -> USER._id (unique)
password       String (bcrypt hash)     identifiers    [{
lockerId       ObjectId -> LOCKER._id                   _id,
createdAt      Date                                     identifier: String (AES-256-GCM ciphertext),
updatedAt      Date                                     credential: String (AES-256-GCM ciphertext)
                                                       }]
                                        createdAt      Date
                                        updatedAt      Date
```

Each identifier sub-document has its own `_id`, so a single credential can be
updated or deleted without rewriting the whole array.

## API

All responses use one shape:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Message", "details": [] }
```

### Auth

| Method | Path                 | Auth | Description                                        |
| ------ | -------------------- | ---- | -------------------------------------------------- |
| POST   | `/api/auth/register` | No   | Create user + locker, sets cookie, returns token   |
| POST   | `/api/auth/login`    | No   | Verify password, sets cookie, returns token        |
| POST   | `/api/auth/logout`   | No   | Clears the session cookie                          |
| GET    | `/api/auth/me`       | Yes  | Current user                                       |

### Locker

| Method | Path                           | Auth | Description                              |
| ------ | ------------------------------ | ---- | ---------------------------------------- |
| GET    | `/api/locker`                  | Yes  | Locker + all identifiers                 |
| GET    | `/api/locker/identifiers`      | Yes  | Identifiers list with count              |
| POST   | `/api/locker/identifiers`      | Yes  | Add `{ identifier, credential }`         |
| GET    | `/api/locker/identifiers/:id`  | Yes  | Single identifier                        |
| PATCH  | `/api/locker/identifiers/:id`  | Yes  | Update identifier and/or credential      |
| DELETE | `/api/locker/identifiers/:id`  | Yes  | Delete one identifier                    |

### curl examples

```bash
# Register (also logs you in)
curl -i -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}'

# Login and save the returned token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0)).data.token')

# Add a credential
curl -X POST http://localhost:3000/api/locker/identifiers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"identifier":"instagram:johndoe","credential":"hunter2"}'

# Dashboard data
curl http://localhost:3000/api/locker \
  -H "Authorization: Bearer $TOKEN"

# Update one entry
curl -X PATCH http://localhost:3000/api/locker/identifiers/<IDENTIFIER_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"credential":"new-password"}'

# Delete one entry
curl -X DELETE http://localhost:3000/api/locker/identifiers/<IDENTIFIER_ID> \
  -H "Authorization: Bearer $TOKEN"
```

In Postman, either enable the cookie jar (the `locker_token` cookie is set on
register/login) or copy `data.token` into **Authorization → Bearer Token**.

## Status codes

- `200` OK, `201` created
- `400` malformed JSON / invalid id
- `401` missing, invalid, or expired token / wrong credentials
- `404` user, locker, or identifier not found
- `409` duplicate email or duplicate identifier in the locker
- `422` schema validation failed (`details` lists the fields)
- `500` unexpected server error

## Security notes

- Locker `identifier` and `credential` values are encrypted at rest. A database
  dump without `CREDENTIALS_ENCRYPTION_KEY` does not expose them.
- Keep the encryption key out of the repository and back it up. The current
  implementation has no automatic key rotation; rotating the key requires
  decrypting and re-encrypting existing rows with the new key.
- Tokens last 7 days; there is no refresh/revocation list yet.
- No rate limiting or account lockout on login yet.
- Add CSRF protection if the cookie flow is used from a separate frontend.
