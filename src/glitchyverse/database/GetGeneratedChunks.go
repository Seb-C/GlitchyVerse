package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

// Returns the position of the chunks which has already been generated in the given coordinates range
func GetGeneratedChunks(min, max [3]int64) [][3]int64 {
	s, err := db.Prepare(`
		SELECT
			chunk_position_x,
			chunk_position_y,
			chunk_position_z
		FROM chunk
		WHERE chunk_position_x >= ?1 AND chunk_position_x <= ?4
		AND   chunk_position_y >= ?2 AND chunk_position_y <= ?5
		AND   chunk_position_z >= ?3 AND chunk_position_z <= ?6
		ORDER BY 1, 2, 3 -- Required by space.go optimized loops
		;
	`)
	if err != nil {
		log.Panic(err)
	}
	
	chunks := make([][3]int64, 0)
	
	err = s.Select(func(s *sqlite.Stmt) error {
		var pos [3]int64
		var err error
		
		pos[0], _, err = s.ScanInt64(0); if err != nil { return err }
		pos[1], _, err = s.ScanInt64(1); if err != nil { return err }
		pos[2], _, err = s.ScanInt64(2); if err != nil { return err }
		
		chunks = append(chunks, pos)
		
		return nil
	}, min[0], min[1], min[2], max[0], max[1], max[2])
	if err != nil {
		log.Panic(err)
	}
	
	return chunks
}