-- =============================================================
--  Road Test Management ERP — seed data
--  File: supabase/seed.sql
--  Run AFTER 001_initial_schema.sql.
--
--  This seed mirrors src/mock/*.ts in the front-end prototype so the
--  same demo state is reproducible on a real Supabase instance.
--
--  Strategy: we use deterministic UUIDs derived from the legacy IDs
--  (U001, PRJ-2025-014, V-001 ...) via uuid_generate_v5. That keeps
--  the seed file self-contained — every foreign key resolves without
--  intermediate SELECTs.
-- =============================================================

SET search_path TO rtm, public;

-- Stable namespace UUID (one per project). Generated once via uuidgen.
-- Do not change — every legacy_id-derived UUID is anchored on this.
--   namespace = 'b0a7d6e2-9c8e-5f4f-8e1d-3b6a2c1d5e7f'
\set ns 'b0a7d6e2-9c8e-5f4f-8e1d-3b6a2c1d5e7f'

-- Convenience macro: id_of('U001') -> deterministic uuid.
-- (psql variable interpolation; pure SQL would need a function — see below.)
CREATE OR REPLACE FUNCTION rtm._id(legacy text)
RETURNS uuid AS $$
  SELECT uuid_generate_v5('b0a7d6e2-9c8e-5f4f-8e1d-3b6a2c1d5e7f'::uuid, legacy);
$$ LANGUAGE sql IMMUTABLE;


-- -------------------------------------------------------------
-- USERS  (11 — matches src/mock/users.ts)
-- -------------------------------------------------------------
INSERT INTO rtm.users (id, legacy_id, name, email, phone, role, city,
                       account_status, licence_valid, training_complete, insurance_eligible)
VALUES
  (_id('U001'), 'U001', 'Sarah Mitchell',  'sarah.m@rtm.co.uk',    '+44 7700 900101', 'PMO',             'London',     'Active', true,  true,  true),
  (_id('U002'), 'U002', 'James Chen',      'james.c@rtm.co.uk',    '+44 7700 900102', 'Project Manager', 'Cambridge',  'Active', true,  true,  true),
  (_id('U003'), 'U003', 'Olivia Brown',    'olivia.b@rtm.co.uk',   '+44 7700 900103', 'Project Manager', 'Edinburgh',  'Active', true,  true,  true),
  (_id('U004'), 'U004', 'Mohammed Ali',    'm.ali@rtm.co.uk',      '+44 7700 900104', 'Test Engineer',   'London',     'Active', true,  true,  true),
  (_id('U005'), 'U005', 'Elena Petrova',   'elena.p@rtm.co.uk',    '+44 7700 900105', 'Test Engineer',   'Cambridge',  'Active', true,  true,  true),
  (_id('U006'), 'U006', 'David Walker',    'd.walker@rtm.co.uk',   '+44 7700 900106', 'Driver',          'London',     'Active', true,  true,  true),
  (_id('U007'), 'U007', 'Tom Reeves',      't.reeves@rtm.co.uk',   '+44 7700 900107', 'Driver',          'Cambridge',  'Active', true,  true,  true),
  (_id('U008'), 'U008', 'Aisha Khan',      'a.khan@rtm.co.uk',     '+44 7700 900108', 'Driver',          'Edinburgh',  'Active', true,  true,  true),
  (_id('U009'), 'U009', 'Henry Williams',  'h.williams@rtm.co.uk', '+44 7700 900109', 'Driver',          'Manchester', 'Active', true,  false, true),
  (_id('U010'), 'U010', 'Rachel Green',    'r.green@rtm.co.uk',    '+44 7700 900110', 'Finance',         'London',     'Active', true,  true,  true),
  (_id('U011'), 'U011', 'Marcus Holloway', 'm.holloway@rtm.co.uk', '+44 7700 900111', 'Admin',           'London',     'Suspended', true,  true,  true);

-- -------------------------------------------------------------
-- PROJECTS  (5 — matches src/mock/projects.ts)
-- -------------------------------------------------------------
INSERT INTO rtm.projects (id, legacy_id, code, name, client, type,
                          manager_id, pmo_owner_id, region,
                          start_date, end_date, status, priority,
                          vehicles_needed, staff_needed, plate_needed,
                          data_req, progress, notes)
VALUES
  (_id('PRJ-2025-014'), 'PRJ-2025-014', 'PRJ-2025-014',
     'ADAS Highway Validation — M11 Corridor', 'Aurora Mobility Ltd', 'ADAS Testing',
     _id('U002'), _id('U001'), 'Cambridge → London',
     '2026-04-22', '2026-06-30', 'In Progress', 'High',
     3, 5, true, 'Full CAN + camera + radar logs', 64,
     'Daily 6h test windows, must avoid peak traffic 07:30–09:30.'),
  (_id('PRJ-2025-015'), 'PRJ-2025-015', 'PRJ-2025-015',
     'EV Cold-Weather Range Study — Scottish Highlands', 'Voltaic Drive Plc', 'EV Performance',
     _id('U003'), _id('U001'), 'Edinburgh → Aviemore',
     '2026-05-01', '2026-05-25', 'In Progress', 'High',
     2, 4, true, 'Energy + thermal + driver behaviour', 38,
     'Convoy testing, two cars in parallel.'),
  (_id('PRJ-2025-013'), 'PRJ-2025-013', 'PRJ-2025-013',
     'Brake System Compliance — Edinburgh Bay', 'Apex Drivetrain GmbH', 'Brake Testing',
     _id('U002'), _id('U001'), 'Edinburgh',
     '2026-04-15', '2026-05-25', 'Issue Handling', 'Medium',
     1, 2, true, 'Brake telemetry + GoPro', 72,
     'Plate TP-004 expiring — see ISS-501.'),
  (_id('PRJ-2025-016'), 'PRJ-2025-016', 'PRJ-2025-016',
     'ULEZ Inner-London Sweep — Q2 Phase', 'Greenline Auto Inc', 'Urban Testing',
     _id('U002'), _id('U001'), 'London',
     '2026-05-12', '2026-07-11', 'Scheduling', 'Medium',
     2, 3, true, 'Urban driving + emissions logger', 12,
     'Awaiting plate allocation confirmation.'),
  (_id('PRJ-2025-017'), 'PRJ-2025-017', 'PRJ-2025-017',
     'New Driver Familiarisation — Cambridge Loop', 'Internal', 'Training',
     _id('U002'), _id('U001'), 'Cambridge',
     '2026-05-04', '2026-05-18', 'In Progress', 'Low',
     1, 3, false, 'Driver behaviour observation', 50,
     'On-boarding 3 new drivers.');

-- -------------------------------------------------------------
-- PROJECT MEMBERS  (drivers + engineers per project)
-- -------------------------------------------------------------
INSERT INTO rtm.project_members (project_id, user_id, role_in_project, start_date, end_date)
VALUES
  -- PRJ-2025-014 — David driver, Mohammed engineer
  (_id('PRJ-2025-014'), _id('U006'), 'Primary driver',  '2026-04-22', NULL),
  (_id('PRJ-2025-014'), _id('U009'), 'Backup driver',   '2026-04-22', NULL),
  (_id('PRJ-2025-014'), _id('U004'), 'Primary engineer','2026-04-22', NULL),
  -- PRJ-2025-015 — convoy
  (_id('PRJ-2025-015'), _id('U007'), 'Primary driver',  '2026-05-01', NULL),
  (_id('PRJ-2025-015'), _id('U008'), 'Convoy driver',   '2026-05-01', NULL),
  (_id('PRJ-2025-015'), _id('U005'), 'Primary engineer','2026-05-01', NULL),
  -- PRJ-2025-013 — brake
  (_id('PRJ-2025-013'), _id('U008'), 'Primary driver',  '2026-04-15', NULL),
  (_id('PRJ-2025-013'), _id('U005'), 'Primary engineer','2026-04-15', NULL),
  -- PRJ-2025-016 — ULEZ
  (_id('PRJ-2025-016'), _id('U009'), 'Primary driver',  '2026-05-12', NULL),
  (_id('PRJ-2025-016'), _id('U004'), 'Primary engineer','2026-05-12', NULL),
  -- PRJ-2025-017 — training
  (_id('PRJ-2025-017'), _id('U007'), 'Lead trainer',    '2026-05-04', NULL);

-- -------------------------------------------------------------
-- VEHICLES  (11 — matches src/mock/vehicles.ts)
-- -------------------------------------------------------------
INSERT INTO rtm.vehicles (id, legacy_id, plate, vin, brand, model, year, power, ownership,
                          city, current_project_id, current_driver_id, status,
                          insurance, mot_expiry, mileage, equipment)
VALUES
  (_id('V-001'), 'V-001', 'LR72 KXP',  'WBA8E1C50JK***1', 'BMW',    '330e',      2023, 'Hybrid', 'Owned',  'London',     _id('PRJ-2025-014'), _id('U006'), 'In Use',      'Covered', '2026-09-12', 38421, ARRAY['PNC','GoPro x4','HDD bay']),
  (_id('V-002'), 'V-002', 'CB23 OTL',  'JN1TANT32U***2',  'Nissan', 'Leaf e+',   2023, 'EV',     'Owned',  'Cambridge',  _id('PRJ-2025-015'), _id('U007'), 'In Use',      'Covered', '2026-07-30', 21984, ARRAY['Energy logger','GNSS']),
  (_id('V-003'), 'V-003', 'EH72 NMR',  'WVWZZZ1KZ***3',   'VW',     'ID.4',      2024, 'EV',     'Leased', 'Edinburgh',  _id('PRJ-2025-015'), _id('U008'), 'In Use',      'Covered', '2027-01-15', 14302, ARRAY['Lidar mount','Thermal cam']),
  (_id('V-004'), 'V-004', 'LD24 VBR',  '5YJSA1E26K***4',  'Tesla',  'Model Y',   2024, 'EV',     'Owned',  'London',     _id('PRJ-2025-016'), _id('U009'), 'Reserved',    'Covered', '2027-02-20',  8730, ARRAY['8x camera','Lidar','GNSS']),
  (_id('V-005'), 'V-005', 'CB71 FGH',  'WBA5T7C50KK***5', 'BMW',    'X3',        2022, 'Petrol', 'Owned',  'Cambridge',  NULL,                 NULL,         'Available',   'Covered', '2026-06-04', 52610, ARRAY['PNC']),
  (_id('V-006'), 'V-006', 'LR21 MNQ',  '1FMCU0F7***6',    'Ford',   'Kuga',      2022, 'Diesel', 'Leased', 'London',     NULL,                 NULL,         'Maintenance', 'Covered', '2026-08-22', 71204, ARRAY['GoPro x2']),
  (_id('V-007'), 'V-007', 'EH22 PQR',  'WAUZZZF2***7',    'Audi',   'Q4 e-tron', 2023, 'EV',     'Owned',  'Edinburgh',  _id('PRJ-2025-013'), _id('U008'), 'In Use',      'Pending', '2026-05-30', 19877, ARRAY['Brake test rig']),
  (_id('V-008'), 'V-008', 'LR73 STU',  'JTDKB20U***8',    'Toyota', 'bZ4X',      2024, 'EV',     'Owned',  'London',     _id('PRJ-2025-014'), _id('U009'), 'In Use',      'Covered', '2027-04-10',  5430, ARRAY['PNC','GoPro x2']),
  (_id('V-009'), 'V-009', 'MN72 ZXC',  'JTDKB20U***9',    'Toyota', 'Prius',     2021, 'Hybrid', 'Owned',  'Manchester', NULL,                 NULL,         'Accident',    'Covered', '2026-11-18', 89432, ARRAY[]::text[]),
  (_id('V-010'), 'V-010', 'CB22 TVN',  'WF0XXXTTGX***A',  'Ford',   'Transit',   2022, 'Diesel', 'Owned',  'Cambridge',  _id('PRJ-2025-014'), NULL,         'Available',   'Covered', '2026-10-08', 42188, ARRAY['HDD bay','Equipment rack','Power inverter']),
  (_id('V-011'), 'V-011', 'LR73 PSX',  '5YJ3E1EA0K***B',  'Tesla',  'Model Y',   2023, 'EV',     'Leased', 'London',     NULL,                 NULL,         'Available',   'Covered', '2027-03-25', 12876, ARRAY['GoPro x2','GNSS']);

-- -------------------------------------------------------------
-- PLATES  (7 — matches src/mock/plates.ts incl. expired TP-007)
-- -------------------------------------------------------------
INSERT INTO rtm.plates (id, legacy_id, number, type, valid_from, valid_to, status,
                        current_project_id, current_vehicle_id, responsible_user_id, notes)
VALUES
  (_id('TP-001'), 'TP-001', 'TX 1245', 'Trade Plate',     '2026-01-01', '2026-12-31', 'In Use',    _id('PRJ-2025-014'), _id('V-001'), _id('U002'), 'Annual trade plate, primary.'),
  (_id('TP-002'), 'TP-002', 'TX 1246', 'Trade Plate',     '2026-01-01', '2026-12-31', 'In Use',    _id('PRJ-2025-015'), _id('V-002'), _id('U003'), ''),
  (_id('TP-003'), 'TP-003', 'TX 1247', 'Trade Plate',     '2026-01-01', '2026-12-31', 'In Use',    _id('PRJ-2025-015'), _id('V-003'), _id('U003'), 'Edinburgh ops.'),
  (_id('TP-004'), 'TP-004', 'TP 8821', 'Temporary Plate', '2026-04-15', '2026-05-15', 'In Use',    _id('PRJ-2025-013'), _id('V-007'), _id('U002'), 'Expiring soon — renew before May 14.'),
  (_id('TP-005'), 'TP-005', 'TP 8822', 'Temporary Plate', '2026-05-01', '2026-07-01', 'Reserved',  _id('PRJ-2025-016'), _id('V-004'), _id('U002'), 'Pending project kick-off.'),
  (_id('TP-006'), 'TP-006', 'TX 1248', 'Trade Plate',     '2026-01-01', '2026-12-31', 'Available', NULL,                 NULL,         _id('U001'), 'Spare.'),
  (_id('TP-007'), 'TP-007', 'TP 8780', 'Temporary Plate', '2026-02-01', '2026-04-30', 'Expired',   _id('PRJ-2025-013'), _id('V-007'), _id('U002'), 'Expired April 30 — must not reuse.');

-- -------------------------------------------------------------
-- PLATE ALLOCATIONS  (6 — last one is the deliberate conflict)
-- The trigger detect_plate_conflicts() will set conflict=true on
-- both overlapping rows automatically.
-- -------------------------------------------------------------
INSERT INTO rtm.plate_allocations (id, legacy_id, plate_id, project_id, vehicle_id,
                                   responsible_user_id, start_date, end_date)
VALUES
  (_id('PA-1'), 'PA-1', _id('TP-001'), _id('PRJ-2025-014'), _id('V-001'), _id('U002'), '2026-04-22', '2026-06-30'),
  (_id('PA-2'), 'PA-2', _id('TP-002'), _id('PRJ-2025-015'), _id('V-002'), _id('U003'), '2026-05-04', '2026-05-25'),
  (_id('PA-3'), 'PA-3', _id('TP-003'), _id('PRJ-2025-015'), _id('V-003'), _id('U003'), '2026-05-04', '2026-05-25'),
  (_id('PA-4'), 'PA-4', _id('TP-004'), _id('PRJ-2025-013'), _id('V-007'), _id('U002'), '2026-04-15', '2026-05-15'),
  (_id('PA-5'), 'PA-5', _id('TP-005'), _id('PRJ-2025-016'), _id('V-004'), _id('U002'), '2026-05-12', '2026-07-11'),
  -- Deliberate conflict: TP-001 booked for two projects in overlapping windows
  (_id('PA-6'), 'PA-6', _id('TP-001'), _id('PRJ-2025-014'), _id('V-008'), _id('U002'), '2026-05-22', '2026-06-04');

-- -------------------------------------------------------------
-- ROUTES  (6)
-- -------------------------------------------------------------
INSERT INTO rtm.routes (id, legacy_id, project_id, name, city, type,
                        distance_mi, duration, risk_level, maps_link, gpx_file, status)
VALUES
  (_id('R-001'), 'R-001', _id('PRJ-2025-014'), 'M11 Cambridge → London Stansted',
     'Cambridge → London', 'Highway', 58.0, '1 hour 10 minutes', 'Medium',
     'https://maps.google.com/?saddr=Cambridge&daddr=Stansted', 'R-001_M11.gpx', 'Active'),
  (_id('R-002'), 'R-002', _id('PRJ-2025-016'), 'London Inner ULEZ Sweep',
     'London', 'Urban', 42.0, '2 hours 30 minutes', 'High',
     'https://maps.google.com/?q=ULEZ+London', 'R-002_ULEZ.gpx', 'Active'),
  (_id('R-003'), 'R-003', _id('PRJ-2025-015'), 'Edinburgh → Aviemore A9',
     'Edinburgh → Aviemore', 'Highway', 132.0, '2 hours 45 minutes', 'Medium',
     'https://maps.google.com/?saddr=Edinburgh&daddr=Aviemore', 'R-003_A9.gpx', 'Active'),
  (_id('R-004'), 'R-004', _id('PRJ-2025-017'), 'Cambridge Ring Road Loop',
     'Cambridge', 'Urban', 18.0, '45 minutes', 'Low',
     'https://maps.google.com/?q=Cambridge+Ring+Road', 'R-004_CambridgeLoop.gpx', 'Active'),
  (_id('R-005'), 'R-005', NULL, 'Manchester Orbital — M60',
     'Manchester', 'Highway', 56.0, '1 hour 15 minutes', 'Low',
     'https://maps.google.com/?q=M60+Manchester', NULL, 'Draft'),
  (_id('R-006'), 'R-006', _id('PRJ-2025-014'), 'Felixstowe Port → Cambridge HQ',
     'Felixstowe → Cambridge', 'Mixed', 78.0, '1 hour 35 minutes', 'Medium',
     'https://maps.google.com/?saddr=Felixstowe&daddr=Cambridge', 'R-006_Felixstowe.gpx', 'Active');

-- -------------------------------------------------------------
-- POIS  (10)
-- -------------------------------------------------------------
INSERT INTO rtm.pois (id, legacy_id, route_id, project_id, name, type, address, city, lat, lng, notes, photo_ref)
VALUES
  (_id('POI-001'), 'POI-001', _id('R-001'), _id('PRJ-2025-014'), 'M11 J9 Northbound Camera Site',     'Camera Site',
     'M11 J9 northbound, Great Chesterford', 'Cambridge', 52.0813, 0.1903,
     'Mounted gantry on RHS, target panel placement required.', 'lark://drive/poi-001-photo'),
  (_id('POI-002'), 'POI-002', _id('R-001'), _id('PRJ-2025-014'), 'Stansted Long-Stay Car Park',       'Parking',
     'Long Stay Car Park, Stansted Airport, CM24 1RW', 'Stansted', 51.8847, 0.2378,
     'Free for fleet vehicles up to 6h with PNC.', NULL),
  (_id('POI-003'), 'POI-003', _id('R-003'), _id('PRJ-2025-015'), 'Aviemore Cold-Soak Yard',           'Test Site',
     'Dalfaber Industrial Estate, Aviemore PH22 1ST', 'Aviemore', 57.1916, -3.8294,
     'Overnight cold-soak bay, contact site manager Andy McRae.', 'lark://drive/poi-003-photo'),
  (_id('POI-004'), 'POI-004', _id('R-002'), _id('PRJ-2025-016'), 'Mile End ULEZ Boundary',            'Boundary',
     'Bow Road / A11, London E3', 'London', 51.5240, -0.0337,
     'Boundary crossing for ULEZ entry log.', NULL),
  (_id('POI-005'), 'POI-005', _id('R-002'), _id('PRJ-2025-016'), 'Old Street Roundabout — High-Risk Junction', 'Risk Point',
     'Old Street, Shoreditch, London EC1V', 'London', 51.5258, -0.0876,
     'Heavy cyclist / pedestrian traffic. Reduce speed, no manual overrides during test.', 'lark://drive/poi-005-photo'),
  (_id('POI-006'), 'POI-006', _id('R-004'), _id('PRJ-2025-017'), 'Madingley Park & Ride',             'Parking',
     'Madingley Road, Cambridge CB23 8AQ', 'Cambridge', 52.2167, 0.0500,
     'Used as muster point for convoy tests.', NULL),
  (_id('POI-007'), 'POI-007', _id('R-003'), _id('PRJ-2025-015'), 'Perth Ionity Charging Hub',         'Charging',
     'Broxden Services, Perth PH2 0PX', 'Perth', 56.4083, -3.4717,
     '350 kW chargers x4. Account: Voltaic Drive corporate.', 'lark://drive/poi-007-photo'),
  (_id('POI-008'), 'POI-008', _id('R-001'), _id('PRJ-2025-014'), 'Royal Mail HDD Dispatch Point — Cambridge', 'Data Handover',
     'Cambridge Mail Centre, Mill Road CB1 2AZ', 'Cambridge', 52.2053, 0.1218,
     'Special Delivery Guaranteed cut-off 17:30. PMO approval required for >£500 contents.', NULL),
  (_id('POI-009'), 'POI-009', _id('R-001'), _id('PRJ-2025-014'), 'Birchanger Green Services',         'Service Area',
     'M11 J8, Birchanger CM23 5QZ', 'Stansted', 51.8617, 0.2147,
     'Convenient refuel + 30-min driver break mid-test.', NULL),
  (_id('POI-010'), 'POI-010', _id('R-006'), _id('PRJ-2025-014'), 'Felixstowe Port Start Point',       'Start Point',
     'Port of Felixstowe, Tomline Road IP11 3SY', 'Felixstowe', 51.9550, 1.3500,
     'Vehicle collection point for imported test fleet.', 'lark://drive/poi-010-photo');

-- -------------------------------------------------------------
-- DAILY TASKS  (5 — all dated 2026-05-07 to match TODAY)
-- -------------------------------------------------------------
INSERT INTO rtm.daily_tasks (id, legacy_id, task_date, project_id, vehicle_id,
                             driver_id, engineer_id, route_id,
                             start_point, end_point, planned_hours, status, data_req, notes)
VALUES
  (_id('DT-2461'), 'DT-2461', '2026-05-07', _id('PRJ-2025-014'), _id('V-001'), _id('U006'), _id('U004'), _id('R-001'),
     'Cambridge HQ',    'London Stansted', 6.0, 'In Progress', 'Full ADAS log',     'Calibration target panel in boot.'),
  (_id('DT-2462'), 'DT-2462', '2026-05-07', _id('PRJ-2025-015'), _id('V-002'), _id('U007'), _id('U005'), _id('R-003'),
     'Edinburgh Depot', 'Aviemore',        7.0, 'In Progress', 'Energy + thermal',  'Pre-conditioning at 4°C.'),
  (_id('DT-2463'), 'DT-2463', '2026-05-07', _id('PRJ-2025-015'), _id('V-003'), _id('U008'), _id('U005'), _id('R-003'),
     'Edinburgh Depot', 'Aviemore',        7.0, 'Planned',     'Backup logger',     'Convoy with V-002.'),
  (_id('DT-2464'), 'DT-2464', '2026-05-07', _id('PRJ-2025-013'), _id('V-007'), _id('U008'), _id('U005'), _id('R-005'),
     'Edinburgh Depot', 'Brake test bay',  4.0, 'Issue',       'Brake telemetry',   'Temp plate expiring — renew.'),
  (_id('DT-2465'), 'DT-2465', '2026-05-07', _id('PRJ-2025-014'), _id('V-008'), _id('U009'), _id('U004'), _id('R-001'),
     'London HQ',       'Cambridge HQ',    5.0, 'Completed',   'ADAS regression',   '');

-- -------------------------------------------------------------
-- VEHICLE CHECKS  (5)
-- -------------------------------------------------------------
INSERT INTO rtm.vehicle_checks (id, legacy_id, vehicle_id, submitted_by, check_type, status,
                                performed_at, mileage, fuel_pct, hdd_free_gb, issue_found,
                                checklist_state, notes)
VALUES
  (_id('VC-3301'), 'VC-3301', _id('V-001'), _id('U006'), 'Pre-Drive',  'OK',
     '2026-05-07 07:30+00', 38421, 78, 412, false,
     '{"tyres":"ok","lights":"ok","mirrors":"ok","windscreen":"ok","dashboard":"ok","fluids":"ok","pnc":"ok","logger":"ok","gnss":"ok","hdd":"ok","interior":"ok","seatbelts":"ok"}'::jsonb,
     'All clear.'),
  (_id('VC-3302'), 'VC-3302', _id('V-002'), _id('U007'), 'Pre-Drive',  'OK',
     '2026-05-07 06:00+00', 21984, 92, 380, false,
     '{"tyres":"ok","lights":"ok","mirrors":"ok","windscreen":"ok","dashboard":"ok","fluids":"ok","pnc":"ok","logger":"ok","gnss":"ok","hdd":"ok","interior":"ok","seatbelts":"ok"}'::jsonb,
     'Battery 92%.'),
  (_id('VC-3303'), 'VC-3303', _id('V-007'), _id('U008'), 'Pre-Drive',  'Warning',
     '2026-05-07 08:10+00', 19877, 64, 88, true,
     '{"tyres":"ok","lights":"ok","mirrors":"ok","windscreen":"ok","dashboard":"ok","fluids":"ok","pnc":"ok","logger":"ok","gnss":"ok","hdd":"warning","interior":"ok","seatbelts":"ok"}'::jsonb,
     'HDD nearly full — see ISS-503.'),
  (_id('VC-3304'), 'VC-3304', _id('V-008'), _id('U009'), 'Post-Drive', 'OK',
     '2026-05-06 18:30+00',  5430, 71, 488, false,
     '{}'::jsonb,
     'Returned to London depot.'),
  (_id('VC-3305'), 'VC-3305', _id('V-006'), NULL,        'Check-In',   'Critical',
     '2026-05-05 11:00+00', 71204, 22, 0, true,
     '{"tyres":"bad","fluids":"bad","hdd":"bad"}'::jsonb,
     'Sent for maintenance, multiple faults.');

-- -------------------------------------------------------------
-- ATTENDANCE RECORDS  (5)
-- -------------------------------------------------------------
INSERT INTO rtm.attendance_records (id, legacy_id, user_id, project_id, task_id, vehicle_id,
                                    event_type, status, event_at, location, has_photo)
VALUES
  (_id('AT-9001'), 'AT-9001', _id('U006'), _id('PRJ-2025-014'), _id('DT-2461'), _id('V-001'),
     'Clock In',           'Normal', '2026-05-07 07:42+00', 'Cambridge HQ Car Park', true),
  (_id('AT-9002'), 'AT-9002', _id('U006'), _id('PRJ-2025-014'), _id('DT-2461'), _id('V-001'),
     'Arrived Test Area',  'Normal', '2026-05-07 09:18+00', 'M11 J8 Lay-by',         false),
  (_id('AT-9003'), 'AT-9003', _id('U007'), _id('PRJ-2025-015'), _id('DT-2462'), _id('V-002'),
     'Clock In',           'Normal', '2026-05-07 06:15+00', 'Edinburgh Depot',       true),
  (_id('AT-9004'), 'AT-9004', _id('U008'), _id('PRJ-2025-013'), _id('DT-2464'), _id('V-007'),
     'Clock In',           'Late',   '2026-05-07 08:25+00', 'Edinburgh Depot',       true),
  (_id('AT-9005'), 'AT-9005', _id('U004'), _id('PRJ-2025-014'), _id('DT-2461'), _id('V-001'),
     'Clock In',           'Normal', '2026-05-07 07:55+00', 'Cambridge HQ',          false);

-- -------------------------------------------------------------
-- ISSUES  (5)
-- -------------------------------------------------------------
INSERT INTO rtm.issues (id, legacy_id, title, description, type, severity, status,
                        project_id, vehicle_id, task_id, reported_by, reported_at, owner_id, attachments)
VALUES
  (_id('ISS-501'), 'ISS-501',
     'Plate TP-004 expires before project end',
     'Trade plate TP-004 expires May 15 but project runs to May 25. Renewal initiated.',
     'Plate',   'High',     'In Progress',
     _id('PRJ-2025-013'), _id('V-007'), _id('DT-2464'),
     _id('U002'), '2026-05-06 14:22+00', _id('U001'),
     '[{"name":"renewal_application.pdf","ref":"lark://drive/iss501-1"}]'::jsonb),
  (_id('ISS-502'), 'ISS-502',
     'ADAS regression on highway test',
     'Lane departure intervention failing in 3/10 runs. Logs attached.',
     'Data',    'Critical', 'Open',
     _id('PRJ-2025-014'), _id('V-001'), NULL,
     _id('U004'), '2026-05-04 16:51+00', _id('U002'),
     '[{"name":"logs_run01.zip"},{"name":"logs_run02.zip"},{"name":"video.mp4"},{"name":"report.pdf"}]'::jsonb),
  (_id('ISS-503'), 'ISS-503',
     'HDD nearly full on V-007',
     'Only 88GB free, will not fit today''s session.',
     'Device',  'Medium',   'Open',
     _id('PRJ-2025-013'), _id('V-007'), _id('DT-2464'),
     _id('U008'), '2026-05-07 08:15+00', _id('U005'),
     '[]'::jsonb),
  (_id('ISS-504'), 'ISS-504',
     'V-009 minor collision in car park',
     'Insurance claim filed, body shop quote received.',
     'Vehicle', 'High',     'Resolved',
     NULL,                  _id('V-009'), NULL,
     _id('U011'), '2026-05-02 10:30+00', _id('U001'),
     '[{"name":"photos.zip"},{"name":"insurance_claim.pdf"}]'::jsonb),
  (_id('ISS-505'), 'ISS-505',
     'Wrong route loaded on driver tablet',
     'Cached old route; cleared and reloaded.',
     'Route',   'Low',      'Closed',
     _id('PRJ-2025-016'), _id('V-004'), NULL,
     _id('U009'), '2026-05-06 09:12+00', _id('U002'),
     '[]'::jsonb);

-- -------------------------------------------------------------
-- EXPENSES  (8 — sampling each category)
-- -------------------------------------------------------------
INSERT INTO rtm.expenses (id, legacy_id, applicant_id, project_id, vehicle_id,
                          category, amount, currency, expense_date, description, status, approver_id)
VALUES
  (_id('EXP-7701'), 'EXP-7701', _id('U006'), _id('PRJ-2025-014'), _id('V-001'),
     'Parking',          18.50, 'GBP', '2026-05-06', 'Stansted long-stay 6h',         'Submitted', _id('U002')),
  (_id('EXP-7702'), 'EXP-7702', _id('U007'), _id('PRJ-2025-015'), _id('V-002'),
     'Charging',         42.30, 'GBP', '2026-05-06', 'Ionity Perth, 47 kWh',          'Approved',  _id('U003')),
  (_id('EXP-7703'), 'EXP-7703', _id('U008'), _id('PRJ-2025-013'), NULL,
     'Hotel',            96.00, 'GBP', '2026-05-05', 'Premier Inn Aviemore, 1 night', 'Submitted', _id('U002')),
  (_id('EXP-7704'), 'EXP-7704', _id('U004'), _id('PRJ-2025-014'), NULL,
     'Meal',             14.20, 'GBP', '2026-05-05', 'Lunch on test day',             'Approved',  _id('U002')),
  (_id('EXP-7705'), 'EXP-7705', _id('U002'), _id('PRJ-2025-014'), NULL,
     'HDD Postage',      22.40, 'GBP', '2026-05-04', 'Royal Mail Special Delivery x2','Approved',  _id('U010')),
  (_id('EXP-7706'), 'EXP-7706', _id('U009'), _id('PRJ-2025-014'), _id('V-008'),
     'Fuel',             58.10, 'GBP', '2026-05-03', 'BP Shell Mile End',             'Submitted', _id('U002')),
  (_id('EXP-7707'), 'EXP-7707', _id('U005'), _id('PRJ-2025-015'), NULL,
     'Vehicle Cleaning', 12.00, 'GBP', '2026-05-04', 'Pre-test valet Edinburgh',      'Paid',      _id('U010')),
  (_id('EXP-7708'), 'EXP-7708', _id('U006'), _id('PRJ-2025-014'), _id('V-001'),
     'Public Transport',  8.40, 'GBP', '2026-05-07', 'Return train to Cambridge HQ',  'Draft',     NULL);

-- -------------------------------------------------------------
-- FILES  (8 — sample of each category)
-- -------------------------------------------------------------
INSERT INTO rtm.files (id, legacy_id, project_id, related_id, category, name,
                       lark_drive_ref, version, permission, uploaded_by)
VALUES
  (_id('F-100'), 'F-100', _id('PRJ-2025-014'), NULL,
     'Project Contract', 'Aurora_Mobility_PO_2025-014.pdf',
     'lark://drive/file/abc123', 'v1.0', 'Project', _id('U001')),
  (_id('F-101'), 'F-101', _id('PRJ-2025-014'), NULL,
     'Test Plan',        'Test_Matrix_M11_corridor.xlsx',
     'lark://drive/file/abc124', 'v2.1', 'Project', _id('U002')),
  (_id('F-102'), 'F-102', _id('PRJ-2025-014'), 'R-001',
     'Route File',       'Route_R-001_KML_export.kml',
     'lark://drive/file/abc125', 'v1.0', 'Project', _id('U002')),
  (_id('F-103'), 'F-103', _id('PRJ-2025-014'), 'DT-2461',
     'Daily Report',     'Daily_Report_2026-05-06.pdf',
     'lark://drive/file/abc126', 'v1.0', 'Project', _id('U004')),
  (_id('F-104'), 'F-104', NULL,                 'ISS-502',
     'Issue Report',     'ADAS_regression_logs.zip',
     'lark://drive/file/abc127', 'v1.0', 'Private', _id('U004')),
  (_id('F-105'), 'F-105', _id('PRJ-2025-015'), 'R-003',
     'Route File',       'Route_R-003_A9_GPX.gpx',
     'lark://drive/file/abc128', 'v1.0', 'Project', _id('U003')),
  (_id('F-106'), 'F-106', NULL,                 'V-001',
     'Vehicle Doc',      'V-001_insurance_2026.pdf',
     'lark://drive/file/abc129', 'v1.0', 'Project', _id('U011')),
  (_id('F-107'), 'F-107', NULL,                 'TP-001',
     'Plate Doc',        'TP-001_trade_plate_permit.pdf',
     'lark://drive/file/abc130', 'v1.0', 'Project', _id('U001'));

-- -------------------------------------------------------------
-- SETTINGS  (initial defaults; non-secret only)
-- -------------------------------------------------------------
INSERT INTO rtm.settings (category, key, value, description)
VALUES
  ('lark',         'base_sync_enabled',           '{"value": true}'::jsonb,                              'Sync to PMO Lark Base view'),
  ('lark',         'bot_notifications_enabled',   '{"value": true}'::jsonb,                              'Lark Bot DM notifications master switch'),
  ('lark',         'oauth_callback_url',          '"https://road-test-erp-api.workers.dev/api/lark/oauth/callback"'::jsonb, 'OAuth redirect URL'),
  ('notifications','critical_issue',              '{"channels": ["lark_dm","email"], "targets": ["pmo","project_pm"]}'::jsonb, 'Critical issue alerts'),
  ('notifications','plate_expiring_14d',          '{"channels": ["lark_dm"], "lead_days": 14}'::jsonb,   'Plate expiry warning'),
  ('notifications','mot_expiring_30d',            '{"channels": ["email"], "lead_days": 30}'::jsonb,     'Vehicle MOT expiry warning'),
  ('backup',       'schedule',                    '"daily-0200-gmt"'::jsonb,                             'Daily backup schedule'),
  ('backup',       'destination',                 '"cloudflare_r2"'::jsonb,                              'Backup destination provider'),
  ('backup',       'retention_days',              '90'::jsonb,                                           'Backup retention in days'),
  ('approval',     'expense_threshold_gbp',       '100'::jsonb,                                          'Expense threshold for Finance approval'),
  ('company',      'name',                        '"RTM Operations Ltd"'::jsonb,                         'Legal company name');

-- -------------------------------------------------------------
-- Cleanup
-- -------------------------------------------------------------
-- Keep _id() helper around — useful in subsequent seed scripts
-- and harmless in production (functions in rtm schema, not public).

-- =============================================================
--  End of seed.sql
-- =============================================================
