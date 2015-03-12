/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Sébastien CAPARROS (GlitchyVerse)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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
