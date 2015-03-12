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

// Updates the state of one or multiple (buildingId = nil) propeller(s), based on a rate (-1.0 .. 1.0)
func SetPropellersPowerRate(spaceShipId int64, buildingId int64, powerRate float64) {
	err := db.Exec(`
		UPDATE building
		SET building_state = (
			CASE
				WHEN ?3 < -1 THEN -1
				WHEN ?3 >  1 THEN  1
				ELSE ?3
			END
		) * (
			SELECT CASE
				WHEN ?3 < 0
				THEN -1 * T.building_type_min_state
				ELSE T.building_type_max_state
			END
			FROM building_type AS T
			WHERE T.building_type_id = building.building_type_id
		)
		WHERE spaceship_id = ?1
		AND building_type_id IN (
			SELECT building_type_id
			FROM building_type
			WHERE building_type_can_exert_thrust = 1
		)
		AND building_is_built = 1
		AND building_is_enabled = 1
		AND (:building_id IS NULL OR building_id = ?2)
		;
	`, spaceShipId, buildingId, powerRate)
	if err != nil {
		log.Panic(err)
	}
}
