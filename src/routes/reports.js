const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');

// GET certificate official view details by Certificate ID (e.g. CERT-2025-X89A1)
router.get('/certificate/:certId', (req, res) => {
  const certId = req.params.certId;

  const query = `
    SELECT uc.*, c.title as certification_title, c.category, c.description as cert_description,
           p.name as profile_name, p.title as profile_title, p.email as profile_email,
           ea.time_taken_seconds, ea.total_questions, ea.score_percentage
    FROM user_certifications uc
    JOIN certifications c ON uc.certification_id = c.id
    JOIN profiles p ON uc.profile_id = p.id
    JOIN exam_attempts ea ON uc.attempt_id = ea.id
    WHERE uc.certificate_id = ? AND uc.status = 'VALID'
  `;

  db.get(query, [certId], (err, cert) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!cert) return res.status(404).json({ error: 'Certificate not found or invalid' });

    res.json({
      certificate_id: cert.certificate_id,
      holder: {
        name: cert.profile_name,
        title: cert.profile_title,
        email: cert.profile_email
      },
      certification: {
        title: cert.certification_title,
        category: cert.category,
        description: cert.cert_description
      },
      exam_results: {
        score: `${cert.score_percentage}%`,
        total_questions: cert.total_questions,
        time_taken_formatted: `${Math.floor(cert.time_taken_seconds / 60)} mins ${cert.time_taken_seconds % 60} secs`,
        time_limit: '80 minutes',
        required_pass_score: '80%'
      },
      issue_date: cert.issue_date,
      status: cert.status,
      verification_seal: 'OFFICIALLY VERIFIED CERTIFICATE'
    });
  });
});

// GET HTML/Printable Certificate Document for download or printing
router.get('/certificate/:certId/printable', (req, res) => {
  const certId = req.params.certId;

  const query = `
    SELECT uc.*, c.title as certification_title, c.category,
           p.name as profile_name, ea.time_taken_seconds, ea.score_percentage
    FROM user_certifications uc
    JOIN certifications c ON uc.certification_id = c.id
    JOIN profiles p ON uc.profile_id = p.id
    JOIN exam_attempts ea ON uc.attempt_id = ea.id
    WHERE uc.certificate_id = ? AND uc.status = 'VALID'
  `;

  db.get(query, [certId], (err, cert) => {
    if (err || !cert) return res.status(404).send('<h2>Certificate Not Found</h2>');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate of Completion - ${cert.certificate_id}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 40px; }
          .certificate { border: 10px solid #1e293b; padding: 50px; background: #ffffff; max-width: 800px; margin: 0 auto; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 8px; position: relative; }
          .gold-seal { width: 90px; height: 90px; background: #eab308; border-radius: 50%; border: 4px double #ffffff; margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 10px rgba(234,179,8,0.4); }
          h1 { color: #0f172a; font-size: 36px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
          h2 { color: #2563eb; font-size: 28px; margin: 20px 0; }
          p { color: #475569; font-size: 18px; line-height: 1.6; }
          .recipient { font-size: 32px; font-weight: bold; color: #0f172a; margin: 25px 0; text-decoration: underline #2563eb; }
          .details { margin-top: 40px; display: flex; justify-content: space-between; border-top: 2px solid #e2e8f0; padding-top: 25px; text-align: left; }
          .badge { background: #dcfce7; color: #166534; padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; display: inline-block; }
          @media print { body { padding: 0; background: none; } .certificate { box-shadow: none; border-width: 6px; } }
        </style>
      </head>
      <body>
        <div class="certificate">
          <div class="gold-seal">VERIFIED</div>
          <h1>Certificate of Completion</h1>
          <p>This is officially awarded to</p>
          <div class="recipient">${cert.profile_name}</div>
          <p>for successfully completing the rigorous assessment and demonstrating mastery in</p>
          <h2>${cert.certification_title}</h2>
          <span class="badge">Passed 60 MCQ Timed Exam (${cert.score_percentage}%)</span>

          <div class="details">
            <div>
              <strong>Certificate ID:</strong> ${cert.certificate_id}<br/>
              <strong>Issued On:</strong> ${new Date(cert.issue_date).toLocaleDateString()}<br/>
              <strong>Passing Criteria:</strong> &ge; 80% score within 80 minutes
            </div>
            <div style="text-align: right;">
              <strong>Exam Duration:</strong> ${Math.floor(cert.time_taken_seconds / 60)} minutes<br/>
              <strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">OFFICIALLY VALID</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });
});

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
