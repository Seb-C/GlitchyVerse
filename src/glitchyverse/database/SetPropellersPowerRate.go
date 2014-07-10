package db

import (
	"log"
)

// Updates the state of one or multiple (buildingId = nil) propeller(s), based on a rate (-1.0 .. 1.0)
func SetPropellersPowerRate(spaceShipId int64, buildingId int64, powerRate float64) {
	err := db.Exec(`
		UPDATE building
		SET building_state = (
			CASE
				WHEN ?3 < -1 THEN -1
				WHEN ?3 >  1 THEN  1
				ELSE ?3
			END
		) * (
			SELECT CASE
				WHEN ?3 < 0
				THEN -1 * T.building_type_min_state
				ELSE T.building_type_max_state
			END
			FROM building_type AS T
			WHERE T.building_type_id = building.building_type_id
		)
		WHERE spaceship_id = ?1
		AND building_type_id IN (
			SELECT building_type_id
			FROM building_type
			WHERE building_type_can_exert_thrust = 1
		)
		AND building_is_built = 1
		AND building_is_enabled = 1
		AND (:building_id IS NULL OR building_id = ?2)
		;
	`, spaceShipId, buildingId, powerRate)
	if err != nil {
		log.Panic(err)
	}
}
