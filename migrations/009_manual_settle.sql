
-- Migration for Manual Settlement System
CREATE TABLE IF NOT EXISTS manual_matches (
    id TEXT PRIMARY KEY,
    league_name TEXT,
    home_team TEXT,
    away_team TEXT,
    commence_time DATETIME,
    home_odds REAL,
    draw_odds REAL,
    away_odds REAL,
    status TEXT DEFAULT 'active' -- active, settled
);

-- Ensure users have kyc_bonus_claimed column
ALTER TABLE users ADD COLUMN kyc_bonus_claimed INTEGER DEFAULT 0;
