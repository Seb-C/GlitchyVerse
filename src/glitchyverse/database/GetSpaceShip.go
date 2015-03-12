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

func GetSpaceShip(spaceShipId int64) (name string, position [3]float64, rotation [3]float64, found bool) {
	s, err := db.Prepare(`
		SELECT
			spaceship_name,
			spaceship_position_x,
			spaceship_position_y,
			spaceship_position_z,
			spaceship_rotation_x,
			spaceship_rotation_y,
			spaceship_rotation_z
		FROM spaceship
		WHERE spaceship_id = ?1
		;
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		name,        _      = s.ScanText  (0)
		position[0], _, err = s.ScanDouble(1); if err != nil { return err }
		position[1], _, err = s.ScanDouble(2); if err != nil { return err }
		position[2], _, err = s.ScanDouble(3); if err != nil { return err }
		rotation[0], _, err = s.ScanDouble(4); if err != nil { return err }
		rotation[1], _, err = s.ScanDouble(5); if err != nil { return err }
		position[2], _, err = s.ScanDouble(6); if err != nil { return err }
		
		return nil
	}, spaceShipId)
	if err != nil {
		log.Panic(err)
	}
	
	return
}
