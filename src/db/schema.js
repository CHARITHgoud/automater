const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, '../../certifications.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database at', dbPath);
  }
});

function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Profiles (Information Gatherer)
      db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          phone TEXT,
          title TEXT,
          bio TEXT,
          skills TEXT, -- JSON array
          experience TEXT, -- JSON array of objects
          education TEXT, -- JSON array of objects
          documents TEXT, -- JSON array of objects
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Certifications (Topics / Catalog)
      db.run(`
        CREATE TABLE IF NOT EXISTS certifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          description TEXT,
          passing_score INTEGER DEFAULT 80, -- Minimum percentage score
          time_limit_minutes INTEGER DEFAULT 80, -- Time limit in minutes
          total_questions INTEGER DEFAULT 60,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 3. Question Bank (60 MCQs per certification topic)
      db.run(`
        CREATE TABLE IF NOT EXISTS question_bank (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          certification_id INTEGER NOT NULL,
          question TEXT NOT NULL,
          option_a TEXT NOT NULL,
          option_b TEXT NOT NULL,
          option_c TEXT NOT NULL,
          option_d TEXT NOT NULL,
          correct_option TEXT NOT NULL, -- 'A', 'B', 'C', or 'D'
          explanation TEXT,
          FOREIGN KEY (certification_id) REFERENCES certifications (id) ON DELETE CASCADE
        )
      `);

      // 4. Exam Attempts / Submissions
      db.run(`
        CREATE TABLE IF NOT EXISTS exam_attempts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          profile_id INTEGER NOT NULL,
          certification_id INTEGER NOT NULL,
          score_percentage REAL NOT NULL,
          correct_count INTEGER NOT NULL,
          total_questions INTEGER NOT NULL,
          time_taken_seconds INTEGER NOT NULL,
          passed INTEGER NOT NULL, -- 1 for pass, 0 for fail
          answers TEXT, -- JSON array/object of submitted answers
          attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
          FOREIGN KEY (certification_id) REFERENCES certifications (id) ON DELETE CASCADE
        )
      `);

      // 5. Issued Certifications
      db.run(`
        CREATE TABLE IF NOT EXISTS user_certifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          certificate_id TEXT UNIQUE NOT NULL, -- UUID or unique code e.g. CERT-2025-XXXX
          profile_id INTEGER NOT NULL,
          certification_id INTEGER NOT NULL,
          attempt_id INTEGER NOT NULL,
          issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          score_achieved REAL NOT NULL,
          status TEXT DEFAULT 'VALID', -- 'VALID', 'REVOKED', 'EXPIRED'
          FOREIGN KEY (profile_id) REFERENCES profiles (id) ON DELETE CASCADE,
          FOREIGN KEY (certification_id) REFERENCES certifications (id) ON DELETE CASCADE,
          FOREIGN KEY (attempt_id) REFERENCES exam_attempts (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

module.exports = {
  db,
  initDatabase
};
