const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');

// GET dossier report for an entity/profile
router.get('/dossier/:profileId', (req, res) => {
  const profileId = req.params.profileId;

  db.get('SELECT * FROM profiles WHERE id = ?', [profileId], (err, profile) => {
    if (err || !profile) return res.status(404).json({ error: 'Profile not found' });

    const queryCerts = `
      SELECT uc.certificate_id, uc.issue_date, uc.score_achieved, c.title, c.category, ea.time_taken_seconds
      FROM user_certifications uc
      JOIN certifications c ON uc.certification_id = c.id
      JOIN exam_attempts ea ON uc.attempt_id = ea.id
      WHERE uc.profile_id = ? AND uc.status = 'VALID'
    `;

    const queryAttempts = `
      SELECT ea.*, c.title as certification_title
      FROM exam_attempts ea
      JOIN certifications c ON ea.certification_id = c.id
      WHERE ea.profile_id = ?
      ORDER BY ea.attempted_at DESC
    `;

    db.all(queryCerts, [profileId], (err, certs) => {
      if (err) return res.status(500).json({ error: err.message });

      db.all(queryAttempts, [profileId], (err, attempts) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({
          dossier_id: `DOSSIER-P${profileId}`,
          generated_at: new Date().toISOString(),
          profile_info: {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            title: profile.title,
            bio: profile.bio,
            skills: profile.skills ? JSON.parse(profile.skills) : [],
            experience: profile.experience ? JSON.parse(profile.experience) : [],
            education: profile.education ? JSON.parse(profile.education) : [],
            notes: profile.notes
          },
          verified_certifications_summary: {
            total_earned: certs.length,
            certifications: certs
          },
          exam_attempt_audit_trail: attempts
        });
      });
    });
  });
});

module.exports = router;
