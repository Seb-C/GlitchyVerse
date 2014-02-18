-- Removes all items from a building inventory
-- @param INTEGER :building_id The id of the building
-- @param INTEGER :spaceship_id The id of the spaceship
DELETE FROM item
WHERE building_id = :building_id
AND building_id IN (
	SELECT building_id
	FROM building
	WHERE spaceship_id = :spaceship_id
)
