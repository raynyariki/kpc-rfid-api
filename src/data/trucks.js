export const trucks = [
  { epc: '300833B2DDD90140000001', registration: 'KDA 123A', isActive: true, status: 'OUTSIDE' },
  { epc: '300833B2DDD90140000002', registration: 'KCB 456B', isActive: true, status: 'OUTSIDE' },
 
  // Deactivated tag (e.g. reported lost or stolen): registered,
  // but must be refused.
  { epc: '300833B2DDD90140000003', registration: 'KDC 789C', isActive: false, status: 'OUTSIDE' },
 
  // Five more active trucks, so we have 7 active trucks in total
  // and can test what happens when a 7th tries to enter.
  { epc: '300833B2DDD90140000004', registration: 'KDD 234D', isActive: true, status: 'OUTSIDE' },
  { epc: '300833B2DDD90140000005', registration: 'KDE 345E', isActive: true, status: 'OUTSIDE' },
  { epc: '300833B2DDD90140000006', registration: 'KDF 456F', isActive: true, status: 'OUTSIDE' },
  { epc: '300833B2DDD90140000007', registration: 'KDG 567G', isActive: true, status: 'OUTSIDE' },
  { epc: '300833B2DDD90140000008', registration: 'KDH 678H', isActive: true, status: 'OUTSIDE' },
];