package db

import (
	"log"
	"github.com/gwenn/gosqlite"
)

func GetUserId(name, password string) (userId int64) {
	s, err := db.Prepare(`
		SELECT 
			user_id
		FROM user
		WHERE user_name = ?1
		AND user_password = ?2
	`)
	if err != nil {
		log.Panic(err)
	}
	
	err = s.Select(func(s *sqlite.Stmt) error {
		userId, _, err = s.ScanInt64(0)
		if err != nil {
			return err
		}
		
		return nil
	}, name, password)
	if err != nil {
		log.Panic(err)
	}
	
	return
}