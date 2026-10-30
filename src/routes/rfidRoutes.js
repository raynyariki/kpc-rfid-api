// =============================================================
// rfidRoutes.js — the URLs the RFID readers send scans to
// =============================================================
// app.js attaches this group under /api/rfid, so "/entry" below
// becomes POST /api/rfid/entry.

import { Router } from 'express';
import { handleEntry, handleExit } from '../controllers/rfidController.js';

const router = Router();

// POST because each reader is SENDING us new data (a scan).
router.post('/entry', handleEntry);
router.post('/exit', handleExit); // NEW

// Coming next:
// router.post('/rejection', handleRejection);

export default router;