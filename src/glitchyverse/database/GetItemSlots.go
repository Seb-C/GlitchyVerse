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

func GetItemSlots(rowHandler func(buildingTypeId, itemGroupId int64, whenBuilding bool, maxAmount int64, variation float64)) {
	s, err := db.Prepare(`
		SELECT
			building_type_id,
			item_group_id,
			item_slot_when_building,
			item_slot_maximum_amount,
			item_slot_state_variation
		FROM item_slot
		NATURAL INNER JOIN item_group
		ORDER BY
			CASE WHEN item_group_id = 0 THEN 1 ELSE 0 END ASC, -- "any" slots at last
			item_group_name
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		buildingTypeId,  _, err := s.ScanInt64 (0); if err != nil { return err }
		itemGroupId,     _, err := s.ScanInt64 (1); if err != nil { return err }
		whenBuilding,    _, err := s.ScanBool  (2); if err != nil { return err }
		maxAmount,       _, err := s.ScanInt64 (3); if err != nil { return err }
		variation,       _, err := s.ScanDouble(4); if err != nil { return err }
		
		rowHandler(
			buildingTypeId,
			itemGroupId,
			whenBuilding,
			maxAmount,
			variation,
		)
		
		return nil
	})
	if err != nil {
		log.Panic(err)
	}
}
