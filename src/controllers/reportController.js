import { config } from '../config.js';
import { trucks } from '../data/trucks.js';
import { movements, alerts } from '../data/records.js';
import { getOccupancy } from '../services/gateServices.js';

// GET /api/occupancy — how full the premises are right now.
export function getOccupancyReport(req, res) {
  const inside = getOccupancy();

  res.status(200).json({
    inside,
    maxOccupancy: config.maxOccupancy,
    available: config.maxOccupancy - inside,
    capacityFull: inside >= config.maxOccupancy,
    // Just the registrations of the trucks inside.
    trucksInside: trucks
      .filter((truck) => truck.status === 'INSIDE')
      .map((truck) => truck.registration),
  });
}

// GET /api/movements — every gate event, newest first.
// [...movements] makes a copy, so .reverse() doesn't reorder the
// real list.
export function getMovements(req, res) {
  res.status(200).json([...movements].reverse());
}

// GET /api/alerts — security alerts, newest first.
export function getAlerts(req, res) {
  res.status(200).json([...alerts].reverse());
}