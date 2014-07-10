package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetItemTypes(rowHandler func(id int64, name string, maxState float64)) {
	s, err := db.Prepare(`
		SELECT
			item_type_id,
			item_type_name,
			item_type_max_state
		FROM item_type

	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		typeId,   _, err := s.ScanInt64(0); if err != nil { return err }
		name,     _ := s.ScanText(1)
		maxState, _, err := s.ScanDouble(2); if err != nil { return err }
		
		rowHandler(
			typeId,
			name,
			maxState,
		)
		
		return nil
	})
	if err != nil {
		log.Panic(err)
	}
}