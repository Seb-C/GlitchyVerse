-- Returns all bodies visible from the given position
-- @param REAL :position_x Position on the X axis
-- @param REAL :position_y Position on the Y axis
-- @param REAL :position_z Position on the Z axis
SELECT *
FROM body
NATURAL JOIN body_type
WHERE SQRT(
	  POW(body_position_x - :position_x, 2)
	+ POW(body_position_y - :position_y, 2)
	+ POW(body_position_z - :position_z, 2)
) <= body_type_max_visibility_distance