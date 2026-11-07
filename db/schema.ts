import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const content = sqliteTable('content', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const loginAttempts = sqliteTable('login_attempts', {key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expires:integer('expires').notNull()},t=>[index('login_attempt_expiry').on(t.expires)]);
