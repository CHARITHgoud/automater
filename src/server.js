const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db/schema');
const { seedSampleProfilesIfEmpty } = require('./services/seedData');
const profilesRouter = require('./routes/profiles');
const certificationsRouter = require('./routes/certifications');
const resumesRouter = require('./routes/resumes');
const reportsRouter = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/profiles', profilesRouter);
app.use('/api/certifications', certificationsRouter);
app.use('/api/resumes', resumesRouter);
app.use('/api/reports', reportsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized successfully.');
    seedSampleProfilesIfEmpty();
    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
