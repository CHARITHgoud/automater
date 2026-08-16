const express = require('express');
const router = express.Router();
const { db } = require('../db/schema');

// GET generated resume data for a given profile ID
router.get('/:profileId', (req, res) => {
  const profileId = req.params.profileId;

  // 1. Fetch Profile
  db.get('SELECT * FROM profiles WHERE id = ?', [profileId], (err, profile) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // 2. Fetch Earned Valid Certifications
    const certQuery = `
      SELECT uc.certificate_id, uc.issue_date, uc.score_achieved, c.title, c.category, c.description
      FROM user_certifications uc
      JOIN certifications c ON uc.certification_id = c.id
      WHERE uc.profile_id = ? AND uc.status = 'VALID'
      ORDER BY uc.issue_date DESC
    `;

    db.all(certQuery, [profileId], (err, certs) => {
      if (err) return res.status(500).json({ error: err.message });

      const parsedSkills = profile.skills ? JSON.parse(profile.skills) : [];
      const parsedExperience = profile.experience ? JSON.parse(profile.experience) : [];
      const parsedEducation = profile.education ? JSON.parse(profile.education) : [];

      // Format clean resume object
      const resume = {
        header: {
          name: profile.name,
          title: profile.title || 'Professional',
          email: profile.email,
          phone: profile.phone,
          summary: profile.bio || 'Accomplished professional with certified skills and proven industry experience.'
        },
        verified_certifications: certs.map(c => ({
          certificate_id: c.certificate_id,
          title: c.title,
          category: c.category,
          issue_date: c.issue_date,
          score_achieved: `${c.score_achieved}% (Passed 60 MCQ Timed Exam)`,
          status: 'VERIFIED & VALID'
        })),
        skills: parsedSkills,
        work_experience: parsedExperience,
        education: parsedEducation,
        generated_at: new Date().toISOString()
      };

      res.json(resume);
    });
  });
});

// GET export resume in Markdown / Plain Text format
router.get('/:profileId/export/text', (req, res) => {
  const profileId = req.params.profileId;

  db.get('SELECT * FROM profiles WHERE id = ?', [profileId], (err, profile) => {
    if (err || !profile) return res.status(404).json({ error: 'Profile not found' });

    const certQuery = `
      SELECT uc.certificate_id, uc.issue_date, uc.score_achieved, c.title, c.category
      FROM user_certifications uc
      JOIN certifications c ON uc.certification_id = c.id
      WHERE uc.profile_id = ? AND uc.status = 'VALID'
      ORDER BY uc.issue_date DESC
    `;

    db.all(certQuery, [profileId], (err, certs) => {
      if (err) return res.status(500).json({ error: err.message });

      const skills = profile.skills ? JSON.parse(profile.skills) : [];
      const exp = profile.experience ? JSON.parse(profile.experience) : [];
      const edu = profile.education ? JSON.parse(profile.education) : [];

      let markdown = `# ${profile.name.toUpperCase()}\n`;
      if (profile.title) markdown += `**${profile.title}**\n`;
      markdown += `Email: ${profile.email || 'N/A'} | Phone: ${profile.phone || 'N/A'}\n\n`;

      markdown += `--- \n\n`;
      markdown += `## PROFESSIONAL SUMMARY\n${profile.bio || 'Dedicated professional with verified certifications.'}\n\n`;

      markdown += `## VERIFIED CERTIFICATIONS\n`;
      if (certs.length === 0) {
        markdown += `*No verified certifications on file yet.*\n\n`;
      } else {
        certs.forEach(c => {
          markdown += `- **${c.title}** (${c.category})\n`;
          markdown += `  - ID: \`${c.certificate_id}\` | Score: ${c.score_achieved}% (60 MCQ Timed Assessment Passed)\n`;
          markdown += `  - Issued: ${new Date(c.issue_date).toLocaleDateString()}\n\n`;
        });
      }

      markdown += `## SKILLS & COMPETENCIES\n`;
      if (skills.length > 0) {
        markdown += skills.map(s => `- ${s}`).join('\n') + `\n\n`;
      } else {
        markdown += `- N/A\n\n`;
      }

      markdown += `## WORK EXPERIENCE\n`;
      if (exp.length > 0) {
        exp.forEach(e => {
          markdown += `### ${e.role || 'Role'} - ${e.company || 'Company'}\n`;
          if (e.years) markdown += `*${e.years}*\n`;
          if (e.description) markdown += `${e.description}\n`;
          markdown += `\n`;
        });
      } else {
        markdown += `*N/A*\n\n`;
      }

      markdown += `## EDUCATION\n`;
      if (edu.length > 0) {
        edu.forEach(ed => {
          markdown += `- **${ed.degree || 'Degree'}**, ${ed.institution || 'Institution'} (${ed.year || ''})\n`;
        });
      } else {
        markdown += `- N/A\n`;
      }

      res.setHeader('Content-Type', 'text/plain');
      res.send(markdown);
    });
  });
});

module.exports = router;
