-- Inserts a new body in the database
-- @param INTEGER :type_id The id of the type of the body to insert
-- @param REAL :position_x The X position of the body
-- @param REAL :position_y The Y position of the body
-- @param REAL :position_z The Z position of the body
-- @param REAL :radius The radius of the body
-- @param REAL :seed A seed used by the client to define some body attributes
INSERT INTO body (
	body_id,
	body_type_id,
	body_parent_id,
	body_position_x,
	body_position_y,
	body_position_z,
	body_radius,
	body_seed
) VALUES (
	NULL,
	:type_id,
	:parent_id,
	:position_x,
	:position_y,
	:position_z,
	:radius,
	:seed
);
