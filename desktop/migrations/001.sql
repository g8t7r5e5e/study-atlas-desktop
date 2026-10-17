CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL CHECK(json_valid(value)));
CREATE TABLE IF NOT EXISTS records (
 category TEXT NOT NULL, id TEXT NOT NULL, ordinal INTEGER NOT NULL,
 date TEXT, daily INTEGER NOT NULL DEFAULT 0 CHECK(daily IN (0,1)),
 body TEXT NOT NULL CHECK(json_valid(body)), PRIMARY KEY(category,id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_daily_record ON records(date) WHERE category='logs' AND daily=1;
CREATE TABLE IF NOT EXISTS imports (hash TEXT PRIMARY KEY, receipt TEXT NOT NULL CHECK(json_valid(receipt)));
PRAGMA user_version=1;
