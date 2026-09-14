import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || './data/macky_merch.db';

// ensure the directory for the database file exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// enforce foreign keys and use WAL for better concurrent reads
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// run schema.sql on startup so the table always exists
const schemaPath = path.join(__dirname, '../../schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');
db.exec(schema);

export default db;