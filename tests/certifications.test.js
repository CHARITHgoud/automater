const request = require('supertest');
const app = require('../src/server');
const { initDatabase, db } = require('../src/db/schema');

let profileId;
let certificationId;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initDatabase();

  // Wait brief moment for router seed
  await new Promise(r => setTimeout(r, 600));

  // Create test profile
  const pRes = await request(app).post('/api/profiles').send({
    name: 'Bob Tester',
    email: 'bob@example.com',
    title: 'DevOps Engineer'
  });
  profileId = pRes.body.id;

  // Fetch certifications
  const cRes = await request(app).get('/api/certifications');
  certificationId = cRes.body[0].id;
});

afterAll((done) => {
  db.close(done);
});

describe('Certifications & 60 MCQ Timed Exam API', () => {
  it('should list certifications with 60 MCQ criteria and 80-min timer', async () => {
    const res = await request(app).get('/api/certifications');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('passing_score', 80);
    expect(res.body[0]).toHaveProperty('time_limit_minutes', 80);
    expect(res.body[0]).toHaveProperty('total_questions', 60);
  });

  it('should retrieve exactly 60 MCQ exam questions for a certification', async () => {
    const res = await request(app).get(`/api/certifications/${certificationId}/exam-questions`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.total_questions).toEqual(60);
    expect(res.body.questions.length).toEqual(60);
    expect(res.body.questions[0]).toHaveProperty('question');
    expect(res.body.questions[0]).toHaveProperty('option_a');
  });

  it('should fail exam submission if score is under 80%', async () => {
    const res = await request(app)
      .post(`/api/certifications/${certificationId}/submit-exam`)
      .send({
        profile_id: profileId,
        answers: {}, // 0 correct answers
        time_taken_seconds: 1200
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.passed).toBe(false);
    expect(res.body.score_percentage).toBe(0);
    expect(res.body.failure_reason).toContain('80% required');
  });

  it('should fail exam submission if time taken exceeds 80 minutes (4800 seconds)', async () => {
    const res = await request(app)
      .post(`/api/certifications/${certificationId}/submit-exam`)
      .send({
        profile_id: profileId,
        is_auto_complete: true, // gets 100% answers
        time_taken_seconds: 5000 // exceeds 4800s (80 mins)
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.passed).toBe(false);
    expect(res.body.failure_reason).toContain('Time limit exceeded');
  });

  it('should pass exam and issue certification if score >= 80% and time <= 80 mins', async () => {
    const res = await request(app)
      .post(`/api/certifications/${certificationId}/submit-exam`)
      .send({
        profile_id: profileId,
        is_auto_complete: true,
        time_taken_seconds: 1800 // 30 minutes
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.score_percentage).toBe(100);
    expect(res.body).toHaveProperty('certificate_id');
    expect(res.body.certificate_id).toMatch(/^CERT-\d{4}-[A-Z0-9]+$/);
  });

  it('should list valid earned user certifications for a profile', async () => {
    const res = await request(app).get(`/api/certifications/user/${profileId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toEqual(1);
    expect(res.body[0]).toHaveProperty('certificate_id');
    expect(res.body[0].profile_name).toEqual('Bob Tester');
  });
});
