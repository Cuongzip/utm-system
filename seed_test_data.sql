-- ==============================================================================
-- DROPS-UTM Comprehensive Test Seed Data Script
-- ==============================================================================
-- Aligned 100% with all 13 PostgreSQL 16 Liquibase schemas (ddl-auto=validate),
-- identity/realm-export.json users, Jackson JSONB DTOs, and runtime invariants:
--   - All JPA @Enumerated(EnumType.STRING) columns use UPPER_SNAKE_CASE.
--   - ZERO idle ACTIVE/DIVERTED flights & ZERO zombie RUNNING/PAUSED simulations
--     (avoids immediate 10s/25s conformance C2_LINK_LOST storms & 409 blockers).
--   - 5 AUTHORIZED flights paired with distinct AVAILABLE drones parked at exact
--     departure hubs for instant 1-click TAKEOFF / Simulation / Chaos testing.
--   - 3 SCHEDULED flights (GO + NO_GO + Multi-Leg Leg 1) for ATC Authorization,
--     Feasibility Check & Override testing.
--   - Multi-leg missions (SAME_DRONE_SEQUENTIAL + MULTI_DRONE_RELAY) with proper
--     terminal & stopover HUB waypoints and vertical hub-anchored planned_route.
--   - 37 multi-frame telemetry_record rows + 12 blackbox_entries for Flight Deck
--     Replay Dossier, altitude profiles, and incident forensics.
--   - All 29 tables across all 13 utm_* databases richly populated (273 rows).
--
-- Usage (from repo root):
--   Get-Content seed_test_data.sql -Raw | docker compose exec -T postgres psql -U admin -v ON_ERROR_STOP=1
--   (Optional after seeding: restart `emergency` and `telemetry` to refresh in-memory caches.)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. utm_organization (6 organizations across 5 types & 2 statuses)
-- ------------------------------------------------------------------------------
\c utm_organization;

TRUNCATE TABLE organization CASCADE;

INSERT INTO organization (
  id, name, type, registration_number, contact_info, address,
  authorized_airspace, certifications, insurance_info, status, created_on, created_by
)
VALUES
  ('f110bb18-c585-459d-adc2-d3f023c93aa3',
   'SkyExpress Cargo Vietnam Ltd',
   'OPERATOR',
   'VN-OP-2024-001',
   'dispatch@skyexpress.aero | +84 28 3822 9999 | 120 Nguyen Hue Blvd, District 1, HCMC',
   '{"street":"120 Nguyen Hue Blvd","district":"District 1","city":"Ho Chi Minh City","country":"VN"}'::jsonb,
   '{"zones":["ASZ-SGRC","ASZ-HUB-D1"],"maxAltitudeM":150}'::jsonb,
   '{"code":"AOC-UAS-VN-001","issuer":"CAAV","expiresAt":"2028-12-31"}'::jsonb,
   '{"provider":"Bao Viet Aviation","policyNumber":"BV-UAS-9901","coverageUsd":5000000}'::jsonb,
   'ACTIVE',
   NOW() - interval '90 days',
   'admin'),

  ('e220bb18-c585-459d-adc2-d3f023c93aa4',
   'Urban Air Mobility Services Inc',
   'OPERATOR',
   'VN-OP-2024-002',
   'operations@uamservices.com | +84 28 3744 8888 | 45 Mai Chi Tho Ave, Thu Thiem, HCMC',
   '{"street":"45 Mai Chi Tho Ave","district":"Thu Thiem","city":"Ho Chi Minh City","country":"VN"}'::jsonb,
   '{"zones":["ASZ-SGRC","ASZ-CTRL-TD"],"maxAltitudeM":180}'::jsonb,
   '{"code":"AOC-UAS-VN-002","issuer":"CAAV","expiresAt":"2028-06-30"}'::jsonb,
   '{"provider":"PVI Aviation Insurance","policyNumber":"PVI-UAS-4412","coverageUsd":3000000}'::jsonb,
   'ACTIVE',
   NOW() - interval '85 days',
   'admin'),

  ('d330bb18-c585-459d-adc2-d3f023c93aa5',
   'MedFlight Emergency Logistics Network',
   'SERVICE_PROVIDER',
   'VN-OP-2024-003',
   'emergency@medflight.org | +84 28 3911 0000 | 201B Nguyen Chi Thanh, District 5, HCMC',
   '{"street":"201B Nguyen Chi Thanh","district":"District 5","city":"Ho Chi Minh City","country":"VN"}'::jsonb,
   '{"zones":["ASZ-SGRC","ASZ-TSNA"],"priorityCorridor":true,"maxAltitudeM":160}'::jsonb,
   '{"code":"MED-UAS-PRIORITY-01","issuer":"CAAV & MOH","expiresAt":"2029-01-01"}'::jsonb,
   '{"provider":"Allianz Global Aviation","policyNumber":"AG-MED-7720","coverageUsd":10000000}'::jsonb,
   'ACTIVE',
   NOW() - interval '80 days',
   'admin'),

  ('c440bb18-c585-459d-adc2-d3f023c93aa6',
   'Civil Aviation Authority of Vietnam (CAAV)',
   'REGULATORY',
   'VN-REG-CAAV-01',
   'utm-oversight@caav.gov.vn | +84 24 3827 1513 | 119 Nguyen Son, Long Bien, Hanoi',
   '{"street":"119 Nguyen Son","district":"Long Bien","city":"Hanoi","country":"VN"}'::jsonb,
   '{"scope":"NATIONAL_FIR"}'::jsonb,
   '{"authority":"CAAV"}'::jsonb,
   '{}'::jsonb,
   'ACTIVE',
   NOW() - interval '120 days',
   'system'),

  ('b550bb18-c585-459d-adc2-d3f023c93aa7',
   'Saigon Coastal Vertiport Infrastructure Partners',
   'PARTNER',
   'VN-PRT-2025-004',
   'infra@saigonvertiports.vn | +84 28 3890 1122 | 88 Rung Sac Rd, Can Gio, HCMC',
   '{"street":"88 Rung Sac Rd","district":"Can Gio","city":"Ho Chi Minh City","country":"VN"}'::jsonb,
   '{"zones":["ASZ-SGRC"],"maxAltitudeM":120}'::jsonb,
   '{"code":"VPT-INFRA-04","issuer":"CAAV","expiresAt":"2028-09-30"}'::jsonb,
   '{"provider":"PTI Aviation","policyNumber":"PTI-INF-3102","coverageUsd":2500000}'::jsonb,
   'ACTIVE',
   NOW() - interval '60 days',
   'admin'),

  ('a660bb18-c585-459d-adc2-d3f023c93aa8',
   'Mekong Industrial Inspection Corp',
   'ENTERPRISE',
   'VN-ENT-2026-005',
   'compliance@mekonginspect.vn | +84 28 3620 4455 | 14 Nguyen Van Linh, District 7, HCMC',
   '{"street":"14 Nguyen Van Linh","district":"District 7","city":"Ho Chi Minh City","country":"VN"}'::jsonb,
   '{"zones":[],"maxAltitudeM":100}'::jsonb,
   '{"code":"AOC-PENDING-005","issuer":"CAAV","expiresAt":"2027-12-31"}'::jsonb,
   '{"provider":"MIC Aviation","policyNumber":"MIC-UAS-1088","coverageUsd":1500000}'::jsonb,
   'PENDING_VERIFICATION',
   NOW() - interval '3 days',
   'operator');

-- ------------------------------------------------------------------------------
-- 2. utm_hub (6 hubs: 5 ACTIVE with balanced/donor/shortage fleet + 1 MAINTENANCE)
-- ------------------------------------------------------------------------------
\c utm_hub;

TRUNCATE TABLE hub CASCADE;

INSERT INTO hub (
  id, code, name, organization_id, timezone, latitude, longitude, altitude_msl, airspace_radius,
  max_simultaneous_drones, airspace_floor, airspace_ceiling, capabilities, contact_info, status, created_on, created_by
)
VALUES
  ('76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'HUB-SGN-D1',
   'Saigon Central Vertiport',
   'f110bb18-c585-459d-adc2-d3f023c93aa3',
   'Asia/Ho_Chi_Minh',
   10.7769000,
   106.7009000,
   12.50,
   1200.00,
   12,
   0.0,
   150.0,
   '{"chargingPads":8,"fastChargingKw":12,"coldChainStorage":true,"weatherStation":true,"nightOps":true,"batterySwapBay":true}'::jsonb,
   '{"manager":"Tran Minh Quan","phone":"+84 28 3822 9901","vhfFreq":"122.800"}'::jsonb,
   'ACTIVE',
   NOW() - interval '90 days',
   'admin'),

  ('606a30fb-465a-4016-85f7-85b00467f2f7',
   'HUB-SGN-TT',
   'Thu Thiem Waterfront Vertiport',
   'e220bb18-c585-459d-adc2-d3f023c93aa4',
   'Asia/Ho_Chi_Minh',
   10.7850000,
   106.7350000,
   8.00,
   1000.00,
   10,
   0.0,
   150.0,
   '{"chargingPads":6,"fastChargingKw":10,"coldChainStorage":true,"weatherStation":true,"nightOps":true,"relayHandoffPad":true}'::jsonb,
   '{"manager":"Le Thu Ha","phone":"+84 28 3744 8802","vhfFreq":"122.850"}'::jsonb,
   'ACTIVE',
   NOW() - interval '85 days',
   'admin'),

  ('c854d502-2c9b-4e4a-93c2-b8759521e962',
   'HUB-SGN-TD',
   'Thu Duc High-Tech Innovation Hub',
   'e220bb18-c585-459d-adc2-d3f023c93aa4',
   'Asia/Ho_Chi_Minh',
   10.8490000,
   106.7710000,
   25.00,
   1500.00,
   15,
   0.0,
   180.0,
   '{"chargingPads":10,"fastChargingKw":15,"maintenanceBay":true,"weatherStation":true,"nightOps":true}'::jsonb,
   '{"manager":"Nguyen Hoang Nam","phone":"+84 28 3730 5500","vhfFreq":"122.900"}'::jsonb,
   'ACTIVE',
   NOW() - interval '80 days',
   'admin'),

  ('a942c710-1b8a-4c22-83e1-d647a829f101',
   'HUB-SGN-D7',
   'Phu My Hung South Logistics Hub',
   'f110bb18-c585-459d-adc2-d3f023c93aa3',
   'Asia/Ho_Chi_Minh',
   10.7290000,
   106.7210000,
   5.50,
   1000.00,
   10,
   0.0,
   140.0,
   '{"chargingPads":6,"fastChargingKw":10,"heavyCargoWinch":true,"weatherStation":true,"coldChainStorage":true}'::jsonb,
   '{"manager":"Pham Gia Bao","phone":"+84 28 5411 2200","vhfFreq":"122.925"}'::jsonb,
   'ACTIVE',
   NOW() - interval '75 days',
   'admin'),

  ('b153d821-2c9b-4d33-94f2-e758b930a202',
   'HUB-SGN-TSN',
   'Tan Son Nhat Gateway Vertiport',
   'd330bb18-c585-459d-adc2-d3f023c93aa5',
   'Asia/Ho_Chi_Minh',
   10.8185000,
   106.6588000,
   10.00,
   800.00,
   8,
   0.0,
   100.0,
   '{"chargingPads":4,"atcDirectIntercom":true,"coldChainStorage":true,"weatherStation":true}'::jsonb,
   '{"manager":"Vo Anh Tuan","phone":"+84 28 3848 5383","vhfFreq":"118.100"}'::jsonb,
   'ACTIVE',
   NOW() - interval '70 days',
   'admin'),

  ('d264e932-3d0c-4e44-a503-f869ca41b303',
   'HUB-SGN-CG',
   'Can Gio Coastal Relay Station',
   'b550bb18-c585-459d-adc2-d3f023c93aa7',
   'Asia/Ho_Chi_Minh',
   10.4114000,
   106.9547000,
   3.00,
   900.00,
   6,
   0.0,
   120.0,
   '{"chargingPads":2,"weatherStation":true,"maritimeRelay":true}'::jsonb,
   '{"manager":"Huynh Quoc Dat","phone":"+84 28 3874 0101","vhfFreq":"123.100"}'::jsonb,
   'MAINTENANCE',
   NOW() - interval '45 days',
   'admin');

-- ------------------------------------------------------------------------------
-- 3. utm_airspace (8 zones covering 8 zone_types, active/inactive, TFR windows)
--    All PROHIBITED/NO_FLY_ZONE/TFR polygons sit cleanly outside standard corridors.
-- ------------------------------------------------------------------------------
\c utm_airspace;

TRUNCATE TABLE airspace_zone CASCADE;

INSERT INTO airspace_zone (
  id, code, hub_id, name, zone_type, geometry, altitude_floor, altitude_ceiling,
  effective_start, effective_end, priority, rules, schedule, status, description, created_on, created_by
)
VALUES
  ('b6241fe9-beb1-48d3-94ff-ae7ce4be0563',
   'ASZ-VNP1',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'Independence Palace Prohibited Airspace (VNP-01)',
   'PROHIBITED',
   '{"type":"Polygon","coordinates":[[[106.6930,10.7750],[106.6990,10.7750],[106.6990,10.7800],[106.6930,10.7800],[106.6930,10.7750]]]}'::jsonb,
   0.0,
   200.0,
   NULL,
   NULL,
   100,
   '{"prohibited":true,"authorizationRequired":true,"allowEmergencyOverride":false,"maxSpeedMs":0}'::jsonb,
   '{"enabled":true,"timezone":"Asia/Ho_Chi_Minh"}'::jsonb,
   'ACTIVE',
   'Strictly prohibited airspace protecting government historic landmark and administrative district.',
   NOW() - interval '90 days',
   'atc_hanoi'),

  ('f0685fe9-beb1-48d3-94ff-ae7ce4be0567',
   'ASZ-NFZ-PORT',
   '606a30fb-465a-4016-85f7-85b00467f2f7',
   'Cat Lai Maritime Terminal No-Fly Zone',
   'NO_FLY_ZONE',
   '{"type":"Polygon","coordinates":[[[106.7850,10.7500],[106.8050,10.7500],[106.8050,10.7680],[106.7850,10.7680],[106.7850,10.7500]]]}'::jsonb,
   0.0,
   180.0,
   NULL,
   NULL,
   95,
   '{"noFly":true,"maxSpeedMs":0,"reason":"Active container gantry cranes and customs security"}'::jsonb,
   '{"enabled":true,"timezone":"Asia/Ho_Chi_Minh"}'::jsonb,
   'ACTIVE',
   'Permanent no-fly zone over Cat Lai port crane operations; ideal target for geofence breach and feasibility denial tests.',
   NOW() - interval '60 days',
   'atc_hanoi'),

  ('c7352fe9-beb1-48d3-94ff-ae7ce4be0564',
   'ASZ-SGRC',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'Saigon River Low-Altitude Flight Corridor',
   'HUB_CORRIDOR',
   '{"type":"Polygon","coordinates":[[[106.7009,10.7745],[106.7150,10.7775],[106.7350,10.7825],[106.7365,10.7875],[106.7140,10.7825],[106.7000,10.7785],[106.7009,10.7745]]]}'::jsonb,
   20.0,
   150.0,
   NULL,
   NULL,
   10,
   '{"maxSpeedMs":20.0,"minSeparationM":100.0,"remoteIdRequired":true}'::jsonb,
   '{"enabled":true,"timezone":"Asia/Ho_Chi_Minh","startTime":"00:00","endTime":"23:59"}'::jsonb,
   'ACTIVE',
   'Designated commercial drone delivery corridor following the Saigon river bend between District 1 and Thu Thiem.',
   NOW() - interval '90 days',
   'atc_hanoi'),

  ('a5130fe9-beb1-48d3-94ff-ae7ce4be0562',
   'ASZ-HUB-D1',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'Saigon Central Vertiport Terminal Zone',
   'HUB_ZONE',
   '{"type":"Polygon","coordinates":[[[106.6995,10.7755],[106.7025,10.7755],[106.7025,10.7785],[106.6995,10.7785],[106.6995,10.7755]]]}'::jsonb,
   0.0,
   150.0,
   NULL,
   NULL,
   20,
   '{"maxSpeedMs":12.0,"verticalApproachOnly":true,"remoteIdRequired":true}'::jsonb,
   '{"enabled":true,"timezone":"Asia/Ho_Chi_Minh"}'::jsonb,
   'ACTIVE',
   'Terminal takeoff and landing cylinder enveloping Saigon Central Vertiport pads.',
   NOW() - interval '90 days',
   'atc_hanoi'),

  ('a6241fe9-beb1-48d3-94ff-ae7ce4be0570',
   'ASZ-HUB-TT',
   '606a30fb-465a-4016-85f7-85b00467f2f7',
   'Thu Thiem Waterfront Vertiport Terminal Zone',
   'HUB_ZONE',
   '{"type":"Polygon","coordinates":[[[106.7335,10.7835],[106.7368,10.7835],[106.7368,10.7868],[106.7335,10.7868],[106.7335,10.7835]]]}'::jsonb,
   0.0,
   150.0,
   NULL,
   NULL,
   20,
   '{"maxSpeedMs":12.0,"verticalApproachOnly":true,"remoteIdRequired":true}'::jsonb,
   '{"enabled":true,"timezone":"Asia/Ho_Chi_Minh"}'::jsonb,
   'ACTIVE',
   'Terminal takeoff and landing cylinder enveloping Thu Thiem Waterfront Vertiport pads.',
   NOW() - interval '90 days',
   'atc_hanoi'),

  ('d8463fe9-beb1-48d3-94ff-ae7ce4be0565',
   'ASZ-TSNA',
   'b153d821-2c9b-4d33-94f2-e758b930a202',
   'Tan Son Nhat Airport Approach Protection Zone',
   'RESTRICTED',
   '{"type":"Polygon","coordinates":[[[106.6450,10.8100],[106.6750,10.8100],[106.6750,10.8350],[106.6450,10.8350],[106.6450,10.8100]]]}'::jsonb,
   0.0,
   50.0,
   NULL,
   NULL,
   90,
   '{"authorizationRequired":true,"transponderRequired":true,"maxAltitudeM":50.0}'::jsonb,
   '{"enabled":true,"timezone":"Asia/Ho_Chi_Minh","icao":"VVTS"}'::jsonb,
   'ACTIVE',
   'Restricted low-altitude buffer zone safeguarding commercial aircraft approach and departure vectors (ceiling 50m).',
   NOW() - interval '90 days',
   'atc_hanoi'),

  ('e9574fe9-beb1-48d3-94ff-ae7ce4be0566',
   'ASZ-LM81',
   '606a30fb-465a-4016-85f7-85b00467f2f7',
   'Landmark 81 High-Rise Hazard Geofence',
   'WARNING',
   '{"type":"Polygon","coordinates":[[[106.7180,10.7920],[106.7260,10.7920],[106.7260,10.7980],[106.7180,10.7980],[106.7180,10.7920]]]}'::jsonb,
   0.0,
   465.0,
   NULL,
   NULL,
   50,
   '{"standoffMeters":300,"turbulenceAdvisory":true}'::jsonb,
   '{"enabled":true,"timezone":"Asia/Ho_Chi_Minh"}'::jsonb,
   'ACTIVE',
   'Permanent obstacle hazard containment zone surrounding Landmark 81 skyscraper with 300m safety standoff.',
   NOW() - interval '90 days',
   'atc_hanoi'),

  ('f1796fe9-beb1-48d3-94ff-ae7ce4be0568',
   'ASZ-TFR-EVENT',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'Tao Dan Public Festival Temporary Restriction (TFR)',
   'TEMPORARY_RESTRICTION',
   '{"type":"Polygon","coordinates":[[[106.6880,10.7680],[106.6930,10.7680],[106.6930,10.7730],[106.6880,10.7730],[106.6880,10.7680]]]}'::jsonb,
   0.0,
   120.0,
   NOW() - interval '2 hours',
   NOW() + interval '14 hours',
   80,
   '{"authorizationRequired":true,"maxAltitudeM":120.0,"notamRef":"NOTAM-VVTS-2026-1127"}'::jsonb,
   '{"enabled":true,"timezone":"Asia/Ho_Chi_Minh","daysOfWeek":[1,2,3,4,5,6,7],"startTime":"06:00","endTime":"23:00"}'::jsonb,
   'ACTIVE',
   'Active temporary flight restriction for public gathering; demonstrates effective_start/end time windows and schedule evaluation.',
   NOW() - interval '4 hours',
   'atc_hanoi'),

  ('f2807fe9-beb1-48d3-94ff-ae7ce4be0569',
   'ASZ-CTRL-TD',
   'c854d502-2c9b-4e4a-93c2-b8759521e962',
   'Thu Duc BVLOS Experimental Flight Test Sector',
   'CONTROLLED',
   '{"type":"Polygon","coordinates":[[[106.7740,10.8440],[106.7860,10.8440],[106.7860,10.8560],[106.7740,10.8560],[106.7740,10.8440]]]}'::jsonb,
   30.0,
   180.0,
   NOW() + interval '24 hours',
   NOW() + interval '48 hours',
   30,
   '{"authorizationRequired":false,"maxSpeedMs":25.0,"bvlosApproved":true}'::jsonb,
   '{"enabled":false,"timezone":"Asia/Ho_Chi_Minh"}'::jsonb,
   'INACTIVE',
   'Scheduled controlled test sector adjacent to Thu Duc High-Tech Park (currently inactive until tomorrow).',
   NOW() - interval '2 days',
   'atc_hanoi');

-- ------------------------------------------------------------------------------
-- 4. utm_drone (13 drones covering all valid chk_drone_status values + 5 protocols,
--               plus 10 realistic drone_command history records)
--    Fleet hub distribution (AVAILABLE):
--      HUB-SGN-D1: 4 (Donor > minDonorReserve=2)
--      HUB-SGN-TT: 2 (Balanced)
--      HUB-SGN-TD: 2 (Balanced)
--      HUB-SGN-D7: 1 (Shortage < minDronesPerHub=2)
--      HUB-SGN-TSN: 0 (Critical shortage -> 1 CHARGING)
--      HUB-SGN-CG: 0 (MAINTENANCE hub -> 1 OFFLINE)
-- ------------------------------------------------------------------------------
\c utm_drone;

TRUNCATE TABLE drone_command, drone CASCADE;

INSERT INTO drone (
  id, registration_number, serial_number, manufacturer, model, owner_id,
  home_hub_id, current_hub_id, battery_capacity_wh, current_battery_pct,
  max_payload, max_altitude, max_speed, hover_power_w, cruise_power_w,
  cruise_speed_ms, battery_health_pct, wind_tolerance_ms, max_flight_time_min,
  max_range_m, total_flight_hours, total_flights, communication_protocol, remote_id,
  capabilities, specifications, telemetry_config, last_maintenance, next_maintenance,
  status, version, created_on, created_by
)
VALUES
  -- [1] HUB-SGN-D1 AVAILABLE -> paired with AUTHORIZED FL-2026-001 (1-click TAKEOFF / Sim)
  ('30d1435a-77bf-49a1-8fd5-6920a6ed064c',
   'VN-D001', 'DJI-M350-SN-001', 'DJI', 'Matrice 350 RTK',
   'f110bb18-c585-459d-adc2-d3f023c93aa3',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   588.0, 96.0, 2.7, 150.0, 23.0, 340.0, 275.0, 15.0, 98.0, 12.0, 55, 25000.0, 142.5, 218,
   'DJI_SDK', 'RID-VN-D001',
   '["rtk","thermal_camera","cargo_winch","ip55_weather","cold_chain"]'::jsonb,
   '{"wingspanMm":810,"emptyWeightKg":6.47,"ipRating":"IP55","propellers":4}'::jsonb,
   '{"defaultRateHz":1.0,"enhancedRateHz":5.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '14 days', NOW() + interval '46 days',
   'AVAILABLE', 0, NOW() - interval '60 days', 'admin'),

  -- [2] HUB-SGN-TT AVAILABLE -> paired with AUTHORIZED Multi-Leg Leg 1 FL-2026-002
  ('7633fbe9-411a-4767-94bb-a1d818b7f26f',
   'VN-D002', 'DJI-M350-SN-002', 'DJI', 'Matrice 350 RTK',
   'f110bb18-c585-459d-adc2-d3f023c93aa3',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   588.0, 100.0, 2.7, 150.0, 23.0, 340.0, 275.0, 15.0, 97.5, 12.0, 55, 25000.0, 118.2, 179,
   'DJI_SDK', 'RID-VN-D002',
   '["rtk","thermal_camera","cargo_winch","ip55_weather"]'::jsonb,
   '{"wingspanMm":810,"emptyWeightKg":6.47,"ipRating":"IP55","propellers":4}'::jsonb,
   '{"defaultRateHz":1.0,"enhancedRateHz":5.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '7 days', NOW() + interval '53 days',
   'AVAILABLE', 0, NOW() - interval '55 days', 'admin'),

  -- [3] HUB-SGN-D1 AVAILABLE -> paired with AUTHORIZED Survey FL-2026-003 (hover + confirm)
  ('8c577611-85b0-4530-aa0f-7f9e2f6ea3e3',
   'VN-UAV-001', 'DJI-INS3-SN-001', 'DJI', 'Inspire 3 Pro',
   'e220bb18-c585-459d-adc2-d3f023c93aa4',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   428.0, 94.0, 1.8, 140.0, 26.0, 290.0, 240.0, 14.0, 96.0, 14.0, 42, 20000.0, 88.4, 134,
   'WEBSOCKET', 'RID-VN-UAV-001',
   '["rtk","8k_optical","lidar_survey"]'::jsonb,
   '{"wingspanMm":695,"emptyWeightKg":3.99,"propellers":4}'::jsonb,
   '{"defaultRateHz":1.0,"enhancedRateHz":5.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '20 days', NOW() + interval '40 days',
   'AVAILABLE', 0, NOW() - interval '50 days', 'admin'),

  -- [4] HUB-SGN-TD AVAILABLE -> paired with AUTHORIZED FL-2026-004 (2nd concurrent flight)
  ('ece5662e-b5c6-477f-b710-918e2e11a1c5',
   'VN-UAV-6376', 'WGT-GEN2-SN-6376', 'Wingtra', 'WingtraOne Gen II VTOL',
   'e220bb18-c585-459d-adc2-d3f023c93aa4',
   'c854d502-2c9b-4e4a-93c2-b8759521e962', 'c854d502-2c9b-4e4a-93c2-b8759521e962',
   620.0, 91.0, 3.5, 180.0, 20.0, 360.0, 230.0, 16.0, 99.0, 13.0, 59, 45000.0, 96.0, 112,
   'MAVLINK', 'RID-VN-UAV-6376',
   '["vtol","long_range","cold_chain","rtk"]'::jsonb,
   '{"wingspanMm":1250,"emptyWeightKg":3.70,"vtolType":"tailsitter"}'::jsonb,
   '{"defaultRateHz":1.0,"enhancedRateHz":5.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '10 days', NOW() + interval '50 days',
   'AVAILABLE', 0, NOW() - interval '50 days', 'admin'),

  -- [5] HUB-SGN-D1 AVAILABLE -> paired with AUTHORIZED Relay Leg 0 FL-2026-006
  ('d4e5f601-1122-3344-5566-778899aabbcc',
   'VN-MED-001', 'VLS-M20-SN-001', 'Volansi', 'Voly M20 Medical VTOL',
   'd330bb18-c585-459d-adc2-d3f023c93aa5',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   750.0, 98.0, 5.0, 160.0, 25.0, 420.0, 310.0, 18.0, 97.0, 15.0, 65, 50000.0, 164.0, 205,
   'MAVLINK', 'RID-VN-MED-001',
   '["vtol","cold_chain","medical_priority","bvlos","rtk"]'::jsonb,
   '{"wingspanMm":2100,"emptyWeightKg":12.5,"coldChainTempC":"2-8"}'::jsonb,
   '{"defaultRateHz":2.0,"enhancedRateHz":10.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '5 days', NOW() + interval '25 days',
   'AVAILABLE', 0, NOW() - interval '45 days', 'admin'),

  -- [6] HUB-SGN-TT AVAILABLE -> paired with SCHEDULED Relay Leg 1 FL-2026-007
  ('11223344-5566-4777-8888-99aabbcc0002',
   'VN-MED-002', 'VLS-M20-SN-002', 'Volansi', 'Voly M20 Medical VTOL',
   'd330bb18-c585-459d-adc2-d3f023c93aa5',
   '606a30fb-465a-4016-85f7-85b00467f2f7', '606a30fb-465a-4016-85f7-85b00467f2f7',
   750.0, 95.0, 5.0, 160.0, 25.0, 420.0, 310.0, 18.0, 98.5, 15.0, 65, 50000.0, 74.5, 92,
   'MAVLINK', 'RID-VN-MED-002',
   '["vtol","cold_chain","medical_priority","bvlos","rtk"]'::jsonb,
   '{"wingspanMm":2100,"emptyWeightKg":12.5,"coldChainTempC":"2-8"}'::jsonb,
   '{"defaultRateHz":2.0,"enhancedRateHz":10.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '9 days', NOW() + interval '51 days',
   'AVAILABLE', 0, NOW() - interval '40 days', 'admin'),

  -- [7] HUB-SGN-D1 AVAILABLE -> UNASSIGNED reserve drone for new missions / fleet scoring / rebalancing
  ('f6a7b803-3344-4566-7788-99aabbccddee',
   'VN-CARGO-011', 'WGT-CRG-SN-011', 'Wingtra', 'Wingtra Heavy Cargo VTOL',
   'f110bb18-c585-459d-adc2-d3f023c93aa3',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   820.0, 92.0, 6.0, 150.0, 22.0, 450.0, 340.0, 16.0, 99.0, 14.0, 52, 38000.0, 52.0, 68,
   'MAVLINK', 'RID-VN-CARGO-011',
   '["vtol","heavy_lift","cargo_winch","rtk","cold_chain"]'::jsonb,
   '{"wingspanMm":1800,"emptyWeightKg":10.8,"winchLengthM":20}'::jsonb,
   '{"defaultRateHz":1.0,"enhancedRateHz":5.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '6 days', NOW() + interval '54 days',
   'AVAILABLE', 0, NOW() - interval '35 days', 'admin'),

  -- [8] HUB-SGN-TD AVAILABLE -> paired with SCHEDULED FL-2026-008 & READY Mission MSN-261127-AVN5
  ('11223344-5566-4777-8888-99aabbcc0004',
   'VN-INSP-004', 'AUT-EVO4T-SN-004', 'Autel', 'EVO Max 4T Tactical',
   'e220bb18-c585-459d-adc2-d3f023c93aa4',
   'c854d502-2c9b-4e4a-93c2-b8759521e962', 'c854d502-2c9b-4e4a-93c2-b8759521e962',
   460.0, 89.0, 2.0, 150.0, 23.0, 300.0, 245.0, 15.0, 95.0, 12.0, 42, 22000.0, 63.0, 95,
   'REST_API', 'RID-VN-INSP-004',
   '["rtk","thermal_camera","obstacle_avoidance","lidar_survey"]'::jsonb,
   '{"wingspanMm":564,"emptyWeightKg":1.65,"zoomOptical":"10x"}'::jsonb,
   '{"defaultRateHz":1.0,"enhancedRateHz":5.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '12 days', NOW() + interval '48 days',
   'AVAILABLE', 0, NOW() - interval '30 days', 'admin'),

  -- [9] HUB-SGN-D7 AVAILABLE (low batt 38%) -> paired with SCHEDULED NO_GO FL-2026-009 (deterministic NO_GO!)
  ('11223344-5566-4777-8888-99aabbcc0005',
   'VN-CARGO-012', 'EHG-FLCB-SN-012', 'EHang', 'Falcon B Commercial Heavy',
   'f110bb18-c585-459d-adc2-d3f023c93aa3',
   'a942c710-1b8a-4c22-83e1-d647a829f101', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   520.0, 38.0, 8.5, 150.0, 20.0, 820.0, 680.0, 14.0, 92.0, 11.0, 28, 18000.0, 184.0, 240,
   'CUSTOM_API', 'RID-VN-CARGO-012',
   '["heavy_lift","cargo_winch","rtk"]'::jsonb,
   '{"wingspanMm":1600,"emptyWeightKg":14.2,"propellers":8}'::jsonb,
   '{"defaultRateHz":1.0,"enhancedRateHz":5.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '18 days', NOW() + interval '42 days',
   'AVAILABLE', 0, NOW() - interval '45 days', 'admin'),

  -- [10] HUB-SGN-TSN CHARGING (48% -> scheduler charges +3.5%/min; leaves HUB-SGN-TSN at 0 AVAILABLE for rebalancing)
  ('11223344-5566-4777-8888-99aabbcc0006',
   'VN-CHG-005', 'DJI-M350-SN-005', 'DJI', 'Matrice 350 RTK',
   'd330bb18-c585-459d-adc2-d3f023c93aa5',
   'b153d821-2c9b-4d33-94f2-e758b930a202', 'b153d821-2c9b-4d33-94f2-e758b930a202',
   588.0, 48.0, 2.7, 150.0, 23.0, 340.0, 275.0, 15.0, 96.5, 12.0, 55, 25000.0, 109.5, 160,
   'DJI_SDK', 'RID-VN-CHG-005',
   '["rtk","cold_chain","medical_priority"]'::jsonb,
   '{"wingspanMm":810,"emptyWeightKg":6.47,"ipRating":"IP55"}'::jsonb,
   '{"defaultRateHz":1.0,"enhancedRateHz":5.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '15 days', NOW() + interval '45 days',
   'CHARGING', 0, NOW() - interval '40 days', 'admin'),

  -- [11] HUB-SGN-D7 MAINTENANCE (overdue maintenance -> tests fleet health & maintenance scoring)
  ('e5f6a702-2233-4455-6677-8899aabbccdd',
   'VN-CARGO-009', 'EHG-FLCB-SN-009', 'EHang', 'Falcon B Commercial Heavy',
   'f110bb18-c585-459d-adc2-d3f023c93aa3',
   'a942c710-1b8a-4c22-83e1-d647a829f101', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   950.0, 62.0, 8.5, 150.0, 22.0, 820.0, 650.0, 14.0, 84.0, 12.0, 35, 24000.0, 310.0, 412,
   'WEBSOCKET', 'RID-VN-CARGO-009',
   '["heavy_lift","cargo_winch","rtk"]'::jsonb,
   '{"wingspanMm":1600,"emptyWeightKg":14.2,"propellers":8}'::jsonb,
   '{"defaultRateHz":1.0,"enhancedRateHz":5.0,"emergencyRateHz":10.0}'::jsonb,
   NOW() - interval '62 days', NOW() - interval '2 days',
   'MAINTENANCE', 0, NOW() - interval '70 days', 'admin'),

  -- [12] HUB-SGN-CG OFFLINE (parked at Can Gio maintenance relay hub)
  ('11223344-5566-4777-8888-99aabbcc0007',
   'VN-OFF-007', 'SKY-X10-SN-007', 'Skydio', 'X10D Coastal Patrol',
   'b550bb18-c585-459d-adc2-d3f023c93aa7',
   'd264e932-3d0c-4e44-a503-f869ca41b303', 'd264e932-3d0c-4e44-a503-f869ca41b303',
   310.0, 35.0, 1.0, 120.0, 20.0, 240.0, 195.0, 13.0, 91.0, 12.0, 40, 16000.0, 45.0, 72,
   'WEBSOCKET', 'RID-VN-OFF-007',
   '["obstacle_avoidance","thermal_camera","night_vision"]'::jsonb,
   '{"wingspanMm":650,"emptyWeightKg":2.11,"ipRating":"IP55"}'::jsonb,
   '{"defaultRateHz":1.0,"enhancedRateHz":5.0}'::jsonb,
   NOW() - interval '25 days', NOW() + interval '35 days',
   'OFFLINE', 0, NOW() - interval '40 days', 'admin'),

  -- [13] HUB-SGN-TD RETIRED (decommissioned airframe for historical filter testing)
  ('11223344-5566-4777-8888-99aabbcc0008',
   'VN-RET-008', 'DJI-M300-SN-008', 'DJI', 'Matrice 300 RTK (Gen 1)',
   'f110bb18-c585-459d-adc2-d3f023c93aa3',
   'c854d502-2c9b-4e4a-93c2-b8759521e962', 'c854d502-2c9b-4e4a-93c2-b8759521e962',
   548.0, 20.0, 2.7, 120.0, 20.0, 370.0, 300.0, 14.0, 58.0, 10.0, 38, 18000.0, 1420.5, 1850,
   'DJI_SDK', 'RID-VN-RET-008',
   '["rtk","thermal_camera"]'::jsonb,
   '{"wingspanMm":810,"emptyWeightKg":6.30,"retiredReason":"Cycle life limit reached"}'::jsonb,
   '{"defaultRateHz":1.0}'::jsonb,
   NOW() - interval '120 days', NOW() - interval '60 days',
   'RETIRED', 0, NOW() - interval '365 days', 'admin');

INSERT INTO drone_command (
  id, drone_id, flight_id, command_type, parameters, status, issued_by, issued_at,
  acknowledged_at, completed_at, error_message, priority, timeout_ms, retry_count, max_retries,
  version, created_on, created_by
)
VALUES
  ('c0010000-0000-4000-8000-000000000001',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa',
   'TAKEOFF', '{"targetAltitudeM":80.0}'::jsonb, 'COMPLETED', 'pilot_nam',
   NOW() - interval '105 minutes', NOW() - interval '104 minutes 58 seconds', NOW() - interval '104 minutes 30 seconds',
   NULL, 2, 2000, 0, 2, 0, NOW() - interval '105 minutes', 'pilot_nam'),

  ('c0010000-0000-4000-8000-000000000002',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa',
   'CONFIGURE', '{"targetSpeedMps":14.0}'::jsonb, 'COMPLETED', 'operator',
   NOW() - interval '100 minutes', NOW() - interval '99 minutes 59 seconds', NOW() - interval '99 minutes 58 seconds',
   NULL, 3, 5000, 0, 1, 0, NOW() - interval '100 minutes', 'operator'),

  ('c0010000-0000-4000-8000-000000000003',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa',
   'HOVER', '{"holdTimeSeconds":60,"altitudeM":80.0}'::jsonb, 'COMPLETED', 'atc_hanoi',
   NOW() - interval '97 minutes', NOW() - interval '96 minutes 59 seconds', NOW() - interval '96 minutes',
   NULL, 1, 1000, 0, 2, 0, NOW() - interval '97 minutes', 'atc_hanoi'),

  ('c0010000-0000-4000-8000-000000000004',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa',
   'RESUME', '{}'::jsonb, 'COMPLETED', 'atc_hanoi',
   NOW() - interval '95 minutes 50 seconds', NOW() - interval '95 minutes 49 seconds', NOW() - interval '95 minutes 48 seconds',
   NULL, 2, 2000, 0, 2, 0, NOW() - interval '95 minutes 50 seconds', 'atc_hanoi'),

  ('c0010000-0000-4000-8000-000000000005',
   '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a',
   'SET_ALTITUDE', '{"targetAltitudeM":110.0,"climbRateMs":2.5}'::jsonb, 'COMPLETED', 'atc_hanoi',
   NOW() - interval '55 minutes', NOW() - interval '54 minutes 59 seconds', NOW() - interval '54 minutes 45 seconds',
   NULL, 2, 2000, 0, 2, 0, NOW() - interval '55 minutes', 'atc_hanoi'),

  ('c0010000-0000-4000-8000-000000000006',
   '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a',
   'SET_HOME', '{"latitude":10.7850,"longitude":106.7350,"targetHubId":"606a30fb-465a-4016-85f7-85b00467f2f7"}'::jsonb, 'COMPLETED', 'operator',
   NOW() - interval '52 minutes', NOW() - interval '51 minutes 59 seconds', NOW() - interval '51 minutes 58 seconds',
   NULL, 3, 5000, 0, 1, 0, NOW() - interval '52 minutes', 'operator'),

  ('c0010000-0000-4000-8000-000000000007',
   'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788',
   'GOTO', '{"latitude":10.7550,"longitude":106.7120,"altitude":110.0,"reason":"Lateral deviation recovery"}'::jsonb, 'COMPLETED', 'atc_hanoi',
   NOW() - interval '122 minutes', NOW() - interval '121 minutes 58 seconds', NOW() - interval '121 minutes 10 seconds',
   NULL, 2, 2000, 0, 2, 0, NOW() - interval '122 minutes', 'atc_hanoi'),

  ('c0010000-0000-4000-8000-000000000008',
   'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788',
   'LAND', '{"descentRateMps":3.5,"reason":"Critical battery emergency protocol"}'::jsonb, 'COMPLETED', 'emergency-service',
   NOW() - interval '118 minutes', NOW() - interval '117 minutes 59 seconds', NOW() - interval '115 minutes',
   NULL, 0, 500, 0, 3, 0, NOW() - interval '118 minutes', 'system'),

  ('c0010000-0000-4000-8000-000000000009',
   'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788',
   'RTL', '{"reason":"Initial low battery advisory"}'::jsonb, 'CANCELLED', 'operator',
   NOW() - interval '119 minutes', NULL, NULL,
   'Superseded by P0 LAND emergency command', 1, 1000, 0, 2, 0, NOW() - interval '119 minutes', 'operator'),

  ('c0010000-0000-4000-8000-000000000010',
   '11223344-5566-4777-8888-99aabbcc0007', NULL,
   'CONFIGURE', '{"telemetryMode":"normal"}'::jsonb, 'FAILED', 'operator',
   NOW() - interval '3 hours', NULL, NULL,
   'Device DEV-SKYDIO-007 unreachable after 2 retries (OFFLINE)', 3, 5000, 2, 2, 0, NOW() - interval '3 hours', 'operator');

-- ------------------------------------------------------------------------------
-- 5. utm_connectivity (ALL 3 tables: 15 device_registrations, 6 device_certificates,
--                      4 manufacturer_api_keys)
--    Uses standard adapter protocol keys (dji_sdk, mavlink, websocket, rest_api,
--    custom_api) and 64-char UPPERCASE hex SHA-256 fingerprints matching certs.
-- ------------------------------------------------------------------------------
\c utm_connectivity;

TRUNCATE TABLE manufacturer_api_keys, device_certificates, device_registrations CASCADE;

INSERT INTO device_registrations (
  id, drone_id, hub_id, device_type, device_identifier, registration_status, connection_status,
  telemetry_mode, telemetry_mode_reason, supported_protocols, metadata,
  socket_id, certificate_fingerprint, last_seen_at, version, created_on, created_by
)
VALUES
  ('1b534791-346d-437b-9553-91b7bea3cc4b',
   '30d1435a-77bf-49a1-8fd5-6920a6ed064c', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'DRONE', 'DEV-DJI-M350-001', 'ACTIVE', 'ONLINE', 'NORMAL', 'Ready on Saigon Central Pad 1',
   '["dji_sdk","websocket"]'::jsonb, '{"firmware":"v09.02.0705","modem":"5G-SA","remoteId":"RID-VN-D001"}'::jsonb,
   'ws://gateway:8089/conn-d001', '9C12A45D77E819B4F91C3D11B87A123E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C',
   NOW(), 0, NOW() - interval '60 days', 'admin'),

  ('3d756913-568f-459d-b775-13d9deb5ee6d',
   '7633fbe9-411a-4767-94bb-a1d818b7f26f', '606a30fb-465a-4016-85f7-85b00467f2f7',
   'DRONE', 'DEV-DJI-M350-002', 'ACTIVE', 'ONLINE', 'NORMAL', 'Post-recharge standby for Multi-Leg Leg 1',
   '["dji_sdk","websocket"]'::jsonb, '{"firmware":"v09.02.0705","modem":"5G-SA","remoteId":"RID-VN-D002"}'::jsonb,
   'ws://gateway:8089/conn-d002', '1A22B33C44D55E66F77A88B99CC0011E2233445566778899AABBCCDDEEFF0011',
   NOW(), 0, NOW() - interval '55 days', 'admin'),

  ('ef59525b-65d1-428a-8ff0-1019e3a182c2',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'DRONE', 'DEV-DJI-INS3-001', 'ACTIVE', 'ONLINE', 'IDLE', 'Idle at Saigon Central Pad 3',
   '["websocket","dji_sdk"]'::jsonb, '{"firmware":"v01.00.0600","modem":"LTE-A","remoteId":"RID-VN-UAV-001"}'::jsonb,
   'ws://gateway:8089/conn-uav001', '7B91D24C88F910A3E83B4C10A23E981F1234567890ABCDEF1234567890ABCDEF',
   NOW(), 0, NOW() - interval '50 days', 'admin'),

  ('2c645802-457e-448c-a664-02c8cfa4dd5c',
   'ece5662e-b5c6-477f-b710-918e2e11a1c5', 'c854d502-2c9b-4e4a-93c2-b8759521e962',
   'DRONE', 'DEV-WINGTRA-6376', 'ACTIVE', 'ONLINE', 'ENHANCED', 'High-precision RTK pre-flight calibration',
   '["mavlink","websocket"]'::jsonb, '{"firmware":"v2.11.4","modem":"SatCom+5G","remoteId":"RID-VN-UAV-6376"}'::jsonb,
   'ws://gateway:8089/conn-6376', '3D44E56F88A920C5A02D5E22C11B887A00112233445566778899AABBCCDDEEFF',
   NOW(), 0, NOW() - interval '50 days', 'admin'),

  ('4e867924-679a-460e-c886-24eaefc6ff7e',
   'd4e5f601-1122-3344-5566-778899aabbcc', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'DRONE', 'DEV-VOLY-MED-001', 'ACTIVE', 'ONLINE', 'ENHANCED', 'Priority medical standby telemetry link',
   '["mavlink","websocket"]'::jsonb, '{"firmware":"v4.3.1","modem":"Dual-5G","remoteId":"RID-VN-MED-001"}'::jsonb,
   'ws://gateway:8089/conn-med001', '5F66A77B88C99D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2C3D4E',
   NOW(), 0, NOW() - interval '45 days', 'admin'),

  ('60000000-0000-4000-8000-000000000006',
   '11223344-5566-4777-8888-99aabbcc0002', '606a30fb-465a-4016-85f7-85b00467f2f7',
   'DRONE', 'DEV-VOLY-MED-002', 'ACTIVE', 'OFFLINE', 'IDLE', 'Standby at Thu Thiem relay pad',
   '["mavlink","websocket"]'::jsonb, '{"firmware":"v4.3.1","modem":"Dual-5G","remoteId":"RID-VN-MED-002"}'::jsonb,
   NULL, NULL, NOW() - interval '20 minutes', 0, NOW() - interval '40 days', 'admin'),

  ('60000000-0000-4000-8000-000000000007',
   'f6a7b803-3344-4566-7788-99aabbccddee', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'DRONE', 'DEV-WINGTRA-011', 'ACTIVE', 'OFFLINE', 'IDLE', 'Reserve fleet standby',
   '["mavlink","websocket"]'::jsonb, '{"firmware":"v2.12.0","modem":"5G-SA","remoteId":"RID-VN-CARGO-011"}'::jsonb,
   NULL, NULL, NOW() - interval '35 minutes', 0, NOW() - interval '35 days', 'admin'),

  ('60000000-0000-4000-8000-000000000008',
   '11223344-5566-4777-8888-99aabbcc0004', 'c854d502-2c9b-4e4a-93c2-b8759521e962',
   'DRONE', 'DEV-AUTEL-004', 'ACTIVE', 'OFFLINE', 'IDLE', 'Parked at Thu Duc inspection hangar',
   '["rest_api","websocket"]'::jsonb, '{"firmware":"v1.9.3","modem":"LTE-M","remoteId":"RID-VN-INSP-004"}'::jsonb,
   NULL, NULL, NOW() - interval '50 minutes', 0, NOW() - interval '30 days', 'admin'),

  ('60000000-0000-4000-8000-000000000009',
   '11223344-5566-4777-8888-99aabbcc0005', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   'DRONE', 'DEV-EHANG-012', 'ACTIVE', 'OFFLINE', 'IDLE', 'Low battery standby at Phu My Hung',
   '["custom_api","websocket"]'::jsonb, '{"firmware":"v3.1.2","modem":"5G-SA","remoteId":"RID-VN-CARGO-012"}'::jsonb,
   NULL, NULL, NOW() - interval '2 hours', 0, NOW() - interval '45 days', 'admin'),

  ('60000000-0000-4000-8000-000000000010',
   '11223344-5566-4777-8888-99aabbcc0006', 'b153d821-2c9b-4d33-94f2-e758b930a202',
   'DRONE', 'DEV-DJI-M350-005', 'ACTIVE', 'OFFLINE', 'IDLE', 'Docked on TSN fast-charge pad',
   '["dji_sdk","websocket"]'::jsonb, '{"firmware":"v09.02.0705","charger":"12kW-Bay-2"}'::jsonb,
   NULL, NULL, NOW() - interval '15 minutes', 0, NOW() - interval '40 days', 'admin'),

  ('5f978035-78ab-471f-d997-35fbf0d7aa8f',
   'e5f6a702-2233-4455-6677-8899aabbccdd', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   'DRONE', 'DEV-EHANG-009', 'ACTIVE', 'OFFLINE', 'IDLE', 'Grounded for overdue maintenance',
   '["websocket","custom_api"]'::jsonb, '{"firmware":"v3.0.8","maintenanceTicket":"MNT-2026-089"}'::jsonb,
   NULL, NULL, NOW() - interval '2 days', 0, NOW() - interval '70 days', 'admin'),

  ('60000000-0000-4000-8000-000000000012',
   '11223344-5566-4777-8888-99aabbcc0007', 'd264e932-3d0c-4e44-a503-f869ca41b303',
   'DRONE', 'DEV-SKYDIO-007', 'PENDING', 'OFFLINE', 'IDLE', 'Awaiting PKI enrollment at Can Gio relay',
   '["websocket"]'::jsonb, '{"firmware":"v2.0.1"}'::jsonb,
   NULL, NULL, NOW() - interval '3 days', 0, NOW() - interval '10 days', 'operator'),

  ('60000000-0000-4000-8000-000000000013',
   '11223344-5566-4777-8888-99aabbcc0008', 'c854d502-2c9b-4e4a-93c2-b8759521e962',
   'DRONE', 'DEV-DJI-M300-008', 'REVOKED', 'OFFLINE', 'IDLE', 'Airframe retired - certificate revoked',
   '["dji_sdk"]'::jsonb, '{"firmware":"v07.00.0102","retiredAt":"2026-11-22"}'::jsonb,
   NULL, NULL, NOW() - interval '15 days', 0, NOW() - interval '365 days', 'admin'),

  ('6a089146-89bc-4820-8aa8-460c01e8bb90',
   NULL, '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'GATEWAY', 'GW-SGN-D1-EDGE01', 'ACTIVE', 'ONLINE', 'NORMAL', 'Primary vertiport edge telemetry relay',
   '["websocket","mavlink","dji_sdk"]'::jsonb, '{"role":"vertiport_edge_relay","antennas":4,"uplinkMbps":1000}'::jsonb,
   'ws://gateway:8089/gw-sgn-d1', '8A99B00C11D22E33F44A55B66C77D88E99F00A11B22C33D44E55F66A77B88C99',
   NOW(), 0, NOW() - interval '90 days', 'admin'),

  ('60000000-0000-4000-8000-000000000015',
   NULL, '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'GCS', 'GCS-OPS-CENTER-01', 'ACTIVE', 'ONLINE', 'EMERGENCY', 'Emergency command ground control console',
   '["websocket","rest_api"]'::jsonb, '{"station":"HCMC-ATC-Desk-01","operator":"atc_hanoi"}'::jsonb,
   'ws://gateway:8089/gcs-ops-01', NULL,
   NOW(), 0, NOW() - interval '90 days', 'admin');

INSERT INTO device_certificates (
  id, device_registration_id, certificate_pem, fingerprint, common_name,
  serial_number, issued_at, expires_at, revoked_at, revocation_reason, created_on, created_by
)
VALUES
  ('dc000000-0000-4000-8000-000000000001',
   '1b534791-346d-437b-9553-91b7bea3cc4b',
   E'-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0001TESTCERTVN000001\n-----END CERTIFICATE-----',
   '9C12A45D77E819B4F91C3D11B87A123E4F5A6B7C8D9E0F1A2B3C4D5E6F7A8B9C',
   'DEV-DJI-M350-001', '4A01000000000001',
   NOW() - interval '30 days', NOW() + interval '60 days', NULL, NULL, NOW() - interval '30 days', 'admin'),

  ('dc000000-0000-4000-8000-000000000002',
   '3d756913-568f-459d-b775-13d9deb5ee6d',
   E'-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0002TESTCERTVN000002\n-----END CERTIFICATE-----',
   '1A22B33C44D55E66F77A88B99CC0011E2233445566778899AABBCCDDEEFF0011',
   'DEV-DJI-M350-002', '4A01000000000002',
   NOW() - interval '25 days', NOW() + interval '65 days', NULL, NULL, NOW() - interval '25 days', 'admin'),

  ('dc000000-0000-4000-8000-000000000003',
   'ef59525b-65d1-428a-8ff0-1019e3a182c2',
   E'-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0003TESTCERTVN000003\n-----END CERTIFICATE-----',
   '7B91D24C88F910A3E83B4C10A23E981F1234567890ABCDEF1234567890ABCDEF',
   'DEV-DJI-INS3-001', '4A01000000000003',
   NOW() - interval '83 days', NOW() + interval '7 days', NULL, NULL, NOW() - interval '83 days', 'admin'),

  ('dc000000-0000-4000-8000-000000000004',
   '2c645802-457e-448c-a664-02c8cfa4dd5c',
   E'-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0004TESTCERTVN000004\n-----END CERTIFICATE-----',
   '3D44E56F88A920C5A02D5E22C11B887A00112233445566778899AABBCCDDEEFF',
   'DEV-WINGTRA-6376', '4A01000000000004',
   NOW() - interval '20 days', NOW() + interval '70 days', NULL, NULL, NOW() - interval '20 days', 'admin'),

  ('dc000000-0000-4000-8000-000000000005',
   '4e867924-679a-460e-c886-24eaefc6ff7e',
   E'-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0005TESTCERTVN000005\n-----END CERTIFICATE-----',
   '5F66A77B88C99D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2C3D4E',
   'DEV-VOLY-MED-001', '4A01000000000005',
   NOW() - interval '15 days', NOW() + interval '75 days', NULL, NULL, NOW() - interval '15 days', 'admin'),

  ('dc000000-0000-4000-8000-000000000006',
   '6a089146-89bc-4820-8aa8-460c01e8bb90',
   E'-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0006TESTCERTGW000006\n-----END CERTIFICATE-----',
   '8A99B00C11D22E33F44A55B66C77D88E99F00A11B22C33D44E55F66A77B88C99',
   'GW-SGN-D1-EDGE01', '4A01000000000006',
   NOW() - interval '45 days', NOW() + interval '135 days', NULL, NULL, NOW() - interval '45 days', 'admin'),

  ('dc000000-0000-4000-8000-000000000007',
   '60000000-0000-4000-8000-000000000013',
   E'-----BEGIN CERTIFICATE-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0007REVOKEDCERT00007\n-----END CERTIFICATE-----',
   'F0E1D2C3B4A5968778695A4B3C2D1E0F0123456789ABCDEF0123456789ABCDEF',
   'DEV-DJI-M300-008', '4A01000000000007',
   NOW() - interval '200 days', NOW() - interval '110 days',
   NOW() - interval '5 days', 'Airframe retired from commercial fleet',
   NOW() - interval '200 days', 'admin');

INSERT INTO manufacturer_api_keys (
  id, name, manufacturer_name, key_prefix, key_hash, scopes, is_active,
  expires_at, last_used_at, revoked_at, created_on, created_by
)
VALUES
  ('ac000000-0000-4000-8000-000000000001',
   'DJI Cloud API Bridge - Production',
   'DJI',
   'utm_live_dji01',
   'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b801',
   '["telemetry:write","drone:register","status:read"]'::jsonb,
   true,
   NOW() + interval '180 days',
   NOW() - interval '12 minutes',
   NULL,
   NOW() - interval '60 days',
   'admin'),

  ('ac000000-0000-4000-8000-000000000002',
   'Wingtra VTOL Telemetry Feed',
   'Wingtra',
   'utm_live_wgt02',
   'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b802',
   '["telemetry:write","status:read"]'::jsonb,
   true,
   NOW() + interval '120 days',
   NOW() - interval '45 minutes',
   NULL,
   NOW() - interval '50 days',
   'admin'),

  ('ac000000-0000-4000-8000-000000000003',
   'Volansi Medical Fleet Gateway',
   'Volansi',
   'utm_live_vls03',
   'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b803',
   '["telemetry:write","drone:register","status:read"]'::jsonb,
   true,
   NOW() + interval '240 days',
   NOW() - interval '2 hours',
   NULL,
   NOW() - interval '45 days',
   'admin'),

  ('ac000000-0000-4000-8000-000000000004',
   'EHang Legacy Integration Key (Revoked)',
   'EHang',
   'utm_live_ehg04',
   'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b804',
   '["telemetry:write","status:read"]'::jsonb,
   false,
   NOW() + interval '30 days',
   NOW() - interval '15 days',
   NOW() - interval '10 days',
   NOW() - interval '90 days',
   'admin');

-- ------------------------------------------------------------------------------
-- 6. utm_mission (ALL 5 tables: 4 templates w/ versioning, 9 missions across all
--                 statuses/schedules, 29 terminal+stopover+coord waypoints,
--                 6 executions & 8 legs incl. SAME_DRONE_SEQUENTIAL & MULTI_DRONE_RELAY)
-- ------------------------------------------------------------------------------
\c utm_mission;

TRUNCATE TABLE mission_template, mission_execution_leg, waypoint, mission_execution, mission CASCADE;

INSERT INTO mission_template (
  id, code, name, description, category, tags, variables, blueprint,
  version, is_latest, previous_version_id, changelog, usage_count, is_published, published_at, created_on, created_by
)
VALUES
  ('71000000-0000-4000-8000-000000000001',
   'TPL-MED-SHUTTLE',
   'Saigon River Medical Express Blueprint',
   'Standard cold-chain medical shuttle corridor from Saigon Central Vertiport to Thu Thiem.',
   'medical',
   '["cold_chain","river_corridor","urgent"]'::jsonb,
   '[{"key":"payloadWeightKg","label":"Payload Weight (kg)","type":"number","required":true,"defaultValue":2.5,"validation":{"min":0.5,"max":5.0}},{"key":"cruiseSpeed","label":"Cruise Speed (m/s)","type":"number","required":false,"defaultValue":15.0,"validation":{"min":8.0,"max":22.0}}]'::jsonb,
   '{"waypoints":[{"sequence":1,"name":"Bach Dang River Entry Gate","latitude":10.7750,"longitude":106.7080,"altitude":120.0,"speedToWaypoint":15.0,"turnRadius":25.0,"stopoverType":"none","hoverDuration":0,"waitForConfirmation":false,"actions":{"type":"fly_through","speed":15.0},"conditions":{"maxWindSpeed":12.0,"minVisibility":3000},"waypointType":"coordinate"},{"sequence":2,"name":"Thu Thiem Inbound Transit Gate","latitude":10.7800,"longitude":106.7220,"altitude":120.0,"speedToWaypoint":15.0,"turnRadius":25.0,"stopoverType":"none","hoverDuration":0,"waitForConfirmation":false,"actions":{"type":"fly_through","speed":15.0},"conditions":{"maxWindSpeed":12.0,"minVisibility":3000},"waypointType":"coordinate"}],"defaultScheduleType":"immediate","defaultTriggerConditions":[],"requiredCapabilities":["cold_chain","rtk"],"payloadWeightKg":2.5,"estimatedDuration":340,"estimatedDistance":4200.0}'::jsonb,
   1, false, NULL, 'Initial published corridor blueprint', 4, true,
   NOW() - interval '21 days', NOW() - interval '21 days', 'admin'),

  ('71000000-0000-4000-8000-000000000011',
   'TPL-MED-SHUTTLE',
   'Saigon River Medical Express Blueprint',
   'Updated cold-chain medical shuttle with tighter weather tolerances and intermediate river monitoring gate.',
   'medical',
   '["cold_chain","river_corridor","urgent","v2"]'::jsonb,
   '[{"key":"payloadWeightKg","label":"Payload Weight (kg)","type":"number","required":true,"defaultValue":2.2,"validation":{"min":0.5,"max":5.0}},{"key":"cruiseSpeed","label":"Cruise Speed (m/s)","type":"number","required":false,"defaultValue":15.0,"validation":{"min":10.0,"max":20.0}}]'::jsonb,
   '{"waypoints":[{"sequence":1,"name":"Bach Dang River Entry Gate","latitude":10.7755,"longitude":106.7085,"altitude":120.0,"speedToWaypoint":15.0,"turnRadius":25.0,"stopoverType":"none","hoverDuration":0,"waitForConfirmation":false,"actions":{"type":"fly_through","speed":15.0},"conditions":{"maxWindSpeed":12.0,"minVisibility":4000},"waypointType":"coordinate"},{"sequence":2,"name":"Thu Thiem Inbound Transit Gate","latitude":10.7805,"longitude":106.7230,"altitude":120.0,"speedToWaypoint":15.0,"turnRadius":25.0,"stopoverType":"none","hoverDuration":0,"waitForConfirmation":false,"actions":{"type":"fly_through","speed":15.0},"conditions":{"maxWindSpeed":12.0,"minVisibility":4000},"waypointType":"coordinate"}],"defaultScheduleType":"immediate","defaultTriggerConditions":[],"requiredCapabilities":["cold_chain","rtk"],"payloadWeightKg":2.2,"estimatedDuration":330,"estimatedDistance":4150.0}'::jsonb,
   2, true, '71000000-0000-4000-8000-000000000001', 'Raised visibility minimum to 4000m and smoothed Thu Thiem approach vector', 6, true,
   NOW() - interval '7 days', NOW() - interval '7 days', 'admin'),

  ('71000000-0000-4000-8000-000000000002',
   'TPL-RIVER-SURVEY',
   'Saigon River Environmental Bathymetry Survey',
   'Automated LiDAR and water-quality hover sampling template along Saigon River fairway.',
   'inspection',
   '["lidar_survey","environmental","river"]'::jsonb,
   '[{"key":"hoverSeconds","label":"Sampling Hover Duration (s)","type":"number","required":false,"defaultValue":120,"validation":{"min":30,"max":300}}]'::jsonb,
   '{"waypoints":[{"sequence":1,"name":"Saigon River Mid-Channel Water Sampling Point","latitude":10.7785,"longitude":106.7160,"altitude":60.0,"speedToWaypoint":12.0,"turnRadius":15.0,"stopoverType":"none","hoverDuration":120,"waitForConfirmation":true,"actions":{"type":"hover","durationS":120},"conditions":{"maxWindSpeed":10.0,"minVisibility":5000},"waypointType":"coordinate"}],"defaultScheduleType":"manual","defaultTriggerConditions":[],"requiredCapabilities":["lidar_survey","rtk"],"payloadWeightKg":1.2,"estimatedDuration":510,"estimatedDistance":3900.0}'::jsonb,
   1, true, NULL, 'Initial environmental inspection blueprint', 3, true,
   NOW() - interval '14 days', NOW() - interval '14 days', 'admin'),

  ('71000000-0000-4000-8000-000000000003',
   'TPL-CARGO-MULTILEG',
   'Cross-City Multi-Hub Recharge Cargo Shuttle (Draft)',
   'Draft 2-leg cargo corridor linking Saigon Central, Thu Thiem Recharge Hub, and Thu Duc Innovation Park.',
   'logistics',
   '["multi_leg","recharge","cargo"]'::jsonb,
   '[{"key":"payloadWeightKg","label":"Cargo Weight (kg)","type":"number","required":true,"defaultValue":2.0,"validation":{"min":0.5,"max":6.0}}]'::jsonb,
   '{"waypoints":[{"sequence":1,"name":"Thu Thiem Recharge Stopover","latitude":10.7850,"longitude":106.7350,"altitude":0.0,"hubId":"606a30fb-465a-4016-85f7-85b00467f2f7","stopoverType":"recharge","groundTimeMinutes":30,"payloadDeltaKg":0.0,"hoverDuration":0,"waitForConfirmation":false,"actions":{"type":"recharge"},"waypointType":"hub"}],"defaultScheduleType":"scheduled","defaultTriggerConditions":[],"requiredCapabilities":["rtk","cargo_winch"],"payloadWeightKg":2.0,"estimatedDuration":1200,"estimatedDistance":12400.0}'::jsonb,
   1, true, NULL, 'Draft awaiting operational safety sign-off', 0, false,
   NULL, NOW() - interval '2 days', 'operator');

INSERT INTO mission (
  id, code, name, description, payload_weight_kg, departure_hub_id, arrival_hub_id,
  drone_id, pilot_id, schedule_type, scheduled_at, recurring_pattern, dispatch_grace_minutes,
  trigger_conditions, required_capabilities, feasibility_override,
  template_id, template_version, estimated_distance, estimated_duration,
  status, version, created_on, created_by
)
VALUES
  -- [1] EXECUTING (Leg 0 = AUTHORIZED FL-2026-001, 1-click ready for TAKEOFF / Sim)
  ('a1111111-1111-4111-8111-111111111111',
   'MSN-261127-MED1',
   'Urgent Medical Blood Pack Transfer',
   'Cold-chain transport of O-negative blood units from Saigon Central Vertiport to Thu Thiem Medical Center (Flight FL-2026-001 ready for 1-click TAKEOFF).',
   2.20,
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   '30d1435a-77bf-49a1-8fd5-6920a6ed064c', 'pilot_nam',
   'IMMEDIATE', NOW() - interval '10 minutes', NULL, 30,
   '[]'::jsonb, '["cold_chain","rtk"]'::jsonb, NULL,
   '71000000-0000-4000-8000-000000000011', 2, 4150.0, 330,
   'EXECUTING', 0, NOW() - interval '15 minutes', 'operator'),

  -- [2] EXECUTING 2-Leg SAME_DRONE_SEQUENTIAL w/ RECHARGE stopover (Leg 0 COMPLETED, Leg 1 AUTHORIZED FL-2026-002!)
  ('a2222222-2222-4222-8222-222222222222',
   'MSN-261127-SEQ2',
   'Multi-Leg Express Parcel & Recharge Shuttle',
   '2-leg sequential mission from Saigon Central via Thu Thiem Recharge Stopover (30m completed) to Thu Duc Innovation Park. Leg 1 (FL-2026-002) is AUTHORIZED and ready for takeoff.',
   2.40,
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'c854d502-2c9b-4e4a-93c2-b8759521e962',
   '7633fbe9-411a-4767-94bb-a1d818b7f26f', 'pilot_nam',
   'IMMEDIATE', NOW() - interval '75 minutes', NULL, 30,
   '[]'::jsonb, '["rtk","cargo_winch"]'::jsonb, NULL,
   NULL, NULL, 12450.0, 960,
   'EXECUTING', 0, NOW() - interval '80 minutes', 'operator'),

  -- [3] EXECUTING Survey Mission with Hover + Wait-For-Confirmation (AUTHORIZED FL-2026-003)
  ('a3333333-3333-4333-8333-333333333333',
   'MSN-261127-ENV3',
   'Saigon River Water Quality Hover Survey',
   'LiDAR and mid-channel sampling mission with 120s hover checkpoint requiring pilot confirmation (Flight FL-2026-003 ready for TAKEOFF).',
   1.20,
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', 'pilot_nam',
   'IMMEDIATE', NOW() - interval '12 minutes', NULL, 30,
   '[]'::jsonb, '["lidar_survey","rtk"]'::jsonb, NULL,
   '71000000-0000-4000-8000-000000000002', 1, 3900.0, 510,
   'EXECUTING', 0, NOW() - interval '18 minutes', 'operator'),

  -- [4] EXECUTING 2-Leg MULTI_DRONE_RELAY (Leg 0 AUTHORIZED on VN-MED-001, Leg 1 SCHEDULED on VN-MED-002)
  ('a4444444-4444-4444-8444-444444444444',
   'MSN-261127-RLY4',
   'Cross-City Pediatric Vaccine Relay',
   '2-leg multi-drone relay via Thu Thiem handoff pad: VN-MED-001 carries Leg 0 (FL-2026-006 AUTHORIZED), handing cold-chain container to VN-MED-002 for Leg 1 (FL-2026-007 SCHEDULED) to Phu My Hung.',
   3.10,
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   'd4e5f601-1122-3344-5566-778899aabbcc', 'pilot_nam',
   'IMMEDIATE', NOW() - interval '8 minutes', NULL, 30,
   '[]'::jsonb, '["cold_chain","medical_priority","vtol"]'::jsonb,
   '{"approvedBy":"atc_hanoi","reason":"Priority pediatric cold-chain vaccine dispatch"}'::jsonb,
   NULL, NULL, 10200.0, 720,
   'EXECUTING', 0, NOW() - interval '12 minutes', 'operator'),

  -- [5] READY (1-click Execute Mission demo!)
  ('a5555555-5555-4555-8555-555555555555',
   'MSN-261127-AVN5',
   'High-Tech Avionics Sensor Dispatch',
   'Pre-validated manual mission ready for 1-click Execute Mission testing (Thu Duc -> Saigon Central).',
   1.50,
   'c854d502-2c9b-4e4a-93c2-b8759521e962', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   '11223344-5566-4777-8888-99aabbcc0004', 'pilot_nam',
   'MANUAL', NULL, NULL, 30,
   '[]'::jsonb, '["rtk","thermal_camera"]'::jsonb, NULL,
   NULL, NULL, 10800.0, 740,
   'READY', 0, NOW() - interval '25 minutes', 'operator'),

  -- [6] SCHEDULED (future +6h so ScheduledMissionDispatcher cron won't expire it!)
  ('a6666666-6666-4666-8666-666666666666',
   'MSN-261127-SCH6',
   'Scheduled Evening Cargo Consolidation',
   'Automated time-scheduled parcel transfer from Saigon Central to Phu My Hung South Hub.',
   3.80,
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   'f6a7b803-3344-4566-7788-99aabbccddee', 'pilot_nam',
   'SCHEDULED', NOW() + interval '6 hours', NULL, 45,
   '[{"type":"weather_clear","maxWindMs":12.0}]'::jsonb, '["heavy_lift","rtk"]'::jsonb, NULL,
   NULL, NULL, 5900.0, 420,
   'SCHEDULED', 0, NOW() - interval '30 minutes', 'operator'),

  -- [7] DRAFT + RECURRING cron pattern
  ('a7777777-7777-4777-8777-777777777777',
   'MSN-261127-REC7',
   'Weekday Morning Corridor Telemetry Patrol',
   'Draft recurring weekday corridor verification mission awaiting route review and publishing.',
   0.80,
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   NULL, 'pilot_nam',
   'RECURRING', NOW() + interval '1 day', '0 0 8 ? * MON-FRI', 30,
   '[{"type":"visibility_vfr","minVisibilityM":5000}]'::jsonb, '["rtk"]'::jsonb, NULL,
   NULL, NULL, 4100.0, 320,
   'DRAFT', 0, NOW() - interval '1 day', 'operator'),

  -- [8] COMPLETED historical mission (linked to COMPLETED flight FL-2026-010 + 15-frame telemetry replay!)
  ('a8888888-8888-4888-8888-888888888888',
   'MSN-261127-CMP8',
   'Morning Saigon River LiDAR & Air Sampling',
   'Successfully completed river corridor survey flight with full 15-frame telemetry replay history.',
   1.20,
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', 'pilot_nam',
   'IMMEDIATE', NOW() - interval '110 minutes', NULL, 30,
   '[]'::jsonb, '["lidar_survey"]'::jsonb, NULL,
   '71000000-0000-4000-8000-000000000002', 1, 3900.0, 510,
   'COMPLETED', 0, NOW() - interval '120 minutes', 'operator'),

  -- [9] ABORTED historical mission (linked to EMERGENCY_LANDING flight FL-2026-011 + blackbox + incident!)
  ('a9999999-9999-4999-8999-999999999999',
   'MSN-261127-ABR9',
   'Emergency Aborted South Clinic Vaccine Run',
   'Aborted mid-flight due to critical battery depletion event; drone executed controlled emergency landing with full blackbox recording.',
   2.60,
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   'd4e5f601-1122-3344-5566-778899aabbcc', 'pilot_nam',
   'IMMEDIATE', NOW() - interval '135 minutes', NULL, 30,
   '[]'::jsonb, '["cold_chain","medical_priority"]'::jsonb,
   '{"approvedBy":"atc_hanoi","reason":"Emergency clinical blood delivery"}'::jsonb,
   NULL, NULL, 5800.0, 410,
   'ABORTED', 0, NOW() - interval '140 minutes', 'operator');

INSERT INTO waypoint (
  id, mission_id, sequence, name, waypoint_type, latitude, longitude, altitude,
  speed_to_waypoint, heading_at_waypoint, turn_radius, wait_for_confirmation,
  hub_id, stopover_type, ground_time_minutes, payload_delta_kg, hover_duration_sec,
  actions, conditions, created_on, created_by
)
VALUES
  -- MSN-261127-MED1 (D1 -> 2 coords -> TT)
  ('b1111111-0001-4000-8000-000000000001', 'a1111111-1111-4111-8111-111111111111', 1, 'Departure: Saigon Central Vertiport', 'HUB', 10.7769000, 106.7009000, 0.0, NULL, NULL, NULL, false, '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'NONE', 0, 0.0, 0, '{"type":"takeoff"}'::jsonb, NULL, NOW(), 'system'),
  ('b1111111-0002-4000-8000-000000000002', 'a1111111-1111-4111-8111-111111111111', 2, 'Bach Dang River Entry Gate', 'COORDINATE', 10.7755000, 106.7085000, 120.0, 15.0, 75.0, 25.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":15.0}'::jsonb, '{"speed":15.0,"turnRadius":25.0,"maxWindSpeed":12.0,"minVisibility":4000}'::jsonb, NOW(), 'system'),
  ('b1111111-0003-4000-8000-000000000003', 'a1111111-1111-4111-8111-111111111111', 3, 'Thu Thiem Inbound Transit Gate', 'COORDINATE', 10.7805000, 106.7230000, 120.0, 15.0, 70.0, 25.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":15.0}'::jsonb, '{"speed":15.0,"turnRadius":25.0,"maxWindSpeed":12.0,"minVisibility":4000}'::jsonb, NOW(), 'system'),
  ('b1111111-0004-4000-8000-000000000004', 'a1111111-1111-4111-8111-111111111111', 4, 'Arrival: Thu Thiem Waterfront Vertiport', 'HUB', 10.7850000, 106.7350000, 0.0, NULL, NULL, NULL, false, '606a30fb-465a-4016-85f7-85b00467f2f7', 'NONE', 0, 0.0, 0, '{"type":"land"}'::jsonb, NULL, NOW(), 'system'),

  -- MSN-261127-SEQ2 (2-Leg: D1 -> coord -> TT [RECHARGE 30m] -> 2 coords -> TD)
  ('b2222222-0001-4000-8000-000000000001', 'a2222222-2222-4222-8222-222222222222', 1, 'Departure: Saigon Central Vertiport', 'HUB', 10.7769000, 106.7009000, 0.0, NULL, NULL, NULL, false, '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'NONE', 0, 0.0, 0, '{"type":"takeoff"}'::jsonb, NULL, NOW(), 'system'),
  ('b2222222-0002-4000-8000-000000000002', 'a2222222-2222-4222-8222-222222222222', 2, 'Saigon River East Crossing', 'COORDINATE', 10.7800000, 106.7180000, 100.0, 15.0, 74.0, 20.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":15.0}'::jsonb, '{"speed":15.0,"turnRadius":20.0,"maxWindSpeed":12.0}'::jsonb, NOW(), 'system'),
  ('b2222222-0003-4000-8000-000000000003', 'a2222222-2222-4222-8222-222222222222', 3, 'Stopover: Thu Thiem Recharge Pad', 'HUB', 10.7850000, 106.7350000, 0.0, NULL, NULL, NULL, false, '606a30fb-465a-4016-85f7-85b00467f2f7', 'RECHARGE', 30, 0.0, 0, '{"type":"recharge","groundTimeMinutes":30}'::jsonb, NULL, NOW(), 'system'),
  ('b2222222-0004-4000-8000-000000000004', 'a2222222-2222-4222-8222-222222222222', 4, 'An Phu Corridor Entry', 'COORDINATE', 10.8050000, 106.7450000, 100.0, 15.0, 28.0, 20.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":15.0}'::jsonb, '{"speed":15.0,"turnRadius":20.0,"maxWindSpeed":12.0}'::jsonb, NOW(), 'system'),
  ('b2222222-0005-4000-8000-000000000005', 'a2222222-2222-4222-8222-222222222222', 5, 'Rach Chiec Navigation Checkpoint', 'COORDINATE', 10.8260000, 106.7600000, 100.0, 15.0, 26.0, 20.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":15.0}'::jsonb, '{"speed":15.0,"turnRadius":20.0,"maxWindSpeed":12.0}'::jsonb, NOW(), 'system'),
  ('b2222222-0006-4000-8000-000000000006', 'a2222222-2222-4222-8222-222222222222', 6, 'Arrival: Thu Duc Innovation Hub', 'HUB', 10.8490000, 106.7710000, 0.0, NULL, NULL, NULL, false, 'c854d502-2c9b-4e4a-93c2-b8759521e962', 'NONE', 0, 0.0, 0, '{"type":"land"}'::jsonb, NULL, NOW(), 'system'),

  -- MSN-261127-ENV3 (D1 -> hover+confirm coord -> TT)
  ('b3333333-0001-4000-8000-000000000001', 'a3333333-3333-4333-8333-333333333333', 1, 'Departure: Saigon Central Vertiport', 'HUB', 10.7769000, 106.7009000, 0.0, NULL, NULL, NULL, false, '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'NONE', 0, 0.0, 0, '{"type":"takeoff"}'::jsonb, NULL, NOW(), 'system'),
  ('b3333333-0002-4000-8000-000000000002', 'a3333333-3333-4333-8333-333333333333', 2, 'Saigon River Mid-Channel Water Sampling Point', 'COORDINATE', 10.7785000, 106.7160000, 60.0, 12.0, 78.0, 15.0, true, NULL, 'NONE', NULL, 0.0, 120, '{"type":"hover","durationS":120,"sensor":"lidar_bathymetry"}'::jsonb, '{"speed":12.0,"maxWindSpeed":10.0,"minVisibility":5000}'::jsonb, NOW(), 'system'),
  ('b3333333-0003-4000-8000-000000000003', 'a3333333-3333-4333-8333-333333333333', 3, 'Arrival: Thu Thiem Waterfront Vertiport', 'HUB', 10.7850000, 106.7350000, 0.0, NULL, NULL, NULL, false, '606a30fb-465a-4016-85f7-85b00467f2f7', 'NONE', 0, 0.0, 0, '{"type":"land"}'::jsonb, NULL, NOW(), 'system'),

  -- MSN-261127-RLY4 (2-Leg Relay: D1 -> coord -> TT [RELAY_HANDOFF 10m] -> coord -> D7)
  ('b4444444-0001-4000-8000-000000000001', 'a4444444-4444-4444-8444-444444444444', 1, 'Departure: Saigon Central Vertiport', 'HUB', 10.7769000, 106.7009000, 0.0, NULL, NULL, NULL, false, '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'NONE', 0, 0.0, 0, '{"type":"takeoff"}'::jsonb, NULL, NOW(), 'system'),
  ('b4444444-0002-4000-8000-000000000002', 'a4444444-4444-4444-8444-444444444444', 2, 'Saigon River Medical Gate', 'COORDINATE', 10.7805000, 106.7185000, 110.0, 16.0, 74.0, 25.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":16.0}'::jsonb, '{"speed":16.0,"maxWindSpeed":14.0}'::jsonb, NOW(), 'system'),
  ('b4444444-0003-4000-8000-000000000003', 'a4444444-4444-4444-8444-444444444444', 3, 'Relay Handoff: Thu Thiem Vertiport', 'HUB', 10.7850000, 106.7350000, 0.0, NULL, NULL, NULL, false, '606a30fb-465a-4016-85f7-85b00467f2f7', 'RELAY_HANDOFF', 10, 0.0, 0, '{"type":"relay_handoff","groundTimeMinutes":10}'::jsonb, NULL, NOW(), 'system'),
  ('b4444444-0004-4000-8000-000000000004', 'a4444444-4444-4444-8444-444444444444', 4, 'Phu My Bridge South Approach', 'COORDINATE', 10.7540000, 106.7290000, 110.0, 16.0, 195.0, 25.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":16.0}'::jsonb, '{"speed":16.0,"maxWindSpeed":14.0}'::jsonb, NOW(), 'system'),
  ('b4444444-0005-4000-8000-000000000005', 'a4444444-4444-4444-8444-444444444444', 5, 'Arrival: Phu My Hung South Hub', 'HUB', 10.7290000, 106.7210000, 0.0, NULL, NULL, NULL, false, 'a942c710-1b8a-4c22-83e1-d647a829f101', 'NONE', 0, 0.0, 0, '{"type":"land"}'::jsonb, NULL, NOW(), 'system'),

  -- MSN-261127-AVN5 (READY: TD -> 2 coords -> D1)
  ('b5555555-0001-4000-8000-000000000001', 'a5555555-5555-4555-8555-555555555555', 1, 'Departure: Thu Duc Innovation Hub', 'HUB', 10.8490000, 106.7710000, 0.0, NULL, NULL, NULL, false, 'c854d502-2c9b-4e4a-93c2-b8759521e962', 'NONE', 0, 0.0, 0, '{"type":"takeoff"}'::jsonb, NULL, NOW(), 'system'),
  ('b5555555-0002-4000-8000-000000000002', 'a5555555-5555-4555-8555-555555555555', 2, 'Binh Trieu Navigation Corridor', 'COORDINATE', 10.8180000, 106.7480000, 110.0, 15.0, 215.0, 25.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":15.0}'::jsonb, '{"speed":15.0,"maxWindSpeed":12.0}'::jsonb, NOW(), 'system'),
  ('b5555555-0003-4000-8000-000000000003', 'a5555555-5555-4555-8555-555555555555', 3, 'Thu Thiem South Bypass', 'COORDINATE', 10.7830000, 106.7260000, 110.0, 15.0, 240.0, 25.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":15.0}'::jsonb, '{"speed":15.0,"maxWindSpeed":12.0}'::jsonb, NOW(), 'system'),
  ('b5555555-0004-4000-8000-000000000004', 'a5555555-5555-4555-8555-555555555555', 4, 'Arrival: Saigon Central Vertiport', 'HUB', 10.7769000, 106.7009000, 0.0, NULL, NULL, NULL, false, '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'NONE', 0, 0.0, 0, '{"type":"land"}'::jsonb, NULL, NOW(), 'system'),

  -- MSN-261127-SCH6 (SCHEDULED: D1 -> coord -> D7)
  ('b6666666-0001-4000-8000-000000000001', 'a6666666-6666-4666-8666-666666666666', 1, 'Departure: Saigon Central Vertiport', 'HUB', 10.7769000, 106.7009000, 0.0, NULL, NULL, NULL, false, '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'NONE', 0, 0.0, 0, '{"type":"takeoff"}'::jsonb, NULL, NOW(), 'system'),
  ('b6666666-0002-4000-8000-000000000002', 'a6666666-6666-4666-8666-666666666666', 2, 'Kenh Te Canal Southern Gate', 'COORDINATE', 10.7530000, 106.7120000, 110.0, 15.0, 155.0, 25.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":15.0}'::jsonb, '{"speed":15.0,"maxWindSpeed":12.0}'::jsonb, NOW(), 'system'),
  ('b6666666-0003-4000-8000-000000000003', 'a6666666-6666-4666-8666-666666666666', 3, 'Arrival: Phu My Hung South Hub', 'HUB', 10.7290000, 106.7210000, 0.0, NULL, NULL, NULL, false, 'a942c710-1b8a-4c22-83e1-d647a829f101', 'NONE', 0, 0.0, 0, '{"type":"land"}'::jsonb, NULL, NOW(), 'system'),

  -- MSN-261127-REC7 (DRAFT: D1 -> coord -> TT)
  ('b7777777-0001-4000-8000-000000000001', 'a7777777-7777-4777-8777-777777777777', 1, 'Departure: Saigon Central Vertiport', 'HUB', 10.7769000, 106.7009000, 0.0, NULL, NULL, NULL, false, '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'NONE', 0, 0.0, 0, '{"type":"takeoff"}'::jsonb, NULL, NOW(), 'system'),
  ('b7777777-0002-4000-8000-000000000002', 'a7777777-7777-4777-8777-777777777777', 2, 'River Patrol Midpoint', 'COORDINATE', 10.7810000, 106.7180000, 90.0, 14.0, 75.0, 20.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":14.0}'::jsonb, NULL, NOW(), 'system'),
  ('b7777777-0003-4000-8000-000000000003', 'a7777777-7777-4777-8777-777777777777', 3, 'Arrival: Thu Thiem Waterfront Vertiport', 'HUB', 10.7850000, 106.7350000, 0.0, NULL, NULL, NULL, false, '606a30fb-465a-4016-85f7-85b00467f2f7', 'NONE', 0, 0.0, 0, '{"type":"land"}'::jsonb, NULL, NOW(), 'system'),

  -- MSN-261127-CMP8 (COMPLETED: D1 -> coord -> TT)
  ('b8888888-0001-4000-8000-000000000001', 'a8888888-8888-4888-8888-888888888888', 1, 'Departure: Saigon Central Vertiport', 'HUB', 10.7769000, 106.7009000, 0.0, NULL, NULL, NULL, false, '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'NONE', 0, 0.0, 0, '{"type":"takeoff"}'::jsonb, NULL, NOW() - interval '120 minutes', 'system'),
  ('b8888888-0002-4000-8000-000000000002', 'a8888888-8888-4888-8888-888888888888', 2, 'Saigon River Sampling Buoy', 'COORDINATE', 10.7805000, 106.7180000, 80.0, 14.0, 74.0, 15.0, false, NULL, 'NONE', NULL, 0.0, 60, '{"type":"hover","durationS":60}'::jsonb, '{"speed":14.0,"maxWindSpeed":10.0}'::jsonb, NOW() - interval '120 minutes', 'system'),
  ('b8888888-0003-4000-8000-000000000003', 'a8888888-8888-4888-8888-888888888888', 3, 'Arrival: Thu Thiem Waterfront Vertiport', 'HUB', 10.7850000, 106.7350000, 0.0, NULL, NULL, NULL, false, '606a30fb-465a-4016-85f7-85b00467f2f7', 'NONE', 0, 0.0, 0, '{"type":"land"}'::jsonb, NULL, NOW() - interval '120 minutes', 'system'),

  -- MSN-261127-ABR9 (ABORTED: D1 -> coord -> D7)
  ('b9999999-0001-4000-8000-000000000001', 'a9999999-9999-4999-8999-999999999999', 1, 'Departure: Saigon Central Vertiport', 'HUB', 10.7769000, 106.7009000, 0.0, NULL, NULL, NULL, false, '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'NONE', 0, 0.0, 0, '{"type":"takeoff"}'::jsonb, NULL, NOW() - interval '140 minutes', 'system'),
  ('b9999999-0002-4000-8000-000000000002', 'a9999999-9999-4999-8999-999999999999', 2, 'Kenh Te Southern Transit Waypoint', 'COORDINATE', 10.7550000, 106.7120000, 110.0, 16.0, 158.0, 30.0, false, NULL, 'NONE', NULL, 0.0, 0, '{"type":"fly_through","speed":16.0}'::jsonb, '{"speed":16.0,"maxWindSpeed":12.0}'::jsonb, NOW() - interval '140 minutes', 'system'),
  ('b9999999-0003-4000-8000-000000000003', 'a9999999-9999-4999-8999-999999999999', 3, 'Arrival: Phu My Hung South Hub', 'HUB', 10.7290000, 106.7210000, 0.0, NULL, NULL, NULL, false, 'a942c710-1b8a-4c22-83e1-d647a829f101', 'NONE', 0, 0.0, 0, '{"type":"land"}'::jsonb, NULL, NOW() - interval '140 minutes', 'system');

INSERT INTO mission_execution (
  id, mission_id, pilot_id, execution_mode, primary_drone_id,
  current_leg_index, total_legs, completed_legs, current_waypoint_index, completed_waypoints,
  waypoint_logs, trigger_type, started_at, completed_at, paused_at, abort_reason, error_message,
  status, version, created_on, created_by
)
VALUES
  ('e1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111',
   'pilot_nam', 'SAME_DRONE_SEQUENTIAL', '30d1435a-77bf-49a1-8fd5-6920a6ed064c',
   0, 1, 0, 1, 0, '[]'::jsonb, 'MANUAL',
   NOW() - interval '10 minutes', NULL, NULL, NULL, NULL,
   'IN_PROGRESS', 0, NOW() - interval '10 minutes', 'operator'),

  ('e2222222-2222-4222-8222-222222222222', 'a2222222-2222-4222-8222-222222222222',
   'pilot_nam', 'SAME_DRONE_SEQUENTIAL', '7633fbe9-411a-4767-94bb-a1d818b7f26f',
   1, 2, 1, 3, 3,
   '[{"flightId":"30000000-0000-4000-8000-00000000002a","legIndex":0,"waypointIndex":1,"reachedAt":"2026-11-27T05:50:00Z"},{"flightId":"30000000-0000-4000-8000-00000000002a","legIndex":0,"waypointIndex":2,"reachedAt":"2026-11-27T05:54:00Z"},{"flightId":"30000000-0000-4000-8000-00000000002a","legIndex":0,"waypointIndex":3,"reachedAt":"2026-11-27T06:00:00Z"}]'::jsonb,
   'MANUAL',
   NOW() - interval '75 minutes', NULL, NULL, NULL, NULL,
   'IN_PROGRESS', 0, NOW() - interval '75 minutes', 'operator'),

  ('e3333333-3333-4333-8333-333333333333', 'a3333333-3333-4333-8333-333333333333',
   'pilot_nam', 'SAME_DRONE_SEQUENTIAL', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3',
   0, 1, 0, 1, 0, '[]'::jsonb, 'MANUAL',
   NOW() - interval '12 minutes', NULL, NULL, NULL, NULL,
   'IN_PROGRESS', 0, NOW() - interval '12 minutes', 'operator'),

  ('e4444444-4444-4444-8444-444444444444', 'a4444444-4444-4444-8444-444444444444',
   'pilot_nam', 'MULTI_DRONE_RELAY', 'd4e5f601-1122-3344-5566-778899aabbcc',
   0, 2, 0, 1, 0, '[]'::jsonb, 'MANUAL',
   NOW() - interval '8 minutes', NULL, NULL, NULL, NULL,
   'IN_PROGRESS', 0, NOW() - interval '8 minutes', 'operator'),

  ('e8888888-8888-4888-8888-888888888888', 'a8888888-8888-4888-8888-888888888888',
   'pilot_nam', 'SAME_DRONE_SEQUENTIAL', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3',
   0, 1, 1, 3, 3,
   '[{"flightId":"6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa","legIndex":0,"waypointIndex":1,"reachedAt":"2026-11-27T05:15:00Z"},{"flightId":"6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa","legIndex":0,"waypointIndex":2,"reachedAt":"2026-11-27T05:22:00Z"},{"flightId":"6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa","legIndex":0,"waypointIndex":3,"reachedAt":"2026-11-27T05:30:00Z"}]'::jsonb,
   'MANUAL',
   NOW() - interval '105 minutes', NOW() - interval '90 minutes', NULL, NULL, NULL,
   'COMPLETED', 0, NOW() - interval '105 minutes', 'operator'),

  ('e9999999-9999-4999-8999-999999999999', 'a9999999-9999-4999-8999-999999999999',
   'pilot_nam', 'SAME_DRONE_SEQUENTIAL', 'd4e5f601-1122-3344-5566-778899aabbcc',
   0, 1, 0, 2, 1,
   '[{"flightId":"4dbde32d-f7d3-45c2-b99d-8a8a9695d788","legIndex":0,"waypointIndex":1,"reachedAt":"2026-11-27T04:55:00Z"}]'::jsonb,
   'MANUAL',
   NOW() - interval '130 minutes', NOW() - interval '115 minutes', NULL,
   'Critical battery depletion (14.2%) triggered emergency vertical landing', NULL,
   'ABORTED', 0, NOW() - interval '130 minutes', 'operator');

INSERT INTO mission_execution_leg (
  id, execution_id, leg_index, flight_id, drone_id, departure_hub_id, arrival_hub_id,
  stopover_type, ground_time_minutes, estimated_energy_wh, status, created_on, created_by
)
VALUES
  ('f1010000-0000-4000-8000-000000000001', 'e1111111-1111-4111-8111-111111111111', 0,
   '2babe10b-d5b1-42a0-9c7b-f65f7473b566', '30d1435a-77bf-49a1-8fd5-6920a6ed064c',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   'NONE', 0, 52.4, 'AUTHORIZED', NOW() - interval '10 minutes', 'system'),

  ('f1020000-0000-4000-8000-000000000001', 'e2222222-2222-4222-8222-222222222222', 0,
   '30000000-0000-4000-8000-00000000002a', '7633fbe9-411a-4767-94bb-a1d818b7f26f',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   'RECHARGE', 30, 54.0, 'COMPLETED', NOW() - interval '75 minutes', 'system'),

  ('f1020000-0000-4000-8000-000000000002', 'e2222222-2222-4222-8222-222222222222', 1,
   '3cacf21c-e6c2-43b1-a88c-7f7f8584c677', '7633fbe9-411a-4767-94bb-a1d818b7f26f',
   '606a30fb-465a-4016-85f7-85b00467f2f7', 'c854d502-2c9b-4e4a-93c2-b8759521e962',
   'NONE', 0, 108.5, 'AUTHORIZED', NOW() - interval '75 minutes', 'system'),

  ('f1030000-0000-4000-8000-000000000001', 'e3333333-3333-4333-8333-333333333333', 0,
   '30000000-0000-4000-8000-000000000003', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   'NONE', 0, 48.2, 'AUTHORIZED', NOW() - interval '12 minutes', 'system'),

  ('f1040000-0000-4000-8000-000000000001', 'e4444444-4444-4444-8444-444444444444', 0,
   '30000000-0000-4000-8000-000000000006', 'd4e5f601-1122-3344-5566-778899aabbcc',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   'RELAY_HANDOFF', 10, 56.0, 'AUTHORIZED', NOW() - interval '8 minutes', 'system'),

  ('f1040000-0000-4000-8000-000000000002', 'e4444444-4444-4444-8444-444444444444', 1,
   '30000000-0000-4000-8000-000000000007', '11223344-5566-4777-8888-99aabbcc0002',
   '606a30fb-465a-4016-85f7-85b00467f2f7', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   'NONE', 0, 74.0, 'PLANNED', NOW() - interval '8 minutes', 'system'),

  ('f1080000-0000-4000-8000-000000000001', 'e8888888-8888-4888-8888-888888888888', 0,
   '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   'NONE', 0, 44.8, 'COMPLETED', NOW() - interval '105 minutes', 'system'),

  ('f1090000-0000-4000-8000-000000000001', 'e9999999-9999-4999-8999-999999999999', 0,
   '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'd4e5f601-1122-3344-5566-778899aabbcc',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   'NONE', 0, 72.5, 'EMERGENCY_LANDING', NOW() - interval '130 minutes', 'system');

-- ------------------------------------------------------------------------------
-- 7. utm_flight (12 flights: 5 AUTHORIZED ready for 1-click TAKEOFF/Sim,
--                3 SCHEDULED incl. NO_GO + Relay Leg 1, 2 COMPLETED w/ replay,
--                1 EMERGENCY_LANDING w/ blackbox, 1 CANCELLED/REJECTED;
--                8 feasibility_evaluations; 4 flight_conformance records)
--    NOTE: Parent legs inserted BEFORE dependent legs (fk_flight_depends_on).
--    NOTE: Every planned_route is vertically hub-anchored ([lon,lat,0]->[lon,lat,alt]).
-- ------------------------------------------------------------------------------
\c utm_flight;

TRUNCATE TABLE flight_conformance, feasibility_evaluations, flight CASCADE;

INSERT INTO flight (
  id, flight_number, drone_id, departure_hub_id, arrival_hub_id, pilot_id,
  flight_type, operation_mode, scheduled_departure, scheduled_arrival, actual_departure, actual_arrival,
  cruising_altitude_m, min_altitude_m, max_altitude_m,
  authorization_number, authorized_by, authorized_at, risk_assessment,
  mission_type, mission_data, weather_conditions,
  mission_id, execution_id, leg_index, total_legs, depends_on_flight_id,
  payload_weight_kg, expected_initial_battery_pct, minimum_turnaround_minutes, arrival_stopover_type,
  planned_route, actual_route, waypoints,
  authorization_status, conformance_status, status, notes,
  feasibility_verdict, feasibility_override, version, created_on, created_by
)
VALUES
  -- [1] AUTHORIZED (1-click TAKEOFF / Simulation / Chaos Injection: VN-D001 @ HUB-SGN-D1 -> HUB-SGN-TT)
  ('2babe10b-d5b1-42a0-9c7b-f65f7473b566', 'FL-2026-001',
   '30d1435a-77bf-49a1-8fd5-6920a6ed064c',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7', 'pilot_nam',
   'DELIVERY', 'AUTONOMOUS',
   NOW() + interval '5 minutes', NOW() + interval '30 minutes', NULL, NULL,
   120.0, 20.0, 150.0,
   'AUTH-20261127-0001', 'atc_hanoi', NOW() - interval '8 minutes', 'LOW',
   'medical_shuttle', '{"cargo":"O-Negative Blood Pack","tempControlC":"2-6"}'::jsonb,
   '{"verdict":"GO","windSpeedMs":3.5,"windGustMs":5.1,"visibilityM":9500,"flightCategory":"VFR","nearestStation":"VVTS"}'::jsonb,
   'a1111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111', 0, 1, NULL,
   2.2, 96.0, 0, 'none',
   '{"type":"LineString","coordinates":[[106.7009,10.7769,0.0],[106.7009,10.7769,120.0],[106.7085,10.7755,120.0],[106.7230,10.7805,120.0],[106.7350,10.7850,120.0],[106.7350,10.7850,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Saigon Central Vertiport","latitude":10.7769,"longitude":106.7009,"altitude":0.0,"waypointType":"hub","hubId":"76a06ff8-4ca7-418f-8077-c6c656fba3f5","stopoverType":"none","hoverDurationSec":0,"waitForConfirmation":false,"actions":{"type":"takeoff"}},{"sequence":2,"name":"Bach Dang River Entry Gate","latitude":10.7755,"longitude":106.7085,"altitude":120.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":15.0,"turnRadius":25.0,"hoverDurationSec":0,"waitForConfirmation":false,"actions":{"type":"fly_through","speed":15.0}},{"sequence":3,"name":"Thu Thiem Inbound Transit Gate","latitude":10.7805,"longitude":106.7230,"altitude":120.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":15.0,"turnRadius":25.0,"hoverDurationSec":0,"waitForConfirmation":false,"actions":{"type":"fly_through","speed":15.0}},{"sequence":4,"name":"Arrival: Thu Thiem Waterfront Vertiport","latitude":10.7850,"longitude":106.7350,"altitude":0.0,"waypointType":"hub","hubId":"606a30fb-465a-4016-85f7-85b00467f2f7","stopoverType":"none","hoverDurationSec":0,"waitForConfirmation":false,"actions":{"type":"land"}}]'::jsonb,
   'APPROVED', 'UNKNOWN', 'AUTHORIZED',
   'Cleared for immediate TAKEOFF or Simulation launch along Saigon River corridor.',
   'GO', NULL, 0, NOW() - interval '10 minutes', 'operator'),

  -- [2] COMPLETED Multi-Leg Leg 0 (Parent of FL-2026-002; landed 45m ago > 30m turnaround)
  ('30000000-0000-4000-8000-00000000002a', 'FL-2026-002A',
   '7633fbe9-411a-4767-94bb-a1d818b7f26f',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7', 'pilot_nam',
   'DELIVERY', 'AUTONOMOUS',
   NOW() - interval '70 minutes', NOW() - interval '40 minutes', NOW() - interval '68 minutes', NOW() - interval '45 minutes',
   100.0, 20.0, 150.0,
   'AUTH-20261127-002A', 'atc_hanoi', NOW() - interval '74 minutes', 'LOW',
   'express_parcel', '{"leg":"0 of 2","stopover":"Thu Thiem Recharge"}'::jsonb,
   '{"verdict":"GO","windSpeedMs":3.0,"windGustMs":4.5,"visibilityM":10000,"flightCategory":"VFR","nearestStation":"VVTS"}'::jsonb,
   'a2222222-2222-4222-8222-222222222222', 'e2222222-2222-4222-8222-222222222222', 0, 2, NULL,
   2.4, 98.0, 0, 'recharge',
   '{"type":"LineString","coordinates":[[106.7009,10.7769,0.0],[106.7009,10.7769,100.0],[106.7180,10.7800,100.0],[106.7350,10.7850,100.0],[106.7350,10.7850,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[[106.7009,10.7769,0.0],[106.7009,10.7769,100.0],[106.7095,10.7784,100.0],[106.7180,10.7800,100.0],[106.7265,10.7825,100.0],[106.7350,10.7850,100.0],[106.7350,10.7850,0.0]]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Saigon Central Vertiport","latitude":10.7769,"longitude":106.7009,"altitude":0.0,"waypointType":"hub","hubId":"76a06ff8-4ca7-418f-8077-c6c656fba3f5","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"Saigon River East Crossing","latitude":10.7800,"longitude":106.7180,"altitude":100.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":15.0,"actions":{"type":"fly_through","speed":15.0}},{"sequence":3,"name":"Stopover: Thu Thiem Recharge Pad","latitude":10.7850,"longitude":106.7350,"altitude":0.0,"waypointType":"hub","hubId":"606a30fb-465a-4016-85f7-85b00467f2f7","stopoverType":"recharge","actions":{"type":"recharge"}}]'::jsonb,
   'APPROVED', 'CONFORMANT', 'COMPLETED',
   'Leg 0 completed cleanly; 30-minute recharge turnaround at Thu Thiem finished.',
   'GO', NULL, 0, NOW() - interval '75 minutes', 'operator'),

  -- [3] AUTHORIZED Multi-Leg Leg 1 (1-click ready! depends on completed FL-2026-002A; VN-D002 @ HUB-SGN-TT 100%)
  ('3cacf21c-e6c2-43b1-a88c-7f7f8584c677', 'FL-2026-002',
   '7633fbe9-411a-4767-94bb-a1d818b7f26f',
   '606a30fb-465a-4016-85f7-85b00467f2f7', 'c854d502-2c9b-4e4a-93c2-b8759521e962', 'pilot_nam',
   'DELIVERY', 'AUTONOMOUS',
   NOW() + interval '5 minutes', NOW() + interval '40 minutes', NULL, NULL,
   100.0, 20.0, 150.0,
   'AUTH-20261127-0002', 'atc_hanoi', NOW() - interval '12 minutes', 'LOW',
   'express_parcel', '{"leg":"1 of 2","turnaroundCompleted":true}'::jsonb,
   '{"verdict":"GO","windSpeedMs":2.8,"windGustMs":4.2,"visibilityM":9500,"flightCategory":"VFR","nearestStation":"VVTS"}'::jsonb,
   'a2222222-2222-4222-8222-222222222222', 'e2222222-2222-4222-8222-222222222222', 1, 2, '30000000-0000-4000-8000-00000000002a',
   2.4, 100.0, 30, 'none',
   '{"type":"LineString","coordinates":[[106.7350,10.7850,0.0],[106.7350,10.7850,100.0],[106.7450,10.8050,100.0],[106.7600,10.8260,100.0],[106.7710,10.8490,100.0],[106.7710,10.8490,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Thu Thiem Recharge Pad","latitude":10.7850,"longitude":106.7350,"altitude":0.0,"waypointType":"hub","hubId":"606a30fb-465a-4016-85f7-85b00467f2f7","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"An Phu Corridor Entry","latitude":10.8050,"longitude":106.7450,"altitude":100.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":15.0,"actions":{"type":"fly_through","speed":15.0}},{"sequence":3,"name":"Rach Chiec Navigation Checkpoint","latitude":10.8260,"longitude":106.7600,"altitude":100.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":15.0,"actions":{"type":"fly_through","speed":15.0}},{"sequence":4,"name":"Arrival: Thu Duc Innovation Hub","latitude":10.8490,"longitude":106.7710,"altitude":0.0,"waypointType":"hub","hubId":"c854d502-2c9b-4e4a-93c2-b8759521e962","stopoverType":"none","actions":{"type":"land"}}]'::jsonb,
   'APPROVED', 'UNKNOWN', 'AUTHORIZED',
   'Multi-leg Leg 1/2 cleared for immediate takeoff from Thu Thiem to Thu Duc.',
   'GO', NULL, 0, NOW() - interval '75 minutes', 'operator'),

  -- [4] AUTHORIZED Hover + Operator Confirmation Survey Flight (VN-UAV-001 @ HUB-SGN-D1 -> HUB-SGN-TT)
  ('30000000-0000-4000-8000-000000000003', 'FL-2026-003',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7', 'pilot_nam',
   'INSPECTION', 'HYBRID',
   NOW() + interval '10 minutes', NOW() + interval '40 minutes', NULL, NULL,
   60.0, 20.0, 120.0,
   'AUTH-20261127-0003', 'atc_hanoi', NOW() - interval '10 minutes', 'LOW',
   'environmental_survey', '{"sensor":"LiDAR + Water Sampler","hoverConfirm":true}'::jsonb,
   '{"verdict":"GO","windSpeedMs":2.5,"windGustMs":3.8,"visibilityM":10000,"flightCategory":"VFR","nearestStation":"VVTS"}'::jsonb,
   'a3333333-3333-4333-8333-333333333333', 'e3333333-3333-4333-8333-333333333333', 0, 1, NULL,
   1.2, 94.0, 0, 'none',
   '{"type":"LineString","coordinates":[[106.7009,10.7769,0.0],[106.7009,10.7769,60.0],[106.7160,10.7785,60.0],[106.7350,10.7850,60.0],[106.7350,10.7850,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Saigon Central Vertiport","latitude":10.7769,"longitude":106.7009,"altitude":0.0,"waypointType":"hub","hubId":"76a06ff8-4ca7-418f-8077-c6c656fba3f5","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"Saigon River Mid-Channel Water Sampling Point","latitude":10.7785,"longitude":106.7160,"altitude":60.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":12.0,"hoverDurationSec":120,"waitForConfirmation":true,"actions":{"type":"hover","durationS":120}},{"sequence":3,"name":"Arrival: Thu Thiem Waterfront Vertiport","latitude":10.7850,"longitude":106.7350,"altitude":0.0,"waypointType":"hub","hubId":"606a30fb-465a-4016-85f7-85b00467f2f7","stopoverType":"none","actions":{"type":"land"}}]'::jsonb,
   'APPROVED', 'UNKNOWN', 'AUTHORIZED',
   'Authorized environmental inspection with mid-river hover and pilot waypoint confirmation.',
   'GO', NULL, 0, NOW() - interval '12 minutes', 'operator'),

  -- [5] AUTHORIZED Standalone VTOL Transit (VN-UAV-6376 @ HUB-SGN-TD -> HUB-SGN-D1; test 2-drone concurrent flights!)
  ('30000000-0000-4000-8000-000000000004', 'FL-2026-004',
   'ece5662e-b5c6-477f-b710-918e2e11a1c5',
   'c854d502-2c9b-4e4a-93c2-b8759521e962', '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'pilot_nam',
   'DELIVERY', 'AUTONOMOUS',
   NOW() + interval '5 minutes', NOW() + interval '45 minutes', NULL, NULL,
   110.0, 20.0, 150.0,
   'AUTH-20261127-0004', 'atc_hanoi', NOW() - interval '6 minutes', 'LOW',
   'vtol_express', '{"cargo":"Semiconductor Sample Kit"}'::jsonb,
   '{"verdict":"GO","windSpeedMs":3.2,"windGustMs":4.8,"visibilityM":9000,"flightCategory":"VFR","nearestStation":"VVTS"}'::jsonb,
   NULL, NULL, NULL, NULL, NULL,
   2.5, 91.0, 0, 'none',
   '{"type":"LineString","coordinates":[[106.7710,10.8490,0.0],[106.7710,10.8490,110.0],[106.7480,10.8180,110.0],[106.7260,10.7830,110.0],[106.7009,10.7769,110.0],[106.7009,10.7769,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Thu Duc Innovation Hub","latitude":10.8490,"longitude":106.7710,"altitude":0.0,"waypointType":"hub","hubId":"c854d502-2c9b-4e4a-93c2-b8759521e962","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"Binh Trieu Navigation Corridor","latitude":10.8180,"longitude":106.7480,"altitude":110.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":16.0,"actions":{"type":"fly_through","speed":16.0}},{"sequence":3,"name":"Thu Thiem South Bypass","latitude":10.7830,"longitude":106.7260,"altitude":110.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":16.0,"actions":{"type":"fly_through","speed":16.0}},{"sequence":4,"name":"Arrival: Saigon Central Vertiport","latitude":10.7769,"longitude":106.7009,"altitude":0.0,"waypointType":"hub","hubId":"76a06ff8-4ca7-418f-8077-c6c656fba3f5","stopoverType":"none","actions":{"type":"land"}}]'::jsonb,
   'APPROVED', 'UNKNOWN', 'AUTHORIZED',
   'Standalone VTOL flight ready for concurrent simulation alongside FL-2026-001 or FL-2026-002.',
   'GO', NULL, 0, NOW() - interval '9 minutes', 'operator'),

  -- [6] AUTHORIZED Multi-Drone Relay Leg 0 (Parent of FL-2026-007; VN-MED-001 @ HUB-SGN-D1 -> HUB-SGN-TT)
  ('30000000-0000-4000-8000-000000000006', 'FL-2026-006',
   'd4e5f601-1122-3344-5566-778899aabbcc',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7', 'pilot_nam',
   'DELIVERY', 'AUTONOMOUS',
   NOW() + interval '8 minutes', NOW() + interval '30 minutes', NULL, NULL,
   110.0, 20.0, 150.0,
   'AUTH-20261127-0006', 'atc_hanoi', NOW() - interval '5 minutes', 'MEDIUM',
   'medical_relay', '{"leg":"0 of 2","relayPartner":"VN-MED-002"}'::jsonb,
   '{"verdict":"GO_WITH_CONDITIONS","windSpeedMs":6.1,"windGustMs":8.4,"visibilityM":8000,"flightCategory":"VFR","nearestStation":"VVTS"}'::jsonb,
   'a4444444-4444-4444-8444-444444444444', 'e4444444-4444-4444-8444-444444444444', 0, 2, NULL,
   3.1, 98.0, 0, 'relay_handoff',
   '{"type":"LineString","coordinates":[[106.7009,10.7769,0.0],[106.7009,10.7769,110.0],[106.7185,10.7805,110.0],[106.7350,10.7850,110.0],[106.7350,10.7850,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Saigon Central Vertiport","latitude":10.7769,"longitude":106.7009,"altitude":0.0,"waypointType":"hub","hubId":"76a06ff8-4ca7-418f-8077-c6c656fba3f5","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"Saigon River Medical Gate","latitude":10.7805,"longitude":106.7185,"altitude":110.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":16.0,"actions":{"type":"fly_through","speed":16.0}},{"sequence":3,"name":"Relay Handoff: Thu Thiem Vertiport","latitude":10.7850,"longitude":106.7350,"altitude":0.0,"waypointType":"hub","hubId":"606a30fb-465a-4016-85f7-85b00467f2f7","stopoverType":"relay_handoff","actions":{"type":"relay_handoff"}}]'::jsonb,
   'APPROVED', 'UNKNOWN', 'AUTHORIZED',
   'Relay Leg 0 cleared with ATC override for elevated river crosswind.',
   'MARGINAL', 'Override by atc_hanoi: Priority pediatric vaccine relay authorized under medical corridor rules',
   0, NOW() - interval '8 minutes', 'operator'),

  -- [7] SCHEDULED (PENDING ATC) Multi-Drone Relay Leg 1 (depends on FL-2026-006; VN-MED-002 @ HUB-SGN-TT -> HUB-SGN-D7)
  ('30000000-0000-4000-8000-000000000007', 'FL-2026-007',
   '11223344-5566-4777-8888-99aabbcc0002',
   '606a30fb-465a-4016-85f7-85b00467f2f7', 'a942c710-1b8a-4c22-83e1-d647a829f101', 'pilot_nam',
   'DELIVERY', 'AUTONOMOUS',
   NOW() + interval '40 minutes', NOW() + interval '70 minutes', NULL, NULL,
   110.0, 20.0, 140.0,
   NULL, NULL, NULL, 'LOW',
   'medical_relay', '{"leg":"1 of 2","handoffFrom":"FL-2026-006"}'::jsonb, NULL,
   'a4444444-4444-4444-8444-444444444444', 'e4444444-4444-4444-8444-444444444444', 1, 2, '30000000-0000-4000-8000-000000000006',
   3.1, 95.0, 10, 'none',
   '{"type":"LineString","coordinates":[[106.7350,10.7850,0.0],[106.7350,10.7850,110.0],[106.7290,10.7540,110.0],[106.7210,10.7290,110.0],[106.7210,10.7290,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[]}'::jsonb,
   '[{"sequence":1,"name":"Relay Departure: Thu Thiem Vertiport","latitude":10.7850,"longitude":106.7350,"altitude":0.0,"waypointType":"hub","hubId":"606a30fb-465a-4016-85f7-85b00467f2f7","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"Phu My Bridge South Approach","latitude":10.7540,"longitude":106.7290,"altitude":110.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":16.0,"actions":{"type":"fly_through","speed":16.0}},{"sequence":3,"name":"Arrival: Phu My Hung South Hub","latitude":10.7290,"longitude":106.7210,"altitude":0.0,"waypointType":"hub","hubId":"a942c710-1b8a-4c22-83e1-d647a829f101","stopoverType":"none","actions":{"type":"land"}}]'::jsonb,
   'PENDING', 'UNKNOWN', 'SCHEDULED',
   'Awaiting ATC authorization and completion of Relay Leg 0 (FL-2026-006).',
   'GO', NULL, 0, NOW() - interval '8 minutes', 'operator'),

  -- [8] SCHEDULED (PENDING ATC, GO) Standalone Surveillance Flight -> test ATC Authorize / Reject!
  ('5ecef43e-08e4-46d3-ca0e-9b9ba7a6e899', 'FL-2026-008',
   '11223344-5566-4777-8888-99aabbcc0004',
   'c854d502-2c9b-4e4a-93c2-b8759521e962', '606a30fb-465a-4016-85f7-85b00467f2f7', 'pilot_nam',
   'SURVEILLANCE', 'REMOTE_PILOT',
   NOW() + interval '2 hours', NOW() + interval '2 hours 40 minutes', NULL, NULL,
   90.0, 30.0, 140.0,
   NULL, NULL, NULL, 'LOW',
   'infrastructure_patrol', '{"target":"Metro Line 1 Viaduct Thermal Check"}'::jsonb, NULL,
   NULL, NULL, NULL, NULL, NULL,
   1.4, 89.0, 0, 'none',
   '{"type":"LineString","coordinates":[[106.7710,10.8490,0.0],[106.7710,10.8490,90.0],[106.7580,10.8220,90.0],[106.7440,10.8020,90.0],[106.7350,10.7850,90.0],[106.7350,10.7850,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Thu Duc Innovation Hub","latitude":10.8490,"longitude":106.7710,"altitude":0.0,"waypointType":"hub","hubId":"c854d502-2c9b-4e4a-93c2-b8759521e962","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"Rach Chiec Viaduct Sector","latitude":10.8220,"longitude":106.7580,"altitude":90.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":14.0,"actions":{"type":"fly_through","speed":14.0}},{"sequence":3,"name":"An Phu Station Thermal Gate","latitude":10.8020,"longitude":106.7440,"altitude":90.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":14.0,"actions":{"type":"fly_through","speed":14.0}},{"sequence":4,"name":"Arrival: Thu Thiem Waterfront Vertiport","latitude":10.7850,"longitude":106.7350,"altitude":0.0,"waypointType":"hub","hubId":"606a30fb-465a-4016-85f7-85b00467f2f7","stopoverType":"none","actions":{"type":"land"}}]'::jsonb,
   'PENDING', 'UNKNOWN', 'SCHEDULED',
   'Scheduled afternoon thermal inspection awaiting ATC clearance.',
   'GO', NULL, 0, NOW() - interval '20 minutes', 'operator'),

  -- [9] SCHEDULED (PENDING ATC, NO_GO!) -> test Feasibility Check, Solutions & ATC Override!
  ('30000000-0000-4000-8000-000000000009', 'FL-2026-009',
   '11223344-5566-4777-8888-99aabbcc0005',
   'a942c710-1b8a-4c22-83e1-d647a829f101', 'c854d502-2c9b-4e4a-93c2-b8759521e962', 'pilot_nam',
   'DELIVERY', 'AUTONOMOUS',
   NOW() + interval '3 hours', NOW() + interval '4 hours', NULL, NULL,
   130.0, 25.0, 150.0,
   NULL, NULL, NULL, 'HIGH',
   'heavy_cargo', '{"cargo":"Industrial Valve Assembly","requiresRechargeOrPayloadCut":true}'::jsonb, NULL,
   NULL, NULL, NULL, NULL, NULL,
   8.2, 38.0, 0, 'none',
   '{"type":"LineString","coordinates":[[106.7210,10.7290,0.0],[106.7210,10.7290,130.0],[106.7420,10.7800,130.0],[106.7580,10.8180,130.0],[106.7710,10.8490,130.0],[106.7710,10.8490,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Phu My Hung South Hub","latitude":10.7290,"longitude":106.7210,"altitude":0.0,"waypointType":"hub","hubId":"a942c710-1b8a-4c22-83e1-d647a829f101","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"Thu Thiem East Overpass","latitude":10.7800,"longitude":106.7420,"altitude":130.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":14.0,"actions":{"type":"fly_through","speed":14.0}},{"sequence":3,"name":"Rach Chiec Heavy Corridor","latitude":10.8180,"longitude":106.7580,"altitude":130.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":14.0,"actions":{"type":"fly_through","speed":14.0}},{"sequence":4,"name":"Arrival: Thu Duc Innovation Hub","latitude":10.8490,"longitude":106.7710,"altitude":0.0,"waypointType":"hub","hubId":"c854d502-2c9b-4e4a-93c2-b8759521e962","stopoverType":"none","actions":{"type":"land"}}]'::jsonb,
   'PENDING', 'UNKNOWN', 'SCHEDULED',
   'Heavy 8.2kg haul on 38% battery -> deterministic NO_GO test case for Feasibility Engine & ATC Override.',
   'NO_GO', NULL, 0, NOW() - interval '15 minutes', 'operator'),

  -- [10] COMPLETED Flight w/ 15-frame telemetry replay trail (FlightReplayDossier showcase!)
  ('6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 'FL-2026-010',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7', 'pilot_nam',
   'INSPECTION', 'AUTONOMOUS',
   NOW() - interval '110 minutes', NOW() - interval '85 minutes', NOW() - interval '105 minutes', NOW() - interval '90 minutes',
   80.0, 20.0, 120.0,
   'AUTH-20261127-0010', 'atc_hanoi', NOW() - interval '115 minutes', 'LOW',
   'environmental_survey', '{"samplesCollected":4,"lidarCoveragePct":100}'::jsonb,
   '{"verdict":"GO","windSpeedMs":2.2,"windGustMs":3.5,"visibilityM":10000,"flightCategory":"VFR","nearestStation":"VVTS"}'::jsonb,
   'a8888888-8888-4888-8888-888888888888', 'e8888888-8888-4888-8888-888888888888', 0, 1, NULL,
   1.2, 99.0, 0, 'none',
   '{"type":"LineString","coordinates":[[106.7009,10.7769,0.0],[106.7009,10.7769,80.0],[106.7180,10.7805,80.0],[106.7350,10.7850,80.0],[106.7350,10.7850,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[[106.7009,10.7769,0.0],[106.7009,10.7769,40.0],[106.7009,10.7769,80.0],[106.7065,10.7781,80.0],[106.7122,10.7793,80.0],[106.7180,10.7805,80.0],[106.7235,10.7820,80.0],[106.7292,10.7835,80.0],[106.7350,10.7850,80.0],[106.7350,10.7850,35.0],[106.7350,10.7850,0.0]]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Saigon Central Vertiport","latitude":10.7769,"longitude":106.7009,"altitude":0.0,"waypointType":"hub","hubId":"76a06ff8-4ca7-418f-8077-c6c656fba3f5","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"Saigon River Sampling Buoy","latitude":10.7805,"longitude":106.7180,"altitude":80.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":14.0,"hoverDurationSec":60,"actions":{"type":"hover","durationS":60}},{"sequence":3,"name":"Arrival: Thu Thiem Waterfront Vertiport","latitude":10.7850,"longitude":106.7350,"altitude":0.0,"waypointType":"hub","hubId":"606a30fb-465a-4016-85f7-85b00467f2f7","stopoverType":"none","actions":{"type":"land"}}]'::jsonb,
   'APPROVED', 'CONFORMANT', 'COMPLETED',
   'Successfully completed river survey with 15-frame FlightReplayDossier telemetry.',
   'GO', NULL, 0, NOW() - interval '120 minutes', 'operator'),

  -- [11] EMERGENCY_LANDING Historical Flight (w/ 12-frame telemetry + blackbox + emergency incident + conflict!)
  ('4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'FL-2026-011',
   'd4e5f601-1122-3344-5566-778899aabbcc',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'a942c710-1b8a-4c22-83e1-d647a829f101', 'pilot_nam',
   'DELIVERY', 'AUTONOMOUS',
   NOW() - interval '135 minutes', NOW() - interval '105 minutes', NOW() - interval '130 minutes', NOW() - interval '115 minutes',
   110.0, 20.0, 140.0,
   'AUTH-20261127-0011', 'atc_hanoi', NOW() - interval '138 minutes', 'HIGH',
   'medical_emergency', '{"cargo":"Emergency Pediatric Vaccine","outcome":"Safe Emergency Touchdown"}'::jsonb,
   '{"verdict":"GO_WITH_CONDITIONS","windSpeedMs":6.4,"windGustMs":9.2,"visibilityM":7500,"flightCategory":"VFR","nearestStation":"VVTS"}'::jsonb,
   'a9999999-9999-4999-8999-999999999999', 'e9999999-9999-4999-8999-999999999999', 0, 1, NULL,
   2.6, 85.0, 0, 'none',
   '{"type":"LineString","coordinates":[[106.7009,10.7769,0.0],[106.7009,10.7769,110.0],[106.7120,10.7550,110.0],[106.7210,10.7290,110.0],[106.7210,10.7290,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[[106.7009,10.7769,0.0],[106.7009,10.7769,110.0],[106.7060,10.7660,110.0],[106.7135,10.7540,126.0],[106.7136,10.7538,85.0],[106.7137,10.7535,35.0],[106.7137,10.7535,0.0]]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Saigon Central Vertiport","latitude":10.7769,"longitude":106.7009,"altitude":0.0,"waypointType":"hub","hubId":"76a06ff8-4ca7-418f-8077-c6c656fba3f5","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"Kenh Te Southern Transit Waypoint","latitude":10.7550,"longitude":106.7120,"altitude":110.0,"waypointType":"coordinate","stopoverType":"none","speedToWaypoint":16.0,"actions":{"type":"fly_through","speed":16.0}},{"sequence":3,"name":"Arrival: Phu My Hung South Hub","latitude":10.7290,"longitude":106.7210,"altitude":0.0,"waypointType":"hub","hubId":"a942c710-1b8a-4c22-83e1-d647a829f101","stopoverType":"none","actions":{"type":"land"}}]'::jsonb,
   'APPROVED', 'NON_CONFORMING', 'EMERGENCY_LANDING',
   'Historical emergency landing dossier: rapid battery depletion + lateral deviation resolved safely at alt 0m.',
   'MARGINAL', 'Override by atc_hanoi: Authorized emergency medical supply mission under priority dispatch rules',
   0, NOW() - interval '140 minutes', 'operator'),

  -- [12] CANCELLED / REJECTED Flight (for status & authorization filter testing)
  ('30000000-0000-4000-8000-000000000012', 'FL-2026-012',
   'e5f6a702-2233-4455-6677-8899aabbccdd',
   'a942c710-1b8a-4c22-83e1-d647a829f101', 'b153d821-2c9b-4d33-94f2-e758b930a202', 'pilot_nam',
   'REPOSITIONING', 'AUTONOMOUS',
   NOW() - interval '4 hours', NOW() - interval '3 hours', NULL, NULL,
   140.0, 30.0, 150.0,
   NULL, NULL, NULL, 'HIGH',
   'fleet_repositioning', '{"rejectionReason":"Altitude 140m violates ASZ-TSNA 50m ceiling & airframe overdue maintenance"}'::jsonb, NULL,
   NULL, NULL, NULL, NULL, NULL,
   0.0, 62.0, 0, 'none',
   '{"type":"LineString","coordinates":[[106.7210,10.7290,0.0],[106.7210,10.7290,140.0],[106.6850,10.7750,140.0],[106.6588,10.8185,140.0],[106.6588,10.8185,0.0]]}'::jsonb,
   '{"type":"LineString","coordinates":[]}'::jsonb,
   '[{"sequence":1,"name":"Departure: Phu My Hung South Hub","latitude":10.7290,"longitude":106.7210,"altitude":0.0,"waypointType":"hub","hubId":"a942c710-1b8a-4c22-83e1-d647a829f101","stopoverType":"none","actions":{"type":"takeoff"}},{"sequence":2,"name":"Arrival: Tan Son Nhat Gateway","latitude":10.8185,"longitude":106.6588,"altitude":0.0,"waypointType":"hub","hubId":"b153d821-2c9b-4d33-94f2-e758b930a202","stopoverType":"none","actions":{"type":"land"}}]'::jsonb,
   'REJECTED', 'UNKNOWN', 'CANCELLED',
   'Rejected by ATC: planned 140m altitude breached ASZ-TSNA 50m ceiling and VN-CARGO-009 entered maintenance.',
   'NO_GO', NULL, 0, NOW() - interval '5 hours', 'operator');

INSERT INTO feasibility_evaluations (
  id, flight_id, drone_id, verdict, margin_pct, usable_wh, required_wh,
  cruise_wh, hover_wh, climb_wh, payload_factor, wind_factor, wind_speed_ms,
  confidence, solutions_json, explanation, explanation_source, created_on, created_by
)
VALUES
  ('fe111111-1111-4111-8111-111111111111', '2babe10b-d5b1-42a0-9c7b-f65f7473b566', '30d1435a-77bf-49a1-8fd5-6920a6ed064c',
   'GO', 88.2, 442.5, 52.4, 34.2, 11.4, 6.8, 1.41, 1.12, 3.5, 'HIGH', '[]'::jsonb,
   'Usable battery: 442.5 Wh (20% reserve), Required: 52.4 Wh (cruise: 34.2 Wh, hover: 11.4 Wh, climb: 6.8 Wh). Net margin: 88.2%. Verdict: GO.',
   'deterministic', NOW() - interval '10 minutes', 'system'),

  ('fe222222-2222-4222-8222-222222222222', '3cacf21c-e6c2-43b1-a88c-7f7f8584c677', '7633fbe9-411a-4767-94bb-a1d818b7f26f',
   'GO', 76.3, 458.6, 108.5, 78.0, 16.3, 14.2, 1.44, 1.09, 2.8, 'HIGH', '[]'::jsonb,
   'Usable battery: 458.6 Wh (post-recharge 100% SoC, 20% reserve), Required: 108.5 Wh. Net margin: 76.3%. Verdict: GO.',
   'deterministic', NOW() - interval '14 minutes', 'system'),

  ('fe333333-3333-4333-8333-333333333333', '30000000-0000-4000-8000-000000000003', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3',
   'GO', 84.4, 309.0, 48.2, 26.8, 15.1, 6.3, 1.33, 1.07, 2.5, 'HIGH', '[]'::jsonb,
   'Usable battery: 309.0 Wh (20% reserve), Required: 48.2 Wh including 120s sampling hover. Net margin: 84.4%. Verdict: GO.',
   'deterministic', NOW() - interval '12 minutes', 'system'),

  ('fe444444-4444-4444-8444-444444444444', '30000000-0000-4000-8000-000000000004', 'ece5662e-b5c6-477f-b710-918e2e11a1c5',
   'GO', 80.1, 446.8, 88.9, 64.5, 12.8, 11.6, 1.36, 1.10, 3.2, 'HIGH', '[]'::jsonb,
   'Usable battery: 446.8 Wh (20% reserve), Required: 88.9 Wh across 11.1 km VTOL corridor. Net margin: 80.1%. Verdict: GO.',
   'deterministic', NOW() - interval '9 minutes', 'system'),

  ('fe666666-6666-4666-8666-666666666666', '30000000-0000-4000-8000-000000000006', 'd4e5f601-1122-3344-5566-778899aabbcc',
   'MARGINAL', 11.4, 570.4, 505.4, 340.0, 99.5, 65.9, 1.31, 1.16, 6.1, 'HIGH',
   '[{"kind":"await_wind","label":"Await Lower River Crosswind","detail":"Wait for crosswind gusts below 6.0 m/s to increase reserve margin above 15%"},{"kind":"reduce_payload","label":"Reduce Medical Payload","detail":"Reducing container weight by 0.6 kg increases reserve margin to 16.2%"}]'::jsonb,
   'Elevated crosswind (6.1 m/s) reduces safety margin to 11.4% (threshold 15.0%). Verdict: MARGINAL.',
   'deterministic', NOW() - interval '7 minutes', 'system'),

  ('fe999999-9999-4999-8999-999999999999', '30000000-0000-4000-8000-000000000009', '11223344-5566-4777-8888-99aabbcc0005',
   'NO_GO', -164.8, 145.4, 385.0, 298.0, 36.8, 50.2, 1.48, 1.18, 5.0, 'HIGH',
   '[{"kind":"charging_stop","label":"Recharge Before Takeoff or Add Stopover","detail":"VN-CARGO-012 is at 38% SoC (145.4 Wh usable); recharge to >=95% or insert Thu Thiem recharge stopover"},{"kind":"reduce_payload","label":"Reduce Payload Weight","detail":"Reduce 8.2 kg load below 5.0 kg to lower energy requirement by 18%"},{"kind":"other_drone","label":"Reassign Higher-Capacity Drone","detail":"Assign VN-CARGO-011 (820 Wh, 92% SoC) for direct completion with >50% margin"}]'::jsonb,
   'Usable battery: 145.4 Wh (38% SoC, 20% reserve) is insufficient for required 385.0 Wh on 14.5 km heavy cargo route. Net margin: -164.8%. Verdict: NO_GO.',
   'deterministic', NOW() - interval '15 minutes', 'system'),

  ('fe110000-0000-4000-8000-000000000011', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'd4e5f601-1122-3344-5566-778899aabbcc',
   'MARGINAL', 8.5, 494.7, 452.6, 318.0, 75.6, 59.0, 1.26, 1.17, 6.4, 'HIGH',
   '[{"kind":"charging_stop","label":"Plan Intermediate Charging Stop","detail":"Plan contingency recharge waypoint at Thu Thiem Vertiport"}]'::jsonb,
   'Pre-flight margin 8.5% below 15.0% threshold; cleared via ATC priority override.',
   'deterministic', NOW() - interval '139 minutes', 'system'),

  -- Standalone pre-flight evaluation (flight_id = NULL)
  ('fe000000-0000-4000-8000-000000000099', NULL, 'f6a7b803-3344-4566-7788-99aabbccddee',
   'GO', 74.5, 597.5, 152.4, 112.0, 20.5, 19.9, 1.32, 1.11, 4.0, 'MEDIUM', '[]'::jsonb,
   'Standalone pre-flight feasibility check for Saigon Central -> Phu My Hung 3.8 kg cargo run. Verdict: GO.',
   'deterministic', NOW() - interval '25 minutes', 'operator');

INSERT INTO flight_conformance (
  id, flight_id, status, cross_track_error_m, vertical_error_m,
  corridor_radius_m, altitude_buffer_m, current_latitude, current_longitude,
  current_altitude, current_speed, current_heading, last_telemetry_time,
  last_evaluated_at, violations_json, created_on, created_by
)
VALUES
  ('fc111111-1111-4111-8111-111111111111', '2babe10b-d5b1-42a0-9c7b-f65f7473b566',
   'UNKNOWN', 0.0, 0.0, 15.0, 10.0, 10.7769000, 106.7009000, 0.0, 0.0, 75.0,
   NULL, NOW() - interval '5 minutes', '[]'::jsonb, NOW() - interval '5 minutes', 'system'),

  ('fc222222-2222-4222-8222-222222222222', '30000000-0000-4000-8000-00000000002a',
   'CONFORMANT', 2.4, 0.6, 15.0, 10.0, 10.7850000, 106.7350000, 0.0, 0.0, 74.0,
   NOW() - interval '45 minutes', NOW() - interval '45 minutes', '[]'::jsonb, NOW() - interval '45 minutes', 'system'),

  ('fc333333-3333-4333-8333-333333333333', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa',
   'CONFORMANT', 1.9, 0.5, 15.0, 10.0, 10.7850000, 106.7350000, 0.0, 0.0, 74.0,
   NOW() - interval '90 minutes', NOW() - interval '90 minutes', '[]'::jsonb, NOW() - interval '90 minutes', 'system'),

  ('fc444444-4444-4444-8444-444444444444', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788',
   'NON_CONFORMING', 22.5, 16.0, 15.0, 10.0, 10.7535000, 106.7137000, 0.0, 0.0, 185.0,
   NOW() - interval '115 minutes', NOW() - interval '115 minutes',
   '["Cross-track deviation 22.5m exceeds corridor radius 15.0m","Vertical deviation 16.0m exceeds altitude buffer 10.0m","Critical battery depletion: 14.2%! Immediate failsafe landing or RTH required"]'::jsonb,
   NOW() - interval '115 minutes', 'system');

-- ------------------------------------------------------------------------------
-- 8. utm_telemetry (37 rich multi-frame telemetry records for FlightReplayDossier:
--                   15 frames for FL-2026-010, 10 frames for FL-2026-002A,
--                   12 frames for emergency flight FL-2026-011)
-- ------------------------------------------------------------------------------
\c utm_telemetry;

TRUNCATE TABLE telemetry_record CASCADE;

INSERT INTO telemetry_record (
  id, drone_id, flight_id, latitude, longitude, altitude, altitude_agl, speed, vertical_speed, heading,
  pitch, roll, yaw, battery_percentage, battery_voltage, battery_temperature, battery_discharge_rate,
  signal_strength, gps_hdop, gps_satellites, flight_mode, system_status, source,
  motor_rpm, warnings, errors, recorded_at, created_on, created_by
)
VALUES
  -- === FL-2026-010 (COMPLETED Survey: 15 frames Takeoff -> Climb -> Cruise -> Hover -> Descent -> Landed) ===
  ('d1000000-0001-4000-8000-000000000001', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.77690, 106.70090,  0.0,  0.0,  0.0,  0.0, 74.0,  0.0,  0.0, 74.0, 99.0, 25.1, 29.5,  15.0, 99.0, 0.6, 19, 'TAKEOFF',    'OK', 'simulation', '[2200,2210,2195,2205]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '105 minutes', NOW() - interval '105 minutes', 'system'),
  ('d1000000-0002-4000-8000-000000000002', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.77690, 106.70090, 40.0, 40.0,  0.5,  4.0, 74.0,  0.4,  0.1, 74.0, 98.2, 25.0, 30.2, 315.0, 98.0, 0.6, 19, 'TAKEOFF',    'OK', 'simulation', '[4850,4860,4845,4855]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '104 minutes', NOW() - interval '104 minutes', 'system'),
  ('d1000000-0003-4000-8000-000000000003', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.77690, 106.70090, 80.0, 80.0,  4.0,  2.0, 74.0,  1.8,  0.2, 74.0, 97.4, 24.9, 31.0, 290.0, 98.0, 0.7, 18, 'AUTONOMOUS', 'OK', 'simulation', '[4520,4535,4515,4525]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '103 minutes', NOW() - interval '103 minutes', 'system'),
  ('d1000000-0004-4000-8000-000000000004', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.77750, 106.70420, 80.0, 80.0, 14.0,  0.0, 74.0,  2.4, -0.2, 74.0, 96.5, 24.8, 31.6, 245.0, 97.0, 0.7, 18, 'AUTONOMOUS', 'OK', 'simulation', '[4310,4320,4305,4315]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '102 minutes', NOW() - interval '102 minutes', 'system'),
  ('d1000000-0005-4000-8000-000000000005', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.77820, 106.70800, 80.0, 80.0, 14.2,  0.0, 74.0,  2.2,  0.0, 74.0, 95.6, 24.7, 32.1, 242.0, 96.0, 0.7, 18, 'AUTONOMOUS', 'OK', 'simulation', '[4300,4315,4295,4305]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '101 minutes', NOW() - interval '101 minutes', 'system'),
  ('d1000000-0006-4000-8000-000000000006', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.77930, 106.71280, 80.0, 80.0, 14.0,  0.0, 74.0,  2.1,  0.1, 74.0, 94.7, 24.6, 32.5, 244.0, 95.0, 0.8, 17, 'AUTONOMOUS', 'OK', 'simulation', '[4290,4305,4285,4300]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '100 minutes', NOW() - interval '100 minutes', 'system'),
  ('d1000000-0007-4000-8000-000000000007', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.78050, 106.71800, 80.0, 80.0,  0.0,  0.0, 74.0,  0.1,  0.0, 74.0, 93.8, 24.5, 33.0, 285.0, 95.0, 0.7, 18, 'LOITER',     'OK', 'simulation', '[4480,4490,4475,4485]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '99 minutes',  NOW() - interval '99 minutes',  'system'),
  ('d1000000-0008-4000-8000-000000000008', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.78050, 106.71800, 80.0, 80.0,  0.0,  0.0, 90.0,  0.2, -0.1, 90.0, 92.6, 24.4, 33.4, 288.0, 94.0, 0.7, 18, 'LOITER',     'OK', 'simulation', '[4490,4495,4480,4485]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '98 minutes',  NOW() - interval '98 minutes',  'system'),
  ('d1000000-0009-4000-8000-000000000009', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.78140, 106.72150, 80.0, 80.0, 13.8,  0.0, 74.0,  2.3,  0.2, 74.0, 91.8, 24.3, 33.6, 244.0, 95.0, 0.7, 18, 'AUTONOMOUS', 'OK', 'simulation', '[4310,4320,4300,4315]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '96 minutes',  NOW() - interval '96 minutes',  'system'),
  ('d1000000-0010-4000-8000-000000000010', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.78240, 106.72550, 80.0, 80.0, 14.0,  0.0, 74.0,  2.1, -0.1, 74.0, 91.0, 24.2, 33.8, 242.0, 96.0, 0.7, 18, 'AUTONOMOUS', 'OK', 'simulation', '[4300,4310,4295,4305]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '95 minutes',  NOW() - interval '95 minutes',  'system'),
  ('d1000000-0011-4000-8000-000000000011', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.78360, 106.72980, 80.0, 80.0, 14.0,  0.0, 74.0,  2.0,  0.1, 74.0, 90.2, 24.1, 34.0, 243.0, 97.0, 0.6, 19, 'AUTONOMOUS', 'OK', 'simulation', '[4295,4305,4290,4300]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '94 minutes',  NOW() - interval '94 minutes',  'system'),
  ('d1000000-0012-4000-8000-000000000012', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.78500, 106.73500, 80.0, 80.0,  3.5, -1.5, 74.0, -0.5,  0.0, 74.0, 89.5, 24.0, 34.1, 260.0, 98.0, 0.6, 19, 'LANDING',    'OK', 'simulation', '[4120,4130,4115,4125]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '93 minutes',  NOW() - interval '93 minutes',  'system'),
  ('d1000000-0013-4000-8000-000000000013', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.78500, 106.73500, 45.0, 45.0,  0.2, -3.0, 74.0, -0.2,  0.0, 74.0, 89.0, 24.0, 34.0, 230.0, 99.0, 0.6, 19, 'LANDING',    'OK', 'simulation', '[3920,3930,3910,3925]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '92 minutes',  NOW() - interval '92 minutes',  'system'),
  ('d1000000-0014-4000-8000-000000000014', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.78500, 106.73500, 12.0, 12.0,  0.0, -2.0, 74.0,  0.0,  0.0, 74.0, 88.6, 23.9, 33.8, 210.0, 99.0, 0.6, 19, 'LANDING',    'OK', 'simulation', '[3650,3660,3645,3655]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '91 minutes',  NOW() - interval '91 minutes',  'system'),
  ('d1000000-0015-4000-8000-000000000015', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 10.78500, 106.73500,  0.0,  0.0,  0.0,  0.0, 74.0,  0.0,  0.0, 74.0, 88.4, 23.9, 33.2,  12.0, 99.0, 0.6, 19, 'LANDED',     'OK', 'simulation', '[0,0,0,0]'::jsonb,             '[]'::jsonb, '[]'::jsonb, NOW() - interval '90 minutes',  NOW() - interval '90 minutes',  'system'),

  -- === FL-2026-002A (COMPLETED Multi-Leg Leg 0: 10 frames D1 -> TT) ===
  ('d2000000-0001-4000-8000-000000000001', '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 10.77690, 106.70090,   0.0,   0.0,  0.0,  0.0, 74.0,  0.0,  0.0, 74.0, 98.0, 50.2, 29.0,  18.0, 99.0, 0.6, 19, 'TAKEOFF',    'OK', 'DJI_SDK', '[2400,2405,2395,2410]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '68 minutes', NOW() - interval '68 minutes', 'system'),
  ('d2000000-0002-4000-8000-000000000002', '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 10.77690, 106.70090,  55.0,  55.0,  0.4,  4.5, 74.0,  0.5,  0.0, 74.0, 96.8, 49.9, 30.1, 360.0, 98.0, 0.6, 19, 'TAKEOFF',    'OK', 'DJI_SDK', '[5100,5110,5095,5105]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '66 minutes', NOW() - interval '66 minutes', 'system'),
  ('d2000000-0003-4000-8000-000000000003', '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 10.77690, 106.70090, 100.0, 100.0,  8.0,  1.5, 74.0,  1.9,  0.1, 74.0, 95.5, 49.6, 31.2, 310.0, 97.0, 0.7, 18, 'AUTONOMOUS', 'OK', 'DJI_SDK', '[4650,4660,4645,4655]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '64 minutes', NOW() - interval '64 minutes', 'system'),
  ('d2000000-0004-4000-8000-000000000004', '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 10.77820, 106.70950, 100.0, 100.0, 15.0,  0.0, 74.0,  2.5, -0.1, 74.0, 93.8, 49.2, 32.0, 280.0, 96.0, 0.7, 18, 'AUTONOMOUS', 'OK', 'DJI_SDK', '[4480,4490,4475,4485]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '61 minutes', NOW() - interval '61 minutes', 'system'),
  ('d2000000-0005-4000-8000-000000000005', '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 10.78000, 106.71800, 100.0, 100.0, 15.2,  0.0, 74.0,  2.4,  0.0, 74.0, 92.0, 48.8, 32.8, 282.0, 95.0, 0.7, 18, 'AUTONOMOUS', 'OK', 'DJI_SDK', '[4490,4500,4485,4495]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '58 minutes', NOW() - interval '58 minutes', 'system'),
  ('d2000000-0006-4000-8000-000000000006', '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 10.78240, 106.72620, 110.0, 110.0, 15.0,  1.0, 74.0,  2.2,  0.1, 74.0, 90.4, 48.5, 33.4, 295.0, 96.0, 0.7, 18, 'ALTITUDE_CHANGE', 'OK', 'DJI_SDK', '[4580,4590,4575,4585]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '55 minutes', NOW() - interval '55 minutes', 'system'),
  ('d2000000-0007-4000-8000-000000000007', '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 10.78400, 106.73150, 100.0, 100.0, 14.5, -0.5, 74.0,  1.8, -0.1, 74.0, 89.2, 48.2, 33.6, 275.0, 97.0, 0.6, 19, 'AUTONOMOUS', 'OK', 'DJI_SDK', '[4440,4450,4435,4445]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '52 minutes', NOW() - interval '52 minutes', 'system'),
  ('d2000000-0008-4000-8000-000000000008', '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 10.78500, 106.73500,  70.0,  70.0,  1.5, -3.0, 74.0, -0.3,  0.0, 74.0, 88.4, 48.0, 33.5, 240.0, 98.0, 0.6, 19, 'LANDING',    'OK', 'DJI_SDK', '[4050,4060,4045,4055]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '49 minutes', NOW() - interval '49 minutes', 'system'),
  ('d2000000-0009-4000-8000-000000000009', '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 10.78500, 106.73500,  22.0,  22.0,  0.0, -2.5, 74.0,  0.0,  0.0, 74.0, 87.8, 47.9, 33.2, 220.0, 99.0, 0.6, 19, 'LANDING',    'OK', 'DJI_SDK', '[3780,3790,3775,3785]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '47 minutes', NOW() - interval '47 minutes', 'system'),
  ('d2000000-0010-4000-8000-000000000010', '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 10.78500, 106.73500,   0.0,   0.0,  0.0,  0.0, 74.0,  0.0,  0.0, 74.0, 87.5, 47.9, 32.8,  15.0, 99.0, 0.6, 19, 'LANDED',     'OK', 'DJI_SDK', '[0,0,0,0]'::jsonb,             '[]'::jsonb, '[]'::jsonb, NOW() - interval '45 minutes', NOW() - interval '45 minutes', 'system'),

  -- === FL-2026-011 (EMERGENCY_LANDING Dossier: 12 frames showing rapid battery depletion + lateral breach + safe emergency landing) ===
  ('d3000000-0001-4000-8000-000000000001', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.77690, 106.70090,   0.0,   0.0,  0.0,  0.0, 158.0,  0.0,  0.0, 158.0, 85.0, 49.5, 31.0,  22.0, 97.0, 0.7, 17, 'TAKEOFF',    'OK',       'MAVLINK', '[2600,2610,2595,2605]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '130 minutes', NOW() - interval '130 minutes', 'system'),
  ('d3000000-0002-4000-8000-000000000002', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.77690, 106.70090,  60.0,  60.0,  1.0,  4.2, 158.0,  0.6,  0.2, 158.0, 82.0, 49.1, 32.5, 440.0, 96.0, 0.7, 17, 'TAKEOFF',    'OK',       'MAVLINK', '[5250,5260,5240,5255]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '128 minutes', NOW() - interval '128 minutes', 'system'),
  ('d3000000-0003-4000-8000-000000000003', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.77690, 106.70090, 110.0, 110.0, 12.0,  0.8, 158.0,  2.1,  0.4, 158.0, 77.5, 48.4, 34.2, 390.0, 95.0, 0.8, 16, 'AUTONOMOUS', 'OK',       'MAVLINK', '[4850,4865,4845,4855]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '126 minutes', NOW() - interval '126 minutes', 'system'),
  ('d3000000-0004-4000-8000-000000000004', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.76950, 106.70450, 110.0, 110.0, 16.0,  0.0, 158.0,  2.4,  0.5, 158.0, 68.0, 47.0, 36.8, 520.0, 94.0, 0.8, 16, 'AUTONOMOUS', 'OK',       'MAVLINK', '[4920,4935,4910,4925]'::jsonb, '[]'::jsonb, '[]'::jsonb, NOW() - interval '124 minutes', NOW() - interval '124 minutes', 'system'),
  ('d3000000-0005-4000-8000-000000000005', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.76300, 106.70780, 112.0, 112.0, 16.2,  0.4, 162.0,  2.6,  1.1, 162.0, 52.0, 45.2, 39.5, 680.0, 93.0, 0.9, 15, 'AUTONOMOUS', 'WARNING',  'MAVLINK', '[5010,5040,4990,5020]'::jsonb, '["RAPID_BATTERY_DISCHARGE"]'::jsonb, '[]'::jsonb, NOW() - interval '122 minutes', NOW() - interval '122 minutes', 'system'),
  ('d3000000-0006-4000-8000-000000000006', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.75750, 106.71150, 120.0, 120.0, 16.5,  1.2, 174.0,  2.8,  1.8, 174.0, 34.5, 43.4, 42.0, 740.0, 92.0, 0.9, 15, 'AUTONOMOUS', 'WARNING',  'MAVLINK', '[5120,5160,5095,5130]'::jsonb, '["RAPID_BATTERY_DISCHARGE","CROSSWIND_DRIFT"]'::jsonb, '[]'::jsonb, NOW() - interval '120 minutes', NOW() - interval '120 minutes', 'system'),
  ('d3000000-0007-4000-8000-000000000007', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.75400, 106.71350, 126.0, 126.0, 16.2,  0.5, 185.0,  1.6,  1.4, 185.0, 19.8, 41.8, 44.2, 790.0, 92.0, 0.9, 15, 'AUTONOMOUS', 'WARNING',  'MAVLINK', '[5180,5210,5150,5170]'::jsonb, '["BATTERY_LOW","LATERAL_CORRIDOR_BREACH"]'::jsonb, '[]'::jsonb, NOW() - interval '119 minutes', NOW() - interval '119 minutes', 'system'),
  ('d3000000-0008-4000-8000-000000000008', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.75400, 106.71350, 126.0, 126.0, 10.5, -1.8, 185.0, -0.8,  0.6, 185.0, 14.2, 40.9, 45.1, 610.0, 92.0, 0.9, 15, 'LANDING',    'CRITICAL', 'MAVLINK', '[4600,4620,4590,4610]'::jsonb, '["BATTERY_CRITICAL"]'::jsonb, '["EMERGENCY_LAND_ACTIVE"]'::jsonb, NOW() - interval '118 minutes', NOW() - interval '118 minutes', 'system'),
  ('d3000000-0009-4000-8000-000000000009', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.75380, 106.71360,  85.0,  85.0,  4.5, -3.5, 185.0, -0.4,  0.2, 185.0, 13.6, 40.7, 44.8, 430.0, 91.0, 0.9, 15, 'LANDING',    'CRITICAL', 'MAVLINK', '[4280,4295,4270,4285]'::jsonb, '["BATTERY_CRITICAL"]'::jsonb, '["EMERGENCY_LAND_ACTIVE"]'::jsonb, NOW() - interval '117 minutes', NOW() - interval '117 minutes', 'system'),
  ('d3000000-0010-4000-8000-000000000010', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.75360, 106.71370,  42.0,  42.0,  1.2, -3.5, 185.0, -0.2,  0.1, 185.0, 13.1, 40.5, 44.3, 390.0, 92.0, 0.8, 16, 'LANDING',    'CRITICAL', 'MAVLINK', '[4020,4035,4015,4025]'::jsonb, '["BATTERY_CRITICAL"]'::jsonb, '["EMERGENCY_LAND_ACTIVE"]'::jsonb, NOW() - interval '116 minutes', NOW() - interval '116 minutes', 'system'),
  ('d3000000-0011-4000-8000-000000000011', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.75350, 106.71370,  10.0,  10.0,  0.2, -2.0, 185.0,  0.0,  0.0, 185.0, 12.8, 40.4, 43.9, 340.0, 93.0, 0.8, 16, 'LANDING',    'CRITICAL', 'MAVLINK', '[3650,3660,3645,3655]'::jsonb, '["BATTERY_CRITICAL"]'::jsonb, '["EMERGENCY_LAND_ACTIVE"]'::jsonb, NOW() - interval '115 minutes 30 seconds', NOW() - interval '115 minutes 30 seconds', 'system'),
  ('d3000000-0012-4000-8000-000000000012', 'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 10.75350, 106.71370,   0.0,   0.0,  0.0,  0.0, 185.0,  0.0,  0.0, 185.0, 12.6, 40.4, 43.1,  18.0, 93.0, 0.8, 16, 'LANDED',     'WARNING',  'MAVLINK', '[0,0,0,0]'::jsonb,             '["BATTERY_CRITICAL"]'::jsonb, '[]'::jsonb, NOW() - interval '115 minutes', NOW() - interval '115 minutes', 'system');

-- ------------------------------------------------------------------------------
-- 9. utm_conflict (5 conflicts across 5 types & 4 statuses + 9 conflict_snapshots)
-- ------------------------------------------------------------------------------
\c utm_conflict;

TRUNCATE TABLE conflict_snapshot, conflict CASCADE;

INSERT INTO conflict (
  id, conflict_type, severity, status, primary_flight_id, secondary_flight_id,
  hub_id, airspace_zone_id, detected_at, detection_method, location_lat, location_lon, altitude,
  separation_distance, min_separation_distance, max_severity, vertical_separation,
  time_to_conflict_sec, description, data, resolution_strategy, resolution_actions,
  resolved_at, resolved_by, version, created_on, created_by
)
VALUES
  -- [1] ACKNOWLEDGED active conflict on SCHEDULED/NO_GO FL-2026-009 (keeps all AUTHORIZED flights 100% clean on takeoff!)
  ('cf100000-0000-4000-8000-000000000001',
   'GEOFENCE_VIOLATION', 'HIGH', 'ACKNOWLEDGED',
   '30000000-0000-4000-8000-000000000009', NULL,
   'a942c710-1b8a-4c22-83e1-d647a829f101', 'e9574fe9-beb1-48d3-94ff-ae7ce4be0566',
   NOW() - interval '12 minutes', 'airspace_geofence_check',
   10.7950, 106.7460, 130.0, 85.0, 150.0, 'HIGH', NULL, 28,
   'Pre-departure trajectory review: heavy-cargo wind-drift buffer for FL-2026-009 approaches Landmark 81 Hazard Geofence (ASZ-LM81) eastern perimeter by 85m.',
   '{"alertType":"GEOFENCE_VIOLATION","droneId":"11223344-5566-4777-8888-99aabbcc0005","flightNumber":"FL-2026-009","zoneCode":"ASZ-LM81"}'::jsonb,
   'REROUTE', '{"latitude":10.7950,"longitude":106.7520,"altitude":130.0,"offsetMeters":250.0}'::jsonb,
   NULL, NULL, 0, NOW() - interval '12 minutes', 'system'),

  -- [2] RESOLVED 2-flight separation conflict (FL-2026-010 vs FL-2026-002A with 3 snapshots)
  ('cf200000-0000-4000-8000-000000000002',
   'SEPARATION_MINIMUM', 'HIGH', 'RESOLVED',
   '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', '30000000-0000-4000-8000-00000000002a',
   '606a30fb-465a-4016-85f7-85b00467f2f7', 'c7352fe9-beb1-48d3-94ff-ae7ce4be0564',
   NOW() - interval '97 minutes', 'automated_telemetry',
   10.7812, 106.7210, 90.0, 92.0, 150.0, 'CRITICAL', 20.0, 34,
   'Tactical separation conflict between FL-2026-010 and FL-2026-002A over Saigon River fairway; resolved by climbing FL-2026-002A to 110m.',
   '{"alertType":"CONFLICT_PROXIMITY","flightNumber":"FL-2026-010","secondaryFlightNumber":"FL-2026-002A"}'::jsonb,
   'ALTITUDE_CHANGE', '{"targetAltitude":110.0,"deltaM":10.0}'::jsonb,
   NOW() - interval '94 minutes', 'atc_hanoi', 0, NOW() - interval '97 minutes', 'system'),

  -- [3] RESOLVED airspace breach proximity (FL-2026-011 vs ASZ-LM81)
  ('cf300000-0000-4000-8000-000000000003',
   'AIRSPACE_BREACH', 'MEDIUM', 'RESOLVED',
   '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', NULL,
   '606a30fb-465a-4016-85f7-85b00467f2f7', 'e9574fe9-beb1-48d3-94ff-ae7ce4be0566',
   NOW() - interval '121 minutes', 'airspace_geofence_check',
   10.7575, 106.7115, 120.0, 210.0, 300.0, 'MEDIUM', NULL, 65,
   'Proximity notice: FL-2026-011 deviated 22.5m east of corridor under crosswind gust; corrective GOTO issued.',
   '{"alertType":"LATERAL_CORRIDOR_BREACH","droneId":"d4e5f601-1122-3344-5566-778899aabbcc","flightNumber":"FL-2026-011"}'::jsonb,
   'REROUTE', '{"latitude":10.7550,"longitude":106.7120,"altitude":110.0,"offsetMeters":120.0}'::jsonb,
   NOW() - interval '118 minutes', 'atc_hanoi', 0, NOW() - interval '121 minutes', 'system'),

  -- [4] RESOLVED equipment/conformance conflict (FL-2026-011 critical battery)
  ('cf400000-0000-4000-8000-000000000004',
   'EQUIPMENT_FAILURE', 'CRITICAL', 'RESOLVED',
   '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', NULL,
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', NULL,
   NOW() - interval '118 minutes', 'automated_conformance',
   10.7540, 106.7135, 126.0, 0.0, 0.0, 'CRITICAL', 16.0, 0,
   'Conformance watchdog flagged critical battery depletion (14.2%) on FL-2026-011; resolved after safe emergency landing.',
   '{"alertType":"BATTERY_CRITICAL","droneId":"d4e5f601-1122-3344-5566-778899aabbcc","flightNumber":"FL-2026-011"}'::jsonb,
   'RETURN_TO_BASE', '{"reason":"CRITICAL_BATTERY_LANDING"}'::jsonb,
   NOW() - interval '115 minutes', 'system', 0, NOW() - interval '118 minutes', 'system'),

  -- [5] DISMISSED weather conflict on historical COMPLETED FL-2026-010 (for filter & dismissed status coverage)
  ('cf500000-0000-4000-8000-000000000005',
   'WEATHER', 'LOW', 'DISMISSED',
   '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', NULL,
   'b153d821-2c9b-4d33-94f2-e758b930a202', 'd8463fe9-beb1-48d3-94ff-ae7ce4be0565',
   NOW() - interval '100 minutes', 'automated_conformance',
   10.7805, 106.7180, 80.0, NULL, NULL, 'LOW', NULL, NULL,
   'Transient convective gust advisory from VVTS METAR dissipated during historical FL-2026-010 survey window.',
   '{"alertType":"WEATHER_HAZARD","flightNumber":"FL-2026-010","gustMs":9.4}'::jsonb,
   'AUTO_CLEARED', '{"reason":"METAR wind gust subsided below 6.5 m/s"}'::jsonb,
   NOW() - interval '96 minutes', 'atc_hanoi', 0, NOW() - interval '100 minutes', 'system');

INSERT INTO conflict_snapshot (
  id, conflict_id, recorded_at, primary_lat, primary_lon, primary_alt,
  secondary_lat, secondary_lon, secondary_alt, separation_distance,
  vertical_separation, time_to_conflict_sec, severity, created_on, created_by
)
VALUES
  -- Snapshots for cf100000 (Geofence proximity on SCHEDULED FL-2026-009)
  ('c5100000-0001-4000-8000-000000000001', 'cf100000-0000-4000-8000-000000000001', NOW() - interval '12 minutes', 10.7948, 106.7462, 130.0, NULL, NULL, NULL, 95.0, NULL, 32, 'MEDIUM', NOW() - interval '12 minutes', 'system'),
  ('c5100000-0002-4000-8000-000000000002', 'cf100000-0000-4000-8000-000000000001', NOW() - interval '11 minutes', 10.7950, 106.7460, 130.0, NULL, NULL, NULL, 85.0, NULL, 28, 'HIGH',   NOW() - interval '11 minutes', 'system'),

  -- Snapshots for cf200000 (2-flight separation convergence -> recovery)
  ('c5200000-0001-4000-8000-000000000001', 'cf200000-0000-4000-8000-000000000002', NOW() - interval '97 minutes', 10.7805, 106.7180,  80.0, 10.7808, 106.7192, 100.0, 136.0, 20.0, 42, 'HIGH',     NOW() - interval '97 minutes', 'system'),
  ('c5200000-0002-4000-8000-000000000002', 'cf200000-0000-4000-8000-000000000002', NOW() - interval '96 minutes', 10.7810, 106.7198,  80.0, 10.7812, 106.7206, 100.0,  92.0, 20.0, 20, 'CRITICAL', NOW() - interval '96 minutes', 'system'),
  ('c5200000-0003-4000-8000-000000000003', 'cf200000-0000-4000-8000-000000000002', NOW() - interval '94 minutes', 10.7824, 106.7255,  80.0, 10.7824, 106.7262, 110.0, 185.0, 30.0, 90, 'LOW',      NOW() - interval '94 minutes', 'system'),

  -- Snapshots for cf300000 (Airspace/corridor lateral breach)
  ('c5300000-0001-4000-8000-000000000001', 'cf300000-0000-4000-8000-000000000003', NOW() - interval '121 minutes', 10.7575, 106.7115, 120.0, NULL, NULL, NULL, 240.0, NULL, 75, 'MEDIUM', NOW() - interval '121 minutes', 'system'),
  ('c5300000-0002-4000-8000-000000000002', 'cf300000-0000-4000-8000-000000000003', NOW() - interval '119 minutes', 10.7540, 106.7135, 126.0, NULL, NULL, NULL, 210.0, NULL, 65, 'MEDIUM', NOW() - interval '119 minutes', 'system'),

  -- Snapshots for cf400000 (Critical battery emergency)
  ('c5400000-0001-4000-8000-000000000001', 'cf400000-0000-4000-8000-000000000004', NOW() - interval '118 minutes', 10.7540, 106.7135, 126.0, NULL, NULL, NULL, 0.0, 16.0, 0, 'CRITICAL', NOW() - interval '118 minutes', 'system'),
  ('c5400000-0002-4000-8000-000000000002', 'cf400000-0000-4000-8000-000000000004', NOW() - interval '115 minutes', 10.7535, 106.7137,   0.0, NULL, NULL, NULL, 0.0,  0.0, 0, 'LOW',      NOW() - interval '115 minutes', 'system');

-- ------------------------------------------------------------------------------
-- 10. utm_alert (7 alerts across all 4 severities & all 4 statuses;
--                2 open alerts so TopAlertBanner displays a clean 1/2 pager)
-- ------------------------------------------------------------------------------
\c utm_alert;

TRUNCATE TABLE alert CASCADE;

INSERT INTO alert (
  id, alert_type, severity, status, drone_id, flight_id, hub_id,
  conflict_id, incident_id, message, details_json,
  acknowledged_at, acknowledged_by, resolved_at, resolved_by, resolution_notes,
  created_on, created_by
)
VALUES
  -- [1] ACTIVE HIGH -> visible on TopAlertBanner (1/2), linked to SCHEDULED/NO_GO FL-2026-009 (never pollutes AUTHORIZED takeoff!)
  ('a1100000-0000-4000-8000-000000000001',
   'GEOFENCE_VIOLATION', 'HIGH', 'ACTIVE',
   '11223344-5566-4777-8888-99aabbcc0005', '30000000-0000-4000-8000-000000000009', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   'cf100000-0000-4000-8000-000000000001', NULL,
   'Pre-flight geofence buffer advisory: FL-2026-009 wind-drift envelope sits 85m east of Landmark 81 hazard zone ASZ-LM81.',
   '{"conflictType":"geofence_violation","zoneCode":"ASZ-LM81","separationDistance":85.0,"thresholdValue":150.0}'::jsonb,
   NULL, NULL, NULL, NULL, NULL, NOW() - interval '10 minutes', 'system'),

  -- [2] ACKNOWLEDGED MEDIUM -> visible on TopAlertBanner (2/2), linked to PENDING_CONFIRMATION incident on CANCELLED FL-2026-012
  ('a1200000-0000-4000-8000-000000000002',
   'EMERGENCY_INCIDENT', 'MEDIUM', 'ACKNOWLEDGED',
   'e5f6a702-2233-4455-6677-8899aabbccdd', '30000000-0000-4000-8000-000000000012', 'b153d821-2c9b-4d33-94f2-e758b930a202',
   NULL, '22222222-2222-4222-8222-222222222222',
   'Incident INC-20261127-GEOF awaiting operator confirmation: HOVER advised near Tan Son Nhat approach buffer (ASZ-TSNA).',
   '{"emergencyType":"geofence_warning","responseAction":"HOVER","protocolId":"10000000-0000-4000-8000-000000000008"}'::jsonb,
   NOW() - interval '4 minutes', 'atc_hanoi', NULL, NULL, NULL, NOW() - interval '6 minutes', 'system'),

  -- [3] RESOLVED CRITICAL (linked to historical emergency incident INC-20261127-BATT & conflict cf400000)
  ('a1300000-0000-4000-8000-000000000003',
   'BATTERY_CRITICAL', 'CRITICAL', 'RESOLVED',
   'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'cf400000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111111',
   'Critical battery depletion (14.2%) detected on FL-2026-011; autonomous emergency landing completed.',
   '{"emergencyType":"battery_critical","batteryPercentage":14.2,"responseAction":"LAND","protocolId":"10000000-0000-4000-8000-000000000009"}'::jsonb,
   NOW() - interval '118 minutes', 'atc_hanoi', NOW() - interval '115 minutes', 'atc_hanoi',
   'Aircraft touched down safely at 10.7535, 106.7137; recovery team retrieved cold-chain cargo.',
   NOW() - interval '118 minutes', 'system'),

  -- [4] RESOLVED HIGH (linked to 2-flight separation conflict cf200000)
  ('a1400000-0000-4000-8000-000000000004',
   'CONFLICT_PROXIMITY', 'HIGH', 'RESOLVED',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', '606a30fb-465a-4016-85f7-85b00467f2f7',
   'cf200000-0000-4000-8000-000000000002', NULL,
   'Projected loss of separation between FL-2026-010 and FL-2026-002A (CPA: 92m in 20s).',
   '{"breachValue":92.0,"thresholdValue":150.0,"secondaryFlight":"FL-2026-002A"}'::jsonb,
   NOW() - interval '96 minutes', 'atc_hanoi', NOW() - interval '94 minutes', 'atc_hanoi',
   'Issued +10m altitude climb to FL-2026-002A; separation restored to 185m.',
   NOW() - interval '97 minutes', 'system'),

  -- [5] RESOLVED HIGH (lateral corridor breach on FL-2026-011)
  ('a1500000-0000-4000-8000-000000000005',
   'LATERAL_CORRIDOR_BREACH', 'HIGH', 'RESOLVED',
   'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', '76a06ff8-4ca7-418f-8077-c6c656fba3f5',
   'cf300000-0000-4000-8000-000000000003', NULL,
   'Flight FL-2026-011 exceeded lateral containment corridor by 22.5m (limit: 15.0m).',
   '{"breachValue":22.5,"thresholdValue":15.0,"airframe":"Voly M20 Medical VTOL"}'::jsonb,
   NOW() - interval '120 minutes', 'pilot_nam', NOW() - interval '118 minutes', 'pilot_nam',
   'Corrective GOTO command applied prior to emergency descent.',
   NOW() - interval '121 minutes', 'system'),

  -- [6] RESOLVED LOW (fleet maintenance reminder)
  ('a1600000-0000-4000-8000-000000000006',
   'FLEET', 'LOW', 'RESOLVED',
   'e5f6a702-2233-4455-6677-8899aabbccdd', NULL, 'a942c710-1b8a-4c22-83e1-d647a829f101',
   NULL, NULL,
   'Drone VN-CARGO-009 placed in MAINTENANCE status after passing 60-day rotor inspection interval.',
   '{"maintenanceTicket":"MNT-2026-089","overdueDays":2}'::jsonb,
   NOW() - interval '2 days', 'operator', NOW() - interval '1 day', 'operator',
   'Grounded at Phu My Hung hangar bay 2 awaiting rotor bearing replacement.',
   NOW() - interval '2 days', 'system'),

  -- [7] DISMISSED MEDIUM (dismissed weather advisory on historical COMPLETED FL-2026-010)
  ('a1700000-0000-4000-8000-000000000007',
   'WEATHER_HAZARD', 'MEDIUM', 'DISMISSED',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 'b153d821-2c9b-4d33-94f2-e758b930a202',
   'cf500000-0000-4000-8000-000000000005', NULL,
   'Transient wind gust 9.4 m/s reported at Tan Son Nhat weather station (VVTS).',
   '{"windGustMs":9.4,"station":"VVTS","verdict":"GO_WITH_CONDITIONS"}'::jsonb,
   NOW() - interval '99 minutes', 'atc_hanoi', NOW() - interval '96 minutes', 'atc_hanoi',
   'Dismissed: updated METAR confirms wind subsided to 6.1 m/s.',
   NOW() - interval '100 minutes', 'system');

-- ------------------------------------------------------------------------------
-- 11. utm_simulation (3 historical sessions: 2 COMPLETED + 1 STOPPED, 10 events)
--     CRITICAL: ZERO RUNNING or PAUSED rows! DB-seeded RUNNING/PAUSED rows lack
--     in-memory runtimes and block new simulations via partial unique indexes.
--     All active_scenario values use valid lowercase EmergencyScenarioType codes.
-- ------------------------------------------------------------------------------
\c utm_simulation;

TRUNCATE TABLE simulation_event, simulation_session CASCADE;

INSERT INTO simulation_session (
  id, drone_id, flight_id, mission_id, status, flight_phase, speed, time_scale, tick_rate,
  current_lat, current_lon, current_alt, current_heading, current_battery,
  progress, total_distance, traveled_distance, current_segment,
  active_scenario, scenario_config, waypoints, version, created_on, created_by
)
VALUES
  -- [1] COMPLETED nominal survey session (FL-2026-010)
  ('51011111-1111-4111-8111-111111111111',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', 'a8888888-8888-4888-8888-888888888888',
   'COMPLETED', 'LANDED', 0.0, 2.0, 1.0,
   10.7850000, 106.7350000, 0.0, 74.0, 88.4,
   100.0, 3900.0, 3900.0, 4,
   NULL, NULL,
   '[{"lat":10.7769,"lon":106.7009,"alt":0.0,"speed":14.0,"hoverDurationSec":0},{"lat":10.7769,"lon":106.7009,"alt":80.0,"speed":14.0,"hoverDurationSec":0},{"lat":10.7805,"lon":106.7180,"alt":80.0,"speed":14.0,"hoverDurationSec":60},{"lat":10.7850,"lon":106.7350,"alt":80.0,"speed":14.0,"hoverDurationSec":0},{"lat":10.7850,"lon":106.7350,"alt":0.0,"speed":3.5,"hoverDurationSec":0}]'::jsonb,
   0, NOW() - interval '105 minutes', 'pilot_nam'),

  -- [2] COMPLETED multi-leg Leg 0 session with gps_failure injected & cleared (FL-2026-002A)
  ('51022222-2222-4222-8222-222222222222',
   '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a', 'a2222222-2222-4222-8222-222222222222',
   'COMPLETED', 'LANDED', 0.0, 1.0, 1.0,
   10.7850000, 106.7350000, 0.0, 74.0, 87.5,
   100.0, 3920.0, 3920.0, 4,
   NULL, NULL,
   '[{"lat":10.7769,"lon":106.7009,"alt":0.0,"speed":15.0,"hoverDurationSec":0},{"lat":10.7769,"lon":106.7009,"alt":100.0,"speed":15.0,"hoverDurationSec":0},{"lat":10.7800,"lon":106.7180,"alt":100.0,"speed":15.0,"hoverDurationSec":0},{"lat":10.7850,"lon":106.7350,"alt":100.0,"speed":15.0,"hoverDurationSec":0},{"lat":10.7850,"lon":106.7350,"alt":0.0,"speed":3.5,"hoverDurationSec":0}]'::jsonb,
   0, NOW() - interval '68 minutes', 'pilot_nam'),

  -- [3] STOPPED emergency chaos test session (FL-2026-011 battery_drain -> EMERGENCY_LANDED)
  ('51033333-3333-4333-8333-333333333333',
   'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'a9999999-9999-4999-8999-999999999999',
   'STOPPED', 'LANDED', 0.0, 1.0, 1.0,
   10.7535000, 106.7137000, 0.0, 185.0, 12.6,
   54.0, 5800.0, 3132.0, 2,
   'battery_drain', '{"dischargeRatePerSecond":0.6,"targetRemainingPercent":12.0}'::jsonb,
   '[{"lat":10.7769,"lon":106.7009,"alt":0.0,"speed":16.0,"hoverDurationSec":0},{"lat":10.7769,"lon":106.7009,"alt":110.0,"speed":16.0,"hoverDurationSec":0},{"lat":10.7550,"lon":106.7120,"alt":110.0,"speed":16.0,"hoverDurationSec":0},{"lat":10.7290,"lon":106.7210,"alt":110.0,"speed":16.0,"hoverDurationSec":0},{"lat":10.7290,"lon":106.7210,"alt":0.0,"speed":3.5,"hoverDurationSec":0}]'::jsonb,
   0, NOW() - interval '130 minutes', 'admin');

INSERT INTO simulation_event (
  id, session_id, event_type, scenario, message, severity, config_json, created_on, created_by
)
VALUES
  ('5e111111-0001-4000-8000-000000000001', '51011111-1111-4111-8111-111111111111',
   'TIME_SCALE_CHANGED', NULL, 'Simulation time scale updated to 2.0x.', 'LOW', '{"timeScale":2.0}'::jsonb,
   NOW() - interval '103 minutes', 'pilot_nam'),

  ('5e111111-0002-4000-8000-000000000002', '51011111-1111-4111-8111-111111111111',
   'COMMAND_EXECUTED', 'HOVER', 'C2 command HOVER applied: holding current 3D loiter position for 60s.', 'LOW', '{"holdTimeSeconds":60}'::jsonb,
   NOW() - interval '99 minutes', 'atc_hanoi'),

  ('5e111111-0003-4000-8000-000000000003', '51011111-1111-4111-8111-111111111111',
   'COMMAND_EXECUTED', 'RESUME', 'C2 command RESUME applied: resuming planned survey corridor.', 'LOW', '{}'::jsonb,
   NOW() - interval '96 minutes', 'atc_hanoi'),

  ('5e111111-0004-4000-8000-000000000004', '51011111-1111-4111-8111-111111111111',
   'SESSION_COMPLETED', NULL, 'Virtual flight reached Thu Thiem Waterfront Vertiport and landed cleanly at alt 0m.', 'LOW', '{"finalBatteryPct":88.4}'::jsonb,
   NOW() - interval '90 minutes', 'system'),

  ('5e222222-0001-4000-8000-000000000001', '51022222-2222-4222-8222-222222222222',
   'SCENARIO_INJECTED', 'gps_failure', 'Injected emergency scenario GPS Signal Failure (driftDistanceMeters=25.0).', 'HIGH', '{"driftDistanceMeters":25.0,"lossDurationSeconds":20}'::jsonb,
   NOW() - interval '60 minutes', 'admin'),

  ('5e222222-0002-4000-8000-000000000002', '51022222-2222-4222-8222-222222222222',
   'SCENARIO_CLEARED', 'gps_failure', 'Emergency scenario cleared. Restored nominal GNSS lock and corridor tracking.', 'LOW', NULL,
   NOW() - interval '59 minutes', 'admin'),

  ('5e222222-0003-4000-8000-000000000003', '51022222-2222-4222-8222-222222222222',
   'COMMAND_EXECUTED', 'SET_ALTITUDE', 'C2 command SET_ALTITUDE applied: adjusting target altitude to 110.0m for separation.', 'MEDIUM', '{"targetAltitudeM":110.0}'::jsonb,
   NOW() - interval '55 minutes', 'atc_hanoi'),

  ('5e222222-0004-4000-8000-000000000004', '51022222-2222-4222-8222-222222222222',
   'SESSION_COMPLETED', NULL, 'Leg 0 completed at Thu Thiem Recharge Stopover.', 'LOW', '{"finalBatteryPct":87.5}'::jsonb,
   NOW() - interval '45 minutes', 'system'),

  ('5e333333-0001-4000-8000-000000000001', '51033333-3333-4333-8333-333333333333',
   'SCENARIO_INJECTED', 'battery_drain', 'Injected emergency scenario Rapid Battery Drain (0.6%/s).', 'CRITICAL', '{"dischargeRatePerSecond":0.6,"targetRemainingPercent":12.0}'::jsonb,
   NOW() - interval '123 minutes', 'admin'),

  ('5e333333-0002-4000-8000-000000000002', '51033333-3333-4333-8333-333333333333',
   'EMERGENCY_LANDED', 'battery_drain', 'Critical battery emergency protocol LAND - touchdown completed at alt 0m.', 'HIGH', '{"finalBatteryPct":12.6,"touchdownLat":10.7535,"touchdownLon":106.7137}'::jsonb,
   NOW() - interval '115 minutes', 'system');

-- ------------------------------------------------------------------------------
-- 12. utm_emergency (exact 15 Liquibase system-default protocols + emergency_config
--                    + 5 incidents across 5 statuses + 12 blackbox_entries)
--     NOTE: PENDING_CONFIRMATION uses NOW() + 24 hours so restart won't prematurely
--     auto-execute it before the tester clicks Confirm / Reject in the UI.
-- ------------------------------------------------------------------------------
\c utm_emergency;

TRUNCATE TABLE blackbox_entries, emergency_incidents, emergency_protocols, emergency_config CASCADE;

INSERT INTO emergency_config (id, config_key, config_value, description, created_on, last_modified_on, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'operation_mode', '"supervised"',
   'Emergency response operation mode: auto or supervised', NOW(), NOW(), 'system');

-- Exact 15 Liquibase system-default protocols (05-seed-default-emergency-protocols + 07-standardize-emergency-schema)
INSERT INTO emergency_protocols (
  id, name, description, emergency_type, severity, response_action, fallback_action,
  requires_confirmation, confirmation_timeout_seconds, auto_execute_on_timeout, priority,
  is_active, is_system_default, created_on, last_modified_on, created_by
)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'System Default - Aircraft Collision Avoidance', 'Immediate hover and vertical separation upon imminent aircraft collision', 'COLLISION_AIRCRAFT', 'EMERGENCY', 'HOVER', 'DESCEND', false, 10, true, 1, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000002', 'System Default - Obstacle Collision Avoidance', 'Immediate hover and climb clearance upon obstacle proximity', 'COLLISION_OBSTACLE', 'EMERGENCY', 'HOVER', 'CLIMB', false, 10, true, 2, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000003', 'System Default - Motor Failure Failsafe', 'Immediate controlled landing or emergency stop on propulsion loss', 'MOTOR_FAILURE', 'CRITICAL', 'LAND', 'ESTOP', false, 10, true, 10, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000004', 'System Default - Motor Anomaly Advisory', 'Divert to nearest active hub upon motor vibration or thermal anomaly', 'MOTOR_ANOMALY', 'WARNING', 'DIVERT', 'RTH', true, 20, true, 15, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000005', 'System Default - GNSS Signal Lost', 'Hover in optical-flow stabilization mode and land if GNSS does not recover', 'GPS_LOST', 'CRITICAL', 'HOVER', 'LAND', false, 15, true, 20, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000006', 'System Default - GNSS Degraded', 'Return to home hub when GNSS HDOP/satellite count drops below minimum', 'GPS_DEGRADED', 'WARNING', 'RTH', 'HOVER', true, 30, true, 25, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000007', 'System Default - Geofence Breach', 'Immediate return to home or land upon confirmed geofence breach', 'GEOFENCE_BREACH', 'CRITICAL', 'RTH', 'LAND', false, 15, true, 30, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000008', 'System Default - Geofence Boundary Warning', 'Hold position near geofence buffer awaiting operator guidance', 'GEOFENCE_WARNING', 'WARNING', 'HOVER', 'RTH', true, 20, true, 35, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000009', 'System Default - Critical Battery Depletion', 'Immediate controlled landing when battery falls below 10%', 'BATTERY_CRITICAL', 'CRITICAL', 'LAND', 'ESTOP', false, 10, true, 40, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000010', 'System Default - Low Battery Warning', 'Return to home hub or divert when battery reaches 20%', 'BATTERY_LOW', 'WARNING', 'RTH', 'DIVERT', true, 30, true, 45, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000011', 'System Default - Rapid Battery Discharge', 'Divert to nearest active hub when discharge exceeds 5%/min', 'BATTERY_RAPID_DISCHARGE', 'CRITICAL', 'DIVERT', 'LAND', false, 15, true, 50, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000012', 'System Default - C2 Signal Lost', 'Autonomous RTH or land when C2 telemetry link is severed', 'SIGNAL_LOST', 'CRITICAL', 'RTH', 'LAND', false, 15, true, 55, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000013', 'System Default - Weak C2 Signal', 'Return to home hub when C2 link quality degrades', 'SIGNAL_WEAK', 'WARNING', 'RTH', 'HOVER', true, 30, true, 60, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000014', 'System Default - High Wind Advisory', 'Divert to nearest sheltered hub under severe wind gusts', 'WEATHER_WIND', 'WARNING', 'DIVERT', 'LAND', true, 30, true, 70, true, true, NOW(), NOW(), 'system'),
  ('10000000-0000-4000-8000-000000000015', 'System Default - Low Visibility Advisory', 'Return to home hub when weather visibility drops below VFR minimum', 'WEATHER_VISIBILITY', 'WARNING', 'RTH', 'LAND', true, 30, true, 75, true, true, NOW(), NOW(), 'system');

INSERT INTO emergency_incidents (
  id, incident_number, drone_id, flight_id, protocol_id, emergency_type, severity, status,
  message, detection_data, latitude, longitude, altitude, response_action,
  was_auto_executed, confirmation_required, confirmed_by, confirmed_at,
  confirmation_timeout_at, action_started_at, action_completed_at, action_success,
  action_error, resolved_at, resolved_by, resolution_notes, root_cause,
  root_cause_notes, lessons_learned, timeline, detected_at, version, created_on, created_by
)
VALUES
  -- [1] RESOLVED CRITICAL (FL-2026-011 Battery Critical w/ full root cause + 8 blackbox entries!)
  ('11111111-1111-4111-8111-111111111111', 'INC-20261127-BATT',
   'd4e5f601-1122-3344-5566-778899aabbcc', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788',
   '10000000-0000-4000-8000-000000000009', 'BATTERY_CRITICAL', 'CRITICAL', 'RESOLVED',
   'Critical battery depletion reached 14.2% remaining during rapid discharge event. Autonomous LAND executed safely.',
   '{"batteryPercentage":14.2,"dischargeRatePercentPerMin":7.4,"cellVoltageV":3.42}'::jsonb,
   10.7540000, 106.7135000, 126.0, 'LAND',
   true, false, NULL, NULL, NULL,
   NOW() - interval '118 minutes', NOW() - interval '115 minutes', true, NULL,
   NOW() - interval '112 minutes', 'atc_hanoi',
   'Safe vertical touchdown completed at open riverfront pad (10.7535, 106.7137). Cold-chain medical box recovered intact.',
   'EQUIPMENT',
   'Battery pack #2 cell #4 exhibited elevated internal resistance under 6.4 m/s headwind load.',
   'Mandate pre-flight cell delta-voltage check (< 0.05V) before dispatching high-priority VTOL missions.',
   '[{"timestamp":"2026-11-27T05:06:00Z","event":"action_executing","data":{"action":"LAND","autoExecuted":true}},{"timestamp":"2026-11-27T05:06:02Z","event":"command_dispatched","data":{"commandType":"LAND"}},{"timestamp":"2026-11-27T05:09:00Z","event":"action_completed","data":{"touchdownAlt":0.0}},{"timestamp":"2026-11-27T05:12:00Z","event":"incident_resolved","data":{"resolvedBy":"atc_hanoi"}}]'::jsonb,
   NOW() - interval '118 minutes', 0, NOW() - interval '118 minutes', 'system'),

  -- [2] PENDING_CONFIRMATION on CANCELLED FL-2026-012 / MAINTENANCE VN-CARGO-009 (ready for Confirm/Reject testing; keeps all AUTHORIZED flights 100% clean!)
  ('22222222-2222-4222-8222-222222222222', 'INC-20261127-GEOF',
   'e5f6a702-2233-4455-6677-8899aabbccdd', '30000000-0000-4000-8000-000000000012',
   '10000000-0000-4000-8000-000000000008', 'GEOFENCE_WARNING', 'WARNING', 'PENDING_CONFIRMATION',
   'Geofence boundary proximity warning: rejected repositioning plan FL-2026-012 passes within 38m of Tan Son Nhat approach zone (ASZ-TSNA).',
   '{"proximityMeters":38.0,"bufferZone":"ASZ-TSNA","batteryPercentage":62.0}'::jsonb,
   10.8060000, 106.6690000, 140.0, 'HOVER',
   false, true, NULL, NULL, NOW() + interval '24 hours',
   NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
   '[{"timestamp":"2026-11-27T06:58:00Z","event":"awaiting_confirmation","data":{"action":"HOVER","timeoutSeconds":20}}]'::jsonb,
   NOW() - interval '6 minutes', 0, NOW() - interval '6 minutes', 'system'),

  -- [3] RESOLVED WARNING (historical motor anomaly on FL-2026-010 w/ 4 blackbox entries)
  ('33333333-3333-4333-8333-333333333333', 'INC-20261127-MOTR',
   '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa',
   '10000000-0000-4000-8000-000000000004', 'MOTOR_ANOMALY', 'WARNING', 'RESOLVED',
   'Motor #2 transient vibration spike (0.78g) observed during mid-river loiter; hover stabilization restored nominal RPM.',
   '{"motorIndex":2,"vibrationG":0.78,"tempC":64.5,"batteryPercentage":93.2}'::jsonb,
   10.7805000, 106.7180000, 80.0, 'DIVERT',
   false, true, 'atc_hanoi', NOW() - interval '98 minutes', NULL,
   NOW() - interval '98 minutes', NOW() - interval '96 minutes', true, NULL,
   NOW() - interval '90 minutes', 'atc_hanoi',
   'Oscillation subsided after 60s stabilized hover; flight completed safely to Thu Thiem Vertiport.',
   'EQUIPMENT',
   'Minor propeller imbalance detected on rear-right carbon blade after water-spray sampling.',
   'Added propeller balance inspection to post-river-survey turnaround checklist.',
   '[{"timestamp":"2026-11-27T05:25:00Z","event":"awaiting_confirmation","data":{"action":"DIVERT","timeoutSeconds":20}},{"timestamp":"2026-11-27T05:26:00Z","event":"action_executing","data":{"action":"HOVER","confirmedBy":"atc_hanoi"}},{"timestamp":"2026-11-27T05:34:00Z","event":"incident_resolved","data":{"resolvedBy":"atc_hanoi"}}]'::jsonb,
   NOW() - interval '99 minutes', 0, NOW() - interval '99 minutes', 'system'),

  -- [4] RESOLVED CRITICAL (historical GNSS degraded/lost on FL-2026-002A)
  ('44444444-4444-4444-8444-444444444444', 'INC-20261127-GNSS',
   '7633fbe9-411a-4767-94bb-a1d818b7f26f', '30000000-0000-4000-8000-00000000002a',
   '10000000-0000-4000-8000-000000000006', 'GPS_DEGRADED', 'WARNING', 'RESOLVED',
   'Transient GNSS HDOP rose to 5.4 (satellites=5) near riverfront high-rises; optical-flow lock held until RTK re-acquired.',
   '{"gpsHdop":5.4,"gpsSatellites":5,"batteryPercentage":92.0}'::jsonb,
   10.7800000, 106.7180000, 100.0, 'RTH',
   false, true, 'pilot_nam', NOW() - interval '59 minutes', NULL,
   NOW() - interval '59 minutes', NOW() - interval '58 minutes', true, NULL,
   NOW() - interval '56 minutes', 'pilot_nam',
   'GNSS lock recovered to 18 satellites (HDOP 0.7) within 45 seconds; normal transit resumed.',
   'EXTERNAL',
   'Multipath urban canyon interference from riverside glass facade.',
   'Maintain >=100m altitude along Bach Dang riverfront corridor to avoid multipath pockets.',
   '[{"timestamp":"2026-11-27T06:04:00Z","event":"awaiting_confirmation","data":{"action":"RTH","timeoutSeconds":30}},{"timestamp":"2026-11-27T06:08:00Z","event":"incident_resolved","data":{"resolvedBy":"pilot_nam"}}]'::jsonb,
   NOW() - interval '60 minutes', 0, NOW() - interval '60 minutes', 'system'),

  -- [5] REJECTED WARNING on CANCELLED FL-2026-012 (false-positive dismissed by operator; tests REJECTED status!)
  ('55555555-5555-4555-8555-555555555555', 'INC-20261127-WIND',
   'e5f6a702-2233-4455-6677-8899aabbccdd', '30000000-0000-4000-8000-000000000012',
   '10000000-0000-4000-8000-000000000014', 'WEATHER_WIND', 'WARNING', 'REJECTED',
   'Automated anemometer spike (12.8 m/s) flagged on Phu My Hung Pad 2; confirmed sensor calibration test.',
   '{"windSpeedMs":12.8,"batteryPercentage":62.0}'::jsonb,
   10.7290000, 106.7210000, 12.5, 'DIVERT',
   false, true, 'atc_hanoi', NOW() - interval '28 minutes', NULL,
   NULL, NULL, false, 'Rejected by ATC: anemometer calibration test in progress',
   NOW() - interval '28 minutes', 'atc_hanoi',
   'False positive verified with vertiport ground crew.',
   'SOFTWARE', 'Anemometer calibration mode lacked suppression flag.', 'Tag maintenance telemetry frames before alerting.',
   '[{"timestamp":"2026-11-27T06:34:00Z","event":"awaiting_confirmation","data":{"action":"DIVERT","timeoutSeconds":30}},{"timestamp":"2026-11-27T06:36:00Z","event":"action_rejected","data":{"rejectedBy":"atc_hanoi"}}]'::jsonb,
   NOW() - interval '30 minutes', 0, NOW() - interval '30 minutes', 'system');

INSERT INTO blackbox_entries (
  id, flight_id, drone_id, incident_id, timestamp, latitude, longitude,
  altitude_msl, ground_speed, heading, battery_level, signal_strength,
  command_executed, emergency_active, emergency_type, emergency_severity,
  is_emergency_recording, created_on, created_by
)
VALUES
  -- 8 entries for INC-20261127-BATT (FL-2026-011 critical battery descent)
  ('bb111111-0001-4000-8000-000000000001', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'd4e5f601-1122-3344-5566-778899aabbcc', '11111111-1111-4111-8111-111111111111', NOW() - interval '119 minutes',           10.75420, 106.71340, 126.0, 16.2, 185.0, 19.8, 92.0, NULL,   true, 'BATTERY_CRITICAL', 'CRITICAL', true, NOW() - interval '119 minutes', 'system'),
  ('bb111111-0002-4000-8000-000000000002', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'd4e5f601-1122-3344-5566-778899aabbcc', '11111111-1111-4111-8111-111111111111', NOW() - interval '118 minutes 30 seconds', 10.75405, 106.71348, 126.0, 13.8, 185.0, 16.5, 92.0, NULL,   true, 'BATTERY_CRITICAL', 'CRITICAL', true, NOW() - interval '118 minutes', 'system'),
  ('bb111111-0003-4000-8000-000000000003', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'd4e5f601-1122-3344-5566-778899aabbcc', '11111111-1111-4111-8111-111111111111', NOW() - interval '118 minutes',           10.75400, 106.71350, 126.0, 10.5, 185.0, 14.2, 92.0, 'LAND', true, 'BATTERY_CRITICAL', 'CRITICAL', true, NOW() - interval '118 minutes', 'system'),
  ('bb111111-0004-4000-8000-000000000004', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'd4e5f601-1122-3344-5566-778899aabbcc', '11111111-1111-4111-8111-111111111111', NOW() - interval '117 minutes 30 seconds', 10.75390, 106.71355, 105.0,  6.8, 185.0, 13.9, 91.0, 'LAND', true, 'BATTERY_CRITICAL', 'CRITICAL', true, NOW() - interval '117 minutes', 'system'),
  ('bb111111-0005-4000-8000-000000000005', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'd4e5f601-1122-3344-5566-778899aabbcc', '11111111-1111-4111-8111-111111111111', NOW() - interval '117 minutes',           10.75380, 106.71360,  85.0,  4.5, 185.0, 13.6, 91.0, 'LAND', true, 'BATTERY_CRITICAL', 'CRITICAL', true, NOW() - interval '117 minutes', 'system'),
  ('bb111111-0006-4000-8000-000000000006', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'd4e5f601-1122-3344-5566-778899aabbcc', '11111111-1111-4111-8111-111111111111', NOW() - interval '116 minutes',           10.75360, 106.71370,  42.0,  1.2, 185.0, 13.1, 92.0, 'LAND', true, 'BATTERY_CRITICAL', 'CRITICAL', true, NOW() - interval '116 minutes', 'system'),
  ('bb111111-0007-4000-8000-000000000007', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'd4e5f601-1122-3344-5566-778899aabbcc', '11111111-1111-4111-8111-111111111111', NOW() - interval '115 minutes 30 seconds', 10.75350, 106.71370,  10.0,  0.2, 185.0, 12.8, 93.0, 'LAND', true, 'BATTERY_CRITICAL', 'CRITICAL', true, NOW() - interval '115 minutes', 'system'),
  ('bb111111-0008-4000-8000-000000000008', '4dbde32d-f7d3-45c2-b99d-8a8a9695d788', 'd4e5f601-1122-3344-5566-778899aabbcc', '11111111-1111-4111-8111-111111111111', NOW() - interval '115 minutes',           10.75350, 106.71370,   0.0,  0.0, 185.0, 12.6, 93.0, 'LAND', false, 'BATTERY_CRITICAL', 'CRITICAL', true, NOW() - interval '115 minutes', 'system'),

  -- 4 entries for INC-20261127-MOTR (FL-2026-010 motor anomaly hover)
  ('bb333333-0001-4000-8000-000000000001', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '33333333-3333-4333-8333-333333333333', NOW() - interval '99 minutes',           10.78050, 106.71800, 80.0,  8.5, 74.0, 93.8, 95.0, NULL,    true,  'MOTOR_ANOMALY', 'WARNING', true, NOW() - interval '99 minutes', 'system'),
  ('bb333333-0002-4000-8000-000000000002', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '33333333-3333-4333-8333-333333333333', NOW() - interval '98 minutes 30 seconds', 10.78050, 106.71800, 80.0,  0.0, 74.0, 93.2, 95.0, 'HOVER', true,  'MOTOR_ANOMALY', 'WARNING', true, NOW() - interval '98 minutes', 'system'),
  ('bb333333-0003-4000-8000-000000000003', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '33333333-3333-4333-8333-333333333333', NOW() - interval '97 minutes 30 seconds', 10.78050, 106.71800, 80.0,  0.0, 90.0, 92.6, 94.0, 'HOVER', true,  'MOTOR_ANOMALY', 'WARNING', true, NOW() - interval '97 minutes', 'system'),
  ('bb333333-0004-4000-8000-000000000004', '6fdf054f-19f5-47e4-db1f-0c0cb8b7f9aa', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', '33333333-3333-4333-8333-333333333333', NOW() - interval '96 minutes',           10.78140, 106.72150, 80.0, 13.8, 74.0, 91.8, 95.0, 'NONE',  false, 'MOTOR_ANOMALY', 'WARNING', false, NOW() - interval '96 minutes', 'system');

-- ------------------------------------------------------------------------------
-- 13. utm_fleet (5 fleet_configurations: 4 Liquibase presets + 1 custom;
--                5 fleet_assignments across all 5 statuses w/ exact AlternativeDroneVm;
--                5 rebalancing_tasks across 5 statuses w/ exact RebalancingRuleVm)
-- ------------------------------------------------------------------------------
\c utm_fleet;

TRUNCATE TABLE rebalancing_task, fleet_assignment, fleet_configuration CASCADE;

INSERT INTO fleet_configuration (
  id, name, description, weights, thresholds, is_preset, is_active, created_on, created_by
)
VALUES
  -- Exact 4 Liquibase preset rows
  ('fc000000-0000-4000-8000-000000000001',
   'Balanced Mode',
   'Balance efficiency with fleet health and capability matching',
   '{"proximity":0.25,"battery":0.20,"capability":0.25,"utilization":0.15,"maintenance":0.15}'::jsonb,
   '{"minDronesPerHub":2,"maxIdleTimeMinutes":90,"rebalanceCooldownMinutes":30,"minDonorReserve":2,"maxConcurrentRepositions":3,"minBatteryForReposition":70,"quietHoursOnly":false}'::jsonb,
   true, true, NOW() - interval '90 days', 'system'),

  ('fc000000-0000-4000-8000-000000000002',
   'Rapid Response',
   'Prioritize minimizing flight time and nearest-hub dispatch',
   '{"proximity":0.40,"battery":0.25,"capability":0.20,"utilization":0.05,"maintenance":0.10}'::jsonb,
   '{"minDronesPerHub":2,"maxIdleTimeMinutes":120,"rebalanceCooldownMinutes":30,"minDonorReserve":2,"maxConcurrentRepositions":3,"minBatteryForReposition":70,"quietHoursOnly":false}'::jsonb,
   true, false, NOW() - interval '90 days', 'system'),

  ('fc000000-0000-4000-8000-000000000003',
   'Battery Priority',
   'Prioritize maximum energy reserve margin for long-range or heavy-wind operations',
   '{"proximity":0.20,"battery":0.40,"capability":0.20,"utilization":0.10,"maintenance":0.10}'::jsonb,
   '{"minDronesPerHub":2,"maxIdleTimeMinutes":90,"rebalanceCooldownMinutes":30,"minDonorReserve":2,"maxConcurrentRepositions":2,"minBatteryForReposition":80,"quietHoursOnly":false}'::jsonb,
   true, false, NOW() - interval '90 days', 'system'),

  ('fc000000-0000-4000-8000-000000000004',
   'Fleet Longevity',
   'Prioritize even wear distribution and proactive maintenance scheduling',
   '{"proximity":0.15,"battery":0.15,"capability":0.20,"utilization":0.30,"maintenance":0.20}'::jsonb,
   '{"minDronesPerHub":3,"maxIdleTimeMinutes":60,"rebalanceCooldownMinutes":45,"minDonorReserve":3,"maxConcurrentRepositions":2,"minBatteryForReposition":80,"quietHoursOnly":false}'::jsonb,
   true, false, NOW() - interval '90 days', 'system'),

  -- Custom editable configuration (is_preset=false)
  ('fc000000-0000-4000-8000-000000000005',
   'Medical Priority Dispatch',
   'Custom operator profile prioritizing cold-chain capability matching and rapid proximity',
   '{"proximity":0.35,"battery":0.20,"capability":0.35,"utilization":0.05,"maintenance":0.05}'::jsonb,
   '{"minDronesPerHub":2,"maxIdleTimeMinutes":60,"rebalanceCooldownMinutes":20,"minDonorReserve":2,"maxConcurrentRepositions":4,"minBatteryForReposition":75,"quietHoursStart":22,"quietHoursEnd":5,"quietHoursOnly":false}'::jsonb,
   false, false, NOW() - interval '14 days', 'operator');

INSERT INTO fleet_assignment (
  id, mission_id, drone_id, scores, weights, final_score, status,
  assigned_by, operator_id, alternative_drones, rejection_reason,
  assigned_at, completed_at, created_on, created_by
)
VALUES
  -- [1] ACCEPTED (MSN-261127-MED1 -> VN-D001)
  ('fa100000-0000-4000-8000-000000000001',
   'a1111111-1111-4111-8111-111111111111', '30d1435a-77bf-49a1-8fd5-6920a6ed064c',
   '{"proximity":100.0,"battery":96.0,"capability":100.0,"utilization":82.0,"maintenance":94.0}'::jsonb,
   '{"proximity":0.25,"battery":0.20,"capability":0.25,"utilization":0.15,"maintenance":0.15}'::jsonb,
   95.60, 'ACCEPTED', 'SYSTEM', 'operator',
   '[{"droneId":"f6a7b803-3344-4566-7788-99aabbccddee","registrationNumber":"VN-CARGO-011","score":93.40,"scores":{"proximity":100.0,"battery":92.0,"capability":100.0,"utilization":90.0,"maintenance":90.0},"reason":null},{"droneId":"d4e5f601-1122-3344-5566-778899aabbcc","registrationNumber":"VN-MED-001","score":91.85,"scores":{"proximity":100.0,"battery":98.0,"capability":100.0,"utilization":75.0,"maintenance":73.0},"reason":null}]'::jsonb,
   NULL, NOW() - interval '15 minutes', NULL, NOW() - interval '15 minutes', 'system'),

  -- [2] PENDING (MSN-261127-AVN5 -> VN-INSP-004, ready to test Accept / Reject in UI!)
  ('fa200000-0000-4000-8000-000000000002',
   'a5555555-5555-4555-8555-555555555555', '11223344-5566-4777-8888-99aabbcc0004',
   '{"proximity":100.0,"battery":89.0,"capability":100.0,"utilization":88.0,"maintenance":90.0}'::jsonb,
   '{"proximity":0.25,"battery":0.20,"capability":0.25,"utilization":0.15,"maintenance":0.15}'::jsonb,
   94.50, 'PENDING', 'SYSTEM', NULL,
   '[{"droneId":"ece5662e-b5c6-477f-b710-918e2e11a1c5","registrationNumber":"VN-UAV-6376","score":83.70,"scores":{"proximity":100.0,"battery":91.0,"capability":60.0,"utilization":84.0,"maintenance":86.0},"reason":"Missing thermal_camera capability"}]'::jsonb,
   NULL, NOW() - interval '12 minutes', NULL, NOW() - interval '12 minutes', 'system'),

  -- [3] COMPLETED (MSN-261127-CMP8 -> VN-UAV-001)
  ('fa300000-0000-4000-8000-000000000003',
   'a8888888-8888-4888-8888-888888888888', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3',
   '{"proximity":100.0,"battery":99.0,"capability":100.0,"utilization":86.0,"maintenance":84.0}'::jsonb,
   '{"proximity":0.25,"battery":0.20,"capability":0.25,"utilization":0.15,"maintenance":0.15}'::jsonb,
   95.30, 'COMPLETED', 'OPERATOR', 'operator',
   '[]'::jsonb,
   NULL, NOW() - interval '115 minutes', NOW() - interval '90 minutes', NOW() - interval '115 minutes', 'operator'),

  -- [4] REJECTED (operator rejected low-battery VN-CARGO-012 for MSN-261127-SCH6)
  ('fa400000-0000-4000-8000-000000000004',
   'a6666666-6666-4666-8666-666666666666', '11223344-5566-4777-8888-99aabbcc0005',
   '{"proximity":62.0,"battery":38.0,"capability":100.0,"utilization":68.0,"maintenance":76.0}'::jsonb,
   '{"proximity":0.25,"battery":0.20,"capability":0.25,"utilization":0.15,"maintenance":0.15}'::jsonb,
   69.70, 'REJECTED', 'SYSTEM', 'operator',
   '[{"droneId":"f6a7b803-3344-4566-7788-99aabbccddee","registrationNumber":"VN-CARGO-011","score":94.80,"scores":{"proximity":100.0,"battery":92.0,"capability":100.0,"utilization":92.0,"maintenance":90.0},"reason":null}]'::jsonb,
   'Battery SoC (38%) below operational safety minimum; reassigned to VN-CARGO-011',
   NOW() - interval '32 minutes', NULL, NOW() - interval '32 minutes', 'system'),

  -- [5] CANCELLED (assignment cancelled after maintenance grounding)
  ('fa500000-0000-4000-8000-000000000005',
   'a9999999-9999-4999-8999-999999999999', 'e5f6a702-2233-4455-6677-8899aabbccdd',
   '{"proximity":70.0,"battery":62.0,"capability":60.0,"utilization":55.0,"maintenance":20.0}'::jsonb,
   '{"proximity":0.25,"battery":0.20,"capability":0.25,"utilization":0.15,"maintenance":0.15}'::jsonb,
   56.15, 'CANCELLED', 'SYSTEM', 'operator',
   '[]'::jsonb,
   'Drone VN-CARGO-009 entered overdue maintenance prior to launch',
   NOW() - interval '145 minutes', NULL, NOW() - interval '145 minutes', 'system');

INSERT INTO rebalancing_task (
  id, source_hub_id, target_hub_id, drone_id, repositioning_mission_id, repositioning_flight_id,
  trigger_type, rule, status, priority,
  approved_by, approved_at, started_at, completed_at, cancelled_reason, failure_reason,
  created_on, created_by
)
VALUES
  -- [1] PENDING (Donor HUB-SGN-D1 -> Critical Shortage HUB-SGN-TSN, ready to test Approve / Reject!)
  ('fb100000-0000-4000-8000-000000000001',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'b153d821-2c9b-4d33-94f2-e758b930a202',
   'f6a7b803-3344-4566-7788-99aabbccddee', NULL, NULL,
   'THRESHOLD_BREACH',
   '{"type":"threshold_breach","condition":"Hub Tan Son Nhat Gateway Vertiport has 0 available drones (minimum: 2)","threshold":2,"actualValue":0}'::jsonb,
   'PENDING', 100, NULL, NULL, NULL, NULL, NULL, NULL,
   NOW() - interval '8 minutes', 'system'),

  -- [2] APPROVED (Donor HUB-SGN-D1 -> Shortage HUB-SGN-D7, ready to test Execute!)
  ('fb200000-0000-4000-8000-000000000002',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'a942c710-1b8a-4c22-83e1-d647a829f101',
   '30d1435a-77bf-49a1-8fd5-6920a6ed064c', NULL, NULL,
   'THRESHOLD_BREACH',
   '{"type":"threshold_breach","condition":"Hub Phu My Hung South Logistics Hub has 1 available drone (minimum: 2)","threshold":2,"actualValue":1}'::jsonb,
   'APPROVED', 60, 'operator', NOW() - interval '15 minutes', NULL, NULL, NULL, NULL,
   NOW() - interval '20 minutes', 'system'),

  -- [3] COMPLETED (historical repositioning completed cleanly)
  ('fb300000-0000-4000-8000-000000000003',
   '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7',
   '7633fbe9-411a-4767-94bb-a1d818b7f26f', 'a2222222-2222-4222-8222-222222222222', '30000000-0000-4000-8000-00000000002a',
   'SCHEDULED',
   '{"type":"scheduled","condition":"Morning demand pre-positioning to Thu Thiem Waterfront Vertiport","threshold":2,"actualValue":1}'::jsonb,
   'COMPLETED', 50, 'operator', NOW() - interval '75 minutes', NOW() - interval '68 minutes', NOW() - interval '45 minutes',
   NULL, NULL, NOW() - interval '80 minutes', 'operator'),

  -- [4] CANCELLED (manual repositioning cancelled by operator)
  ('fb400000-0000-4000-8000-000000000004',
   'c854d502-2c9b-4e4a-93c2-b8759521e962', 'd264e932-3d0c-4e44-a503-f869ca41b303',
   '11223344-5566-4777-8888-99aabbcc0004', NULL, NULL,
   'MANUAL',
   '{"type":"manual","condition":"Operator requested coastal relay pre-staging at Can Gio","threshold":1,"actualValue":0}'::jsonb,
   'CANCELLED', 25, NULL, NULL, NULL, NULL,
   'Target hub HUB-SGN-CG transitioned to MAINTENANCE status', NULL,
   NOW() - interval '2 hours', 'operator'),

  -- [5] FAILED (predictive repositioning blocked by ASZ-TSNA ceiling & maintenance)
  ('fb500000-0000-4000-8000-000000000005',
   'a942c710-1b8a-4c22-83e1-d647a829f101', 'b153d821-2c9b-4d33-94f2-e758b930a202',
   'e5f6a702-2233-4455-6677-8899aabbccdd', NULL, '30000000-0000-4000-8000-000000000012',
   'PREDICTIVE',
   '{"type":"predictive","condition":"Forecast medical demand surge at Tan Son Nhat Gateway (+2 flights/hr)","threshold":2,"actualValue":0}'::jsonb,
   'FAILED', 60, 'operator', NOW() - interval '5 hours', NOW() - interval '4 hours 30 minutes', NULL,
   NULL, 'Repositioning flight FL-2026-012 rejected by ATC (ASZ-TSNA ceiling breach & airframe maintenance)',
   NOW() - interval '5 hours', 'system');

-- ==============================================================================
-- End of DROPS-UTM Comprehensive Test Seed Data Script
-- ==============================================================================
