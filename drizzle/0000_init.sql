CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"page" text,
	"ip_hash" text,
	"user_agent" text,
	"status" text DEFAULT 'new' NOT NULL,
	"notified" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"source" text NOT NULL,
	"severity" text DEFAULT 'error' NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"first_frame" text,
	"route" text,
	"count" integer DEFAULT 1 NOT NULL,
	"last_stack" text,
	"last_url" text,
	"last_user_agent" text,
	"extra" jsonb,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "errors_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"calc_key" text NOT NULL,
	"page" text NOT NULL,
	"helpful" boolean NOT NULL,
	"comment" text,
	"ip_hash" text
);
--> statement-breakpoint
CREATE TABLE "gsc_daily" (
	"day" date NOT NULL,
	"page" text NOT NULL,
	"query" text NOT NULL,
	"clicks" integer NOT NULL,
	"impressions" integer NOT NULL,
	"ctr" double precision NOT NULL,
	"position" double precision NOT NULL,
	CONSTRAINT "gsc_daily_day_page_query_pk" PRIMARY KEY("day","page","query")
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ok" boolean NOT NULL,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "errors_open_idx" ON "errors" USING btree ("resolved_at","last_seen");--> statement-breakpoint
CREATE INDEX "feedback_calc_idx" ON "feedback" USING btree ("calc_key");