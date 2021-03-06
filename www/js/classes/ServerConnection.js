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
		var message = event.data;
		var hashIndex = message.indexOf("#");
		var method = message.substring(0, hashIndex)
		var data = JSON.parse(message.substring(hashIndex + 1));
		
		if(self["_" + method]) {
			self["_" + method](data);
		} else {
			throw new Error("Unknown method name : " + method);
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
	var jsonData = JSON.stringify(data);
	this.socket.send(method + "#" + jsonData);
};

ServerConnection.prototype._authQuery = function(data) {
	var self = this;
	LoginForm.open(this.world, function(name, password) {
		self.sendMessage("authAnswer", {name: name, password: password});
	});
};

ServerConnection.prototype._authResult = function(data) {
	LoginForm.setMessage(data.message, data.isValid);
	if(data.isValid) {
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

ServerConnection.prototype._data_buildingTypesDefinition = function(data) {
	for(var i = 0 ; i < data.length ; i++) {
		var bt = new BuildingType(data[i]);
		Building.types[bt.id] = bt;
	}
};

ServerConnection.prototype._addBuilding = function(data) {
	var ss = this.world.spaceShips[data.spaceshipId];
	ss.addBuilding(new Building(this.world, ss, data));
};

ServerConnection.prototype._deleteBuilding = function(data) {
	var ss = this.world.spaceShips[data.spaceshipId];
	var building = ss.entities[data.buildingId];
	ss.deleteBuilding(building);
	this.world.camera.notifyBuildingRemoved(building);
};

ServerConnection.prototype._data_spaceContent = function(data) {
	this.world.spaceContent.setContent(data);
};

ServerConnection.prototype._updatePosition = function(data) {
	var ss = this.world.spaceShips[data.spaceshipId];
	ss.setPosition(data.position);
	ss.rotation = data.rotation;
};

ServerConnection.prototype._updatePropellers = function(data) {
	var ss = this.world.spaceShips[data.spaceshipId];
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

ServerConnection.prototype._deleteSpaceship = function(data) {
	this.world.remove(this.world.spaceShips[data]);
};

ServerConnection.prototype._data_itemGroupsDefinition = function(data) {
	Item.groups = data;
};

ServerConnection.prototype._data_itemTypesDefinition = function(data) {
	Item.types = {};
	for(var i = 0 ; i < data.length ; i++) {
		var it = new ItemType(data[i]);
		Item.types[it.id] = it;
	}
};

ServerConnection.prototype._moveItem = function(data) { // TODO do this work outside this class ?
	var ss = this.world.spaceShips[data.spaceshipId];
	if(ss) {
		var targetBuilding = ss.entities[data.targetBuildingId];
		if(targetBuilding) {
			// Searching from item in buildings
			for(var k in ss.entities) {
				var item = ss.entities[k].getItemById(data.itemId);
				if(item != null) {
					item.moveTo(targetBuilding, data.targetSlotGroupId);
					targetBuilding.isEnabled = true;
					return;
				}
			}
		}
	}
};

ServerConnection.prototype._achieveBuilding = function(data) {
	var ss = this.world.spaceShips[data.spaceshipId];
	if(ss) {
		var targetBuilding = ss.entities[data.buildingId];
		if(targetBuilding) {
			targetBuilding.achieveBuilding();
		}
	}
};

ServerConnection.prototype._updateItemsStates = function(data) {
	var ss = this.world.spaceShips[data.spaceshipId];
	if(ss) {
		for(var i = 0 ; i < data.items.length ; i++) {
			var itemData = data.items[i];
			var building = ss.entities[itemData.buildingId];
			var item = building.getItemById(itemData.itemId);
			if(item != null) {
				item.setState(itemData.newItemState);
			}
		}
	}
};

ServerConnection.prototype._disableBuildings = function(data) {
	var ss = this.world.spaceShips[data.spaceshipId];
	if(ss) {
		for(var i = 0 ; i < data.buildingIds.length ; i++) {
			ss.entities[data.buildingIds[i]].isEnabled = false;
		}
		ss.updateAcceleration();
	}
};


