package db

import (
	"log"
)

// Moves an item to another building inventory
func MoveItem(spaceShipId int64, itemId int64, targetBuildingId int64, targetSlotGroupId int) {
	// TODO change the filter on spaceships to allow exchanges between spaceships ?
	err := db.Exec(`
		UPDATE item SET
			building_id = ?3,
			item_slot_group_id = ?4
		WHERE item_id = ?2
		AND building_id IN (
			SELECT building_id
			FROM building
			WHERE spaceship_id = ?1
		)
		AND (
			SELECT COUNT(*)
			FROM building
			INNER JOIN item_slot ON building.building_type_id = item_slot.building_type_id
			INNER JOIN item_type_in_item_group ON item_type_in_item_group.item_group_id = item_slot.item_group_id
			WHERE building.spaceship_id = ?1
			AND building.building_id = ?3
			AND item_slot.item_slot_when_building = (1 - building.building_is_built)
			AND item_type_in_item_group.item_type_id = (
				SELECT item_type_id
				FROM item
				WHERE item_id = ?2
			)
			AND (
				SELECT COUNT(*)
				FROM item
				WHERE building_id = ?3
				AND item_slot_group_id = ?4
			) < item_slot.item_slot_maximum_amount
		) > 0
		;
	`, spaceShipId, itemId, targetBuildingId, targetSlotGroupId)
	if err != nil {
		log.Fatal(err)
	}
}
