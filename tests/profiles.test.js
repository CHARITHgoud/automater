const request = require('supertest');
const app = require('../src/server');
const { initDatabase, db } = require('../src/db/schema');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initDatabase();
});

afterAll((done) => {
  db.close(done);
});

describe('Profiles API (Information Gatherer)', () => {
  let createdProfileId;

  it('should create a new person profile', async () => {
    const res = await request(app)
      .post('/api/profiles')
      .send({
        name: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '+1-555-0192',
        title: 'Senior Security Analyst',
        bio: 'Cybersecurity professional with 8 years experience.',
        skills: ['Cybersecurity', 'Network Defense', 'Ethical Hacking', 'Risk Assessment'],
        experience: [
          { company: 'SecureCorp', role: 'Security Engineer', years: '2020-Present' }
        ],
        education: [
          { degree: 'B.S. Computer Science', institution: 'State University', year: '2019' }
        ],
        notes: 'Top candidate for CISSP level certification.'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Alice Johnson');
    expect(res.body.skills).toContain('Ethical Hacking');
    createdProfileId = res.body.id;
  });

  it('should retrieve all profiles', async () => {
    const res = await request(app).get('/api/profiles');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should retrieve a specific profile by ID', async () => {
    const res = await request(app).get(`/api/profiles/${createdProfileId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.id).toEqual(createdProfileId);
    expect(res.body.email).toEqual('alice@example.com');
  });

  it('should update an existing profile', async () => {
    const res = await request(app)
      .put(`/api/profiles/${createdProfileId}`)
      .send({
        name: 'Alice Johnson',
        email: 'alice.johnson@example.com',
        phone: '+1-555-0192',
        title: 'Lead Security Architect',
        skills: ['Cybersecurity', 'Cloud Security', 'CISSP', 'Incident Response'],
        notes: 'Promoted to Lead Security Architect.'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.title).toBe('Lead Security Architect');
    expect(res.body.skills).toContain('Cloud Security');
  });
});
