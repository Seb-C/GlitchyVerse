package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetItemSlots(rowHandler func(buildingTypeId, itemGroupId int64, whenBuilding bool, maxAmount int64, variation float64)) {
	s, err := db.Prepare(`
		SELECT
			building_type_id,
			item_group_id,
			item_slot_when_building,
			item_slot_maximum_amount,
			item_slot_state_variation
		FROM item_slot
		NATURAL INNER JOIN item_group
		ORDER BY
			CASE WHEN item_group_id = 0 THEN 1 ELSE 0 END ASC, -- "any" slots at last
			item_group_name
	`)
	if err != nil {
		log.Fatal(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		buildingTypeId,  _, err := s.ScanInt64 (0); if err != nil { return err }
		itemGroupId,     _, err := s.ScanInt64 (1); if err != nil { return err }
		whenBuilding,    _, err := s.ScanBool  (2); if err != nil { return err }
		maxAmount,       _, err := s.ScanInt64 (3); if err != nil { return err }
		variation,       _, err := s.ScanDouble(4); if err != nil { return err }
		
		rowHandler(
			buildingTypeId,
			itemGroupId,
			whenBuilding,
			maxAmount,
			variation,
		)
		
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
}