-- Updates the position and the rotation of the spaceship, only if
-- the new position is coherent with the maximum speed of the ship
-- @param REAL :MAX_SPEED_PER_PROPELLER_UNIT
-- @param REAL :MOVE_MAXIMUM_ERROR_RATE
-- @param int :spaceship_id The id of the spaceship to update
-- @param REAL :passed_time_rate The passed time, as seconds
-- @param REAL :position_x The X new position of the spaceship
-- @param REAL :position_y The Y new position of the spaceship
-- @param REAL :position_z The Z new position of the spaceship
-- @param REAL :rotation_x The X new rotation of the spaceship
-- @param REAL :rotation_y The Y new rotation of the spaceship
-- @param REAL :rotation_z The Z new rotation of the spaceship
UPDATE spaceship
SET
	spaceship_position_x = :position_x,
	spaceship_position_y = :position_y,
	spaceship_position_z = :position_z,
	spaceship_rotation_x = :rotation_x,
	spaceship_rotation_y = :rotation_y,
	spaceship_rotation_z = :rotation_z
WHERE spaceship_id = :spaceship_id
AND (
	SQRT(
		  POW(spaceship_position_x - :position_x, 2)
		+ POW(spaceship_position_y - :position_y, 2)
		+ POW(spaceship_position_z - :position_z, 2)
	) < :passed_time_rate * (1 + :MOVE_MAXIMUM_ERROR_RATE) * (
		SELECT
			SUM(
				building_size_x
				* building_size_y
				* building_size_z
				* building_type_max_state
				* :MAX_SPEED_PER_PROPELLER_UNIT
			) AS max_speed
		FROM building
		NATURAL INNER JOIN building_type
		WHERE spaceship_id = :spaceship_id
		AND building_is_built = 1
		AND building_is_enabled = 1
		AND building_type_can_exert_thrust = 1
	)
)