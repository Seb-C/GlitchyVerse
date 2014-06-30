package db

import (
	"log"
)

func InsertBody(typeId int, parentId int64, position [3]float64, radius float64, seed float64) {
	err := db.Exec(`
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
	`, typeId, parentId, position[0], position[1], position[2], radius, seed)
	if err != nil {
		log.Fatal(err)
	}
}
