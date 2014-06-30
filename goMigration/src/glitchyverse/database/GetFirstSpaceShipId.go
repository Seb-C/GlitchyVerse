package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetFirstSpaceShipId(userId int64, rowHandler func(spaceShipId int64)) {
	s, err := db.Prepare(`
		SELECT MIN(spaceship_id) AS spaceship_id
		FROM spaceship
		WHERE user_id = ?1
	`)
	if err != nil {
		log.Fatal(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		spaceShipId, _, err := s.ScanInt64(0); if err != nil { return err }
		
		rowHandler(
			spaceShipId,
		)
		
		return nil
	}, userId)
	if err != nil {
		log.Fatal(err)
	}
}