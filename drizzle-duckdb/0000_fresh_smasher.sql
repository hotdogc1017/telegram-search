CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text DEFAULT '' NOT NULL,
	"platform_message_id" text DEFAULT '' NOT NULL,
	"from_id" text DEFAULT '' NOT NULL,
	"from_name" text DEFAULT '' NOT NULL,
	"in_chat_id" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"is_reply" boolean DEFAULT false NOT NULL,
	"reply_to_name" text DEFAULT '' NOT NULL,
	"reply_to_id" text DEFAULT '' NOT NULL,
	"platform_timestamp" bigint DEFAULT 0 NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL,
	"deleted_at" bigint DEFAULT 0 NOT NULL,
	"content_vector_1536" vector(1536),
	"content_vector_1024" vector(1024),
	"content_vector_768" vector(768),
	"jieba_tokens" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "joined_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text DEFAULT '' NOT NULL,
	"chat_id" text DEFAULT '' NOT NULL,
	"chat_name" text DEFAULT '' NOT NULL,
	"chat_type" text DEFAULT 'user' NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "joined_chats_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text DEFAULT '' NOT NULL,
	"file_id" text DEFAULT '' NOT NULL,
	"message_id" uuid,
	"image_bytes" "bytea",
	"image_path" text DEFAULT '' NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL,
	"description_vector_1536" vector(1536),
	"description_vector_1024" vector(1024),
	"description_vector_768" vector(768)
);
--> statement-breakpoint
CREATE TABLE "recent_sent_stickers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sticker_id" uuid NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sticker_packs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text DEFAULT '' NOT NULL,
	"platform_id" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stickers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text DEFAULT '' NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"emoji" text DEFAULT '' NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"file_id" text NOT NULL,
	"sticker_bytes" "bytea",
	"sticker_path" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" bigint DEFAULT 0 NOT NULL,
	"updated_at" bigint DEFAULT 0 NOT NULL,
	"description_vector_1536" vector(1536),
	"description_vector_1024" vector(1024),
	"description_vector_768" vector(768)
);
--> statement-breakpoint
ALTER TABLE "recent_sent_stickers" ADD CONSTRAINT "recent_sent_stickers_sticker_id_stickers_id_fk" FOREIGN KEY ("sticker_id") REFERENCES "public"."stickers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_messages_platform_platform_message_id_in_chat_id_unique_index" ON "chat_messages" USING btree ("platform","platform_message_id","in_chat_id");--> statement-breakpoint
CREATE INDEX "chat_messages_content_vector_1536_index" ON "chat_messages" USING hnsw ("content_vector_1536" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "chat_messages_content_vector_1024_index" ON "chat_messages" USING hnsw ("content_vector_1024" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "chat_messages_content_vector_768_index" ON "chat_messages" USING hnsw ("content_vector_768" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "jieba_tokens_index" ON "chat_messages" USING gin ("jieba_tokens" jsonb_path_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "photos_platform_file_id_unique_index" ON "photos" USING btree ("platform","file_id");--> statement-breakpoint
CREATE INDEX "photos_description_vector_1536_index" ON "photos" USING hnsw ("description_vector_1536" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "photos_description_vector_1024_index" ON "photos" USING hnsw ("description_vector_1024" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "photos_description_vector_768_index" ON "photos" USING hnsw ("description_vector_768" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "photos_message_id_index" ON "photos" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sticker_packs_platform_platform_id_unique_index" ON "sticker_packs" USING btree ("platform","platform_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stickers_platform_file_id_unique" ON "stickers" USING btree ("platform","file_id");--> statement-breakpoint
CREATE INDEX "stickers_description_vector_1536_index" ON "stickers" USING hnsw ("description_vector_1536" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "stickers_description_vector_1024_index" ON "stickers" USING hnsw ("description_vector_1024" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "stickers_description_vector_768_index" ON "stickers" USING hnsw ("description_vector_768" vector_cosine_ops);--> statement-breakpoint
CREATE VIEW "public"."chat_message_stats" AS (
    SELECT 
      jc.platform, 
      jc.chat_id, 
      jc.chat_name, 
      COUNT(cm.id)::int AS message_count,
      MIN(cm.platform_message_id) AS first_message_id,
      MIN(cm.created_at) AS first_message_at,
      MAX(cm.platform_message_id) AS latest_message_id,
      MAX(cm.created_at) AS latest_message_at
    FROM joined_chats jc
    LEFT JOIN chat_messages cm ON jc.chat_id = cm.in_chat_id
    GROUP BY jc.platform, jc.chat_id, jc.chat_name
  );