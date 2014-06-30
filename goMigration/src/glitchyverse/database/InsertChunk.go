package db

import (
	"log"
)

// Inserts a chunk in the list of generated chunk
func InsertChunk(position [3]float64) {
	err := db.Exec(`
		INSERT INTO chunk (
			chunk_position_x,
			chunk_position_y,
			chunk_position_z
		) VALUES (
			?1,
			?2,
			?3
		);
	`, position[0], position[1], position[2])
	if err != nil {
		log.Fatal(err)
	}
}
