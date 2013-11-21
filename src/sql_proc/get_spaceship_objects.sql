-- Returns the list of objects defining the spaceship
-- @param INTEGER :user_id The id of the user
SELECT
	object_id,
	object_type_id,
    object_type_model,
    object_type_is_gap,
    object_type_is_position_by_room_unit,
    object_position_x,
    object_position_y,
    object_position_z,
    object_rotation_x,
    object_rotation_y,
    object_rotation_z,
    object_size_x,
    object_size_y,
    object_size_z,
	object_state,
	object_type_min_state,
	object_type_max_state,
	object_type_can_exert_thrust
FROM spaceship
NATURAL INNER JOIN object
NATURAL INNER JOIN object_type
WHERE user_id = :user_id