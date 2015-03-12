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

func createTableEmptiedBuildings() {
	err := db.Exec(`
		CREATE TEMPORARY TABLE temp_emptied_buildings (
			building_id INTEGER
		);
	`)
	if err != nil {
		log.Panic(err)
	}
}

// Inserts into temp_emptied_buildings the buildings which requires items to work, and where there are no items left.
func InsertIntoEmptiedBuildingsFromItemVariation() {
	err := db.Exec(`
		INSERT INTO temp_emptied_buildings
		SELECT
			building.building_id
		FROM temp_item_variation
		INNER JOIN item AS itemA ON itemA.item_id = temp_item_variation.item_id
		INNER JOIN building ON building.building_id = itemA.building_id
		INNER JOIN item_slot ON item_slot.building_type_id = building.building_type_id
		INNER JOIN item AS itemB ON (
			itemB.building_id = building.building_id
			AND itemB.item_slot_group_id = item_slot.item_group_id
		)
		WHERE item_slot.item_slot_state_variation < 0
		AND item_slot.item_slot_when_building = 0
		GROUP BY building.building_id
		HAVING SUM(itemB.item_state) <= 0
	`)
	if err != nil {
		log.Panic(err)
	}
}

// Returns the buildings which have been disabled
func GetDisabledBuildingsFromEmptiedBuildings(spaceShipId int64, rowHandler func(buildingId int64)) {
	s, err := db.Prepare(`
		SELECT
			building_id
		FROM temp_emptied_buildings
		NATURAL INNER JOIN building
		WHERE building.spaceship_id = ?1
		;
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		id, _, err := s.ScanInt64(0); if err != nil { return err }
		
		rowHandler(
			id,
		)
		
		return nil
	}, spaceShipId)
	if err != nil {
		log.Panic(err)
	}
}

func TruncateEmptiedBuildings() {
	err := db.Exec(`
		DELETE FROM temp_emptied_buildings;
	`)
	if err != nil {
		log.Panic(err)
	}
}

// Sets the state of the buildings to disable as disabled
func UpdateEmptiedBuildingsFromTemp() {
	err := db.Exec(`
		UPDATE building
		SET building_is_enabled = 0
		WHERE building_id IN (
			SELECT building_id
			FROM temp_emptied_buildings
		);
	`)
	if err != nil {
		log.Panic(err)
	}
}
