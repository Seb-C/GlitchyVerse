-- Returns the buildings which have been disabled
-- @param INTEGER :spaceship_id The id of the spaceship
SELECT
	building_id
FROM temp_emptied_buildings
NATURAL INNER JOIN building
WHERE building.spaceship_id = :spaceship_id;