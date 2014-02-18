/**
 * Connection to WebSocket server
 * @param String The name/ip and port of the server ("nameOrIp:port")
 * @param String (optional) The resource name (URL) on the server, without "/"
 * @param World The world where to add entities transmitted by the server
 */
var ServerConnection = function(serverName, resource, world) {
	// Connecting
	this.socket = new WebSocket("ws://" + serverName + "/" + (resource || ""));
	
	this.world = world;
	this.world.server = this;
	
	// Defining actions
	var self = this;
	this.socket.addEventListener('open', function() {
		
	});
	this.socket.addEventListener('message', function(event) {
		var message = JSON.parse(event.data);
		
		if(self["_" + message[0]]) {
			self["_" + message[0]](message[1]);
		} else {
			throw new Error("Unknown method name : " + message[0]);
		}
	});
	this.socket.addEventListener('close', function(event) { 
		// TODO better way than alert
		alert("Connection lost :(");
	});
	this.socket.addEventListener('error', function(event) { 
		// TODO better way than alert
		alert("Connection error :(");
	});
};

/**
 * Sends a message to the server
 * @param {String} action What to do
 * @param {Object} data Anything related to the action. Can also be null
 */
ServerConnection.prototype.sendMessage = function(method, data) {
	var message = JSON.stringify([method, data]);
	this.socket.send(message);
};

ServerConnection.prototype._auth_query = function(data) {
	var self = this;
	LoginForm.open(this.world, function(name, password) {
		self.sendMessage("auth_answer", {name: name, password: password});
	});
};

ServerConnection.prototype._auth_result = function(data) {
	LoginForm.setMessage(data.message, data.is_valid);
	if(data.is_valid) {
		LoginForm.close();
	}
};

ServerConnection.prototype._data_spaceship = function(data) {
	var ss = new SpaceShip(this.world, data.id, data.name, data.position, data.rotation, data.buildings, data.attributes);
	this.world.add(ss);
	if(data.owner) {
		this.world.setUserSpaceShip(ss);
	}
};

ServerConnection.prototype._data_building_types_definition = function(data) {
	Building.types = {};
	for(var i = 0 ; i < data.length ; i++) {
		var bt = new BuildingType(data[i]);
		Building.types[bt.id] = bt;
	}
};

ServerConnection.prototype._add_building = function(data) {
	this.world.spaceShips[data.spaceship_id].addBuilding(data);
};

ServerConnection.prototype._delete_building = function(data) {
	var ss = this.world.spaceShips[data.spaceship_id];
	var building = ss.entities[data.building_id];
	ss.deleteBuilding(data.building_id);
	this.world.camera.notifyBuildingRemoved(building);
};

ServerConnection.prototype._data_space_content = function(data) {
	this.world.spaceContent.setContent(data);
};

ServerConnection.prototype._update_position = function(data) {
	var ss = this.world.spaceShips[data.spaceship_id];
	ss.setPosition(data.position);
	ss.rotation = data.rotation;
};

ServerConnection.prototype._update_propellers = function(data) {
	var ss = this.world.spaceShips[data.spaceship_id];
	if(data.id == null) {
		for(var k in ss.entities) {
			if(ss.entities[k].type.exertThrust) {
				ss.entities[k].setPowerRate(data.power);
			}
		}
	} else {
		ss.entities[data.id].setPowerRate(data.power);
	}
};

ServerConnection.prototype._delete_spaceship = function(data) {
	this.world.remove(this.world.spaceShips[data]);
};

ServerConnection.prototype._data_item_groups_definition = function(data) {
	Item.groups = data;
};

ServerConnection.prototype._data_item_types_definition = function(data) {
	Item.types = {};
	for(var i = 0 ; i < data.length ; i++) {
		var it = new ItemType(data[i]);
		Item.types[it.id] = it;
	}
};

ServerConnection.prototype._move_item = function(data) { // TODO do this work outside this class ?
	var ss = this.world.spaceShips[data.spaceship_id];
	if(ss) {
		var targetBuilding = ss.entities[data.target_building_id];
		if(targetBuilding) {
			// Searching from item in buildings
			for(var k in ss.entities) {
				var building = ss.entities[k];
				for(var i = 0 ; i < building.items.length ; i++) {
					var item = building.items[i];
					if(item.id == data.item_id) {
						item.moveTo(targetBuilding, data.target_slot_group_id);
						return;
					}
				}
			}
		}
	}
};

ServerConnection.prototype._achieve_building = function(data) {
	var ss = this.world.spaceShips[data.spaceship_id];
	if(ss) {
		var targetBuilding = ss.entities[data.building_id];
		if(targetBuilding) {
			targetBuilding.achieveBuilding();
		}
	}
};
