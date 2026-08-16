const request = require('supertest');
const app = require('../src/server');
const { initDatabase, db } = require('../src/db/schema');

let profileId;
let certificationId;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initDatabase();
  await new Promise(r => setTimeout(r, 600));

  // Create test profile
  const pRes = await request(app).post('/api/profiles').send({
    name: 'Carol Danvers',
    email: 'carol@example.com',
    title: 'Lead Security Officer',
    skills: ['Cybersecurity', 'Cloud Security'],
    experience: [{ company: 'Defense Fleet', role: 'Commander', years: '2018-2024' }],
    education: [{ degree: 'B.S. Aerospace Engineering', institution: 'Air Academy', year: '2016' }]
  });
  profileId = pRes.body.id;

  // Get certification
  const cRes = await request(app).get('/api/certifications');
  certificationId = cRes.body[0].id;

  // Pass 60 MCQ timed exam for this certification
  await request(app)
    .post(`/api/certifications/${certificationId}/submit-exam`)
    .send({
      profile_id: profileId,
      is_auto_complete: true,
      time_taken_seconds: 1500
    });
});

afterAll((done) => {
  db.close(done);
});

describe('Resume Generator Module API', () => {
  it('should generate JSON resume including earned certifications', async () => {
    const res = await request(app).get(`/api/resumes/${profileId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.header.name).toBe('Carol Danvers');
    expect(res.body.verified_certifications.length).toBeGreaterThan(0);
    expect(res.body.verified_certifications[0]).toHaveProperty('certificate_id');
    expect(res.body.verified_certifications[0].score_achieved).toContain('60 MCQ Timed Exam');
  });

  it('should export resume in Markdown formatted text', async () => {
    const res = await request(app).get(`/api/resumes/${profileId}/export/text`);
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('# CAROL DANVERS');
    expect(res.text).toContain('VERIFIED CERTIFICATIONS');
    expect(res.text).toContain('60 MCQ Timed Assessment Passed');
  });
});
