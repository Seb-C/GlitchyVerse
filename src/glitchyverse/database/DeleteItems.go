package db

import (
	"log"
)

// Removes all items from a building inventory
func DeleteItems(spaceShipId int64, buildingId int64) {
	err := db.Exec(`
		DELETE FROM item
		WHERE building_id = ?2
		AND building_id IN (
			SELECT building_id
			FROM building
			WHERE spaceship_id = ?1
		);
	`, spaceShipId, buildingId)
	if err != nil {
		log.Panic(err)
	}
}
