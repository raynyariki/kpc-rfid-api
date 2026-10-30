// =============================================================
// gateServices.js — the business rules for the gates
// =============================================================
// A "service" holds the decision-making logic. It knows nothing
// about HTTP, URLs or status codes; it just answers questions like
// "may this truck enter?" and keeps the records up to date.

import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { trucks } from '../data/trucks.js';
import { movements, alerts, lastScans } from '../data/records.js';

// -------------------------------------------------------------
// SMALL HELPERS (shared by every gate)
// -------------------------------------------------------------

// Look up a truck by its EPC. Returns the truck, or undefined.
export function findTruckByEpc(epc) {
  return trucks.find((truck) => truck.epc === epc);
}

// How many trucks are inside right now.
// We COUNT the trucks marked INSIDE instead of keeping a separate
// number. One source of truth means the count can never drift out
// of step with the trucks' statuses (KPC: "Data Integrity").
export function getOccupancy() {
  return trucks.filter((truck) => truck.status === 'INSIDE').length;
}

// Has this tag already been processed at this gate within the
// duplicate window? The gate is part of the key, so a truck seen at
// ENTRY and then at EXIT is never mistaken for a duplicate.
function isDuplicateScan(gate, epc, now) {
  const lastTime = lastScans.get(`${gate}:${epc}`);
  return lastTime !== undefined && now.getTime() - lastTime < config.duplicateWindowMs;
}

// Remember that this tag was processed at this gate just now.
function rememberScan(gate, epc, now) {
  lastScans.set(`${gate}:${epc}`, now.getTime());
}

// Save an alert for security, and print it in the terminal.
function raiseAlert(type, message, epc, now) {
  alerts.push({
    id: randomUUID(),
    type,
    message,
    epc,
    timestamp: now.toISOString(),
  });
  console.warn(`ALERT [${type}] ${message}`);
}

// The reply for a duplicate scan: not recorded, changes nothing.
function ignoredScan(gate, epc, now) {
  const reply = {
    gate,
    epc,
    result: 'IGNORED',
    reason: 'Duplicate scan',
    occupancy: getOccupancy(),
    maxOccupancy: config.maxOccupancy,
    timestamp: now.toISOString(),
  };
  if (gate === 'ENTRY') reply.gateAction = 'NO_CHANGE';
  return reply;
}

// Build the decision, save it as a movement record, and return it.
// Every outcome at every gate goes through here, so all replies and
// records have the same fields.
function recordDecision({ gate, epc, truck, result, reason, now }) {
  const decision = {
    id: randomUUID(),
    gate,                                     // 'ENTRY' or 'EXIT'
    eventType: gate,
    epc,
    truck: truck ? truck.registration : null,
    result,                                   // 'ALLOWED' or 'DENIED'
    reason,                                   // null when allowed
    occupancy: getOccupancy(),                // trucks inside AFTER this event
    maxOccupancy: config.maxOccupancy,
    timestamp: now.toISOString(),
  };

  // Only the entry gate locks automatically (KPC document, FR-07),
  // so only entry decisions tell the gate what to do.
  if (gate === 'ENTRY') {
    decision.gateAction = result === 'ALLOWED' ? 'UNLOCK' : 'KEEP_LOCKED';
  }

  movements.push(decision);
  return decision;
}

// -------------------------------------------------------------
// THE ENTRY GATE
// -------------------------------------------------------------
export function processEntry(epc, now = new Date()) {
  const gate = 'ENTRY';

  // Check 0: duplicate scan? Ignore it completely (FR-20).
  if (isDuplicateScan(gate, epc, now)) return ignoredScan(gate, epc, now);
  rememberScan(gate, epc, now);

  const truck = findTruckByEpc(epc);

  // Rule 1: the tag must be registered.
  if (!truck) {
    raiseAlert('UNREGISTERED_TAG', `Unregistered tag ${epc} at entry gate`, epc, now);
    return recordDecision({ gate, epc, truck, result: 'DENIED', reason: 'Unregistered tag', now });
  }

  // Rule 2: the tag must be active.
  if (!truck.isActive) {
    raiseAlert('DEACTIVATED_TAG', `Deactivated tag for ${truck.registration} at entry gate`, epc, now);
    return recordDecision({ gate, epc, truck, result: 'DENIED', reason: 'Tag deactivated', now });
  }

  // Rule 3: the truck must not already be inside.
  if (truck.status === 'INSIDE') {
    return recordDecision({ gate, epc, truck, result: 'DENIED', reason: 'Truck already inside', now });
  }

  // Rule 4: there must be space (FR-05, FR-06).
  if (getOccupancy() >= config.maxOccupancy) {
    raiseAlert(
      'CAPACITY_FULL',
      `${truck.registration} refused entry: ${config.maxOccupancy} of ${config.maxOccupancy} trucks inside`,
      epc,
      now,
    );
    return recordDecision({ gate, epc, truck, result: 'DENIED', reason: 'Premises full', now });
  }

  // All checks passed: change the status FIRST, so the occupancy
  // saved in the record already includes this truck (FR-10).
  truck.status = 'INSIDE';
  return recordDecision({ gate, epc, truck, result: 'ALLOWED', reason: null, now });
}

// -------------------------------------------------------------
// THE EXIT GATE (NEW)
// -------------------------------------------------------------
// A valid exit identifies the truck, records the time, changes its
// status from INSIDE to OUTSIDE and frees one space (KPC document,
// "Automated Exit Detection", FR-09, FR-10).
export function processExit(epc, now = new Date()) {
  const gate = 'EXIT';

  // Check 0: duplicate scan? Ignore it completely (FR-20).
  if (isDuplicateScan(gate, epc, now)) return ignoredScan(gate, epc, now);
  rememberScan(gate, epc, now);

  const truck = findTruckByEpc(epc);

  // Rule 1: the tag must be registered. An unknown truck LEAVING
  // means it got in without being checked, so security must know.
  if (!truck) {
    raiseAlert('UNREGISTERED_TAG', `Unregistered tag ${epc} at exit gate`, epc, now);
    return recordDecision({ gate, epc, truck, result: 'DENIED', reason: 'Unregistered tag', now });
  }

  // A deactivated tag (e.g. reported stolen) leaving is suspicious,
  // so we alert security. We still record the exit below: the truck
  // may have entered before the tag was deactivated, and the count
  // must stay correct.
  if (!truck.isActive) {
    raiseAlert('DEACTIVATED_TAG', `Deactivated tag for ${truck.registration} at exit gate`, epc, now);
  }

  // Rule 2: the truck must be recorded as inside. If not, the
  // records don't match reality (it may have entered without a
  // scan). The KPC document asks for such inconsistencies to be
  // flagged for review, so we alert and leave the count unchanged.
  if (truck.status !== 'INSIDE') {
    raiseAlert(
      'OCCUPANCY_INCONSISTENCY',
      `${truck.registration} seen at exit gate but not recorded as inside`,
      epc,
      now,
    );
    return recordDecision({ gate, epc, truck, result: 'DENIED', reason: 'Truck not recorded as inside', now });
  }

  // Valid exit: change the status FIRST, so the occupancy saved in
  // the record already reflects the freed space.
  truck.status = 'OUTSIDE';
  return recordDecision({ gate, epc, truck, result: 'ALLOWED', reason: null, now });
}