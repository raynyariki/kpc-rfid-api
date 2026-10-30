// =============================================================
// rfidController.js — handles HTTP requests from the readers
// =============================================================
// The controller's job:
//   1. Read and check the data the reader sent (validation).
//   2. Pass clean data to the service for a decision.
//   3. Send the service's answer back as an HTTP response.

import { processEntry, processExit } from '../services/gateServices.js';

// EPCs are hexadecimal: only the digits 0-9 and letters A-F.
const EPC_PATTERN = /^[0-9A-F]+$/;

// -------------------------------------------------------------
// SHARED VALIDATION
// -------------------------------------------------------------
// Every gate needs exactly the same checks, so they live in ONE
// function instead of being copied into each handler. Fixing a bug
// here fixes it for every gate ("Don't Repeat Yourself").
//
// Returns the clean EPC if it is valid. If it is not, it sends the
// 400 reply itself and returns null, so the handler knows to stop.
function getCleanEpc(req, res) {
  // If nothing was sent, "?? {}" swaps in an empty object so the
  // next line doesn't crash.
  const { epc } = req.body ?? {};

  // Validation 1: epc must exist and be text.
  if (typeof epc !== 'string' || epc.trim() === '') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'epc is required and must be a text value',
    });
    return null;
  }

  // Clean it: no spaces at the ends, all uppercase.
  const cleanEpc = epc.trim().toUpperCase();

  // Validation 2: only hexadecimal characters allowed.
  if (!EPC_PATTERN.test(cleanEpc)) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'epc must only contain the characters 0-9 and A-F',
    });
    return null;
  }

  return cleanEpc;
}

// -------------------------------------------------------------
// ONE HANDLER PER GATE
// -------------------------------------------------------------

// POST /api/rfid/entry
export function handleEntry(req, res) {
  const epc = getCleanEpc(req, res);
  if (!epc) return; // the 400 reply has already been sent

  return res.status(200).json(processEntry(epc));
}

// POST /api/rfid/exit (NEW)
export function handleExit(req, res) {
  const epc = getCleanEpc(req, res);
  if (!epc) return;

  return res.status(200).json(processExit(epc));
}