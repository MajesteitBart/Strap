import { sql } from "drizzle-orm";
import { check, customType, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth.ts";
import { creeds } from "./application.ts";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });
const imageColumns = () => ({
  body: bytea().notNull(),
  content_type: text().notNull(),
  hash: text().notNull(),
  updated_at: timestamp({ withTimezone: true, mode: "string" }).defaultNow().notNull(),
});
export const user_avatars = pgTable("user_avatars", {
  user_id: uuid().primaryKey().references(() => users.id, { onDelete: "cascade" }),
  ...imageColumns(),
}, table => [check("user_avatar_size", sql`octet_length(${table.body}) between 1 and 3145728`)]);
export const creed_avatars = pgTable("creed_avatars", {
  creed_id: uuid().primaryKey().references(() => creeds.id, { onDelete: "cascade" }),
  ...imageColumns(),
}, table => [check("creed_avatar_size", sql`octet_length(${table.body}) between 1 and 3145728`)]);
