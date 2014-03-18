-- Updates the "enabled" state of a building
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param INTEGER :building_id The id of the building to update
-- @param BOOLEAN :is_enabled The new enabled state of the building
UPDATE building
SET building_is_enabled = :is_enabled
WHERE spaceship_id = :spaceship_id
AND building_id = :building_id