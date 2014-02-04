-- Removes a building from the database
-- After calling this procedure, the deleted rows number should be tested
-- to check if delete has been allowed or not.
-- @param INTEGER :building_id The id of the building to remove
-- @param INTEGER :spaceship_id The id of the spaceship
DELETE FROM building
WHERE building_id = :building_id
AND spaceship_id = :spaceship_id

-- If the building is a container, checking that there is not a building inside it
AND (
	building_type_id NOT IN (
		SELECT building_type_id
		FROM building_type
		WHERE building_type_is_container = 1
	) OR (
		SELECT COUNT(*)
		FROM building AS b
		NATURAL INNER JOIN building_type
		WHERE building.spaceship_id = b.spaceship_id
		AND building_type_is_inside = 1
		AND NOT (
			b.building_position_x > (building.building_position_x + building.building_size_x - 1)
			OR (b.building_position_x + b.building_size_x - 1) < building.building_position_x
		) AND NOT (
			b.building_position_y > (building.building_position_y + building.building_size_y - 1)
			OR (b.building_position_y + b.building_size_y - 1) < b.building_position_y
		) AND NOT (
			b.building_position_z > (building.building_position_z + building.building_size_z - 1)
			OR (b.building_position_z + b.building_size_z - 1) < b.building_position_z
		)
	) = 0
) -- TODO bug when removing a room
