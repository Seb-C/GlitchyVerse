package socket

import (
	"fmt"
	"log"
	"net/http"
	"github.com/gorilla/websocket"
	"glitchyverse/user"
	"glitchyverse/database"
	"glitchyverse/space"
	"encoding/json"
	"errors"
)

var sockets = make(map[*user.User]*websocket.Conn)

var upgrader = websocket.Upgrader{}

func SendMessage(method string, data *interface{}, user *user.User) {
	jsonMessage, err := json.Marshal([]interface{}{method, data})
	if err != nil {
		log.Fatal(err)
	}
	
	err = user.Socket.WriteMessage(websocket.TextMessage, jsonMessage)
	if err != nil {
		log.Fatal(err)
	}
}

func LoopUsers(callBack func(user *user.Users)) {
	for k := range sockets {
		f(k)
	}
}

func SendMessageBroadcast(method string, data *interface{}, exceptUser *user.User) {
	jsonMessage, err := json.Marshal([]interface{}{method, data})
	if err != nil {
		log.Fatal(err)
	}
	
	for k, v := range sockets {
		if k != exceptUser {
			err = v.WriteMessage(websocket.TextMessage, jsonMessage)
			if err != nil {
				log.Fatal(err)
			}
		}
	}
}

func Handler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	
	if err != nil {
		if _, ok := err.(websocket.HandshakeError); !ok {
			log.Fatal(err)
		}
		return
	}
	
	user := user.NewUser(ws)
	sockets[user] = ws
	
	for {
		_, rawMessage, err := ws.ReadMessage()
		if err != nil {
			log.Println(err)
			break
		}
		
		err = handleMessage(user, rawMessage)
		if(err != nil) {
			log.Println(err)
			break
		}
		
		log.Println(string(rawMessage))
		ws.WriteMessage(websocket.TextMessage, []byte("Server received : " + string(rawMessage)))
	}
	
	// TODO before returning, remove User with specific function
}

func handleMessage(user *user.User, rawMessage []byte) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = errors.New(fmt.Sprintf("%v", r))
		}
	}()
	
	var message [2]interface{}
	err = json.Unmarshal(rawMessage, &message)
	if err != nil {
		return
	}
	
	methodName := message[0].(string)
	method, ok := methods[methodName]
	if !ok {
		return errors.New("Unknown method : " + methodName)
	}
	
	err = method(user, message[1])
	
	return
}

func toVector(data interface{}) (r []float64) {
	d := data.([]interface{})
	for i, v := range d {
		r[i] = v.(float64)
	}
	return
}

var methods = map[string]func(user *user.User, data interface{}) (err error) {
	"auth_answer": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		ok := user.Connect(d["name"].(string), d["password"].(string))
		var message string
		if ok {
			message = "Connection success !"
		} else {
			message = "Name or password isn't valid."
		}
		
		SendMessage("auth_result", map[string]interface{}{
			"message": message,
			"is_valid": ok,
		}, user)
		
		if ok {
			InsertUserOnline(user.UserId, user.SpaceShipId)
			
			// Sending types data (TODO !!!)
			//self.send_message("data_building_types_definition", $BUILDING_TYPES_DEFINITION, user)
			//self.send_message("data_item_groups_definition",    $ITEM_GROUPS_DEFINITION,    user)
			//self.send_message("data_item_types_definition",     $ITEM_TYPES_DEFINITION,     user)
			
			// Sending spaceship data
			user.SendSpaceShipData()
			space.SendVisibleChunks(user)
		}
		
		return
	},
	
	"update_propellers": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.UpdatePropellers(int64(d["id"].(float64)), d["power"].(float64))
		return
	},
	
	"update_doors": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.UpdateDoors(int64(d["id"].(float64)), d["state"].(float64))
		return
	},
	
	"update_position": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.UpdatePosition(toVector(d["position"]), toVector(d["rotation"]))
		return
	},
	
	// TODO better and unique way to update building, with boolean indicating if the building is freely updatable or not
	
	"build_query": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.AddBuilding(
			int64(d["type_id"].(float64)),
			toVector(d["position"]),
			toVector(d["size"]),
			toVector(d["rotation"]),
		)
		return
	},
	
	"destroy_query": func(user *user.User, data interface{}) (err error) {
		user.DeleteBuilding(int64(data.(float64)))
		return
	},
	
	"move_item_query": func(user *user.User, data interface{}) (err error) {
		d := data.(map[string]interface{})
		user.MoveItem(
			int64(d["item_id"].(float64)),
			int64(d["building_id"].(float64)),
			int64(d["slot_group_id"].(float64)),
		)
		return
	},
	
	"achieve_building_query": func(user *user.User, data interface{}) (err error) {
		user.AchieveBuilding(int64(data.(float64)))
		return
	},
}

// TODO methods names to CamelCase
