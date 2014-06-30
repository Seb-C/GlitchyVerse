package db

import (
	"log"
)

func GetUserId(name, password string) (userId int64, found bool) {
	s, err := db.Prepare(`
		SELECT 
			user_id
		FROM user
		WHERE user_name = ?1
		AND user_password = ?2
	`)
	if err != nil {
		log.Fatal(err)
	}
	
	found, err = s.SelectOneRow(name, password)
	if err != nil {
		log.Fatal(err)
	}
	
	if found {
		userId, _, err = s.ScanInt64(0)
		if err != nil {
			log.Fatal(err)
		}
	}
	
	return
}