const { db } = require('../db/schema');

function seedSampleProfilesIfEmpty() {
  db.get('SELECT COUNT(*) as count FROM profiles', [], (err, row) => {
    if (err || row.count > 0) return;

    console.log('Seeding sample candidate profiles...');
    const samples = [
      {
        name: 'Alex Mercer',
        email: 'alex.mercer@cybersec.io',
        phone: '+1-555-0199',
        title: 'Information Security Specialist',
        bio: 'Cybersecurity practitioner focusing on threat intelligence, vulnerability assessment, and cloud posture.',
        skills: JSON.stringify(['Cybersecurity', 'Network Defense', 'Cloud Infrastructure', 'Python', 'Incident Response']),
        experience: JSON.stringify([{ company: 'CyberShield Systems', role: 'Security Analyst', years: '2021-Present' }]),
        education: JSON.stringify([{ degree: 'B.S. Cyber Security', institution: 'Tech Institute', year: '2020' }])
      },
      {
        name: 'Samantha Vance',
        email: 'samantha.vance@cloudnet.org',
        phone: '+1-555-0244',
        title: 'Cloud & Infrastructure Architect',
        bio: 'Cloud architect with 6 years experience managing enterprise AWS/Azure deployments and microservices.',
        skills: JSON.stringify(['Cloud Computing', 'AWS Architecture', 'Kubernetes', 'DevOps', 'Terraform']),
        experience: JSON.stringify([{ company: 'CloudNet Global', role: 'Senior Architect', years: '2019-Present' }]),
        education: JSON.stringify([{ degree: 'M.S. Computer Science', institution: 'State Tech', year: '2018' }])
      }
    ];

    samples.forEach(s => {
      db.run(
        `INSERT INTO profiles (name, email, phone, title, bio, skills, experience, education) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.name, s.email, s.phone, s.title, s.bio, s.skills, s.experience, s.education]
      );
    });
  });
}

module.exports = { seedSampleProfilesIfEmpty };
