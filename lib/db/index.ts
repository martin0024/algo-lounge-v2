import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import * as schema from "./schema"

const globalForDb = globalThis as unknown as {
  __algoloungePool?: Pool
}

const pool =
  globalForDb.__algoloungePool ??
  new Pool({ connectionString: process.env.DATABASE_URL })

if (process.env.NODE_ENV !== "production") {
  globalForDb.__algoloungePool = pool
}

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema })
export { schema }
