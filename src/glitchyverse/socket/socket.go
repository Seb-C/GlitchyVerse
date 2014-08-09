package socket

import (
	"fmt"
	"log"
	"runtime"
	"net/http"
	"strings"
	"github.com/gorilla/websocket"
	"glitchyverse/user"
	"encoding/json"
	"errors"
)

var sockets = make(map[*user.User]bool)

var upgrader = websocket.Upgrader{}

func Handler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	
	if err != nil {
		if _, ok := err.(websocket.HandshakeError); !ok {
			log.Println(err)
		}
		return
	}
	
	user := user.NewUser(ws)
	defer user.Disconnect()
	
	for {
		_, rawMessage, err := ws.ReadMessage()
		if err != nil {
			break
		}
		
		err = handleMessage(user, rawMessage)
		if(err != nil) {
			log.Println(err)
			break
		}
	}
}

func handleMessage(user *user.User, rawMessage []byte) (err error) {
	defer func() {
		if r := recover(); r != nil {
            trace := make([]byte, 1024)
            runtime.Stack(trace, true)
			
			err = errors.New(fmt.Sprintf("%v\n===== Stack trace : =====\n%s", r, trace))
		}
	}()
	
	stringMessage := string(rawMessage)
	hashIndex := strings.Index(stringMessage, "#")
	methodName := stringMessage[:hashIndex]
	rawData := []byte(stringMessage[hashIndex + 1:])
	
	method, ok := methods[methodName]
	if !ok {
		return errors.New("Unknown method : " + methodName)
	}
	
	var data interface{}
	err = json.Unmarshal(rawData, &data)
	if err != nil {
		return
	}
	
	err = method(user, data)
	
	return
}

func toVec3(data interface{}) (r [3]float64) {
	d := data.([]interface{})
	for i, v := range d {
		r[i] = v.(float64)
	}
	return
}

func toVec4(data interface{}) (r [4]float64) {
	d := data.([]interface{})
	for i, v := range d {
		r[i] = v.(float64)
	}
	return
}

var methods = map[string]func(user *user.User, data interface{}) (err error) {
	"authAnswer": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.Connect(d["name"].(string), d["password"].(string))
		return
	},
	
	"updatePropellers": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.UpdatePropellers(int64(d["id"].(float64)), d["power"].(float64))
		return
	},
	
	"updateDoors": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.UpdateDoors(int64(d["id"].(float64)), d["state"].(float64))
		return
	},
	
	"updatePosition": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.UpdatePosition(toVec3(d["position"]), toVec3(d["rotation"]))
		return
	},
	
	// TODO better and unique way to update building, with boolean indicating if the building is freely updatable or not
	
	"buildQuery": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.AddBuilding(
			int64(d["typeId"].(float64)),
			toVec3(d["position"]),
			toVec3(d["size"]),
			toVec4(d["rotation"]),
		)
		return
	},
	
	"destroyQuery": func(user *user.User, data interface{}) (err error) {
		user.DeleteBuilding(int64(data.(float64)))
		return
	},
	
	"moveItemQuery": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.MoveItem(
			int64(d["itemId"].(float64)),
			int64(d["buildingId"].(float64)),
			int64(d["slotGroupId"].(float64)),
		)
		return
	},
	
	"achieveBuildingQuery": func(user *user.User, data interface{}) (err error) {
		user.AchieveBuilding(int64(data.(float64)))
		return
	},
}
