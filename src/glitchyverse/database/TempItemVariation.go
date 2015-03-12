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
	"github.com/gwenn/gosqlite"
)

func createTableItemVariation() {
	err := db.Exec(`
		CREATE TEMPORARY TABLE temp_item_variation (
			item_id INTEGER,
			new_item_state REAL
		);
	`)
	if err != nil {
		log.Panic(err)
	}
}

// Returns the new states of updated items
func GetNewStatesFromItemVariation(spaceShipId int64, rowHandler func(
	itemId int64,
	newItemState float64,
	buildingId int64,
)) {
	s, err := db.Prepare(`
		SELECT
			item_id,
			new_item_state,
			building_id
		FROM temp_item_variation
		NATURAL INNER JOIN item
		NATURAL INNER JOIN building
		WHERE building.spaceship_id = ?1;
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		itemId,       _, err := s.ScanInt64 (0); if err != nil { return err }
		newItemState, _, err := s.ScanDouble(1); if err != nil { return err }
		buildingId,   _, err := s.ScanInt64 (2); if err != nil { return err }
		
		rowHandler(
			itemId,
			newItemState,
			buildingId,
		)
		
		return nil
	}, spaceShipId)
	if err != nil {
		log.Panic(err)
	}
}

// Inserts into temp_item_variation the items to update, with their new state, depending on building slots
// Also uses the temp_online table to know which ones are connected
func PutDataIntoItemVariation(passedTimeInSeconds float64) {
	err := db.Exec(`
		INSERT INTO temp_item_variation
		SELECT
			item_id,
			CLAMP(
				item_state + (
					item_slot_state_variation
					* ?1
					* building_size_x
					* building_size_y
					* building_size_z
					* CASE
						WHEN building_is_enabled = 0
						THEN 0
						WHEN building_state IS NULL
						THEN 1
						ELSE (
							(building_state - building_type_min_state)
							/ (building_type_max_state - building_type_min_state)
						)
					END
				),
				0,
				item_type_max_state
			) AS new_item_state
		FROM temp_online
		INNER JOIN building ON temp_online.spaceship_id = building.spaceship_id
		INNER JOIN building_type ON building.building_type_id = building_type.building_type_id
		INNER JOIN item_slot ON building.building_type_id = item_slot.building_type_id
		INNER JOIN item ON (
			item.building_id = building.building_id
			AND item.item_slot_group_id = item_slot.item_group_id
		)
		INNER JOIN item_type ON item.item_type_id = item_type.item_type_id
		WHERE item_slot.item_slot_when_building = 0
		AND (
			(
				item_slot_state_variation > 0
				AND item_state < item_type_max_state
			) OR (
				item_slot_state_variation < 0
				AND item_state > 0
			)
		)
		GROUP BY
			building.building_id,
			item_slot.item_group_id
		HAVING item_id = MIN(item_id)
		;
	`, passedTimeInSeconds)
	if err != nil {
		log.Panic(err)
	}
}

func TruncateItemVariation() {
	err := db.Exec(`
		DELETE FROM temp_item_variation;
	`,)
	if err != nil {
		log.Panic(err)
	}
}

// Updates the item states using values in temp_item_variation table
func UpdateItemVariationFromTemp() {
	err := db.Exec(`
		UPDATE item
		SET item_state = (
			SELECT new_item_state
			FROM temp_item_variation
			WHERE temp_item_variation.item_id = item.item_id
		)
		WHERE item_id IN (
			SELECT item_id
			FROM temp_item_variation
		);
	`)
	if err != nil {
		log.Panic(err)
	}
}
