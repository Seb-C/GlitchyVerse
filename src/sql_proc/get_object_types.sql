-- Returns the full list of object types
SELECT
	object_type_id,
	object_type_name,
	object_type_category_name,
	object_type_model,
	object_type_is_gap,
	object_type_default_state,
	object_type_is_sizeable,
	object_type_rotation_x_allowed_divisions,
	object_type_rotation_y_allowed_divisions,
	object_type_rotation_z_allowed_divisions
FROM object_type
NATURAL INNER JOIN object_type_category