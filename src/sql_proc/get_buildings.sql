-- Returns the buildings defining the spaceship
-- @param INTEGER :spaceship_id The id of the spaceship
-- @param INTEGER :building_id (nullable) The id of the building
SELECT
	building_id,
	building_type_id,
    building_position_x,
    building_position_y,
    building_position_z,
    building_rotation_x,
    building_rotation_y,
    building_rotation_z,
    building_size_x,
    building_size_y,
    building_size_z,
	building_state,
	building_is_built,
	building_seed,
	building_is_enabled
FROM spaceship
NATURAL INNER JOIN building
WHERE spaceship_id = :spaceship_id
AND (:building_id IS NULL OR building_id = :building_id)