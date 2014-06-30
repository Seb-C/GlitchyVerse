package db

import (
	"log"
)

// Returns false if the building deletion hasn't been allowed
func DeleteBuilding(spaceShipId int64, buildingId int64) bool {
	s, err := db.Prepare(`
		DELETE FROM building
		WHERE building_id = ?2
		AND spaceship_id = ?1

		-- Can't destroy un-buildable buildings such as characters
		AND building_type_id NOT IN (
			SELECT building_type_id
			FROM building_type
			WHERE building_type_category_id IS NULL
		)

		-- If the building is a container, checking that there is not a building inside it
		AND (
			building_type_id NOT IN (
				SELECT building_type_id
				FROM building_type
				WHERE building_type_is_container = 1
			) OR (
				SELECT COUNT(*)
				FROM building AS b
				NATURAL INNER JOIN building_type
				WHERE building.spaceship_id = b.spaceship_id
				AND building_type_is_inside = 1
				AND NOT (
					b.building_position_x > (building.building_position_x + building.building_size_x - 1)
					OR (b.building_position_x + b.building_size_x - 1) < building.building_position_x
				) AND NOT (
					b.building_position_y > (building.building_position_y + building.building_size_y - 1)
					OR (b.building_position_y + b.building_size_y - 1) < b.building_position_y
				) AND NOT (
					b.building_position_z > (building.building_position_z + building.building_size_z - 1)
					OR (b.building_position_z + b.building_size_z - 1) < b.building_position_z
				)
			) = 0
		) -- TODO bug when removing a room
		;
	`)
	if err != nil {
		log.Fatal(err)
	}
	changes, err := s.ExecDml(spaceShipId, buildingId)
	if err != nil {
		log.Fatal(err)
	}
	return changes > 0
}