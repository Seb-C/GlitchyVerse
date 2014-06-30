package db

import (
	"log"
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
		log.Fatal(err)
	}
	
	found, err = s.SelectOneRow(spaceShipId)
	if err != nil {
		log.Fatal(err)
	}
	
	if found {
		name,        _      = s.ScanText  (0); if err != nil { log.Fatal(err) }
		position[0], _, err = s.ScanDouble(1); if err != nil { log.Fatal(err) }
		position[1], _, err = s.ScanDouble(2); if err != nil { log.Fatal(err) }
		position[2], _, err = s.ScanDouble(3); if err != nil { log.Fatal(err) }
		rotation[0], _, err = s.ScanDouble(4); if err != nil { log.Fatal(err) }
		rotation[1], _, err = s.ScanDouble(5); if err != nil { log.Fatal(err) }
		position[2], _, err = s.ScanDouble(6); if err != nil { log.Fatal(err) }
	}
	
	return
}