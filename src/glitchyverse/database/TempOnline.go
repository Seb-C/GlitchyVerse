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

func createTableOnline() {
	err := db.Exec(`
		CREATE TEMPORARY TABLE temp_online (
			user_id INTEGER,
			spaceship_id INTEGER
		);
	`)
	if err != nil {
		log.Panic(err)
	}
}

func InsertUserOnline(userId int64, spaceShipId int64) {
	err := db.Exec(`
		INSERT INTO temp_online (
			user_id,
			spaceship_id
		) VALUES (
			?1,
			?2
		);
	`, userId, spaceShipId)
	if err != nil {
		log.Panic(err)
	}
}


func DeleteUserOnline(userId int64) {
	err := db.Exec(`
		DELETE FROM temp_online
		WHERE user_id = ?1
		;
	`, userId)
	if err != nil {
		log.Panic(err)
	}
}
