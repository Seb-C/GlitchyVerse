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
