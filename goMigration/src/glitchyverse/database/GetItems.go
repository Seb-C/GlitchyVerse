package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetItems(spaceShipId int64, rowHandler func(id, typeId int64, state float64, buildingId int64, slotGroupId int64)) {
	s, err := db.Prepare(`
		SELECT
			item_id,
			item_type_id,
			item_state,
			building_id,
			item_slot_group_id
		FROM item
		NATURAL INNER JOIN building
		WHERE spaceship_id = ?1
		;
	`)
	if err != nil {
		log.Fatal(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		id,          _, err := s.ScanInt64 (0); if err != nil { return err }
		typeId,      _, err := s.ScanInt64 (1); if err != nil { return err }
		state,       _, err := s.ScanDouble(2); if err != nil { return err }
		buildingId,  _, err := s.ScanInt64 (3); if err != nil { return err }
		slotGroupId, _, err := s.ScanInt64 (4); if err != nil { return err }
		
		rowHandler(
			id,
			typeId,
			state,
			buildingId,
			slotGroupId,
		)
		
		return nil
	}, spaceShipId)
	if err != nil {
		log.Fatal(err)
	}
}