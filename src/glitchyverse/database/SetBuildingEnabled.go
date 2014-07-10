package db

import (
	"log"
)

func SetBuildingEnabled(spaceShipId int64, buildingId int64, isEnabled bool) {
	err := db.Exec(`
		UPDATE building
		SET building_is_enabled = ?3
		WHERE spaceship_id = ?1
		AND building_id = ?2
		;
	`, spaceShipId, buildingId, isEnabled)
	if err != nil {
		log.Panic(err)
	}
}
