CREATE TABLE IF NOT EXISTS manual_matches (
  id TEXT PRIMARY KEY,
  league_name TEXT,
  home_team TEXT,
  away_team TEXT,
  commence_time DATETIME,
  home_odds REAL,
  draw_odds REAL,
  away_odds REAL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
