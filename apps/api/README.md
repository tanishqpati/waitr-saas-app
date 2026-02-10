# api

To install dependencies:

```bash
bun install
```

Set up the database: copy `.env.example` to `.env`, set `DATABASE_URL` to your PostgreSQL connection string, then run `bun run db:generate` and `bun run db:migrate`. If the Prisma CLI fails with an ESM error (Bun workspace), run the migration SQL in `prisma/migrations/` against your database and use `bun run db:generate` from a non-workspace directory or with npm.

To run:

```bash
bun run dev
```

This project was created using `bun init` in bun v1.3.9. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
