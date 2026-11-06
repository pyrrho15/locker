---
name: nextjs-mongodb
description: Connect a Next.js (App Router) app to MongoDB with Mongoose using the MONGODB_URI the user already has in .env.local, and build everything around it - a cached DB connection, model files (including nested schemas, arrays and references), efficient CRUD API route handlers, and the frontend fetch code that calls them. Use whenever the user mentions Next.js with MongoDB, Mongoose, Atlas, MONGODB_URI, schemas, models, API routes, route handlers, CRUD, or loading/saving database data from a Next.js page, even if they don't name every piece.
---

# Next.js + MongoDB (Mongoose)

## How the pieces fit

```
.env.local (URI)  ->  lib/db.ts (connect)  ->  models/*.ts (schema)  ->  app/api/**/route.ts (CRUD)  ->  frontend fetch()
```

Quick vocabulary: a **cluster** hosts **databases**; a database holds **collections** (like tables); a collection holds **documents** (JSON-like records). A **model** is the code that describes one collection. The **URI** is the connection string.

## 1. The URI: already provided, just use it

The user already has a MongoDB cluster and its connection string. Your job is only to **read it from the environment and use it**.

- It lives in `.env.local` as `MONGODB_URI`. Read it with `process.env.MONGODB_URI`.
- Do **not** create a cluster, ask the user to paste the URI into the chat, print it, or hardcode it.
- Do **not** prefix it with `NEXT_PUBLIC_` (that exposes it to the browser). Next.js loads `.env.local` automatically and keeps non-`NEXT_PUBLIC_` variables server-only.
- Keep `.env.local` out of git (`create-next-app` already ignores `.env*`).
- If `MONGODB_URI` is missing, tell the user to add that one line: `MONGODB_URI=<their connection string>`. Restart `npm run dev` after any change.

Two things to check when something looks wrong:

- **No database name in the URI.** Atlas URIs often end in `mongodb.net/?retryWrites=true...` with no `/<dbname>`. Mongoose then silently uses a database called `test`. Fix by adding the name to the URI (`...mongodb.net/mydb?retry...`) or passing `dbName: "mydb"` to `mongoose.connect()` (see section 4).
- **Connection errors.** Usually the URI still contains the `<db_password>` placeholder, the password has unencoded special characters (`@` becomes `%40`), or Atlas **Network Access** doesn't allow the current IP. "Allow access from everywhere" (`0.0.0.0/0`) is fine for learning, but tighten it for production.

## 2. Install

```bash
npm install mongoose
```

## 3. Folder structure

```
project-root/
├── .env.local             # MONGODB_URI lives here (never commit)
├── lib/
│   └── db.ts              # connection helper (cached)
├── models/
│   └── Task.ts            # one file per collection
├── components/
│   └── TaskList.tsx       # client component that calls the API
└── app/
    ├── page.tsx           # renders <TaskList />
    └── api/
        └── tasks/
            ├── route.ts        # collection level: GET (list) + POST (create)
            └── [id]/
                └── route.ts    # single item: PUT (update) + DELETE (and GET one)
```

If the project uses a `src/` folder, put `lib/`, `models/`, `components/` and `app/` inside it. Imports use the default `@/` alias.

## 4. Connect: `lib/db.ts`

Next.js reloads code in dev and runs routes serverless, so calling `mongoose.connect()` on every request opens too many connections. Cache the connection on `global` and reuse it.

```ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI; // provided by the user in .env.local
if (!MONGODB_URI) throw new Error("Please define MONGODB_URI in .env.local");

declare global {
  var mongooseCache:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const cached = (global.mongooseCache ??= { conn: null, promise: null });

export async function connectDB() {
  if (cached.conn) return cached.conn; // reuse existing connection
  cached.promise ??= mongoose.connect(MONGODB_URI!, {
    bufferCommands: false,
    // dbName: "mydb", // only needed if the URI has no /<dbname>
  });
  cached.conn = await cached.promise;
  return cached.conn;
}
```

Call `await connectDB()` at the top of every route handler or Server Component that touches the database.

## 5. How to write a model

A **model** describes one collection: which fields its documents have, their types, and their rules. For any new collection:

1. Create `models/<Name>.ts`. Use a singular, capitalised name (`Task`, `Product`, `User`). Mongoose turns it into the collection `tasks`, `products`, `users`.
2. Define a `Schema` with one entry per field: `fieldName: { type: ..., ...rules }`.
3. Add `{ timestamps: true }` to get `createdAt` and `updatedAt` for free.
4. Add an index for any field you often filter or sort by.
5. Export the model with the `mongoose.models.X ||` guard so hot-reload doesn't crash it.

| You want | Write |
|---|---|
| Text | `type: String` (add `trim: true` to strip spaces) |
| Number | `type: Number` (add `min` / `max`) |
| True/false | `type: Boolean, default: false` |
| Date | `type: Date` |
| Required field | `required: true` |
| Default value | `default: "todo"` |
| Only certain values | `enum: ["todo", "done"]` |
| Must be unique | `unique: true` (creates an index) |

`models/Task.ts`:

```ts
import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["todo", "done"], default: "todo" },
  },
  { timestamps: true }
);

taskSchema.index({ createdAt: -1 }); // speeds up "newest first" queries

export type TaskType = InferSchemaType<typeof taskSchema>;

// The `||` check stops "OverwriteModelError" when Next.js hot-reloads
const Task =
  (mongoose.models.Task as Model<TaskType>) ||
  mongoose.model<TaskType>("Task", taskSchema);

export default Task;
```

## 6. Nested schemas (objects, arrays, sub-documents, references)

Extend the same `Task` model. Each kind of nesting has its own syntax:

```ts
// 1. Sub-schema for array items (define BEFORE taskSchema)
const commentSchema = new Schema(
  {
    text: { type: String, required: true },
    author: String,
  },
  { timestamps: true } // each comment gets its own _id automatically (add `_id: false` to skip)
);

const taskSchema = new Schema(
  {
    title: { type: String, required: true },

    // 2. Nested object: just write an object. No separate schema, no extra _id.
    assignee: {
      name: { type: String, required: true },
      email: { type: String, lowercase: true },
    },

    // 3. Array of simple values
    tags: [String],

    // 4. Array of sub-documents: pass the sub-schema inside [ ]
    comments: [commentSchema],

    // 5. Reference to a document in ANOTHER collection (needs models/Project.ts)
    project: { type: Schema.Types.ObjectId, ref: "Project" },
  },
  { timestamps: true }
);
```

Single sub-document (one object with its own rules and `_id`): `author: authorSchema` (no brackets).

Working with nested data:

```ts
// Query a nested field with dot notation (keep the quotes)
await Task.find({ "assignee.name": "Asha" }).lean();

// Update ONE nested field. Use dot notation inside $set, otherwise the whole object is overwritten.
await Task.findByIdAndUpdate(id, { $set: { "assignee.name": "Ravi" } }, { new: true, runValidators: true });

// Add to an array ($addToSet instead of $push avoids duplicates)
await Task.findByIdAndUpdate(id, { $push: { comments: { text: "Done", author: "Asha" } } }, { new: true });

// Remove an array item by its _id
await Task.findByIdAndUpdate(id, { $pull: { comments: { _id: commentId } } });

// Replace a reference with the real document (second argument picks fields)
await Task.find().populate("project", "name").lean();
```

When to use which:

- **Embed** (nested object / sub-document array) when the data is always read together with its parent and stays small, e.g. an address or a few comments. It needs one query and is the fastest option.
- **Reference** (`ref` + `populate`) when the data is shared between documents, large, or grows without limit, e.g. users, projects, orders.
- A nested object whose field is literally named `type` must be written `{ type: { type: String } }`, otherwise Mongoose reads it as the field's type.
- `populate("project")` needs the `Project` model to be imported somewhere in the route file (e.g. `import "@/models/Project"`), or Mongoose throws "Schema hasn't been registered".

## 7. How to write any CRUD operation (backend)

Every operation is a route handler that follows the same recipe:

1. **Pick the file.** List/create go in `app/api/<name>/route.ts`. One-item operations go in `app/api/<name>/[id]/route.ts`.
2. **Export a function named after the HTTP method**: `GET`, `POST`, `PUT`, `DELETE`.
3. **Read the input.** Body: `await req.json()`. Query string: `req.nextUrl.searchParams`. Id: `const { id } = await params`.
4. **Validate it.** Pick only the fields you expect, and check the id with `mongoose.isValidObjectId(id)`.
5. **Connect and run one Model method**: `await connectDB()`, then call the method from the table below.
6. **Return `NextResponse.json(data, { status })`**, inside a `try/catch` that logs the error with `console.error(err)` and returns a generic 500.

| Operation | HTTP | Mongoose method | File | Success status |
|---|---|---|---|---|
| Create | POST | `Model.create(data)` | `tasks/route.ts` | 201 |
| Read many | GET | `Model.find(filter).lean()` | `tasks/route.ts` | 200 |
| Read one | GET | `Model.findById(id).lean()` | `tasks/[id]/route.ts` | 200 |
| Update | PUT / PATCH | `Model.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })` | `tasks/[id]/route.ts` | 200 |
| Delete | DELETE | `Model.findByIdAndDelete(id)` | `tasks/[id]/route.ts` | 200 |

Other methods you may need: `findOne({ email })`, `countDocuments(filter)`, `insertMany([...])`, `updateMany(filter, update)`, `deleteMany(filter)`. Filters are plain objects, e.g. `Task.find({ status: "done" })`.

To add a new resource (say `products`), copy the `tasks` folder, rename it, and swap the model import.

### Create (POST): `app/api/tasks/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json(); // pick fields, never pass the raw body
    await connectDB();
    const task = await Task.create({ title, description });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
```

### Read (GET, paginated and searchable): same file, `app/api/tasks/route.ts`

```ts
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(50, Number(sp.get("limit")) || 10); // cap the page size

    // Optional search: /api/tasks?q=docs (case-insensitive "contains"; escape user input)
    const q = sp.get("q");
    const filter = q
      ? { title: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
      : {};

    await connectDB();
    const tasks = await Task.find(filter)
      .select("title description status createdAt") // return only the needed fields
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // plain objects: faster and lighter than Mongoose documents

    return NextResponse.json({ page, limit, tasks });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
```

### Update (PUT): `app/api/tasks/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";

type Ctx = { params: Promise<{ id: string }> }; // Next.js 15+: params is a Promise

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { title, description, status } = await req.json();
    await connectDB();
    const task = await Task.findByIdAndUpdate(
      id,
      { $set: { title, description, status } }, // undefined fields are skipped, so partial updates work
      { new: true, runValidators: true } // return the updated doc and apply schema rules
    ).lean();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json(task);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
```

### Delete (DELETE): same file, `app/api/tasks/[id]/route.ts`

```ts
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDB();
    const task = await Task.findByIdAndDelete(id).lean();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ message: "Task deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
```

## 8. How the frontend calls the backend

Two ways, pick by need:

| Situation | Use |
|---|---|
| Interactive UI (buttons, forms, add/edit/delete) | **Client Component** that calls the API with `fetch("/api/...")` |
| Page that only displays data | **Server Component** that queries the database directly (no fetch, no API route) |

### A. Client Component calling the API: `components/TaskList.tsx`

Rules: add `"use client"` (needed for `useState` / `useEffect`), use a **relative URL** (`/api/tasks`), send JSON with the `Content-Type` header, check `res.ok`, and reload the list after a change. In the browser `_id` arrives as a plain **string**.

```tsx
"use client";

import { useEffect, useState } from "react";

type Task = { _id: string; title: string; description?: string; status: string };

const JSON_HEADERS = { "Content-Type": "application/json" };

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // READ (GET)
  async function loadTasks() {
    try {
      const res = await fetch("/api/tasks?page=1&limit=10");
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      setTasks(data.tasks);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  // CREATE (POST)
  async function addTask(title: string) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title }),
    });
    if (res.ok) loadTasks(); // refresh the list
  }

  // UPDATE (PUT): id goes in the URL, new values in the body
  async function updateTask(id: string, title: string) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title }),
    });
    if (res.ok) loadTasks();
  }

  // DELETE: id goes in the URL, no body
  async function deleteTask(id: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) loadTasks();
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <button onClick={() => addTask("New task")}>Add task</button>
      <ul>
        {tasks.map((t) => (
          <li key={t._id}>
            {t.title}{" "}
            <button onClick={() => updateTask(t._id, t.title + " (edited)")}>Edit</button>
            <button onClick={() => deleteTask(t._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Use it in a page (`app/page.tsx`): `import TaskList from "@/components/TaskList"; export default function Home() { return <TaskList />; }`. Replace the hardcoded titles with real form inputs in the user's UI.

### B. Server Component reading the database directly: `app/tasks/page.tsx`

Faster for display-only pages (data is fetched during server rendering, which is also good for SEO). Do not `fetch("/api/...")` from a Server Component, since relative URLs don't work there. Query the model instead.

```tsx
import { connectDB } from "@/lib/db";
import Task from "@/models/Task";

export const dynamic = "force-dynamic"; // read fresh data on every request, not once at build time

export default async function TasksPage() {
  await connectDB();
  const tasks = await Task.find().sort({ createdAt: -1 }).limit(20).lean();

  return (
    <ul>
      {tasks.map((t) => (
        <li key={String(t._id)}>{t.title}</li>
      ))}
    </ul>
  );
}
```

If you pass `tasks` as a prop to a Client Component, first make it plain data, because `ObjectId` and `Date` can't cross the server/client boundary: `const plain = JSON.parse(JSON.stringify(tasks));`. Never import `mongoose`, `lib/db` or models inside a `"use client"` file.

## 9. Test the API

With the dev server running, use Postman (Body, then raw, then JSON) or curl:

```bash
curl -X POST http://localhost:3000/api/tasks -H "Content-Type: application/json" -d '{"title":"Learn Next","description":"Read the docs"}'
curl "http://localhost:3000/api/tasks?page=1&limit=10"
curl -X PUT http://localhost:3000/api/tasks/<id> -H "Content-Type: application/json" -d '{"title":"Updated"}'
curl -X DELETE http://localhost:3000/api/tasks/<id>
```

To check the data, open Atlas, then **Browse Collections**, pick the database, and open the `tasks` collection (the model name, lowercased and pluralised).

## 10. Alternative: official MongoDB driver (no Mongoose)

MongoDB's own Next.js guide uses the native driver (`npm install mongodb`). Use it only if the project already does or the user doesn't want schemas. Folder layout, route handlers and frontend stay the same; there are just no `models/`.

`lib/mongodb.ts`:

```ts
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Please add MONGODB_URI to .env.local");

const g = global as unknown as { _mongoClientPromise?: Promise<MongoClient> };
const clientPromise = (g._mongoClientPromise ??= new MongoClient(uri).connect());

export default clientPromise;
```

Use in a route handler:

```ts
import clientPromise from "@/lib/mongodb";

const client = await clientPromise;
const restaurants = await client
  .db("sample_restaurants")          // database name
  .collection("restaurants")         // collection name
  .find({ borough: "Queens" })       // filter
  .limit(20)
  .toArray();
```

## Rules to follow

1. Read the URI only from `process.env.MONGODB_URI`. Never hardcode, log, or ask for it.
2. Make sure the data lands in the right database (name in the URI or `dbName`), not the default `test`.
3. Reuse one cached connection (`connectDB`). Never call `mongoose.connect()` directly in a route.
4. One model per file in `models/`, always with the `mongoose.models.X ||` guard.
5. Embed small, always-together data. Reference large or shared data. Use dot notation to update nested fields.
6. For reads, use `.lean()`, `.select()`, `.limit()`, and an index on any field you filter or sort by.
7. For writes, destructure only the fields you expect, use `$set`, and pass `runValidators: true` on updates.
8. Validate `id` with `mongoose.isValidObjectId` and return 404 when nothing is found.
9. Return proper status codes (201 created, 400 bad input, 404 not found, 500 server error), and `console.error(err)` the real error while sending the client a generic message.
10. Interactive UI uses a Client Component with `fetch`. Display-only pages query the DB in a Server Component with `dynamic = "force-dynamic"`.
11. Database code runs only on the server: route handlers and Server Components, never `"use client"` files.
12. If the project is plain JavaScript, use the same code and drop the type annotations.

## Sources

- MongoDB docs, Next.js integration: https://www.mongodb.com/docs/drivers/node-frameworks/next-integration/
- Blog, Next.js + MongoDB CRUD: https://dev.to/hezronokwach/building-a-nextjs-back-end-with-mongodb-for-crud-operations-a-guide-to-testing-with-postman-4ne7
