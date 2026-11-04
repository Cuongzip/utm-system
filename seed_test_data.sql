
-- ------------------------------------------------------------------------------
-- 1. utm_organization
-- ------------------------------------------------------------------------------
\c utm_organization;

TRUNCATE TABLE organization CASCADE;

INSERT INTO organization (id, name, type, registration_number, contact_info, status, created_on, created_by)
VALUES 
  ('f110bb18-c585-459d-adc2-d3f023c93aa3', 
   'SkyExpress Cargo Vietnam Ltd', 
   'OPERATOR', 
   'VN-OP-2024-001', 
   'dispatch@skyexpress.aero | +84 28 3822 9999 | 120 Nguyen Hue Blvd, District 1, HCMC', 
   'ACTIVE', 
   NOW(), 
   'system'),

  ('e220bb18-c585-459d-adc2-d3f023c93aa4', 
   'Urban Air Mobility Services Inc', 
   'OPERATOR', 
   'VN-OP-2024-002', 
   'operations@uamservices.com | +84 28 3744 8888 | 45 Mai Chi Tho Ave, Thu Thiem, HCMC', 
   'ACTIVE', 
   NOW(), 
   'system'),

  ('d330bb18-c585-459d-adc2-d3f023c93aa5', 
   'MedFlight Emergency Logistics Network', 
   'OPERATOR', 
   'VN-OP-2024-003', 
   'emergency@medflight.org | +84 28 3911 0000 | Cho Ray Hospital Medical Helipad, HCMC', 
   'ACTIVE', 
   NOW(), 
   'system'),

  ('c440bb18-c585-459d-adc2-d3f023c93aa6', 
   'Civil Aviation Authority of Vietnam (CAAV)', 
   'AUTHORITY', 
   'VN-REG-CAAV-01', 
   'utm-oversight@caav.gov.vn | +84 24 3827 1513 | 119 Nguyen Son, Long Bien, Hanoi', 
   'ACTIVE', 
   NOW(), 
   'system');

-- ------------------------------------------------------------------------------
-- 2. utm_hub
-- ------------------------------------------------------------------------------
\c utm_hub;

TRUNCATE TABLE hub CASCADE;

INSERT INTO hub (id, code, name, latitude, longitude, altitude_msl, airspace_radius, status, created_on, created_by)
VALUES
  ('76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   'HUB-SGN-D1', 
   'Saigon Central Vertiport', 
   10.7769000, 
   106.7009000, 
   12.50, 
   1200.00, 
   'ACTIVE', 
   NOW(), 
   'system'),

  ('606a30fb-465a-4016-85f7-85b00467f2f7', 
   'HUB-SGN-TT', 
   'Thu Thiem Waterfront Vertiport', 
   10.7850000, 
   106.7350000, 
   8.00, 
   1000.00, 
   'ACTIVE', 
   NOW(), 
   'system'),

  ('c854d502-2c9b-4e4a-93c2-b8759521e962', 
   'HUB-SGN-TD', 
   'Thu Duc High-Tech Innovation Hub', 
   10.8490000, 
   106.7710000, 
   25.00, 
   1500.00, 
   'ACTIVE', 
   NOW(), 
   'system'),

  ('a942c710-1b8a-4c22-83e1-d647a829f101', 
   'HUB-SGN-D7', 
   'Phu My Hung South Logistics Hub', 
   10.7290000, 
   106.7210000, 
   5.50, 
   1000.00, 
   'ACTIVE', 
   NOW(), 
   'system'),

  ('b153d821-2c9b-4d33-94f2-e758b930a202', 
   'HUB-SGN-TSN', 
   'Tan Son Nhat Gateway Vertiport', 
   10.8185000, 
   106.6588000, 
   10.00, 
   800.00, 
   'ACTIVE', 
   NOW(), 
   'system');

-- ------------------------------------------------------------------------------
-- 3. utm_airspace
-- ------------------------------------------------------------------------------
\c utm_airspace;

TRUNCATE TABLE airspace_zone CASCADE;

INSERT INTO airspace_zone (id, hub_id, name, zone_type, geometry, altitude_ceiling, status, description, created_on, created_by)
VALUES
  ('b6241fe9-beb1-48d3-94ff-ae7ce4be0563', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   'Independence Palace Prohibited Airspace (VNP-01)', 
   'NO_FLY_ZONE', 
   '{"type":"Polygon","coordinates":[[[106.6930,10.7750],[106.6990,10.7750],[106.6990,10.7800],[106.6930,10.7800],[106.6930,10.7750]]]}', 
   200.0, 
   'ACTIVE', 
   'Strictly prohibited airspace protecting government historic landmark and administrative district.', 
   NOW(), 
   'system'),

  ('c7352fe9-beb1-48d3-94ff-ae7ce4be0564', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   'Saigon River Low-Altitude Flight Corridor', 
   'HUB_CORRIDOR', 
   '{"type":"Polygon","coordinates":[[[106.7009,10.7750],[106.7150,10.7780],[106.7350,10.7830],[106.7360,10.7870],[106.7140,10.7820],[106.7000,10.7780],[106.7009,10.7750]]]}', 
   150.0, 
   'ACTIVE', 
   'Designated commercial drone delivery corridor following the Saigon river bend between District 1 and Thu Thiem.', 
   NOW(), 
   'system'),

  ('d8463fe9-beb1-48d3-94ff-ae7ce4be0565', 
   'b153d821-2c9b-4d33-94f2-e758b930a202', 
   'Tan Son Nhat Airport Approach Protection Zone', 
   'RESTRICTED', 
   '{"type":"Polygon","coordinates":[[[106.6450,10.8100],[106.6750,10.8100],[106.6750,10.8350],[106.6450,10.8350],[106.6450,10.8100]]]}', 
   50.0, 
   'ACTIVE', 
   'Restricted low-altitude buffer zone safeguarding commercial aircraft approach and departure vectors.', 
   NOW(), 
   'system'),

  ('e9574fe9-beb1-48d3-94ff-ae7ce4be0566', 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   'Landmark 81 High-Rise Hazard Geofence', 
   'WARNING', 
   '{"type":"Polygon","coordinates":[[[106.7180,10.7920],[106.7260,10.7920],[106.7260,10.7980],[106.7180,10.7980],[106.7180,10.7920]]]}', 
   465.0, 
   'ACTIVE', 
   'Permanent obstacle hazard containment zone surrounding Landmark 81 skyscraper with 300m safety standoff.', 
   NOW(), 
   'system');

-- ------------------------------------------------------------------------------
-- 4. utm_drone
-- ------------------------------------------------------------------------------
\c utm_drone;

TRUNCATE TABLE drone_command, drone CASCADE;

INSERT INTO drone (id, registration_number, manufacturer, model, owner_id, home_hub_id, battery_capacity_wh, max_payload, status, created_on, created_by)
VALUES
  ('30d1435a-77bf-49a1-8fd5-6920a6ed064c', 
   'VN-D001', 
   'DJI', 
   'Matrice 350 RTK', 
   'f110bb18-c585-459d-adc2-d3f023c93aa3', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   588.0, 
   2.7, 
   'IN_FLIGHT', 
   NOW(), 
   'system'),

  ('7633fbe9-411a-4767-94bb-a1d818b7f26f', 
   'VN-D002', 
   'DJI', 
   'Matrice 350 RTK', 
   'f110bb18-c585-459d-adc2-d3f023c93aa3', 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   588.0, 
   2.7, 
   'AVAILABLE', 
   NOW(), 
   'system'),

  ('8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', 
   'VN-UAV-001', 
   'DJI', 
   'Inspire 3 Pro', 
   'e220bb18-c585-459d-adc2-d3f023c93aa4', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   428.0, 
   1.8, 
   'AVAILABLE', 
   NOW(), 
   'system'),

  ('ece5662e-b5c6-477f-b710-918e2e11a1c5', 
   'VN-UAV-6376', 
   'Wingtra', 
   'WingtraOne Gen II VTOL', 
   'e220bb18-c585-459d-adc2-d3f023c93aa4', 
   'c854d502-2c9b-4e4a-93c2-b8759521e962', 
   620.0, 
   3.5, 
   'IN_FLIGHT', 
   NOW(), 
   'system'),

  ('d4e5f601-1122-3344-5566-778899aabbcc', 
   'VN-MED-001', 
   'Volansi', 
   'Voly M20 Medical VTOL', 
   'd330bb18-c585-459d-adc2-d3f023c93aa5', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   750.0, 
   5.0, 
   'IN_FLIGHT', 
   NOW(), 
   'system'),

  ('e5f6a702-2233-4455-6677-8899aabbccdd', 
   'VN-CARGO-009', 
   'EHang', 
   'Falcon B Commercial Heavy', 
   'f110bb18-c585-459d-adc2-d3f023c93aa3', 
   'a942c710-1b8a-4c22-83e1-d647a829f101', 
   950.0, 
   8.5, 
   'MAINTENANCE', 
   NOW(), 
   'system');

INSERT INTO drone_command (id, drone_id, flight_id, command_type, parameters, status, issued_by, issued_at, priority, timeout_ms, retry_count, max_retries, created_on, created_by)
VALUES
  ('cmd11111-1111-1111-1111-111111111111', 
   '30d1435a-77bf-49a1-8fd5-6920a6ed064c', 
   '3cacf21c-e6c2-43b1-a88c-7f7f8584c677', 
   'HOVER', 
   '{"holdTimeSeconds":60,"altitudeM":100.0}', 
   'COMPLETED', 
   'atc_hanoi', 
   NOW() - interval '3 minutes', 
   1, 
   2000, 
   0, 
   2, 
   NOW(), 
   'system'),

  ('cmd22222-2222-2222-2222-222222222222', 
   'd4e5f601-1122-3344-5566-778899aabbcc', 
   '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 
   'SET_ALTITUDE', 
   '{"targetAltitudeM":140.0,"climbRateMs":2.0}', 
   'ACKNOWLEDGED', 
   'atc_hanoi', 
   NOW() - interval '1 minute', 
   1, 
   2000, 
   0, 
   2, 
   NOW(), 
   'system');

-- ------------------------------------------------------------------------------
-- 5. utm_connectivity
-- ------------------------------------------------------------------------------
\c utm_connectivity;

TRUNCATE TABLE device_registrations CASCADE;

INSERT INTO device_registrations (id, drone_id, device_identifier, connection_status, socket_id, certificate_fingerprint, last_seen_at, created_on, created_by)
VALUES
  ('1b534791-346d-437b-9553-91b7bea3cc4b', 
   '30d1435a-77bf-49a1-8fd5-6920a6ed064c', 
   'DEV-DJI-M350-001', 
   'ONLINE', 
   'ws://gateway:8089/conn-001', 
   'SHA256:9c12a45d77e819b4f91c3d11b87a123e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c', 
   NOW(), 
   NOW(), 
   'system'),

  ('3d756913-568f-459d-b775-13d9deb5ee6d', 
   '7633fbe9-411a-4767-94bb-a1d818b7f26f', 
   'DEV-DJI-M350-002', 
   'OFFLINE', 
   NULL, 
   'SHA256:1a22b33c44d55e66f77a88b99cc0011e2233445566778899aabbccddeeff0011', 
   NOW() - interval '3 hours', 
   NOW(), 
   'system'),

  ('ef59525b-65d1-428a-8ff0-1019e3a182c2', 
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', 
   'DEV-DJI-INS3-001', 
   'ONLINE', 
   'ws://gateway:8089/conn-003', 
   'SHA256:7b91d24c88f910a3e83b4c10a23e981f1234567890abcdef1234567890abcdef', 
   NOW(), 
   NOW(), 
   'system'),

  ('2c645802-457e-448c-a664-02c8cfa4dd5c', 
   'ece5662e-b5c6-477f-b710-918e2e11a1c5', 
   'DEV-WINGTRA-6376', 
   'ONLINE', 
   'ws://gateway:8089/conn-004', 
   'SHA256:3d44e56f88a920c5a02d5e22c11b887a00112233445566778899aabbccddeeff', 
   NOW(), 
   NOW(), 
   'system'),

  ('4e867924-679a-460e-c886-24eaefc6ff7e', 
   'd4e5f601-1122-3344-5566-778899aabbcc', 
   'DEV-VOLY-MED-001', 
   'ONLINE', 
   'ws://gateway:8089/conn-005', 
   'SHA256:5f66a77b88c99d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e', 
   NOW(), 
   NOW(), 
   'system'),

  ('5f978035-78ab-471f-d997-35fbf0d7aa8f', 
   'e5f6a702-2233-4455-6677-8899aabbccdd', 
   'DEV-EHANG-009', 
   'OFFLINE', 
   NULL, 
   'SHA256:6a77b88c99d00e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f', 
   NOW() - interval '1 day', 
   NOW(), 
   'system');

-- ------------------------------------------------------------------------------
-- 6. utm_mission
-- ------------------------------------------------------------------------------
\c utm_mission;

TRUNCATE TABLE waypoint, mission_execution, mission CASCADE;

INSERT INTO mission (id, name, description, departure_hub_id, arrival_hub_id, schedule_type, scheduled_at, status, created_on, created_by)
VALUES
  ('m1111111-1111-1111-1111-111111111111', 
   'Urgent Medical Blood Pack Transfer', 
   'Emergency transport of emergency O-negative blood units from Saigon Central Vertiport to Thu Thiem Medical Center.', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   'IMMEDIATE', 
   NOW() - interval '20 minutes', 
   'EXECUTING', 
   NOW(), 
   'operator'),

  ('m2222222-2222-2222-2222-222222222222', 
   'Autonomous Express Parcel Delivery Flight', 
   'Scheduled commercial express parcel dispatch crossing from Thu Thiem Vertiport to Thu Duc Innovation Park Hub.', 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   'c854d502-2c9b-4e4a-93c2-b8759521e962', 
   'IMMEDIATE', 
   NOW() - interval '10 minutes', 
   'EXECUTING', 
   NOW(), 
   'operator'),

  ('m3333333-3333-3333-3333-333333333333', 
   'Emergency Pediatric Vaccine Transport', 
   'Critical temperature-controlled cold-chain pediatric vaccine transport to Phu My Hung South Clinic.', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   'a942c710-1b8a-4c22-83e1-d647a829f101', 
   'IMMEDIATE', 
   NOW() - interval '5 minutes', 
   'EXECUTING', 
   NOW(), 
   'operator'),

  ('m4444444-4444-4444-4444-444444444444', 
   'High-Tech Avionics Component Dispatch', 
   'Routine afternoon logistics transit of replacement sensor payloads from Thu Duc Park to Saigon Central.', 
   'c854d502-2c9b-4e4a-93c2-b8759521e962', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   'SCHEDULED', 
   NOW() + interval '1 hour', 
   'SCHEDULED', 
   NOW(), 
   'operator'),

  ('m5555555-5555-5555-5555-555555555555', 
   'Saigon River Environmental Survey', 
   'Autonomous aerial water quality sensor sampling and LiDAR bathymetry inspection along the river fairway.', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   'IMMEDIATE', 
   NOW() - interval '2 hours', 
   'COMPLETED', 
   NOW(), 
   'operator');

INSERT INTO waypoint (id, mission_id, sequence, name, latitude, longitude, altitude, actions, conditions, created_on, created_by)
VALUES
  -- Mission 1 Waypoints (D1 -> Thu Thiem)
  ('w1111111-0001-0000-0000-000000000001', 'm1111111-1111-1111-1111-111111111111', 1, 'Saigon Vertiport Departure Pad', 10.7769000, 106.7009000, 30.0, '{"action":"TAKEOFF","speed":5.0}', '{"climbRate":2.5}', NOW(), 'system'),
  ('w1111111-0002-0000-0000-000000000002', 'm1111111-1111-1111-1111-111111111111', 2, 'Bach Dang River Entry Gate', 10.7750000, 106.7080000, 120.0, '{"action":"NAVIGATE","speed":15.0}', '{"corridorId":"HUB-CORRIDOR-SGN"}', NOW(), 'system'),
  ('w1111111-0003-0000-0000-000000000003', 'm1111111-1111-1111-1111-111111111111', 3, 'Thu Thiem Inbound Transit Gate', 10.7800000, 106.7220000, 120.0, '{"action":"NAVIGATE","speed":15.0}', '{}', NOW(), 'system'),
  ('w1111111-0004-0000-0000-000000000004', 'm1111111-1111-1111-1111-111111111111', 4, 'Thu Thiem Vertiport Final Approach', 10.7850000, 106.7350000, 20.0, '{"action":"LAND","speed":3.0}', '{"descentRate":1.5}', NOW(), 'system'),

  -- Mission 2 Waypoints (Thu Thiem -> Thu Duc)
  ('w2222222-0001-0000-0000-000000000001', 'm2222222-2222-2222-2222-222222222222', 1, 'Thu Thiem Vertiport Pad 2 Departure', 10.7850000, 106.7350000, 25.0, '{"action":"TAKEOFF","speed":5.0}', '{}', NOW(), 'system'),
  ('w2222222-0002-0000-0000-000000000002', 'm2222222-2222-2222-2222-222222222222', 2, 'Saigon River Upper Transit Bend', 10.8050000, 106.7450000, 100.0, '{"action":"NAVIGATE","speed":14.0}', '{}', NOW(), 'system'),
  ('w2222222-0003-0000-0000-000000000003', 'm2222222-2222-2222-2222-222222222222', 3, 'Rach Chiec Navigation Checkpoint', 10.8250000, 106.7600000, 100.0, '{"action":"NAVIGATE","speed":14.0}', '{}', NOW(), 'system'),
  ('w2222222-0004-0000-0000-000000000004', 'm2222222-2222-2222-2222-222222222222', 4, 'Thu Duc Tech Park Vertipad', 10.8490000, 106.7710000, 30.0, '{"action":"LAND","speed":3.0}', '{}', NOW(), 'system'),

  -- Mission 3 Waypoints (D1 -> D7)
  ('w3333333-0001-0000-0000-000000000001', 'm3333333-3333-3333-3333-333333333333', 1, 'Saigon Vertiport MedPad Departure', 10.7769000, 106.7009000, 30.0, '{"action":"TAKEOFF"}', '{}', NOW(), 'system'),
  ('w3333333-0002-0000-0000-000000000002', 'm3333333-3333-3333-3333-333333333333', 2, 'Kenh Te Canal Southern Transit Waypoint', 10.7550000, 106.7120000, 110.0, '{"action":"NAVIGATE","speed":16.0}', '{}', NOW(), 'system'),
  ('w3333333-0003-0000-0000-000000000003', 'm3333333-3333-3333-3333-333333333333', 3, 'Phu My Hung Healthcare Landing Pad', 10.7290000, 106.7210000, 20.0, '{"action":"LAND"}', '{}', NOW(), 'system');

INSERT INTO mission_execution (id, mission_id, current_waypoint_index, total_waypoints, completed_waypoints, started_at, completed_at, status, created_on, created_by)
VALUES
  ('ex111111-1111-1111-1111-111111111111', 'm1111111-1111-1111-1111-111111111111', 2, 4, 2, NOW() - interval '15 minutes', NULL, 'IN_PROGRESS', NOW(), 'system'),
  ('ex222222-2222-2222-2222-222222222222', 'm2222222-2222-2222-2222-222222222222', 1, 4, 1, NOW() - interval '8 minutes', NULL, 'IN_PROGRESS', NOW(), 'system'),
  ('ex333333-3333-3333-3333-333333333333', 'm3333333-3333-3333-3333-333333333333', 1, 3, 1, NOW() - interval '4 minutes', NULL, 'IN_PROGRESS', NOW(), 'system'),
  ('ex555555-5555-5555-5555-555555555555', 'm5555555-5555-5555-5555-555555555555', 4, 4, 4, NOW() - interval '100 minutes', NOW() - interval '45 minutes', 'COMPLETED', NOW(), 'system');

-- ------------------------------------------------------------------------------
-- 7. utm_flight
-- ------------------------------------------------------------------------------
\c utm_flight;

TRUNCATE TABLE flight_conformance, feasibility_evaluations, flight CASCADE;

INSERT INTO flight (
  id, flight_number, drone_id, departure_hub_id, arrival_hub_id, pilot_id, 
  scheduled_departure, scheduled_arrival, actual_departure, actual_arrival, 
  cruising_altitude_m, execution_id, planned_route, actual_route, 
  authorization_status, conformance_status, status, notes, 
  feasibility_verdict, feasibility_override, created_on, created_by
)
VALUES
  -- Flight 1: Active conforming delivery flight across river corridor (WingtraOne)
  ('2babe10b-d5b1-42a0-9c7b-f65f7473b566', 
   'FL-2026-001', 
   'ece5662e-b5c6-477f-b710-918e2e11a1c5', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   '7a222222-2222-2222-2222-222222222222', 
   NOW() - interval '18 minutes', 
   NOW() + interval '25 minutes', 
   NOW() - interval '15 minutes', 
   NULL, 
   120.0, 
   'ex111111-1111-1111-1111-111111111111', 
   '{"type":"LineString","coordinates":[[106.7009,10.7769],[106.7080,10.7750],[106.7150,10.7780],[106.7220,10.7800],[106.7350,10.7850]]}', 
   '{"type":"LineString","coordinates":[[106.7009,10.7769],[106.7080,10.7750],[106.7150,10.7780]]}', 
   'APPROVED', 
   'CONFORMANT', 
   'ACTIVE', 
   'Live medical supply shuttle along Saigon river transit lane.', 
   'GO', 
   NULL, 
   NOW(), 
   'system'),

  -- Flight 2: Active express cargo flight towards Thu Duc Park (Matrice 350)
  ('3cacf21c-e6c2-43b1-a88c-7f7f8584c677', 
   'FL-2026-002', 
   '30d1435a-77bf-49a1-8fd5-6920a6ed064c', 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   'c854d502-2c9b-4e4a-93c2-b8759521e962', 
   '7a222222-2222-2222-2222-222222222222', 
   NOW() - interval '10 minutes', 
   NOW() + interval '35 minutes', 
   NOW() - interval '8 minutes', 
   NULL, 
   100.0, 
   'ex222222-2222-2222-2222-222222222222', 
   '{"type":"LineString","coordinates":[[106.7350,10.7850],[106.7450,10.8050],[106.7600,10.8250],[106.7710,10.8490]]}', 
   '{"type":"LineString","coordinates":[[106.7350,10.7850],[106.7400,10.7950]]}', 
   'APPROVED', 
   'CONFORMANT', 
   'ACTIVE', 
   'High-priority commercial hardware dispatch.', 
   'GO', 
   NULL, 
   NOW(), 
   'system'),

  -- Flight 3: Active non-conforming emergency pediatric vaccine flight with ATC override (Voly M20)
  ('4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 
   'FL-2026-003', 
   'd4e5f601-1122-3344-5566-778899aabbcc', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   'a942c710-1b8a-4c22-83e1-d647a829f101', 
   '7a222222-2222-2222-2222-222222222222', 
   NOW() - interval '6 minutes', 
   NOW() + interval '20 minutes', 
   NOW() - interval '4 minutes', 
   NULL, 
   110.0, 
   'ex333333-3333-3333-3333-333333333333', 
   '{"type":"LineString","coordinates":[[106.7009,10.7769],[106.7050,10.7650],[106.7120,10.7550],[106.7210,10.7290]]}', 
   '{"type":"LineString","coordinates":[[106.7009,10.7769],[106.7060,10.7630],[106.7135,10.7540]]}', 
   'APPROVED', 
   'NON_CONFORMING', 
   'ACTIVE', 
   'Critical pediatric vaccine transport with authorized ATC feasibility override.', 
   'MARGINAL', 
   'Override by atc_hanoi: Authorized emergency pediatric medical supply mission under priority dispatch rules', 
   NOW(), 
   'system'),

  -- Flight 4: Scheduled flight awaiting final authorization (Matrice 350)
  ('5ecef43e-08e4-46d3-ca0e-9b9ba7a6e899', 
   'FL-2026-004', 
   '7633fbe9-411a-4767-94bb-a1d818b7f26f', 
   'c854d502-2c9b-4e4a-93c2-b8759521e962', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   '7a222222-2222-2222-2222-222222222222', 
   NOW() + interval '45 minutes', 
   NOW() + interval '90 minutes', 
   NULL, 
   NULL, 
   130.0, 
   NULL, 
   '{"type":"LineString","coordinates":[[106.7710,10.8490],[106.7500,10.8150],[106.7200,10.7850],[106.7009,10.7769]]}', 
   '{"type":"LineString","coordinates":[]}', 
   'PENDING', 
   'CONFORMANT', 
   'SCHEDULED', 
   'Inbound logistics transit scheduled for late afternoon corridor.', 
   'GO', 
   NULL, 
   NOW(), 
   'system'),

  -- Flight 5: Completed environmental sensor flight (Inspire 3 Pro)
  ('6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 
   'FL-2026-005', 
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   '7a222222-2222-2222-2222-222222222222', 
   NOW() - interval '100 minutes', 
   NOW() - interval '45 minutes', 
   NOW() - interval '95 minutes', 
   NOW() - interval '46 minutes', 
   90.0, 
   'ex555555-5555-5555-5555-555555555555', 
   '{"type":"LineString","coordinates":[[106.7009,10.7769],[106.7150,10.7800],[106.7350,10.7850]]}', 
   '{"type":"LineString","coordinates":[[106.7009,10.7769],[106.7150,10.7800],[106.7350,10.7850]]}', 
   'APPROVED', 
   'CONFORMANT', 
   'COMPLETED', 
   'Successfully executed environmental air and river survey flight.', 
   'GO', 
   NULL, 
   NOW(), 
   'system');

INSERT INTO feasibility_evaluations (
  id, flight_id, drone_id, verdict, margin_pct, usable_wh, required_wh, 
  cruise_wh, hover_wh, climb_wh, payload_factor, wind_factor, wind_speed_ms, 
  confidence, solutions_json, explanation, explanation_source, created_on, created_by
)
VALUES
  ('fe111111-1111-1111-1111-111111111111', 
   '2babe10b-d5b1-42a0-9c7b-f65f7473b566', 
   'ece5662e-b5c6-477f-b710-918e2e11a1c5', 
   'GO', 
   28.5, 
   496.0, 
   354.6, 
   245.0, 
   65.0, 
   44.6, 
   1.15, 
   1.08, 
   3.5, 
   'HIGH', 
   '[]', 
   'Usable battery: 496.0 Wh (reserve 20%), Required: 354.6 Wh (cruise: 245.0 Wh, hover: 65.0 Wh, climb: 44.6 Wh). Net margin: 28.5%. Verdict: GO.', 
   'deterministic', 
   NOW() - interval '20 minutes', 
   'system'),

  ('fe222222-2222-2222-2222-222222222222', 
   '3cacf21c-e6c2-43b1-a88c-7f7f8584c677', 
   '30d1435a-77bf-49a1-8fd5-6920a6ed064c', 
   'GO', 
   22.0, 
   470.4, 
   366.9, 
   260.0, 
   60.0, 
   46.9, 
   1.12, 
   1.05, 
   2.8, 
   'HIGH', 
   '[]', 
   'Usable battery: 470.4 Wh (reserve 20%), Required: 366.9 Wh. Net margin: 22.0%. Verdict: GO.', 
   'deterministic', 
   NOW() - interval '12 minutes', 
   'system'),

  ('fe333333-3333-3333-3333-333333333333', 
   '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 
   'd4e5f601-1122-3344-5566-778899aabbcc', 
   'MARGINAL', 
   8.5, 
   600.0, 
   549.0, 
   390.0, 
   90.0, 
   69.0, 
   1.35, 
   1.18, 
   6.2, 
   'HIGH', 
   '[{"kind":"reduce_payload","label":"Reduce Payload","detail":"Reduce medical cargo payload from 4.5 kg to 3.2 kg to meet 15% reserve margin threshold"},{"kind":"charging_stop","label":"Plan Intermediate Charging Stop","detail":"Plan contingency recharge waypoint at Thu Thiem Vertiport"}]', 
   'Usable battery: 600.0 Wh (reserve 20%), Required: 549.0 Wh. Net margin: 8.5% is below required 15.0% threshold. Verdict: MARGINAL.', 
   'deterministic', 
   NOW() - interval '8 minutes', 
   'system');

INSERT INTO flight_conformance (
  id, flight_id, status, cross_track_error_m, vertical_error_m, 
  corridor_radius_m, altitude_buffer_m, current_latitude, current_longitude, 
  current_altitude, current_speed, current_heading, last_telemetry_time, 
  last_evaluated_at, violations_json, created_on, created_by
)
VALUES
  -- Conformance for Flight 1 (Conforming)
  ('fc111111-1111-1111-1111-111111111111', 
   '2babe10b-d5b1-42a0-9c7b-f65f7473b566', 
   'CONFORMANT', 
   2.8, 
   1.2, 
   15.0, 
   10.0, 
   10.7780000, 
   106.7150000, 
   120.0, 
   14.5, 
   68.0, 
   NOW(), 
   NOW(), 
   '[]', 
   NOW(), 
   'system'),

  -- Conformance for Flight 2 (Conforming)
  ('fc222222-2222-2222-2222-222222222222', 
   '3cacf21c-e6c2-43b1-a88c-7f7f8584c677', 
   'CONFORMANT', 
   4.1, 
   0.8, 
   15.0, 
   10.0, 
   10.7950000, 
   106.7400000, 
   100.0, 
   12.0, 
   42.0, 
   NOW(), 
   NOW(), 
   '[]', 
   NOW(), 
   'system'),

  -- Conformance for Flight 3 (Non-Conforming: Breached corridor lateral limit)
  ('fc333333-3333-3333-3333-333333333333', 
   '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 
   'NON_CONFORMING', 
   22.5, 
   14.0, 
   15.0, 
   10.0, 
   10.7540000, 
   106.7135000, 
   135.0, 
   16.2, 
   185.0, 
   NOW(), 
   NOW(), 
   '[{"type":"CORRIDOR_BREACH","axis":"LATERAL","deviationM":22.5,"bufferM":15.0,"timestamp":"2026-10-31T04:30:00Z"}]', 
   NOW(), 
   'system');

-- ------------------------------------------------------------------------------
-- 8. utm_telemetry
-- ------------------------------------------------------------------------------
\c utm_telemetry;

TRUNCATE TABLE telemetry_record CASCADE;

INSERT INTO telemetry_record (
  id, drone_id, flight_id, latitude, longitude, altitude, speed, heading, pitch, roll, yaw, battery_percentage, created_on, created_by
)
VALUES
  -- Flight 1 (Drone 4 - WingtraOne) Live positions along river corridor
  ('tel11111-0001-0000-0000-000000000001', 'ece5662e-b5c6-477f-b710-918e2e11a1c5', '2babe10b-d5b1-42a0-9c7b-f65f7473b566', 10.7769000, 106.7009000, 30.0, 5.0, 65.0, 2.1, 0.4, 65.0, 96.5, NOW() - interval '14 minutes', 'system'),
  ('tel11111-0002-0000-0000-000000000002', 'ece5662e-b5c6-477f-b710-918e2e11a1c5', '2babe10b-d5b1-42a0-9c7b-f65f7473b566', 10.7774000, 106.7065000, 90.0, 12.0, 68.0, 1.5, 0.2, 68.0, 92.0, NOW() - interval '8 minutes', 'system'),
  ('tel11111-0003-0000-0000-000000000003', 'ece5662e-b5c6-477f-b710-918e2e11a1c5', '2babe10b-d5b1-42a0-9c7b-f65f7473b566', 10.7780000, 106.7150000, 120.0, 14.5, 68.0, 0.8, -0.3, 68.0, 84.5, NOW(), 'system'),

  -- Flight 2 (Drone 1 - Matrice 350) Live positions towards Thu Duc
  ('tel22222-0001-0000-0000-000000000001', '30d1435a-77bf-49a1-8fd5-6920a6ed064c', '3cacf21c-e6c2-43b1-a88c-7f7f8584c677', 10.7850000, 106.7350000, 35.0, 6.0, 42.0, 1.8, 0.1, 42.0, 95.0, NOW() - interval '7 minutes', 'system'),
  ('tel22222-0002-0000-0000-000000000002', '30d1435a-77bf-49a1-8fd5-6920a6ed064c', '3cacf21c-e6c2-43b1-a88c-7f7f8584c677', 10.7950000, 106.7400000, 100.0, 12.0, 42.0, 0.9, -0.2, 42.0, 88.0, NOW(), 'system'),

  -- Flight 3 (Drone 5 - Voly M20) Live positions moving south
  ('tel33333-0001-0000-0000-000000000001', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.7769000, 106.7009000, 40.0, 6.0, 185.0, 2.0, 0.5, 185.0, 98.0, NOW() - interval '4 minutes', 'system'),
  ('tel33333-0002-0000-0000-000000000002', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.7540000, 106.7135000, 135.0, 16.2, 185.0, 1.2, 0.8, 185.0, 89.0, NOW(), 'system');

-- ------------------------------------------------------------------------------
-- 9. utm_conflict
-- ------------------------------------------------------------------------------
\c utm_conflict;

TRUNCATE TABLE conflict_snapshot, conflict CASCADE;

INSERT INTO conflict (
  id, conflict_type, severity, status, primary_flight_id, secondary_flight_id, 
  hub_id, detected_at, detection_method, location_lat, location_lon, altitude, 
  separation_distance, min_separation_distance, max_severity, vertical_separation, 
  time_to_conflict_sec, description, resolution_strategy, resolution_actions, 
  resolved_at, resolved_by, created_on, created_by
)
VALUES
  -- Conflict 1: Active separation minimum warning between Flight 1 and Flight 2
  ('cf100000-0000-0000-0000-000000000001', 
   'SEPARATION_MINIMUM', 
   'HIGH', 
   'DETECTED', 
   '2babe10b-d5b1-42a0-9c7b-f65f7473b566', 
   '3cacf21c-e6c2-43b1-a88c-7f7f8584c677', 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   NOW() - interval '2 minutes', 
   'PREDICTIVE_4D_TRAJECTORY', 
   10.7820, 
   106.7280, 
   110.0, 
   115.0, 
   150.0, 
   'HIGH', 
   20.0, 
   42, 
   'Tactical separation advisory: Projected loss of separation between FL-2026-001 and FL-2026-002 along Thu Thiem confluence zone. Closest point of approach: 115m in 42s.', 
   'DIVERT_ALTITUDE', 
   'Recommend FL-2026-002 maintain 100m altitude and FL-2026-001 climb to 130m.', 
   NULL, 
   NULL, 
   NOW(), 
   'system'),

  -- Conflict 2: Resolved airspace proximity alert for Flight 3 near Landmark 81 geofence
  ('cf200000-0000-0000-0000-000000000002', 
   'AIRSPACE_BREACH', 
   'MEDIUM', 
   'RESOLVED', 
   '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 
   NULL, 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   NOW() - interval '10 minutes', 
   'SPATIAL_GEOFENCE_PROXIMITY', 
   10.7550, 
   106.7120, 
   135.0, 
   210.0, 
   300.0, 
   'MEDIUM', 
   NULL, 
   75, 
   'Proximity notice: FL-2026-003 vector came within 210m of Landmark 81 high-rise geofence perimeter.', 
   'REROUTE', 
   'Issued heading alteration: Vector 10 degrees westward along Kenh Te channel.', 
   NOW() - interval '3 minutes', 
   'atc_hanoi', 
   NOW(), 
   'system');

-- ------------------------------------------------------------------------------
-- 10. utm_alert
-- ------------------------------------------------------------------------------
\c utm_alert;

TRUNCATE TABLE alert CASCADE;

INSERT INTO alert (
  id, alert_type, severity, status, drone_id, flight_id, hub_id, 
  message, details_json, acknowledged, acknowledged_at, acknowledged_by, 
  resolved, resolved_at, resolved_by, resolution_notes, created_on, created_by
)
VALUES
  -- Alert 1: Active Conformance Breach
  ('al100000-0000-0000-0000-000000000001', 
   'LATERAL_CORRIDOR_BREACH', 
   'HIGH', 
   'ACTIVE', 
   'd4e5f601-1122-3344-5566-778899aabbcc', 
   '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   'Flight FL-2026-003 exceeded lateral containment corridor by 22.5m (designated limit: 15.0m). Immediate pilot correction required.', 
   '{"deviationM":22.5,"thresholdM":15.0,"airframe":"Voly M20 Medical VTOL","cargo":"Critical Blood Products"}', 
   false, 
   NULL, 
   NULL, 
   false, 
   NULL, 
   NULL, 
   NULL, 
   NOW() - interval '3 minutes', 
   'system'),

  -- Alert 2: Acknowledged Separation Conflict Warning
  ('al200000-0000-0000-0000-000000000002', 
   'CONFLICT_PROXIMITY', 
   'HIGH', 
   'ACKNOWLEDGED', 
   'ece5662e-b5c6-477f-b710-918e2e11a1c5', 
   '2babe10b-d5b1-42a0-9c7b-f65f7473b566', 
   '606a30fb-465a-4016-85f7-85b00467f2f7', 
   'Tactical separation advisory: Projected separation loss between FL-2026-001 and FL-2026-002 (CPA: 115m in 42 seconds).', 
   '{"conflictId":"cf100000-0000-0000-0000-000000000001","separationM":115.0,"requiredM":150.0}', 
   true, 
   NOW() - interval '1 minute', 
   'atc_hanoi', 
   false, 
   NULL, 
   NULL, 
   NULL, 
   NOW() - interval '2 minutes', 
   'system'),

  -- Alert 3: Resolved Low Battery Alert
  ('al300000-0000-0000-0000-000000000003', 
   'BATTERY_LOW', 
   'MEDIUM', 
   'RESOLVED', 
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', 
   '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 
   'Drone VN-UAV-001 battery capacity dropped below 25% threshold during final approach phase.', 
   '{"batteryPct":24.0,"voltage":21.8,"cellTempC":34.5}', 
   true, 
   NOW() - interval '50 minutes', 
   'pilot_nam', 
   true, 
   NOW() - interval '45 minutes', 
   'pilot_nam', 
   'Safely landed at Saigon Central Vertiport Pad 1. Aircraft docked on fast-charging cradle.', 
   NOW() - interval '55 minutes', 
   'system');

-- ------------------------------------------------------------------------------
-- 11. utm_simulation
-- ------------------------------------------------------------------------------
\c utm_simulation;

TRUNCATE TABLE simulation_event, simulation_session CASCADE;

INSERT INTO simulation_session (
  id, drone_id, flight_id, status, speed, time_scale, 
  current_lat, current_lon, current_alt, current_heading, current_battery, 
  progress, total_distance, traveled_distance, current_segment, active_scenario, 
  created_on, created_by
)
VALUES
  ('sim11111-1111-1111-1111-111111111111', 
   'ece5662e-b5c6-477f-b710-918e2e11a1c5', 
   '2babe10b-d5b1-42a0-9c7b-f65f7473b566', 
   'RUNNING', 
   14.50, 
   1.00, 
   10.7780000, 
   106.7150000, 
   120.00, 
   68.00, 
   84.50, 
   55.00, 
   4200.00, 
   2310.00, 
   2, 
   'CORRIDOR_TRANSIT', 
   NOW(), 
   'admin'),

  ('sim22222-2222-2222-2222-222222222222', 
   '30d1435a-77bf-49a1-8fd5-6920a6ed064c', 
   '3cacf21c-e6c2-43b1-a88c-7f7f8584c677', 
   'RUNNING', 
   12.00, 
   1.00, 
   10.7950000, 
   106.7400000, 
   100.00, 
   42.00, 
   88.00, 
   35.00, 
   8500.00, 
   2975.00, 
   1, 
   'EXPRESS_DELIVERY', 
   NOW(), 
   'admin');

INSERT INTO simulation_event (
  id, session_id, event_type, scenario, message, severity, config_json, created_on, created_by
)
VALUES
  ('se111111-1111-1111-1111-111111111111', 
   'sim11111-1111-1111-1111-111111111111', 
   'CORRIDOR_ENTRY', 
   'CORRIDOR_TRANSIT', 
   'Aircraft transitioned into Saigon River flight corridor at waypoint 2.', 
   'INFO', 
   '{"waypoint":2,"altitudeM":120.0,"speedMs":14.5}', 
   NOW() - interval '8 minutes', 
   'system'),

  ('se222222-2222-2222-2222-222222222222', 
   'sim11111-1111-1111-1111-111111111111', 
   'WIND_GUST_RESPONSE', 
   'CORRIDOR_TRANSIT', 
   'Autopilot adjusted heading +3.5 degrees to compensate for 5.2 m/s crosswind gust.', 
   'WARNING', 
   '{"windSpeedMs":5.2,"headingCorrectionDeg":3.5}', 
   NOW() - interval '3 minutes', 
   'system');

-- ------------------------------------------------------------------------------
-- 12. utm_emergency
-- ------------------------------------------------------------------------------
\c utm_emergency;

TRUNCATE TABLE emergency_protocols CASCADE;
TRUNCATE TABLE emergency_incidents CASCADE;
TRUNCATE TABLE blackbox_entries CASCADE;
TRUNCATE TABLE emergency_config CASCADE;

INSERT INTO emergency_config (id, config_key, config_value, description, created_on, last_modified_on, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'operation_mode', '"supervised"', 'Emergency response operation mode: auto or supervised', NOW(), NOW(), 'system');

INSERT INTO emergency_protocols (
  id, name, description, emergency_type, severity, response_action, fallback_action, 
  requires_confirmation, confirmation_timeout_seconds, auto_execute_on_timeout, priority, 
  is_active, is_system_default, notify_pilot, notify_supervisor, notify_ops_center, 
  send_sms, send_email, play_audio_alarm, created_on, last_modified_on, created_by
)
VALUES
  ('10000000-0000-0000-0000-000000000001', 
   'Aircraft Proximity - Descend', 
   'When manned aircraft detected nearby, descend immediately', 
   'collision_aircraft', 
   'emergency', 
   'DESCEND', 
   'LAND', 
   false, 10, true, 1, 
   true, true, true, true, true, 
   true, true, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000002', 
   'Obstacle Collision Imminent - Hover', 
   'Terrain or obstacle collision imminent, emergency hover', 
   'collision_obstacle', 
   'emergency', 
   'HOVER', 
   'LAND', 
   false, 10, true, 2, 
   true, true, true, true, true, 
   true, true, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000003', 
   'Motor Failure - Immediate Land', 
   'Motor dead or stalled, execute vertical emergency land', 
   'motor_failure', 
   'emergency', 
   'LAND', 
   'ESTOP', 
   false, 5, true, 10, 
   true, true, true, true, true, 
   true, true, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000004', 
   'Motor Anomaly - Precautionary Land', 
   'Vibration or temperature anomaly on motor, land immediately', 
   'motor_anomaly', 
   'critical', 
   'LAND', 
   'HOVER', 
   true, 20, true, 15, 
   true, true, true, true, true, 
   false, true, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000005', 
   'GPS Signal Lost - Hover', 
   'Complete loss of navigation satellites, hold position', 
   'gps_lost', 
   'critical', 
   'HOVER', 
   'LAND', 
   true, 30, true, 20, 
   true, true, true, true, true, 
   false, true, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000006', 
   'GPS Degraded - Hover', 
   'High HDOP or low satellite count, hover until geometry improves', 
   'gps_degraded', 
   'warning', 
   'HOVER', 
   'NONE', 
   true, 60, false, 25, 
   true, true, true, false, false, 
   false, false, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000007', 
   'Geofence Breach - Hover & Await', 
   'Drone breached boundary, hover in place and alert ATC', 
   'geofence_breach', 
   'critical', 
   'HOVER', 
   'RTH', 
   true, 30, true, 30, 
   true, true, true, true, true, 
   true, true, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000008', 
   'Geofence Proximity - Divert', 
   'Approaching corridor limit, divert trajectory', 
   'geofence_warning', 
   'warning', 
   'DIVERT', 
   'HOVER', 
   true, 45, true, 35, 
   true, true, true, false, false, 
   false, false, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000009', 
   'Battery Critical - Land Immediately', 
   'Battery below 15%, immediate forced landing', 
   'battery_critical', 
   'emergency', 
   'LAND', 
   'ESTOP', 
   false, 15, true, 40, 
   true, true, true, true, true, 
   true, true, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000010', 
   'Battery Low - Return to Home', 
   'Battery below 30%, initiate return to base hub', 
   'battery_low', 
   'warning', 
   'RTH', 
   'LAND', 
   true, 30, true, 45, 
   true, true, true, false, false, 
   false, false, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000011', 
   'Rapid Battery Discharge - RTH', 
   'Abnormal discharge rate, immediate return to home', 
   'battery_rapid_discharge', 
   'critical', 
   'RTH', 
   'LAND', 
   true, 20, true, 50, 
   true, true, true, true, true, 
   false, true, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000012', 
   'Signal Lost - Auto RTH', 
   'C2 link lost over 15s, execute failsafe RTH', 
   'signal_lost', 
   'critical', 
   'RTH', 
   'LAND', 
   false, 15, true, 55, 
   true, true, true, true, true, 
   true, true, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000013', 
   'Signal Weak - Climb', 
   'Weak RSSI, climb slightly to gain line of sight', 
   'signal_weak', 
   'warning', 
   'CLIMB', 
   'HOVER', 
   true, 45, false, 60, 
   true, true, true, false, false, 
   false, false, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000014', 
   'Severe Wind Gust - Land', 
   'High crosswind exceeding drone limits, land safely', 
   'weather_wind', 
   'critical', 
   'LAND', 
   'HOVER', 
   true, 30, true, 70, 
   true, true, true, true, false, 
   false, true, true, NOW(), NOW(), 'system'),

  ('10000000-0000-0000-0000-000000000015', 
   'Low Visibility - Hover', 
   'Dense fog or reduced visibility, hold hover', 
   'weather_visibility', 
   'warning', 
   'HOVER', 
   'LAND', 
   true, 60, false, 75, 
   true, true, true, false, false, 
   false, false, false, NOW(), NOW(), 'system');

-- ==============================================================================
-- End of Seed Data Script
-- ==============================================================================
