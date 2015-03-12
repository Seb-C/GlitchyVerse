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

// Moves an item to another building inventory
func MoveItem(spaceShipId int64, itemId int64, targetBuildingId int64, targetSlotGroupId int64) bool {
	// TODO change the filter on spaceships to allow exchanges between spaceships ?
	changes, err := db.ExecDml(`
		UPDATE item SET
			building_id = ?3,
			item_slot_group_id = ?4
		WHERE item_id = ?2
		AND building_id IN (
			SELECT building_id
			FROM building
			WHERE spaceship_id = ?1
		)
		AND (
			SELECT COUNT(*)
			FROM building
			INNER JOIN item_slot ON building.building_type_id = item_slot.building_type_id
			INNER JOIN item_type_in_item_group ON item_type_in_item_group.item_group_id = item_slot.item_group_id
			WHERE building.spaceship_id = ?1
			AND building.building_id = ?3
			AND item_slot.item_slot_when_building = (1 - building.building_is_built)
			AND item_type_in_item_group.item_type_id = (
				SELECT item_type_id
				FROM item
				WHERE item_id = ?2
			)
			AND (
				SELECT COUNT(*)
				FROM item
				WHERE building_id = ?3
				AND item_slot_group_id = ?4
			) < item_slot.item_slot_maximum_amount
		) > 0
		;
	`, spaceShipId, itemId, targetBuildingId, int64ToNull(targetSlotGroupId))
	if err != nil {
		log.Panic(err)
	}
	
	return (changes > 0)
}
