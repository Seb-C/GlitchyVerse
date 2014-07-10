package db

import (
	"log"
)

// Returns the id of the inserted body
// parentId <= 0 --> NULL
func InsertBody(typeId int, parentId int64, position [3]float64, radius float64, seed float64) int64 {
	s, err := db.Prepare(`
		INSERT INTO body (
			body_id,
			body_type_id,
			body_parent_id,
			body_position_x,
			body_position_y,
			body_position_z,
			body_radius,
			body_seed
		) VALUES (
			NULL,
			?1,
			?2,
			?3,
			?4,
			?5,
			?6,
			?7
		);
	`)
	if err != nil {
		log.Panic(err)
	}
	
	id, err := s.Insert(typeId, int64ToNull(parentId), position[0], position[1], position[2], radius, seed)
	if err != nil {
		log.Panic(err)
	}
	
	return id
}
