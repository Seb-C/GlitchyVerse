package db

import (
	"log"
)

// Updates the state of one or multiple (buildingId = nil) building(s)
func SetBuildingsState(spaceShipId int64, buildingId int64, model string, state float64) {
	err := db.Exec(`
		UPDATE building
		SET building_state = ?4
		WHERE spaceship_id = ?1
		AND building_type_id IN (
			SELECT building_type_id
			FROM building_type
			WHERE building_type_model = ?3
			AND ?4 >= building_type_min_state
			AND ?4 <= building_type_max_state
		)
		AND building_is_built = 1
		AND building_is_enabled = 1
		AND (?2 IS NULL OR building_id = ?2)
		;
	`, spaceShipId, buildingId, model, state)
	if err != nil {
		log.Fatal(err)
	}
}
