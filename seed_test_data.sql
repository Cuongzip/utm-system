\c utm_organization;

INSERT INTO organization (id, name, type, registration_number, contact_info, status, created_on, created_by)
VALUES 
  ('f110bb18-c585-459d-adc2-d3f023c93aa3', 'Drone Express Vietnam JSC', 'OPERATOR', 'VN-BIZ-0109988776', 'ops@droneexpress.vn | +84 28 3822 9999', 'ACTIVE', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

INSERT INTO organization (id, name, type, registration_number, contact_info, status, created_on, created_by)
VALUES 
  ('e220bb18-c585-459d-adc2-d3f023c93aa4', 'SkyLogistics Urban Delivery', 'OPERATOR', 'VN-BIZ-0109988777', 'contact@skylogistics.vn | +84 28 3744 8888', 'ACTIVE', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

\c utm_hub;

INSERT INTO hub (id, name, code, latitude, longitude, status, created_on, created_by)
VALUES
  ('76a06ff8-4ca7-418f-8077-c6c656fba3f5', 'Trạm Trung Tâm Quận 1', 'HUB-SGN-D1', 10.7769000, 106.7009000, 'ACTIVE', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

INSERT INTO hub (id, name, code, latitude, longitude, status, created_on, created_by)
VALUES
  ('606a30fb-465a-4016-85f7-85b00467f2f7', 'Trạm Vertiport Quận 2', 'HUB-SGN-D2', 10.7850000, 106.7350000, 'ACTIVE', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

INSERT INTO hub (id, name, code, latitude, longitude, status, created_on, created_by)
VALUES
  ('c854d502-2c9b-4e4a-93c2-b8759521e962', 'Trạm Công Nghệ Thủ Đức', 'HUB-SGN-TD', 10.8490000, 106.7710000, 'ACTIVE', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

\c utm_airspace;

INSERT INTO airspace_zone (id, name, zone_type, geometry, altitude_ceiling, status, description, created_on, created_by)
VALUES
  ('b6241fe9-beb1-48d3-94ff-ae7ce4be0563', 'Independence Palace Strictly Prohibited Airspace', 'NO_FLY_ZONE', '{"type":"Polygon","coordinates":[[[106.693,10.775],[106.698,10.775],[106.698,10.779],[106.693,10.779],[106.693,10.775]]]}', 120.0, 'ACTIVE', 'Vùng cấm bay tuyệt đối Dinh Độc Lập và khu vực lân cận', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

INSERT INTO airspace_zone (id, name, zone_type, geometry, altitude_ceiling, status, description, created_on, created_by)
VALUES
  ('c7352fe9-beb1-48d3-94ff-ae7ce4be0564', 'Saigon River Low-Altitude Flight Corridor', 'CORRIDOR', '{"type":"LineString","coordinates":[[106.7009,10.7769],[106.7150,10.7800],[106.7350,10.7850]]}', 150.0, 'ACTIVE', 'Hành lang bay dọc sông Sài Gòn kết nối Quận 1 và Quận 2', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

\c utm_drone;

INSERT INTO drone (id, registration_number, manufacturer, model, owner_id, home_hub_id, battery_capacity_wh, max_payload, status, created_on, created_by)
VALUES
  ('30d1435a-77bf-49a1-8fd5-6920a6ed064c', 'VN-D001', 'DJI', 'Matrice 350 RTK', 'f110bb18-c585-459d-adc2-d3f023c93aa3', '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 5880.0, 2.7, 'IN_FLIGHT', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'IN_FLIGHT', model = 'Matrice 350 RTK';

INSERT INTO drone (id, registration_number, manufacturer, model, owner_id, home_hub_id, battery_capacity_wh, max_payload, status, created_on, created_by)
VALUES
  ('7633fbe9-411a-4767-94bb-a1d818b7f26f', 'VN-D002', 'DJI', 'Matrice 350 RTK', 'f110bb18-c585-459d-adc2-d3f023c93aa3', '606a30fb-465a-4016-85f7-85b00467f2f7', 5880.0, 2.7, 'AVAILABLE', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'AVAILABLE', model = 'Matrice 350 RTK';

INSERT INTO drone (id, registration_number, manufacturer, model, owner_id, home_hub_id, battery_capacity_wh, max_payload, status, created_on, created_by)
VALUES
  ('8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', 'VN-UAV-001', 'DJI', 'Inspire 3 RTK', 'e220bb18-c585-459d-adc2-d3f023c93aa4', '76a06ff8-4ca7-418f-8077-c6c656fba3f5', 4280.0, 1.8, 'AVAILABLE', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'AVAILABLE', model = 'Inspire 3 RTK';

INSERT INTO drone (id, registration_number, manufacturer, model, owner_id, home_hub_id, battery_capacity_wh, max_payload, status, created_on, created_by)
VALUES
  ('ece5662e-b5c6-477f-b710-918e2e11a1c5', 'VN-UAV-6376', 'Wingtra', 'WingtraOne Gen II', 'e220bb18-c585-459d-adc2-d3f023c93aa4', 'c854d502-2c9b-4e4a-93c2-b8759521e962', 6200.0, 3.5, 'IN_FLIGHT', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'IN_FLIGHT', model = 'WingtraOne Gen II';

\c utm_connectivity;

DELETE FROM device_registrations;

INSERT INTO device_registrations (id, drone_id, device_identifier, connection_status, socket_id, certificate_fingerprint, last_seen_at, created_on, created_by)
VALUES
  ('ef59525b-65d1-428a-8ff0-1019e3a182c2', '8c577611-85b0-4530-aa0f-7f9e2f6ea3e3', 'DEV-DJI-INS3-001', 'ONLINE', 'ws://gateway:8089/conn-001', 'SHA256:7b91d24c88f910a3e83b4c10a23e981f', NOW(), NOW(), 'system'),
  ('1b534791-346d-437b-9553-91b7bea3cc4b', '30d1435a-77bf-49a1-8fd5-6920a6ed064c', 'DEV-DJI-M350-001', 'ONLINE', 'ws://gateway:8089/conn-002', 'SHA256:9c12a45d77e819b4f91c3d11b87a123e', NOW(), NOW(), 'system'),
  ('2c645802-457e-448c-a664-02c8cfa4dd5c', 'ece5662e-b5c6-477f-b710-918e2e11a1c5', 'DEV-WINGTRA-6376', 'CONNECTING', 'ws://gateway:8089/conn-003', 'SHA256:3d44e56f88a920c5a02d5e22c11b887a', NOW() - interval '20 seconds', NOW(), 'system'),
  ('3d756913-568f-459d-b775-13d9deb5ee6d', '7633fbe9-411a-4767-94bb-a1d818b7f26f', 'DEV-DJI-M350-002', 'OFFLINE', NULL, 'SHA256:1a22b33c44d55e66f77a88b99cc0011e', NOW() - interval '2 hours', NOW(), 'system');

\c utm_flight;

INSERT INTO flight (id, flight_number, drone_id, departure_hub_id, arrival_hub_id, pilot_id, scheduled_departure, scheduled_arrival, actual_departure, cruising_altitude_m, planned_route, actual_route, authorization_status, conformance_status, status, created_on, created_by)
VALUES
  ('2babe10b-d5b1-42a0-9c7b-f65f7473b566', 'FL-2026-001', 'ece5662e-b5c6-477f-b710-918e2e11a1c5', '76a06ff8-4ca7-418f-8077-c6c656fba3f5', '606a30fb-465a-4016-85f7-85b00467f2f7', '7a222222-2222-2222-2222-222222222222', NOW() - interval '15 minutes', NOW() + interval '30 minutes', NOW() - interval '15 minutes', 120.0, '{"type":"LineString","coordinates":[[106.7009,10.7769],[106.7150,10.7800],[106.7350,10.7850]]}', '{"type":"LineString","coordinates":[[106.7009,10.7769],[106.7080,10.7785]]}', 'APPROVED', 'CONFORMING', 'ACTIVE', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', authorization_status = 'APPROVED';

INSERT INTO flight (id, flight_number, drone_id, departure_hub_id, arrival_hub_id, pilot_id, scheduled_departure, scheduled_arrival, actual_departure, cruising_altitude_m, planned_route, actual_route, authorization_status, conformance_status, status, created_on, created_by)
VALUES
  ('3cacf21c-e6c2-43b1-a88c-7f7f8584c677', 'FL-2026-002', '30d1435a-77bf-49a1-8fd5-6920a6ed064c', '606a30fb-465a-4016-85f7-85b00467f2f7', 'c854d502-2c9b-4e4a-93c2-b8759521e962', '7a222222-2222-2222-2222-222222222222', NOW() - interval '5 minutes', NOW() + interval '45 minutes', NOW() - interval '5 minutes', 100.0, '{"type":"LineString","coordinates":[[106.7350,10.7850],[106.7550,10.8200],[106.7710,10.8490]]}', '{"type":"LineString","coordinates":[[106.7350,10.7850],[106.7400,10.7950]]}', 'APPROVED', 'CONFORMING', 'ACTIVE', NOW(), 'system')
ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE', authorization_status = 'APPROVED';
