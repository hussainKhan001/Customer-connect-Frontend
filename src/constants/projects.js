/* ---- valuation register: one signed note per project per month ---- */
export const PROJECTS = [
  { code: 'GC', name: 'Garden City', entity: 'Neoteric Properties', launch: 2019, lr: 1850, ask: 7200, resale: 6450, circle: 4100, noted: '2026-07-31', by: 'Finance — Head of Accounts', basis: '6 registered resales, Towers A–C, Apr–Jun 2026' },
  { code: 'RG', name: 'Regal Garden', entity: 'Neoteric Properties', launch: 2021, lr: 2000, ask: 6900, resale: 6100, circle: 3900, noted: '2026-07-31', by: 'Finance — Head of Accounts', basis: '5 registered resales, Tower A, Apr–Jun 2026' },
  { code: 'ED', name: 'Eden Garden', entity: 'Neoteric Properties', launch: 2020, lr: 1950, ask: 6800, resale: 5980, circle: 3800, noted: '2026-07-31', by: 'Finance — Head of Accounts', basis: '3 registered resales, Block C, May–Jun 2026' },
  { code: 'WS', name: 'Westage', entity: 'Neoteric Properties', launch: 2021, lr: 2100, ask: 6700, resale: 5900, circle: 3800, noted: '2026-07-31', by: 'Finance — Head of Accounts', basis: '3 registered resales, May–Jun 2026' },
  { code: 'NP', name: 'Nature Park', entity: 'Navayan Realty', launch: 2022, lr: 2350, ask: 6200, resale: 5450, circle: 3600, noted: '2026-07-31', by: 'Finance — Head of Accounts', basis: '4 registered resales, Block A, May–Jun 2026' },
  { code: 'ZG', name: 'Zen Garden', entity: 'Navayan Realty', launch: 2023, lr: 2800, ask: 5900, resale: 5150, circle: 3400, noted: '2026-06-30', by: 'Finance — Head of Accounts', basis: '2 registered resales, Jun 2026' },
  { code: 'WT', name: 'Wildflower Township', entity: 'Navayan Realty', launch: 2024, lr: 3200, ask: 5400, resale: 4700, circle: 3200, noted: '2026-07-31', by: 'Finance — Head of Accounts', basis: 'circle rate only — no resale yet' },
  { code: 'HP', name: 'Hyde Park', entity: 'Heaven Heights', launch: 2022, lr: 2600, ask: 6400, resale: 5600, circle: 3700, noted: '2026-07-31', by: 'Finance — Head of Accounts', basis: '3 registered resales, Apr–Jun 2026' },
  { code: 'TS', name: 'The Statement', entity: 'Heaven Heights', launch: 2023, lr: 3400, ask: 6600, resale: 5800, circle: 3900, noted: '2026-03-31', by: 'Finance — Head of Accounts', basis: '1 registered resale, Feb 2026 — thin evidence' },
];
export const ENTITIES = [...new Set(PROJECTS.map((p) => p.entity))];
