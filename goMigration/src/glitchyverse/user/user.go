package user

import (
	"github.com/gorilla/websocket"
	"time"
	"glitchyverse/database"
	"glitchyverse/socket"
)

func StartItemProductionThread() {
	// Item production / consumption thread
	itemVariationDelay := 3 * time.Seconds
	
	go func() {
		lastUpdateTime := time.Now()
		
		for {
			time.Sleep(itemVariationDelay)
			
			currentTime := time.Now()
			passedTime = currentTime.Sub(lastUpdateTime)
			lastUpdateTime = currentTime
			
			db.ItemsProductionTick(passedTime)
		}
	}()
}

type User struct {
	Socket *websocket.Conn
}

func NewUser(socket *websocket.Conn) *User {
	return User {socket}
}
