const request = require('supertest');
const app = require('../src/server');
const { initDatabase, db } = require('../src/db/schema');

let profileId;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initDatabase();
  await new Promise(r => setTimeout(r, 600));

  // Create test profile
  const pRes = await request(app).post('/api/profiles').send({
    name: 'David Banner',
    email: 'david@example.com',
    title: 'Research Scientist'
  });
  profileId = pRes.body.id;

  const cRes = await request(app).get('/api/certifications');
  const certId = cRes.body[0].id;

  // Submit passing exam
  await request(app)
    .post(`/api/certifications/${certId}/submit-exam`)
    .send({
      profile_id: profileId,
      is_auto_complete: true,
      time_taken_seconds: 2000
    });
});

afterAll((done) => {
  db.close(done);
});

describe('Reports API', () => {
  it('should generate complete profile dossier with attempt audit trail', async () => {
    const res = await request(app).get(`/api/reports/dossier/${profileId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('dossier_id', `DOSSIER-P${profileId}`);
    expect(res.body.verified_certifications_summary.total_earned).toBe(1);
    expect(res.body.exam_attempt_audit_trail.length).toBeGreaterThan(0);
  });
});
