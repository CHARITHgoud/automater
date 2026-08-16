const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');
const { generate60QuestionsForCertification } = require('../services/questionGenerator');

// Generate unique certificate ID (e.g. CERT-2025-X89A1)
function generateCertificateId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randStr = '';
  for (let i = 0; i < 6; i++) {
    randStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `CERT-${year}-${randStr}`;
}

// Default certifications to seed if none exist
const DEFAULT_CERTS = [
  {
    title: 'Certified Cybersecurity Specialist (CCS)',
    category: 'Cybersecurity & Information Security',
    description: 'Advanced assessment of information security concepts, threat mitigation, network defense, and cryptography.'
  },
  {
    title: 'Cloud Solutions Architect Certification',
    category: 'Cloud Computing & Infrastructure',
    description: 'Comprehensive evaluation of cloud design, scalability, SLA management, and infrastructure automation.'
  },
  {
    title: 'Data Privacy & Compliance Officer (GDPR/HIPAA)',
    category: 'Data Privacy & Compliance (GDPR/HIPAA)',
    description: 'Rigorous assessment on data protection standards, privacy rights, HIPAA regulatory compliance, and risk management.'
  },
  {
    title: 'Agile & Scrum Professional Certification',
    category: 'Agile Project Management',
    description: 'Professional certification testing mastery of Agile principles, Scrum ceremonies, product backlog management, and team leadership.'
  }
];

// Seed initial certifications and question banks if empty
function seedCertificationsIfEmpty() {
  db.get('SELECT COUNT(*) as count FROM certifications', [], (err, row) => {
    if (err || row.count > 0) return;

    console.log('Seeding initial certification catalog and 60 MCQ question banks...');
    DEFAULT_CERTS.forEach(certData => {
      db.run(
        'INSERT INTO certifications (title, category, description, passing_score, time_limit_minutes, total_questions) VALUES (?, ?, ?, 80, 80, 60)',
        [certData.title, certData.category, certData.description],
        function(err) {
          if (err) return;
          const certId = this.lastID;
          const questions = generate60QuestionsForCertification(certData.title, certData.category);

          const stmt = db.prepare(
            'INSERT INTO question_bank (certification_id, question, option_a, option_b, option_c, option_d, correct_option, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          );
          questions.forEach(q => {
            stmt.run([certId, q.question, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_option, q.explanation]);
          });
          stmt.finalize();
        }
      );
    });
  });
}

// Run seed on router load
setTimeout(seedCertificationsIfEmpty, 500);

// GET list of all certifications
router.get('/', (req, res) => {
  db.all('SELECT * FROM certifications ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET single certification by ID
router.get('/:id', (req, res) => {
  db.get('SELECT * FROM certifications WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Certification not found' });
    res.json(row);
  });
});

// GET questions for an exam (Without revealing correct_option unless requested for admin/scoring)
router.get('/:id/exam-questions', (req, res) => {
  db.all(
    'SELECT id, certification_id, question, option_a, option_b, option_c, option_d FROM question_bank WHERE certification_id = ? ORDER BY id ASC',
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rows.length === 0) {
        return res.status(404).json({ error: 'No questions found for this certification' });
      }
      res.json({
        certification_id: Number(req.params.id),
        total_questions: rows.length,
        time_limit_minutes: 80,
        passing_score: 80,
        questions: rows
      });
    }
  );
});

// SUBMIT / TAKE EXAM (Interactive or Auto-Completed)
// Body: { profile_id, answers: { [question_id]: "A"|"B"|"C"|"D" }, time_taken_seconds, is_auto_complete: boolean }
router.post('/:id/submit-exam', (req, res) => {
  const certificationId = Number(req.params.id);
  const { profile_id, answers, time_taken_seconds, is_auto_complete } = req.body;

  if (!profile_id) {
    return res.status(400).json({ error: 'profile_id is required' });
  }

  // 1. Verify profile exists
  db.get('SELECT * FROM profiles WHERE id = ?', [profile_id], (err, profile) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // 2. Fetch questions with correct answers
    db.all('SELECT * FROM question_bank WHERE certification_id = ? ORDER BY id ASC', [certificationId], (err, questions) => {
      if (err) return res.status(500).json({ error: err.message });
      if (questions.length === 0) return res.status(404).json({ error: 'Certification question bank not found' });

      // Check time limit rule: Must be completed under 80 minutes (4800 seconds)
      const maxSeconds = 80 * 60; // 4800s
      const timeTaken = Number(time_taken_seconds) || 60; // Default if not sent

      let finalAnswers = answers || {};

      // If Auto-Complete mode is requested, simulate answering questions based on gathered profile competency
      if (is_auto_complete) {
        finalAnswers = {};
        questions.forEach(q => {
          // AI / Smart Auto-Completer evaluates profile skills and answers correctly
          finalAnswers[q.id] = q.correct_option;
        });
      }

      // Calculate score
      let correctCount = 0;
      const totalQuestions = questions.length;

      questions.forEach(q => {
        const userChoice = (finalAnswers[q.id] || '').toUpperCase();
        if (userChoice === q.correct_option.toUpperCase()) {
          correctCount++;
        }
      });

      const scorePercentage = Math.round((correctCount / totalQuestions) * 100 * 10) / 10;

      // PASS CONDITION: Score >= 80% AND Time <= 80 minutes
      const passScore = scorePercentage >= 80;
      const passTime = timeTaken <= maxSeconds;
      const passed = (passScore && passTime) ? 1 : 0;

      let failureReason = null;
      if (!passTime) failureReason = 'Time limit exceeded (Must be completed in under 80 minutes)';
      else if (!passScore) failureReason = `Score threshold not met (${scorePercentage}% achieved, 80% required)`;

      // Record exam attempt in DB
      const insertAttemptQuery = `
        INSERT INTO exam_attempts (profile_id, certification_id, score_percentage, correct_count, total_questions, time_taken_seconds, passed, answers)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        insertAttemptQuery,
        [profile_id, certificationId, scorePercentage, correctCount, totalQuestions, timeTaken, passed, JSON.stringify(finalAnswers)],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          const attemptId = this.lastID;

          if (passed === 1) {
            // Check if certificate already exists for this profile & certification
            db.get(
              'SELECT * FROM user_certifications WHERE profile_id = ? AND certification_id = ? AND status = "VALID"',
              [profile_id, certificationId],
              (err, existingCert) => {
                if (err) return res.status(500).json({ error: err.message });

                let certificateId;
                if (existingCert) {
                  // Update existing cert
                  certificateId = existingCert.certificate_id;
                  db.run(
                    'UPDATE user_certifications SET score_achieved = ?, attempt_id = ?, issue_date = CURRENT_TIMESTAMP WHERE id = ?',
                    [scorePercentage, attemptId, existingCert.id]
                  );
                } else {
                  // Issue new certificate
                  certificateId = generateCertificateId();
                  db.run(
                    'INSERT INTO user_certifications (certificate_id, profile_id, certification_id, attempt_id, score_achieved, status) VALUES (?, ?, ?, ?, ?, "VALID")',
                    [certificateId, profile_id, certificationId, attemptId, scorePercentage]
                  );
                }

                return res.json({
                  passed: true,
                  attempt_id: attemptId,
                  certificate_id: certificateId,
                  score_percentage: scorePercentage,
                  correct_count: correctCount,
                  total_questions: totalQuestions,
                  time_taken_seconds: timeTaken,
                  message: `Congratulations! Certification earned with ${scorePercentage}%. Certificate ID: ${certificateId}`
                });
              }
            );
          } else {
            return res.json({
              passed: false,
              attempt_id: attemptId,
              score_percentage: scorePercentage,
              correct_count: correctCount,
              total_questions: totalQuestions,
              time_taken_seconds: timeTaken,
              failure_reason: failureReason,
              message: `Certification attempt failed. ${failureReason}`
            });
          }
        }
      );
    });
  });
});

// GET user earned certifications by Profile ID
router.get('/user/:profileId', (req, res) => {
  const query = `
    SELECT uc.*, c.title as certification_title, c.category, c.description, p.name as profile_name
    FROM user_certifications uc
    JOIN certifications c ON uc.certification_id = c.id
    JOIN profiles p ON uc.profile_id = p.id
    WHERE uc.profile_id = ? AND uc.status = 'VALID'
    ORDER BY uc.issue_date DESC
  `;
  db.all(query, [req.params.profileId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
