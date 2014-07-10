package db

import (
	"log"
)

// Changes the state of a building from "not built" to "built", only if the requirements (items) are met
func SetBuildingBuilt(spaceShipId int64, buildingId int64) bool {
	changes, err := db.ExecDml(`
		UPDATE building
		SET building_is_built = 1
		WHERE spaceship_id = ?1
		AND building_id = ?2
		AND building_is_built = 0
		AND (
			SELECT SUM(item_slot_maximum_amount) * building_size_x * building_size_y * building_size_z
			FROM building
			INNER JOIN item_slot ON building.building_type_id = item_slot.building_type_id
			WHERE item_slot.item_slot_when_building = 1
			AND building.building_id = ?2
		) = (
			SELECT COUNT(*)
			FROM item
			WHERE building_id = ?2
		);
	`, spaceShipId, buildingId)
	if err != nil {
		log.Panic(err)
	}
	
	return (changes > 0)
}
