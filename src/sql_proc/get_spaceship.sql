-- Returns the spaceship attributes
-- @param INTEGER :spaceship_id The id of the spaceship
SELECT
	spaceship_name,
	spaceship_position_x,
	spaceship_position_y,
	spaceship_position_z,
	spaceship_rotation_x,
	spaceship_rotation_y,
	spaceship_rotation_z
FROM spaceship
WHERE spaceship_id = :spaceship_id