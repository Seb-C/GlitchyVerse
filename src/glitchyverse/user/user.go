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
	user.SendMessage("auth_query", nil)
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
	user.SendMessageBroadcast("delete_spaceship", user.SpaceShipId, true)
	db.DeleteUserOnline(user.UserId)
	delete(users, user) // TODO synchronize it ?
	user.Socket.Close()
}

func (user *User) SendMessage(method string, data interface{}) {
	jsonMessage, err := json.Marshal([]interface{}{method, data})
	if err != nil {
		log.Panic(err)
	}
	
	err = user.Socket.WriteMessage(websocket.TextMessage, jsonMessage)
	if err != nil {
		log.Panic(err)
	}
}

func (user *User) SendMessageBroadcast(method string, data interface{}, exceptCurrentUser bool) {
	jsonMessage, err := json.Marshal([]interface{}{method, data})
	if err != nil {
		log.Panic(err)
	}
	
	for k := range users {
		if !exceptCurrentUser || k != user {
			err = k.Socket.WriteMessage(websocket.TextMessage, jsonMessage)
			if err != nil {
				log.Panic(err)
			}
		}
	}
}

func (user *User) SendSpaceContent(data []map[string]interface{}) {
	user.SendMessage("data_space_content", data)
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
	
	connected := (user.UserId > 0)
	
	var message string
	if connected {
		user.SpaceShipId = db.GetFirstSpaceShipId(user.UserId)
		user.Name, user.Position, user.Rotation, _ = db.GetSpaceShip(user.SpaceShipId)
		user.lastPositionUpdateTime = time.Now()
		message = "Connection success !"
	} else {
		message = "Name or password isn't valid."
	}
	
	user.SendMessage("auth_result", map[string]interface{}{
		"message": message,
		"is_valid": connected,
	})
	
	if connected {
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
	newStates := make([]interface{}, 0)
	db.GetNewStatesFromItemVariation(user.SpaceShipId, func(itemId int64, newItemState float64, buildingId int64) {
		newStates = append(newStates, map[string]interface{} {
			"item_id"       : itemId,
			"new_item_state": newItemState,
			"building_id"   : buildingId,
		})
	})
	
	if len(newStates) > 0 {
		user.SendMessage("update_items_states", map[string]interface{} {
			"spaceship_id": user.SpaceShipId,
			"items"       : newStates,
		})
	}
}

func (user *User) SendDisabledBuildings() {
	buildings := make([]int64, 0)
	db.GetNewStatesFromItemVariation(user.SpaceShipId, func(itemId int64, newItemState float64, buildingId int64) {
		buildings = append(buildings, buildingId)
	})
	
	if len(buildings) > 0 {
		user.SendMessage("disable_buildings", map[string]interface{} {
			"spaceship_id": user.SpaceShipId,
			"building_ids": buildings,
		})
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
		
		itemsListById[strconv.FormatInt(buildingId, 10)] = append(itemList, map[string]interface{} {
			"id"           : id,
			"type_id"      : typeId,
			"state"        : state,
			"slot_group_id": slotGroupId,
		})
	})
	
	// Preparing buildings list
	buildings := make([]map[string]interface{}, 0)
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
		
		buildings = append(buildings, map[string]interface{} {
			"id"        : id,
			"type_id"   : typeId,
			"position"  : position,
			"rotation"  : rotation,
			"size"      : size,
			"state"     : state,
			"is_built"  : isBuilt,
			"is_enabled": isEnabled,
			"seed"      : seed,
			"items"     : itemList,
		})
	})
	
	// Preparing data to send
	spaceShipData := map[string]interface{} {
		"id"        : user.SpaceShipId,
		"owner"     : true,
		"name"      : user.Name,
		"position"  : user.Position,
		"rotation"  : user.Rotation,
		"buildings" : buildings,
		"attributes": map[string]interface{} {
			"max_speed_per_propeller_unit": SpaceShipMaxSpeedPerPropellerUnit,
		},
	}
	
	// Sending spaceship definition to user
	user.SendMessage("data_spaceship", spaceShipData)
	
	// Sending spaceship definition to all users
	spaceShipData["owner"] = false
	user.SendMessageBroadcast("data_spaceship", spaceShipData, true)
}

func (user *User) UpdatePropellers(propellerId int64, powerLevel float64) {
	db.SetPropellersPowerRate(user.SpaceShipId, propellerId, powerLevel)
	
	user.SendMessageBroadcast("update_propellers", map[string]interface{} {
		"spaceship_id": user.SpaceShipId,
		"id"          : propellerId,
		"power"       : powerLevel,
	}, true)
}

func (user *User) UpdateDoors(doorId int64, state float64) {
	db.SetBuildingsState(
		user.SpaceShipId,
		doorId,
		"Door", // TODO replace model by type_id here + block possibility to update multiple buildings at a time ?
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
	
	user.SendMessageBroadcast("update_position", map[string]interface{} {
		"spaceship_id": user.SpaceShipId,
		"position"    : position,
		"rotation"    : rotation,
	}, !sendPositionToUser)
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
			user.SendMessageBroadcast("add_building", map[string]interface{} {
				"id"          : id,
				"type_id"     : typeId,
				"spaceship_id": user.SpaceShipId,
				"position"    : position,
				"rotation"    : rotation,
				"size"        : size,
				"state"       : state,
				"is_built"    : isBuilt,
				"is_enabled"  : isEnabled,
				"seed"        : seed,
				"items"       : make([]interface{}, 0), // Items array is always empty after creation
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
			user.SendMessageBroadcast("delete_building", map[string]interface{} {
				"building_id" : buildingId,
				"spaceship_id": user.SpaceShipId,
			}, false)
			
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
		// NOTE : the enabled state is implicitly updated client side by the "move_item" action
		db.SetBuildingEnabled(user.SpaceShipId, buildingId, true)
		
		user.SendMessage("move_item", map[string]interface{} {
			"spaceship_id"        : user.SpaceShipId,
			"item_id"             : itemId,
			"target_building_id"  : buildingId,
			"target_slot_group_id": slotGroupId,
		}) // TODO broadcast ?!?
	}
}

func (user *User) AchieveBuilding(buildingId int64) {
	db.DeferredTransaction(func() bool {
		if db.SetBuildingBuilt(user.SpaceShipId, buildingId) {
			db.DeleteItems(user.SpaceShipId, buildingId)
			
			user.SendMessage("achieve_building", map[string]interface{} {
				"spaceship_id": user.SpaceShipId,
				"building_id" : buildingId,
			}) // TODO broadcast ?!?
			
			return true
		} else {
			return false
		}
	})
}

func (user *User) SendBuildingTypesDefinition() {
	itemSlots := make(map[string][]interface{})
	db.GetItemSlots(func(buildingTypeId, itemGroupId int64, whenBuilding bool, maxAmount int64, variation float64) {
		slots, ok := itemSlots[strconv.FormatInt(buildingTypeId, 10)]
		if !ok {
			slots = make([]interface{}, 0)
		}
		itemSlots[strconv.FormatInt(buildingTypeId, 10)] = append(slots, map[string]interface{} {
			"group"          : itemGroupId,
			"when_building"  : whenBuilding,
			"maximum_amount" : maxAmount,
			"state_variation": variation,
		})
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
		
		definition = append(definition, map[string]interface{} {
			"id"              : id,
			"name"            : name,
			"category"        : category,
			"model"           : model,
			"is_gap"          : isGap,
			"default_state"   : defaultState,
			"is_sizeable"     : isSizeable,
			"is_container"    : isContainer,
			"is_inside"       : isInside,
			"is_position_by_room_unit": isPositionByRoomUnit,
			"min_state"       : minState,
			"max_state"       : maxState,
			"can_exert_thrust": canExertThrust,
			"is_controllable" : isControllable,
			"slots"           : slots,
		})
	})
	
	user.SendMessage("data_building_types_definition", definition)
}

func (user *User) SendItemGroupsDefinition() {
	definition := make(map[string]string)
	db.GetItemGroups(func(id int64, name string) {
		definition[strconv.FormatInt(id, 10)] = name
	})
	user.SendMessage("data_item_groups_definition", definition)
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
		
		definition = append(definition, map[string]interface{} {
			"id"       : id,
			"name"     : name,
			"max_state": maxState,
			"groups"   : groups,
		})
	})
	
	user.SendMessage("data_item_types_definition", definition)
}