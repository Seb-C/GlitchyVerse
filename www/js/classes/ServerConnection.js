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
	LoginForm.open(function(name, password) {
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
	this.world.setDesigner(data);
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
			if(ss.entities[k].exertThrust) {
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