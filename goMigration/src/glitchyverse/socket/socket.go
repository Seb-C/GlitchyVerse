package socket

import (
	"fmt"
	"log"
	"net/http"
	"github.com/gorilla/websocket"
	"glitchyverse/user"
	"encoding/json"
	"errors"
)

var users []user.User // TODO use it

var upgrader = websocket.Upgrader{}

func Handler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	
	if err != nil {
		if _, ok := err.(websocket.HandshakeError); !ok {
			log.Fatal(err)
		}
		return
	}
	
	for {
		_, rawMessage, err := ws.ReadMessage()
		if err != nil {
			log.Println(err)
			break
		}
		
		err = handleMessage(rawMessage)
		if(err != nil) {
			log.Println(err)
			break
		}
		
		log.Println(string(rawMessage))
		ws.WriteMessage(websocket.TextMessage, []byte("Server received : " + string(rawMessage)))
	}
	
	// TODO before returning, remove User with specific function
}

func handleMessage(rawMessage []byte) (err error) {
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
	
	err = method(message[1])
	
	return
}

var methods = map[string]func(data interface{}) (err error) {
	"test": func(data interface{}) (err error) {
		return
	},
	
}