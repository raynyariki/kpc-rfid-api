import express from 'express';
import rfidRoutes from './routes/rfidRoutes.js';
import reportRoutes from './routes/reportRoutes.js'; // NEW
 
const app = express();
 
// Turn incoming JSON into req.body (max 100 kb per request).
app.use(express.json({ limit: '100kb' }));
 
// Health check: "is the server alive?"
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'kpc-rfid-api',
    time: new Date().toISOString(),
  });
});
 
// Scans from the readers: POST /api/rfid/entry
app.use('/api/rfid', rfidRoutes);
 
// NEW: data for people and the dashboard:
// GET /api/occupancy, /api/movements, /api/alerts
app.use('/api', reportRoutes);
 
// 404: no endpoint matched. Must come AFTER all the routes.
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `No endpoint for ${req.method} ${req.originalUrl}`,
  });
});
 
// Error handler: Express knows it by its FOUR inputs.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Broken JSON from the caller: their mistake, so 400.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'The request body is not valid JSON',
    });
  }
 
  // Anything else is our bug: log the details, reply 500.
  console.error('Unexpected error:', err);
 
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong on the server',
  });
});
 
export default app;