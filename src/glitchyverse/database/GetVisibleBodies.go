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

func GetVisibleBodies(position [3]float64, rowHandler func(
	id, typeId int64,
	parentId *int64,
	position [3]float64,
	radius float64,
	seed float64,
	typeName string,
	typeModel string,
	maxVisivilityDistance float64,
)) {
	s, err := db.Prepare(`
		SELECT
			body_id,
			body_type_id,
			body_parent_id,
			body_position_x,
			body_position_y,
			body_position_z,
			body_radius,
			body_seed,
			body_type_name,
			body_type_model,
			body_type_max_visibility_distance
		FROM body
		NATURAL JOIN body_type
		WHERE SQRT(
			  POW(body_position_x - ?1, 2)
			+ POW(body_position_y - ?2, 2)
			+ POW(body_position_z - ?3, 2)
		) <= body_type_max_visibility_distance
		;
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		var position [3]float64
		var err error
		
		id,          _, err := s.ScanInt64 (0 ); if err != nil { return err }
		typeId,      _, err := s.ScanInt64 (1 ); if err != nil { return err }
		parentId,     err := getNullInt64(s, 2); if err != nil { return err }
		position[0], _, err  = s.ScanDouble(3 ); if err != nil { return err }
		position[1], _, err  = s.ScanDouble(4 ); if err != nil { return err }
		position[2], _, err  = s.ScanDouble(5 ); if err != nil { return err }
		radius,      _, err := s.ScanDouble(6 ); if err != nil { return err }
		seed,        _, err := s.ScanDouble(7 ); if err != nil { return err }
		typeName,    _      := s.ScanText  (8 )
		typeModel,   _      := s.ScanText  (9 )
		maxViewDist, _, err := s.ScanDouble(10); if err != nil { return err }
		
		rowHandler(
			id,
			typeId,
			parentId,
			position,
			radius,
			seed,
			typeName,
			typeModel,
			maxViewDist,
		)
		
		return nil
	}, position[0], position[1], position[2])
	if err != nil {
		log.Panic(err)
	}
}





