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

func GetItems(spaceShipId int64, rowHandler func(id, typeId int64, state float64, buildingId int64, slotGroupId *int64)) {
	s, err := db.Prepare(`
		SELECT
			item_id,
			item_type_id,
			item_state,
			building_id,
			item_slot_group_id
		FROM item
		NATURAL INNER JOIN building
		WHERE spaceship_id = ?1
		;
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		id,          _, err := s.ScanInt64 (0); if err != nil { return err }
		typeId,      _, err := s.ScanInt64 (1); if err != nil { return err }
		state,       _, err := s.ScanDouble(2); if err != nil { return err }
		buildingId,  _, err := s.ScanInt64 (3); if err != nil { return err }
		slotGroupId, err := getNullInt64(s, 4); if err != nil { return err }
		
		rowHandler(
			id,
			typeId,
			state,
			buildingId,
			slotGroupId,
		)
		
		return nil
	}, spaceShipId)
	if err != nil {
		log.Panic(err)
	}
}
