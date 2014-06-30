package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetVisibleBodies(position [3]float64, rowHandler func(id, typeId, parentId int64, position [3]float64, radius float64, seed float64)) {
	s, err := db.Prepare(`
		SELECT
			body_id
			body_type_id
			body_parent_id
			body_position_x
			body_position_y
			body_position_z
			body_radius
			body_seed
		FROM body
		NATURAL JOIN body_type
		WHERE SQRT(
			  POW(body_position_x - ?1, 2)
			+ POW(body_position_y - ?2, 2)
			+ POW(body_position_z - ?3, 2)
		) <= body_type_max_visibility_distance
		;
	`)
	if err != nil {
		log.Fatal(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		var position [3]float64
		var err error
		
		id,          _, err := s.ScanInt64 (0); if err != nil { return err }
		typeId,      _, err := s.ScanInt64 (1); if err != nil { return err }
		parentId,    _, err := s.ScanInt64 (2); if err != nil { return err }
		position[0], _, err  = s.ScanDouble(3); if err != nil { return err }
		position[1], _, err  = s.ScanDouble(4); if err != nil { return err }
		position[2], _, err  = s.ScanDouble(5); if err != nil { return err }
		radius,      _, err := s.ScanDouble(5); if err != nil { return err }
		seed,        _, err := s.ScanDouble(5); if err != nil { return err }
		
		rowHandler(
			id,
			typeId,
			parentId,
			position,
			radius,
			seed,
		)
		
		return nil
	}, position[0], position[1], position[2])
	if err != nil {
		log.Fatal(err)
	}
}





