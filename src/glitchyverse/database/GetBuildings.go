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

func GetBuildings(spaceShipId int64, buildingId int64, rowHandler func(
	id int64,
	typeId int64,
	position [3]float64,
	rotation [4]float64,
	size [3]float64,
	state float64,
	isBuilt bool,
	seed *string,
	isEnabled bool,
)) {
	s, err := db.Prepare(`
		SELECT
			building_id,
			building_type_id,
			building_position_x,
			building_position_y,
			building_position_z,
			building_rotation_x,
			building_rotation_y,
			building_rotation_z,
			building_rotation_w,
			building_size_x,
			building_size_y,
			building_size_z,
			building_state,
			building_is_built,
			building_seed,
			building_is_enabled
		FROM spaceship
		NATURAL INNER JOIN building
		WHERE spaceship_id = ?1
		AND (?2 IS NULL OR ?2 <= 0 OR building_id = ?2)
		;
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		var position [3]float64
		var rotation [4]float64
		var size [3]float64
		var err error
		
		id,          _, err := s.ScanInt64 (0 ); if err != nil { return err }
		typeId,      _, err := s.ScanInt64 (1 ); if err != nil { return err }
		position[0], _, err  = s.ScanDouble(2 ); if err != nil { return err }
		position[1], _, err  = s.ScanDouble(3 ); if err != nil { return err }
		position[2], _, err  = s.ScanDouble(4 ); if err != nil { return err }
		rotation[0], _, err  = s.ScanDouble(5 ); if err != nil { return err }
		rotation[1], _, err  = s.ScanDouble(6 ); if err != nil { return err }
		rotation[2], _, err  = s.ScanDouble(7 ); if err != nil { return err }
		rotation[3], _, err  = s.ScanDouble(8 ); if err != nil { return err }
		size[0],     _, err  = s.ScanDouble(9 ); if err != nil { return err }
		size[1],     _, err  = s.ScanDouble(10); if err != nil { return err }
		size[2],     _, err  = s.ScanDouble(11); if err != nil { return err }
		state,       _, err := s.ScanDouble(12); if err != nil { return err }
		isBuilt,     _, err := s.ScanBool  (13); if err != nil { return err }
		seed                := getNullString(s, 14)
		isEnabled,   _, err := s.ScanBool  (15); if err != nil { return err }
		
		rowHandler(
			id,
			typeId,
			position,
			rotation,
			size,
			state,
			isBuilt,
			seed,
			isEnabled,
		)
		
		return nil
	}, spaceShipId, buildingId)
	if err != nil {
		log.Panic(err)
	}
}
