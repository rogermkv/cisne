-- Replace the initial reservation catalog with the spaces approved by the club.
-- Existing reservations are intentionally removed together with the old spaces.
DELETE FROM "reservations";
DELETE FROM "reservable_spaces";

INSERT INTO "reservable_spaces"
  ("id", "name", "description", "capacity", "price", "active", "imagePath", "requiresApproval", "createdAt", "updatedAt")
VALUES
  ('space-quiosque-1', 'Quiosque 1', 'Espaço disponível para eventos do Clube Ser Cisne.', NULL, 80.00, true, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('space-quiosque-2', 'Quiosque 2', 'Espaço disponível para eventos do Clube Ser Cisne.', NULL, 80.00, true, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('space-quiosque-3', 'Quiosque 3', 'Espaço disponível para eventos do Clube Ser Cisne.', NULL, 80.00, true, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('space-quiosque-4', 'Quiosque 4', 'Espaço disponível para eventos do Clube Ser Cisne.', NULL, 80.00, true, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('space-choupana-1', 'Choupana 1', 'Espaço disponível para eventos do Clube Ser Cisne.', NULL, 120.00, true, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('space-choupana-2', 'Choupana 2', 'Espaço disponível para eventos do Clube Ser Cisne.', NULL, 120.00, true, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('space-salao-principal', 'Salão Principal', 'Espaço disponível para eventos do Clube Ser Cisne.', NULL, 1000.00, true, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('space-salao-festas', 'Salão de Festas', 'Espaço disponível para eventos do Clube Ser Cisne.', NULL, 700.00, true, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
