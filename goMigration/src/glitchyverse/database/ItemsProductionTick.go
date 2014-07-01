package db

import (
	"log"
	"time"
	"github.com/gwenn/gosqlite"
	"glitchyverse/user"
)

// Inserts a chunk in the list of generated chunk
func ItemsProductionTick(elapsedTime time.Duration) {
	secondsPassed := elapsedTime.Seconds()
	
	db.Transaction(sqlite.Deferred, func(c *sqlite.Conn) error {
		PutDataIntoItemVariation(secondsPassed)
		UpdateItemVariationFromTemp()
		
		InsertIntoEmptiedBuildingsFromItemVariation()
		UpdateEmptiedBuildingsFromTemp()
		
		socket.LoopUsers(func(user *user.Users) {
			user.SendItemVariation()
			user.SendDisabledBuildings()
		})
		
		TruncateItemVariation()
		TruncateEmptiedBuildings()
	})
}
