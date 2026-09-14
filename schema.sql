CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK (price > 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  category TEXT NOT NULL,
  size TEXT,
  isAvailable INTEGER NOT NULL DEFAULT 1,
  imageUrl TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);