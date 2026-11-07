import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Self-hosted error inbox: one row per fingerprint (name + first stack frame + route). */
export const errors = pgTable(
  "errors",
  {
    id: serial("id").primaryKey(),
    fingerprint: text("fingerprint").notNull().unique(),
    source: text("source").notNull(), // server | client | edge | cron
    severity: text("severity").notNull().default("error"), // error | warning
    name: text("name").notNull(),
    message: text("message").notNull(),
    firstFrame: text("first_frame"),
    route: text("route"),
    count: integer("count").notNull().default(1),
    lastStack: text("last_stack"),
    lastUrl: text("last_url"),
    lastUserAgent: text("last_user_agent"),
    extra: jsonb("extra"),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("errors_open_idx").on(t.resolvedAt, t.lastSeen)],
);

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  page: text("page"),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("new"), // new | replied | spam
  notified: boolean("notified").notNull().default(false),
});

export const feedback = pgTable(
  "feedback",
  {
    id: serial("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    calcKey: text("calc_key").notNull(),
    page: text("page").notNull(),
    helpful: boolean("helpful").notNull(),
    comment: text("comment"),
    ipHash: text("ip_hash"),
  },
  (t) => [index("feedback_calc_idx").on(t.calcKey)],
);

/** Fixed-window counters for API rate limiting. key = bucket:ipHash:windowStart */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/** Daily Search Console performance rows (page × query), pulled by the GSC cron. */
export const gscDaily = pgTable(
  "gsc_daily",
  {
    day: date("day").notNull(),
    page: text("page").notNull(),
    query: text("query").notNull(),
    clicks: integer("clicks").notNull(),
    impressions: integer("impressions").notNull(),
    ctr: doublePrecision("ctr").notNull(),
    position: doublePrecision("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.day, t.page, t.query] })],
);

/** Operational log for scheduled jobs (data refreshes, GSC pulls, IndexNow pings). */
export const jobRuns = pgTable("job_runs", {
  id: serial("id").primaryKey(),
  job: text("job").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  ok: boolean("ok").notNull(),
  detail: jsonb("detail"),
});
