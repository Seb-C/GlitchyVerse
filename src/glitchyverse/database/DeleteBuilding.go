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

// Returns false if the building deletion hasn't been allowed
func DeleteBuilding(spaceShipId int64, buildingId int64) bool {
	changes, err := db.ExecDml(`
		DELETE FROM building
		WHERE building_id = ?2
		AND spaceship_id = ?1

		-- Can't destroy un-buildable buildings such as characters
		AND building_type_id NOT IN (
			SELECT building_type_id
			FROM building_type
			WHERE building_type_category_id IS NULL
		)

		-- If the building is a container, checking that there is not a building inside it
		AND (
			building_type_id NOT IN (
				SELECT building_type_id
				FROM building_type
				WHERE building_type_is_container = 1
			) OR (
				SELECT COUNT(*)
				FROM building AS b
				NATURAL INNER JOIN building_type
				WHERE building.spaceship_id = b.spaceship_id
				AND building_type_is_inside = 1
				AND NOT (
					b.building_position_x > (building.building_position_x + building.building_size_x - 1)
					OR (b.building_position_x + b.building_size_x - 1) < building.building_position_x
				) AND NOT (
					b.building_position_y > (building.building_position_y + building.building_size_y - 1)
					OR (b.building_position_y + b.building_size_y - 1) < b.building_position_y
				) AND NOT (
					b.building_position_z > (building.building_position_z + building.building_size_z - 1)
					OR (b.building_position_z + b.building_size_z - 1) < b.building_position_z
				)
			) = 0
		) -- TODO bug when removing a room
		;
	`, spaceShipId, buildingId)
	if err != nil {
		log.Panic(err)
	}
	
	return (changes > 0)
}
