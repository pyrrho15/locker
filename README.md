# Locker — password manager (Phase 1 backend)

Next.js App Router + MongoDB/Mongoose backend for a password manager.

Phase 1 scope:

- Register / login with an email and password.
- User passwords are hashed with **bcrypt** (12 salt rounds) before storage.
- Authentication uses a signed **JWT** in an `httpOnly` cookie. The token is also
  returned in the JSON response so Postman/API clients can use
  `Authorization: Bearer <token>`.
- Every user owns one **LOCKER** containing an array of identifiers
  (`{ identifier, credential }`). Credentials are intentionally **not encrypted**
  in phase 1, as requested.
- `proxy.ts` rejects unauthenticated requests to protected routes before they
  reach the handlers, and every handler verifies the token again.

## Setup

1. Add your MongoDB connection string to `.env.local`:

   ```bash
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/locker?retryWrites=true&w=majority
   ```

   `AUTH_SECRET` is already generated in `.env.local`. To rotate it:

   ```bash
   openssl rand -hex 32
   ```

   Optional: if your URI has no database name (`...mongodb.net/?retryWrites=...`),
   set `MONGODB_DB=locker`. Otherwise the app defaults to `locker` instead of
   Mongoose's default `test` database.

2. Run the dev server:

   ```bash
   npm run dev
   ```

Collections created automatically: `users` and `lockers`.

## Test UI

A small UI is included so the backend can be exercised without Postman:

- `/register` — creates a user + locker (auto signs in).
- `/login` — signs in and stores the httpOnly cookie.
- `/dashboard` — protected page that loads the locker directly from MongoDB,
  plus forms to add, reveal, edit, and delete identifiers. Mutations call the
  same `/api/locker/identifiers` endpoints used by Postman.

The dashboard page is protected by `proxy.ts` and re-checks the session in the
Server Component before querying the database.

## Data model

```
USER                                    LOCKER
_id            ObjectId                 _id            ObjectId
email          String (unique)          userId         ObjectId -> USER._id (unique)
password       String (bcrypt hash)     identifiers    [{
lockerId       ObjectId -> LOCKER._id                   _id,
createdAt      Date                                     identifier: String,
updatedAt      Date                                     credential: String
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

## Security notes for later phases

- Credentials are plain text in MongoDB right now — add field-level encryption
  before production.
- Tokens last 7 days; there is no refresh/revocation list yet.
- No rate limiting or account lockout on login yet.
- Add CSRF protection if the cookie flow is used from a separate frontend.
