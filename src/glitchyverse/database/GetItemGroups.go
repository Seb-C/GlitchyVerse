package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetItemGroups(rowHandler func(id int64, name string)) {
	s, err := db.Prepare(`
		SELECT
			item_group_id,
			item_group_name
		FROM item_group
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		id,   _, err := s.ScanInt64(0); if err != nil { return err }
		name, _      := s.ScanText (1)
		
		rowHandler(
			id,
			name,
		)
		
		return nil
	})
	if err != nil {
		log.Panic(err)
	}
}