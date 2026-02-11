CREATE TABLE IF NOT EXISTS exchange_rates (
    pair TEXT PRIMARY KEY,
    rate REAL NOT NULL,
    updated_at INTEGER NOT NULL
);