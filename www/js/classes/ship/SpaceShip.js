/**
 * A spaceship
 * @param World The world where the spaceship is
 * @param int The id of the spaceship
 * @param String The name of the spaceship
 * @param vec3 The position of the spaceship
 * @param vec3 The rotation of the spaceship
 * @param Array(Object) An object containing the definition of the content of the spaceship.
 * @param Object Containing the definition of some attributes : 
 *               - max_speed_per_propeller_unit : The max speed to add per propeller unit
 */
var SpaceShip = function(world, id, name, position, rotation, definition, attributes) {
	this.world = world;
	this.id = id;
	this.roomUnitSize = vec3.fromValues(4, 4, 4); // TODO put everything in obj, and remove those constants ? + rename to grid unit size
	this.edgeSize = 0.2;
	this.lightAndClimEdgeSize = 0.58;
	this.recoilMaxSpeedRate = 0.2; // Relative to the normal max speed
	this.maxSpeedPerPropellerUnit = attributes.max_speed_per_propeller_unit;
	
	this._linearMaxSpeed = 0;
	
	// TODO models : replace the definition parameter by normal parameters
	// TODO organize js classes in subfolders
	
	this.name = name;
	this._position = position;
	this.rotation = rotation;
	this.linearSpeed = 0;
	this._linearAcceleration = 0; // Acceleration per second
	this.rotationSpeed = vec3.create();
	
	this.lastPositionUpdateTime = TimerManager.lastUpdateTimeStamp;
	
	this.screen = new ControlScreen(this.world, this);
	
	this.minBounds = null;
	this.maxBounds = null;
	
	this.buildingsByTypeIds = {};
	this.gapBuildings       = {};
	this.entities           = {}; // TODO is it useful to keep an id as key ? Should we replace it by a normal array ?
	
	// Each spaceship is a different physics world
	this.physics = new Physics(vec3.fromValues(0, -1.8, 0));
	
	// TODO moving bug (rotating) when windows on the right (or left ?)
	// TODO can't see spaceship without propeller ?!?
	
	// Initializing gap buildings list
	for(var i = 0 ; i < definition.length ; i++) {
		var building = definition[i];
		if(Building.types[building.type_id].isGap) {
			this._addGapBuilding(building);
		}
	}
	
	// Creating buildings
	for(var i = 0 ; i < definition.length ; i++) {
		this._addBuilding(definition[i]);
	}
	
	this._recalculateMinMaxBounds();
	
	this.updateAcceleration();
	this.updatePosition();
};

/**
 * Recalculates the min and max bounds buildings
 */
SpaceShip.prototype._recalculateMinMaxBounds = function() {
	this.minBounds = null;
	this.maxBounds = null;
	for(var k in this.entities) {
		var entity = this.entities[k];
		var position = entity.gridPosition;
		var size = entity.gridSize;
		var positionEnd = [position[0] + size[0] - 1, position[1] + size[1] - 1, position[2] + size[2] - 1];
		if(this.minBounds == null || this.maxBounds == null) {
			// First iteration
			this.minBounds = vec3.fromValues(position[0],    position[1],    position[2]);
			this.maxBounds = vec3.fromValues(positionEnd[0], positionEnd[1], positionEnd[2]);
		} else {
			if(position[0] < this.minBounds[0]) this.minBounds[0] = position[0];
			if(position[1] < this.minBounds[1]) this.minBounds[1] = position[1];
			if(position[2] < this.minBounds[2]) this.minBounds[2] = position[2];
			
			if(positionEnd[0] > this.maxBounds[0]) this.maxBounds[0] = positionEnd[0];
			if(positionEnd[1] > this.maxBounds[1]) this.maxBounds[1] = positionEnd[1];
			if(positionEnd[2] > this.maxBounds[2]) this.maxBounds[2] = positionEnd[2];
		}
	}
};

/**
 * Adds a building to the spaceship, based on it's definition.
 * @param Object Definition received from server.
 */
SpaceShip.prototype.addBuilding = function(building) {
	if(Building.types[building.type_id].isGap) {
		this._addGapBuilding(building);
	}
	this._addBuilding(building);
	
	var position = building.position;
	var size = building.size;
	var positionEnd = [position[0] + size[0] - 1, position[1] + size[1] - 1, position[2] + size[2] - 1];
	
	// Recalculates min and max bounds (addition => we can do faster than the method)
	if(position[0] < this.minBounds[0]) this.minBounds[0] = position[0];
	if(position[1] < this.minBounds[1]) this.minBounds[1] = position[1];
	if(position[2] < this.minBounds[2]) this.minBounds[2] = position[2];
	
	if(positionEnd[0] > this.maxBounds[0]) this.maxBounds[0] = positionEnd[0];
	if(positionEnd[1] > this.maxBounds[1]) this.maxBounds[1] = positionEnd[1];
	if(positionEnd[2] > this.maxBounds[2]) this.maxBounds[2] = positionEnd[2];
};

/**
 * Adds information to the list of gaps to apply to the rooms, and recreates the required rooms
 * @param Object Definition received from server.
 */
SpaceShip.prototype._addGapBuilding = function(building) {
	this.gapBuildings[building.id] = {
		isLeftOrRight: (building.rotation[1] != 0 && building.rotation[1] != 180),
		position: building.position
	};
	
	// Determining new building bounds
	var beginX = building.position[0] - 0.5;
	var beginY = building.position[1];
	var beginZ = building.position[2] - 0.5;
	var endX = beginX + building.size[0];
	var endY = beginY + building.size[1];
	var endZ = beginZ + building.size[2];
	
	// Recreates the rooms concerned
	for(var k in this.entities) {
		var entity = this.entities[k];
		if(entity.modelName == "Room") {
			var pos  = entity.gridPosition;
			var size = entity.gridSize;
			
			if(    !(pos[0] > endX || (pos[0] + size[0]) < beginX)
				&& !(pos[1] > endY || (pos[1] + size[1]) < beginY)
				&& !(pos[2] > endZ || (pos[2] + size[2]) < beginZ)
			) {
				entity.regenerateMeshes();
			}
		}
	}
};

/**
 * Adds a building to the spaceship, based on it's definition.
 * Be careful not to use this private method, there is another 
 * public method with the same name (without underscore)
 * @param Object Definition received from server.
 */
SpaceShip.prototype._addBuilding = function(definition) {
	var rotation = vec3.create();
	vec3.add(rotation, definition.rotation, this.rotation);
	
	this.entities[definition.id] = new Building(world, this, vec3.create(), quat.create(), definition);
	if(!this.buildingsByTypeIds[definition.type_id]) this.buildingsByTypeIds[definition.type_id] = new Array();
	this.buildingsByTypeIds[definition.type_id].push(definition.id);
	
	this.world.add(this.entities[definition.id]);
	this.updateAcceleration();
};

/**
 * Deletes a building from the spaceship, based on it's id.
 * @param int Id of the building to delete
 */
SpaceShip.prototype.deleteBuilding = function(id) {
	var entity = this.entities[id];
	
	if(this.gapBuildings[id]) {
		delete this.gapBuildings[id];
		
		var position = entity.gridPosition;
		var size = entity.gridSize;
		
		// Determining building bounds
		var beginX = position[0] - 0.5;
		var beginY = position[1];
		var beginZ = position[2] - 0.5;
		var endX = beginX + size[0];
		var endY = beginY + size[1];
		var endZ = beginZ + size[2];
		
		// Recreates the rooms concerned by the deletion
		for(var k in this.entities) {
			var entity = this.entities[k];
			if(entity.modelName == "Room") {
				var pos  = entity.gridPosition;
				var size = entity.gridSize;
				
				if(    !(pos[0] > endX || (pos[0] + size[0]) < beginX)
					&& !(pos[1] > endY || (pos[1] + size[1]) < beginY)
					&& !(pos[2] > endZ || (pos[2] + size[2]) < beginZ)
				) {
					entity.regenerateMeshes();
				}
			}
		}
	}
	
	var entity = this.entities[id];
	
	this.buildingsByTypeIds[entity.typeId].splice(
		this.buildingsByTypeIds[entity.typeId].indexOf(id),
		1
	);
	delete this.entities[id];
	
	this._recalculateMinMaxBounds();
	this.world.remove(entity);
	this.updateAcceleration();
};

/**
 * Returns the spaceship buildings which are able to exert thrust.
 * @return Array List of the buildings
 */
SpaceShip.prototype.getEntitiesWhichExertsThrust = function(modelClass) {
	var r = new Array();
	for(var id in this.entities) {
		var entity = this.entities[id];
		if(entity.type.exertThrust && entity.isBuilt) {
			r.push(entity);
		}
	}
	return r;
};

/**
 * Returns the current position of the spaceship
 * @return vec3 The current position of the spaceship
 */
SpaceShip.prototype.getPosition = function() {
	return this._position;
};

/**
 * Changes the current position of the spaceship
 * @param vec3 The new position of the spaceship
 */
SpaceShip.prototype.setPosition = function(position) {
	vec3.copy(this._position, position);
};

SpaceShip.prototype.update = function() {
	this.physics.update();
	this.updatePosition();
};

SpaceShip.prototype.updatePosition = function() {
	var passedTimeRate = (TimerManager.lastUpdateTimeStamp - this.lastPositionUpdateTime) / 1000;
	
	// Updating speed, depending on acceleration
	var minSpeed = -this._linearMaxSpeed * this.recoilMaxSpeedRate;
	this.lastPositionUpdateTime = TimerManager.lastUpdateTimeStamp;
	this.linearSpeed += this._linearAcceleration * passedTimeRate;
	if(this.linearSpeed > this._linearMaxSpeed) this.linearSpeed = this._linearMaxSpeed;
	if(this.linearSpeed < minSpeed) this.linearSpeed = minSpeed;
	
	// Stopping movement if required
	if(this.linearSpeed < 1 && this.linearSpeed > -1 && this._linearAcceleration == 0) {
		// TODO do it not only for 1 unit, but for 1% of the maximum speed
		this.linearSpeed = 0;
	}
	
	// Updating rotation
	var rot = vec3.create(); // TODO don't create object here (and bottom with eulerToQuat), use global temp vars ?
	vec3.scale(rot, this.rotationSpeed, passedTimeRate);
	vec3.add(this.rotation, this.rotation, rot);
	
	// TODO always store rotations as quat everywhere ? Or radians ?
	
	// Updating SpaceShip position
	var move = vec3.fromValues(0, 0, -this.linearSpeed * passedTimeRate);
	var rotationQuat = eulerToQuat(this.rotation);
	quat.invert(rotationQuat, rotationQuat);
	vec3.transformQuat(move, move, rotationQuat);
	vec3.add(this._position, this._position, move);
	
	this.checkCollisions();
	
	// Updating entities positions and rotations
	for(var k in this.entities) {
		var entity = this.entities[k];
		entity.refreshAbsolutePositionAndRotation();
	}
	this.world.lightManager.regenerateCache();
};

/**
 * Checks that the spaceship is not colliding with space objects (planets ...), and remains in orbit.
 */
SpaceShip.prototype.checkCollisions = function() {
	// Determining the radius of the "hitbox", based on highest absolute coordinates
	var highestCoord = vec3.fromValues(
		Math.max(Math.abs(this.minBounds[0]), Math.abs(this.maxBounds[0])),
		Math.max(Math.abs(this.minBounds[1]), Math.abs(this.maxBounds[1])),
		Math.max(Math.abs(this.minBounds[2]), Math.abs(this.maxBounds[2]))
	);
	var hitBoxCoord = vec3.multiply(highestCoord, highestCoord, this.roomUnitSize);
	var hitBoxRadius = vec3.length(hitBoxCoord);
	
	var self = this;
	var positionRelativeToBody = vec3.create()
	this.world.spaceContent.forEachCollidableBody(function(body) {
		var hitBoxDistanceFromBody = vec3.distance(body.position, self._position) - hitBoxRadius;
		if(hitBoxDistanceFromBody < body.orbitRadius) {
			// Moving the spaceship to the orbit
			vec3.subtract(positionRelativeToBody, body.position, self._position);
			vec3.scale(positionRelativeToBody, positionRelativeToBody, (body.orbitRadius / hitBoxDistanceFromBody) - 1);
			vec3.subtract(self._position, self._position, positionRelativeToBody);
			
			// Stopping the spaceship
			self.linearSpeed = 0;
		}
	});
};

SpaceShip.prototype.updateAcceleration = function() {
	// Objects are loading, so we can't update this now
	if(this.minBounds == null || this.maxBounds == null) return;
	
	// Bug with middle when we have a window to the "rightest" corner
	var middleXY = [
		((this.maxBounds[0] - this.minBounds[0]) / 2) + this.minBounds[0],
		((this.maxBounds[1] - this.minBounds[1]) / 2) + this.minBounds[1]
	];
	vec3.set(this.rotationSpeed, 0, 0, 0);
	
	this._linearAcceleration = 0;
	this._linearMaxSpeed = 0;
	for(var k in this.entities) {
		var entity = this.entities[k];
		if(entity.type.exertThrust && entity.isBuilt && entity.isEnabled) {
			var positionX = entity.gridPosition[0] + (entity.gridSize[0] / 2 - 0.5);
			var positionY = entity.gridPosition[1] + (entity.gridSize[1] / 2 - 0.5);
			
			var maxState = entity.type.maxState;
			var state = entity.getState();
			var size = entity.gridSize;
			var sizeMultiplicator = size[0] * size[1] * size[2];
			
			this.rotationSpeed[1] += (middleXY[0] - positionX) * state * sizeMultiplicator;
			this.rotationSpeed[0] -= (middleXY[1] - positionY) * state * sizeMultiplicator;
			
			this._linearAcceleration += state * sizeMultiplicator;
			this._linearMaxSpeed += this.maxSpeedPerPropellerUnit * maxState * sizeMultiplicator;
		}
	}
};

/**
 * Removes all it's content from the world
 */
SpaceShip.prototype.destroy = function() {
	var entitiesToRemove = [];
	for(var k in this.entities) {
		var entity = this.entities[k];
		entitiesToRemove.push(entity);
		entity.destroy();
	}
	this.world.remove(entitiesToRemove);
};

// TODO door bugs with transparency (+ window blinking on chrome when opening or closing) ?!?
