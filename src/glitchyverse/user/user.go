/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Sébastien CAPARROS (GlitchyVerse)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

package user

import (
	"log"
	"time"
	"strconv"
	"github.com/gorilla/websocket"
	"glitchyverse/space"
	"glitchyverse/database"
	"encoding/json"
	"crypto/sha1"
	"encoding/hex"
)

const (
	SpaceShipMaxSpeedPerPropellerUnit = 20
	MoveMaximumErrorRate = 0.1 // The maximum difference rate when the client sends new position
)

type User struct {
	Socket *websocket.Conn
	UserId int64
	SpaceShipId int64
	Name string
	Position [3]float64
	Rotation [3]float64
	lastPositionUpdateTime time.Time
}

var users = make(map[*User]bool)

// TODO block double login

func NewUser(socket *websocket.Conn) *User {
	user := &User{Socket: socket}
	users[user] = true // TODO synchronize it ?
	user.SendMessage("authQuery", nil)
	return user
}

func LoopUsers(callBack func(user *User)) {
	for k := range users {
		callBack(k)
	}
}

func (user *User) GetPosition() [3]float64 {
	return user.Position
}

func (user *User) Disconnect() {
	user.SendMessageBroadcast("deleteSpaceship", user.SpaceShipId, true)
	db.DeleteUserOnline(user.UserId)
	delete(users, user) // TODO synchronize it ?
	user.Socket.Close()
}

func (user *User) SendMessage(method string, data interface{}) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Panic(err)
	}
	
	err = user.Socket.WriteMessage(websocket.TextMessage, []byte(method + "#" + string(jsonData)))
	if err != nil {
		log.Panic(err)
	}
}

func (user *User) SendMessageBroadcast(method string, data interface{}, exceptCurrentUser bool) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		log.Panic(err)
	}
	
	for k := range users {
		if !exceptCurrentUser || k != user {
			err = k.Socket.WriteMessage(websocket.TextMessage, []byte(method + "#" + string(jsonData)))
			if err != nil {
				log.Panic(err)
			}
		}
	}
}

func (user *User) SendSpaceContent(data []space.Body) {
	user.SendMessage("data_spaceContent", data)
}

func (user *User) SendVisibleChunks() {
	space.SendVisibleChunks(user)
}

func (user *User) Connect(name, password string) {
	if user.UserId > 0 {
		return
	}
	
	encodedPass := sha1.Sum([]byte(name + password))
	hashPass := hex.EncodeToString(encodedPass[:])
	user.UserId = db.GetUserId(name, hashPass)
	
	result := struct{
		Message string `json:"message"`
		IsValid bool   `json:"isValid"`
	}{}
	
	result.IsValid = (user.UserId > 0)
	
	if result.IsValid {
		user.SpaceShipId = db.GetFirstSpaceShipId(user.UserId)
		user.Name, user.Position, user.Rotation, _ = db.GetSpaceShip(user.SpaceShipId)
		user.lastPositionUpdateTime = time.Now()
		result.Message = "Connection success !"
	} else {
		result.Message = "Name or password isn't valid."
	}
	
	user.SendMessage("authResult", result)
	
	if result.IsValid {
		db.InsertUserOnline(user.UserId, user.SpaceShipId)
		
		// Sending types data (TODO cache this data instead of re-creating it every time)
		user.SendBuildingTypesDefinition()
		user.SendItemGroupsDefinition()
		user.SendItemTypesDefinition()
		
		// Sending spaceship data
		user.SendSpaceShipData()
		user.SendVisibleChunks()
	}
}

func (user *User) SendItemVariation() {
	result := struct{
		SpaceShipId int64         `json:"spaceshipId"`
		Items       []interface{} `json:"items"`
	}{user.SpaceShipId, make([]interface{}, 0)}
	
	db.GetNewStatesFromItemVariation(user.SpaceShipId, func(itemId int64, newItemState float64, buildingId int64) {
		result.Items = append(result.Items, struct{
			ItemId       int64   `json:"itemId"`
			NewItemState float64 `json:"newItemState"`
			BuildingId   int64   `json:"buildingId"`
		}{itemId, newItemState, buildingId})
	})
	
	if len(result.Items) > 0 {
		user.SendMessage("updateItemsStates", result)
	}
}

func (user *User) SendDisabledBuildings() {
	result := struct{
		SpaceShipId int64   `json:"spaceshipId"`
		BuildingIds []int64 `json:"buildingIds"`
	}{user.SpaceShipId, make([]int64, 0)}
	
	db.GetNewStatesFromItemVariation(user.SpaceShipId, func(itemId int64, newItemState float64, buildingId int64) {
		result.BuildingIds = append(result.BuildingIds, buildingId)
	})
	
	if len(result.BuildingIds) > 0 {
		user.SendMessage("disableBuildings", result)
	}
}

func (user *User) SendSpaceShipData() {
	// Preparing items list
	itemsListById := make(map[string][]interface{})
	db.GetItems(user.SpaceShipId, func(id, typeId int64, state float64, buildingId int64, slotGroupId *int64) {
		itemList, ok := itemsListById[strconv.FormatInt(buildingId, 10)]
		if !ok {
			itemList = make([]interface{}, 0)
		}
		
		itemsListById[strconv.FormatInt(buildingId, 10)] = append(itemList, struct{
			Id          int64   `json:"id"`
			TypeId      int64   `json:"typeId"`
			State       float64 `json:"state"`
			SlotGroupId *int64  `json:"slotGroupId"`
		}{id, typeId, state, slotGroupId})
	})
	
	// Preparing buildings list
	buildings := make([]interface{}, 0)
	db.GetBuildings(user.SpaceShipId, -1, func(
		id int64,
		typeId int64,
		position [3]float64,
		rotation [4]float64,
		size [3]float64,
		state float64,
		isBuilt bool,
		seed *string,
		isEnabled bool,
	) {
		itemList, ok := itemsListById[strconv.FormatInt(id, 10)]
		if !ok {
			itemList = make([]interface{}, 0)
		}
		
		buildings = append(buildings, struct{
			Id        int64         `json:"id"`
			TypeId    int64         `json:"typeId"`
			Position  [3]float64    `json:"position"`
			Rotation  [4]float64    `json:"rotation"`
			Size      [3]float64    `json:"size"`
			State     float64       `json:"state"`
			IsBuilt   bool          `json:"isBuilt"`
			IsEnabled bool          `json:"isEnabled"`
			Seed      *string       `json:"seed"`
			Items     []interface{} `json:"items"`
		}{
			id,
			typeId,
			position,
			rotation,
			size,
			state,
			isBuilt,
			isEnabled,
			seed,
			itemList,
		})
	})
	
	// Preparing data to send
	spaceShipData := struct{
		Id         int64                  `json:"id"`
		Owner      bool                   `json:"owner"`
		Name       string                 `json:"name"`
		Position   [3]float64             `json:"position"`
		Rotation   [3]float64             `json:"rotation"`
		Buildings  []interface{}          `json:"buildings"`
		Attributes map[string]interface{} `json:"attributes"`
	}{
		user.SpaceShipId,
		true,
		user.Name,
		user.Position,
		user.Rotation,
		buildings,
		map[string]interface{} {
			"maxSpeedPerPropellerUnit": SpaceShipMaxSpeedPerPropellerUnit,
		},
	}
	
	// Sending spaceship definition to user
	user.SendMessage("data_spaceship", spaceShipData)
	
	// Sending spaceship definition to all users
	spaceShipData.Owner = false
	user.SendMessageBroadcast("data_spaceship", spaceShipData, true)
}

func (user *User) UpdatePropellers(propellerId int64, powerLevel float64) {
	db.SetPropellersPowerRate(user.SpaceShipId, propellerId, powerLevel)
	
	user.SendMessageBroadcast("updatePropellers", struct{
		SpaceshipId int64   `json:"spaceshipId"`
		Id          int64   `json:"id"`
		Power       float64 `json:"power"`
	}{user.SpaceShipId, propellerId, powerLevel}, true)
}

func (user *User) UpdateDoors(doorId int64, state float64) {
	db.SetBuildingsState(
		user.SpaceShipId,
		doorId,
		"Door", // TODO replace model by typeId here + block possibility to update multiple buildings at a time ?
		state,
	)
	// TODO send information to other clients ?
}

// TODO use a type instead of a map of interface{} everywhere

func (user *User) UpdatePosition(position [3]float64, rotation [3]float64) {
	time := time.Now()
	passedTime := time.Sub(user.lastPositionUpdateTime)
	user.lastPositionUpdateTime = time
	
	sendPositionToUser := false
	if db.SetSpaceShipPosition(
		user.SpaceShipId,
		SpaceShipMaxSpeedPerPropellerUnit,
		MoveMaximumErrorRate,
		passedTime.Seconds(),
		position,
		rotation,
	) {
		user.Position = position
		user.Rotation = rotation
		space.SendVisibleChunks(user)
	} else {
		sendPositionToUser = true
	}
	
	user.SendMessageBroadcast("updatePosition", struct{
		SpaceshipId int64      `json:"spaceshipId"`
		Position    [3]float64 `json:"position"`
		Rotation    [3]float64 `json:"rotation"`
	}{user.SpaceShipId, position, rotation}, !sendPositionToUser)
}

func (user *User) AddBuilding(typeId int64, position [3]float64, size [3]float64, rotation [4]float64) bool {
	var inserted bool
	var id int64
	
	db.DeferredTransaction(func() bool {
		inserted, id = db.InsertBuilding(user.SpaceShipId, typeId, position, size, rotation)
		return inserted
	})
	
	if inserted {
		db.GetBuildings(user.SpaceShipId, id, func(
			id int64,
			typeId int64,
			position [3]float64,
			rotation [4]float64,
			size [3]float64,
			state float64,
			isBuilt bool,
			seed *string,
			isEnabled bool,
		) {
			user.SendMessageBroadcast("addBuilding", struct{
				Id          int64         `json:"id"`
				TypeId      int64         `json:"typeId"`
				SpaceshipId int64         `json:"spaceshipId"`
				Position    [3]float64    `json:"position"`
				Rotation    [4]float64    `json:"rotation"`
				Size        [3]float64    `json:"size"`
				State       float64       `json:"state"`
				IsBuilt     bool          `json:"isBuilt"`
				IsEnabled   bool          `json:"isEnabled"`
				Seed        *string       `json:"seed"`
				Items       []interface{} `json:"items"`
			}{
				id,
				typeId,
				user.SpaceShipId,
				position,
				rotation,
				size,
				state,
				isBuilt,
				isEnabled,
				seed,
				make([]interface{}, 0), // Items array is always empty after creation
			}, false)
		})
	}
	
	return inserted
}

// TODO are database last inserted id and inserted row count thread-safe ?

func (user *User) DeleteBuilding(buildingId int64) bool {
	var ret bool
	db.DeferredTransaction(func() bool {
		if db.DeleteBuilding(user.SpaceShipId, buildingId) {
			user.SendMessageBroadcast("deleteBuilding", struct{
				BuildingId  int64 `json:"buildingId"`
				SpaceshipId int64 `json:"spaceshipId"`
			}{buildingId, user.SpaceShipId}, false)
			
			ret = true
		} else {
			ret = false
		}
		
		return ret
	})
	
	return ret
}

func (user *User) MoveItem(itemId int64, buildingId int64, slotGroupId int64) {
	if db.MoveItem(user.SpaceShipId, itemId, buildingId, slotGroupId) {
		// NOTE : the enabled state is implicitly updated client side by the "moveItem" action
		db.SetBuildingEnabled(user.SpaceShipId, buildingId, true)
		
		user.SendMessage("moveItem", struct{
			SpaceshipId       int64 `json:"spaceshipId"`
			ItemId            int64 `json:"itemId"`
			TargetBuildingId  int64 `json:"targetBuildingId"`
			TargetSlotGroupId int64 `json:"targetSlotGroupId"`
		}{user.SpaceShipId, itemId, buildingId, slotGroupId}) // TODO broadcast ?!?
	}
}

func (user *User) AchieveBuilding(buildingId int64) {
	db.DeferredTransaction(func() bool {
		if db.SetBuildingBuilt(user.SpaceShipId, buildingId) {
			db.DeleteItems(user.SpaceShipId, buildingId)
			
			user.SendMessage("achieveBuilding", struct{
				SpaceshipId int64 `json:"spaceshipId"`
				BuildingId  int64 `json:"buildingId"`
			}{user.SpaceShipId, buildingId}) // TODO broadcast ?!?
			
			return true
		} else {
			return false
		}
	})
}

func (user *User) SendItemGroupsDefinition() {
	definition := make(map[string]string)
	db.GetItemGroups(func(id int64, name string) {
		definition[strconv.FormatInt(id, 10)] = name
	})
	user.SendMessage("data_itemGroupsDefinition", definition)
}

func (user *User) SendItemTypesDefinition() {
	itemGroups := make(map[string][]int64)
	db.GetItemTypesInItemGroups(func(typeId, groupId int64) {
		groups, ok := itemGroups[strconv.FormatInt(typeId, 10)]
		if !ok {
			groups = make([]int64, 0)
		}
		itemGroups[strconv.FormatInt(typeId, 10)] = append(groups, groupId)
	})
	
	definition := make([]interface{}, 0)
	db.GetItemTypes(func(id int64, name string, maxState float64) {
		groups := itemGroups[strconv.FormatInt(id, 10)]
		if groups == nil {
			groups = make([]int64, 0)
		}
		
		definition = append(definition, struct{
			Id       int64   `json:"id"`
			Name     string  `json:"name"`
			MaxState float64 `json:"maxState"`
			Groups   []int64 `json:"groups"`
		}{id, name, maxState, groups})
	})
	
	user.SendMessage("data_itemTypesDefinition", definition)
}

func (user *User) SendBuildingTypesDefinition() {
	itemSlots := make(map[string][]interface{})
	db.GetItemSlots(func(buildingTypeId, itemGroupId int64, whenBuilding bool, maxAmount int64, variation float64) {
		slots, ok := itemSlots[strconv.FormatInt(buildingTypeId, 10)]
		if !ok {
			slots = make([]interface{}, 0)
		}
		itemSlots[strconv.FormatInt(buildingTypeId, 10)] = append(slots, struct{
			Group          int64   `json:"group"`
			WhenBuilding   bool    `json:"whenBuilding"`
			MaximumAmount  int64   `json:"maximumAmount"`
			StateVariation float64 `json:"stateVariation"`
		}{itemGroupId, whenBuilding, maxAmount, variation})
	})
	
	definition := make([]interface{}, 0)
	db.GetBuildingTypes(func(
		id int64,
		name string,
		category *string,
		model string,
		isGap bool,
		defaultState float64,
		isSizeable bool,
		isContainer bool,
		isInside *bool,
		isPositionByRoomUnit bool,
		minState float64,
		maxState float64,
		canExertThrust bool,
		isControllable bool,
	) {
		slots := itemSlots[strconv.FormatInt(id, 10)]
		if slots == nil {
			slots = make([]interface{}, 0)
		}
		
		definition = append(definition, struct{
			Id                   int64         `json:"id"`
			Name                 string        `json:"name"`
			Category             *string       `json:"category"`
			Model                string        `json:"model"`
			IsGap                bool          `json:"isGap"`
			DefaultState         float64       `json:"defaultState"`
			IsSizeable           bool          `json:"isSizeable"`
			IsContainer          bool          `json:"isContainer"`
			IsInside             *bool         `json:"isInside"`
			IsPositionByRoomUnit bool          `json:"isPositionByRoomUnit"`
			MinState             float64       `json:"minState"`
			MaxState             float64       `json:"maxState"`
			CanExertThrust       bool          `json:"canExertThrust"`
			IsControllable       bool          `json:"isControllable"`
			Slots                []interface{} `json:"slots"`
		}{
			id,
			name,
			category,
			model,
			isGap,
			defaultState,
			isSizeable,
			isContainer,
			isInside,
			isPositionByRoomUnit,
			minState,
			maxState,
			canExertThrust,
			isControllable,
			slots,
		})
	})
	
	user.SendMessage("data_buildingTypesDefinition", definition)
}
