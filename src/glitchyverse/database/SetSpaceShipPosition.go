package db

import (
	"log"
)

// Updates the position and the rotation of the spaceship, only if
// the new position is coherent with the maximum speed of the ship
func SetSpaceShipPosition(
	spaceShipId int64,
	maxSpeedPerPropellerUnit float64,
	moveMaximumErrorRate float64,
	passedTimeRate float64,
	position [3]float64, // TODO special type vec3 ?
	rotation [3]float64,
) bool {
	changes, err := db.ExecDml(
		`
			UPDATE spaceship
			SET
				spaceship_position_x = ?5,
				spaceship_position_y = ?6,
				spaceship_position_z = ?7,
				spaceship_rotation_x = ?8,
				spaceship_rotation_y = ?9,
				spaceship_rotation_z = ?10
			WHERE spaceship_id = ?1
			AND (
				SQRT(
					  POW(spaceship_position_x - ?5, 2)
					+ POW(spaceship_position_y - ?6, 2)
					+ POW(spaceship_position_z - ?7, 2)
				) < ?4 * (1 + ?3) * (
					SELECT
						SUM(
							building_size_x
							* building_size_y
							* building_size_z
							* building_type_max_state
							* ?2
						) AS max_speed
					FROM building
					NATURAL INNER JOIN building_type
					WHERE spaceship_id = ?1
					AND building_is_built = 1
					AND building_is_enabled = 1
					AND building_type_can_exert_thrust = 1
				)
			);
		`,
		spaceShipId,
		maxSpeedPerPropellerUnit,
		moveMaximumErrorRate,
		passedTimeRate,
		position[0],
		position[1],
		position[2],
		rotation[0],
		rotation[1],
		rotation[2],
	)
	if err != nil {
		log.Panic(err)
	}
	
	return (changes > 0)
}