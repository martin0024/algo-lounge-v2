import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

import type { XpKind } from "@/lib/xp/rules"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Cached result of the SCS guild membership check (see lib/discord.ts).
  // Only positives are trusted for a short window; negatives always re-check.
  discordGuildMember: boolean("discord_guild_member").notNull().default(false),
  discordCheckedAt: timestamp("discord_checked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const questions = pgTable("questions", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
})

export const submissions = pgTable("submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  questionSlug: text("question_slug")
    .notNull()
    .references(() => questions.slug, { onDelete: "cascade" }),
  language: text("language")
    .$type<"typescript" | "python" | "c" | "cpp" | "java">()
    .notNull(),
  code: text("code").notNull(),
  status: text("status")
    .$type<"accepted" | "wrong_answer" | "error" | "timeout">()
    .notNull(),
  passedCount: integer("passed_count").notNull(),
  totalCount: integer("total_count").notNull(),
  runtimeMs: real("runtime_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

/**
 * Append-only XP ledger. Total XP is `SUM(amount)` so it can never drift from
 * the reasons behind it, and `dedupe_key` (unique per user) makes awarding
 * idempotent — a replayed submission pays out exactly once.
 */
export const xpEvents = pgTable(
  "xp_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind").$type<XpKind>().notNull(),
    amount: integer("amount").notNull(),
    questionSlug: text("question_slug").references(() => questions.slug, {
      onDelete: "cascade",
    }),
    language: text("language").$type<
      "typescript" | "python" | "c" | "cpp" | "java"
    >(),
    submissionId: uuid("submission_id").references(() => submissions.id, {
      onDelete: "set null",
    }),
    /** Free-text suffix for the UI label (streak length, achievement name). */
    detail: text("detail"),
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("xp_events_user_dedupe").on(table.userId, table.dedupeKey),
    index("xp_events_user_idx").on(table.userId),
  ]
)

export const userAchievements = pgTable(
  "user_achievements",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id").notNull(),
    unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.achievementId] })]
)

export const cohorts = pgTable("cohorts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: text("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const cohortMembers = pgTable(
  "cohort_members",
  {
    cohortId: uuid("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").$type<"owner" | "member">().notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.cohortId, table.userId] })]
)
