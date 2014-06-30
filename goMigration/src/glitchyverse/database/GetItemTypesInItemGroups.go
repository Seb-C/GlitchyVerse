package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetItemTypesInItemGroups(rowHandler func(typeId, groupId int64)) {
	s, err := db.Prepare(`
		SELECT
			item_type_id,
			item_group_id
		FROM item_type_in_item_group
	`)
	if err != nil {
		log.Fatal(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		typeId,  _, err := s.ScanInt64(0); if err != nil { return err }
		groupId, _, err := s.ScanInt64(1); if err != nil { return err }
		
		rowHandler(
			typeId,
			groupId,
		)
		
		return nil
	})
	if err != nil {
		log.Fatal(err)
	}
}