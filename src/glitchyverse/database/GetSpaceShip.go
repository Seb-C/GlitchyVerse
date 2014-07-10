package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetSpaceShip(spaceShipId int64) (name string, position [3]float64, rotation [3]float64, found bool) {
	s, err := db.Prepare(`
		SELECT
			spaceship_name,
			spaceship_position_x,
			spaceship_position_y,
			spaceship_position_z,
			spaceship_rotation_x,
			spaceship_rotation_y,
			spaceship_rotation_z
		FROM spaceship
		WHERE spaceship_id = ?1
		;
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		name,        _      = s.ScanText  (0)
		position[0], _, err = s.ScanDouble(1); if err != nil { return err }
		position[1], _, err = s.ScanDouble(2); if err != nil { return err }
		position[2], _, err = s.ScanDouble(3); if err != nil { return err }
		rotation[0], _, err = s.ScanDouble(4); if err != nil { return err }
		rotation[1], _, err = s.ScanDouble(5); if err != nil { return err }
		position[2], _, err = s.ScanDouble(6); if err != nil { return err }
		
		return nil
	}, spaceShipId)
	if err != nil {
		log.Panic(err)
	}
	
	return
}