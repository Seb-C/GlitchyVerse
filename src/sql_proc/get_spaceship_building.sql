-- Returns specific building data
-- @param INTEGER :user_id The id of the user
-- @param INTEGER :building_id The id of the building
SELECT
	building_id,
	building_type_id,
    building_type_model,
    building_type_is_gap,
    building_type_is_position_by_room_unit,
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
	building_type_min_state,
	building_type_max_state,
	building_type_can_exert_thrust
FROM spaceship
NATURAL INNER JOIN building
NATURAL INNER JOIN building_type
WHERE user_id = :user_id
AND building_id = :building_id