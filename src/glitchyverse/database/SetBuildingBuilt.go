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

// Changes the state of a building from "not built" to "built", only if the requirements (items) are met
func SetBuildingBuilt(spaceShipId int64, buildingId int64) bool {
	changes, err := db.ExecDml(`
		UPDATE building
		SET building_is_built = 1
		WHERE spaceship_id = ?1
		AND building_id = ?2
		AND building_is_built = 0
		AND (
			SELECT SUM(item_slot_maximum_amount) * building_size_x * building_size_y * building_size_z
			FROM building
			INNER JOIN item_slot ON building.building_type_id = item_slot.building_type_id
			WHERE item_slot.item_slot_when_building = 1
			AND building.building_id = ?2
		) = (
			SELECT COUNT(*)
			FROM item
			WHERE building_id = ?2
		);
	`, spaceShipId, buildingId)
	if err != nil {
		log.Panic(err)
	}
	
	return (changes > 0)
}
