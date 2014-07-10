package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetFirstSpaceShipId(userId int64) (spaceShipId int64) {
	s, err := db.Prepare(`
		SELECT MIN(spaceship_id) AS spaceship_id
		FROM spaceship
		WHERE user_id = ?1
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		spaceShipId, _, err = s.ScanInt64(0)
		if err != nil {
			return err
		}
		
		return nil
	}, userId)
	if err != nil {
		log.Panic(err)
	}
	
	return
}