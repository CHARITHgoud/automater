const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');

// GET all profiles
router.get('/', (req, res) => {
  db.all('SELECT * FROM profiles ORDER BY updated_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    // Parse JSON fields
    const profiles = rows.map(row => ({
      ...row,
      skills: row.skills ? JSON.parse(row.skills) : [],
      experience: row.experience ? JSON.parse(row.experience) : [],
      education: row.education ? JSON.parse(row.education) : [],
      documents: row.documents ? JSON.parse(row.documents) : []
    }));
    res.json(profiles);
  });
});

// GET single profile by ID
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM profiles WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    row.skills = row.skills ? JSON.parse(row.skills) : [];
    row.experience = row.experience ? JSON.parse(row.experience) : [];
    row.education = row.education ? JSON.parse(row.education) : [];
    row.documents = row.documents ? JSON.parse(row.documents) : [];
    res.json(row);
  });
});

// CREATE a new profile
router.post('/', (req, res) => {
  const { name, email, phone, title, bio, skills, experience, education, documents, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const skillsJson = JSON.stringify(skills || []);
  const expJson = JSON.stringify(experience || []);
  const eduJson = JSON.stringify(education || []);
  const docsJson = JSON.stringify(documents || []);

  const query = `
    INSERT INTO profiles (name, email, phone, title, bio, skills, experience, education, documents, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [name, email || '', phone || '', title || '', bio || '', skillsJson, expJson, eduJson, docsJson, notes || ''], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.get('SELECT * FROM profiles WHERE id = ?', [this.lastID], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      row.skills = JSON.parse(row.skills);
      row.experience = JSON.parse(row.experience);
      row.education = JSON.parse(row.education);
      row.documents = JSON.parse(row.documents);
      res.status(201).json(row);
    });
  });
});

// UPDATE profile by ID
router.put('/:id', (req, res) => {
  const { name, email, phone, title, bio, skills, experience, education, documents, notes } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const skillsJson = JSON.stringify(skills || []);
  const expJson = JSON.stringify(experience || []);
  const eduJson = JSON.stringify(education || []);
  const docsJson = JSON.stringify(documents || []);

  const query = `
    UPDATE profiles
    SET name = ?, email = ?, phone = ?, title = ?, bio = ?, skills = ?, experience = ?, education = ?, documents = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [name, email || '', phone || '', title || '', bio || '', skillsJson, expJson, eduJson, docsJson, notes || '', req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    db.get('SELECT * FROM profiles WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      row.skills = JSON.parse(row.skills);
      row.experience = JSON.parse(row.experience);
      row.education = JSON.parse(row.education);
      row.documents = JSON.parse(row.documents);
      res.json(row);
    });
  });
});

// DELETE profile by ID
router.delete('/:id', (req, res) => {
  db.run('DELETE FROM profiles WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({ message: 'Profile deleted successfully', id: Number(req.params.id) });
  });
});

module.exports = router;
