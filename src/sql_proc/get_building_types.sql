-- Returns the full list of building types and it's attributes
SELECT
	building_type_id,
	building_type_name,
	building_type_category_name,
	building_type_model,
	building_type_is_gap,
	building_type_default_state,
	building_type_is_sizeable,
	building_type_rotation_x_allowed_divisions,
	building_type_rotation_y_allowed_divisions,
	building_type_rotation_z_allowed_divisions,
    building_type_is_position_by_room_unit,
	building_type_min_state,
	building_type_max_state,
	building_type_can_exert_thrust,
	building_type_is_controllable
FROM building_type
NATURAL LEFT JOIN building_type_category