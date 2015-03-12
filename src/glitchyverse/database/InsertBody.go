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

// Returns the id of the inserted body
// parentId <= 0 --> NULL
func InsertBody(typeId int, parentId int64, position [3]float64, radius float64, seed float64) int64 {
	s, err := db.Prepare(`
		INSERT INTO body (
			body_id,
			body_type_id,
			body_parent_id,
			body_position_x,
			body_position_y,
			body_position_z,
			body_radius,
			body_seed
		) VALUES (
			NULL,
			?1,
			?2,
			?3,
			?4,
			?5,
			?6,
			?7
		);
	`)
	if err != nil {
		log.Panic(err)
	}
	
	id, err := s.Insert(typeId, int64ToNull(parentId), position[0], position[1], position[2], radius, seed)
	if err != nil {
		log.Panic(err)
	}
	
	return id
}
