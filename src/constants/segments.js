export const DEFAULT_W = { capacity: 40, trust: 25, timing: 20, engagement: 15 };
export const TRUST_HEAVY_W = { capacity: 25, trust: 45, timing: 15, engagement: 15 };

export const SEGLBL = {
  A: 'A · Ready to re-invest', B: 'B · Nurture',
  C: 'C · Repair first', D: 'D · Referral only',
};
export const SEGMETA = {
  A: { w: 'Score 76+, clean service record, capacity present.', o: 'Owner: CEO / GM — personal call only' },
  B: { w: 'Right relationship, wrong moment. Capacity or timing still building.', o: 'Owner: CRM — quarterly statement + events' },
  C: { w: 'Blocked by the gate. Sales outreach is locked until it clears.', o: 'Owner: Service, Legal or CRM' },
  D: { w: 'High trust, no capacity. They cannot buy — they can bring buyers.', o: 'Owner: CRM — referral programme' },
};
export const STATUSLBL = {
  ACTIVE: 'Active owner',
  EXITED: 'Exited — no longer an owner',
  TRANSFER_IN_PROGRESS: 'Transfer in progress',
  DECEASED: 'Deceased — transfer pending',
};

/* Investor tab's two captured fields — mirrors OWNER_TYPES/OCCUPANCIES
   in backend/src/lib/core.js, which coerces anything outside these
   sets to null ("not captured"). */
export const OWNER_TYPE_LBL = {
  INVESTOR: 'Investor',
  END_USER: 'End user',
};
export const OCCUPANCY_LBL = {
  SELF_OCCUPIED: 'Self-occupied',
  RENTED: 'Rented out',
  VACANT: 'Vacant',
};
