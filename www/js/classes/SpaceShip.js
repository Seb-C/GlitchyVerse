/**
 * A spaceship
 * @param World The world where the spaceship is
 * @param int The id of the spaceship
 * @param String The name of the spaceship
 * @param vec3 The position of the spaceship
 * @param vec3 The rotation of the spaceship
 * @param Array(Object) An object containing the definition of the content of the spaceship.
 *                      Each object has attributes : 
 *                      - model    : Name of the model in models list.
 *                      - is_gap   : boolean, true if the objects has to create a gap in the room
 *                      - is_room  : boolean true if the object has the size of a room and takes the same space
 *                      - position : vec3 Containing the position of object
 *                      - rotation : vec3 Containing the rotation of object
 *                      - size     : vec3 Containing the size of object
 * @param Object Containing the definition of some attributes : 
 *               - max_speed_per_propeller_unit : The max speed to add per propeller unit
 */
var SpaceShip = function(world, id, name, position, rotation, definition, attributes) {
	this.world = world;
	this.id = id;
	this.roomUnitSize = [4, 3.5, 4];
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
	
	// Objects attributes and entities, with id as key
	this.objectPositions        = {};
	this.objectInitialRotations = {}; 
	this.objectSizes            = {};
	this.objectTypeIds          = {};
	this.objectModels           = {};
	this.objectsByTypeIds       = {};
	this.roomUnitObjects        = {};
	this.gapObjects             = {};
	this.entities               = {};
	// TODO move this attributes in a class extending Entity, herited by all spaceship models
	
	// TODO moving bug (rotating) when windows on the right (or left ?)
	// TODO can't see spaceship without propeller ?!?
	
	// Initializing gap objects list
	for(var i = 0 ; i < definition.length ; i++) {
		var object = definition[i];
		if(object.is_gap) {
			this._addGapObject(object);
		}
	}
	
	// Creating objects
	for(var i = 0 ; i < definition.length ; i++) {
		this._addObject(definition[i]);
	}
	
	this._recalculateMinMaxBounds();
	
	this.updateAcceleration();
	this.updatePosition();
};

/**
 * Recalculates the min and max bounds objects
 */
SpaceShip.prototype._recalculateMinMaxBounds = function() {
	this.minBounds = null;
	this.maxBounds = null;
	for(var k in this.entities) {
		var position = this.objectPositions[k];
		var size = this.objectSizes[k];
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
 * Adds an object to the spaceship, based on it's definition.
 * @param Object Definition received from server.
 */
SpaceShip.prototype.addObject = function(object) {
	if(object.is_gap) {
		this._addGapObject(object);
	}
	this._addObject(object);
	
	var position = object.position;
	var size = object.size;
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
SpaceShip.prototype._addGapObject = function(object) {
	this.gapObjects[object.id] = {
		isLeftOrRight: (object.rotation[1] != 0 && object.rotation[1] != 180),
		position: object.position
	};
	
	// Determining new object bounds
	var beginX = object.position[0] - 0.5;
	var beginY = object.position[1];
	var beginZ = object.position[2] - 0.5;
	var endX = beginX + object.size[0];
	var endY = beginY + object.size[1];
	var endZ = beginZ + object.size[2];
	
	// Recreates the rooms concerned
	for(var k in this.entities) {
		var entity = this.entities[k];
		if(entity instanceof Models.Room) {
			var pos  = this.objectPositions[k];
			var size = this.objectSizes[k];
			
			if(    !(pos[0] > endX || (pos[0] + size[0]) < beginX)
				&& !(pos[1] > endY || (pos[1] + size[1]) < beginY)
				&& !(pos[2] > endZ || (pos[2] + size[2]) < beginZ)
			) {
				entity.regenerate();
			}
		}
	}
};

/**
 * Adds an object to the spaceship, based on it's definition.
 * Be careful not to use this private method, there is another 
 * public method with the same name (without underscore)
 * @param Object Definition received from server.
 */
SpaceShip.prototype._addObject = function(object) {
	var definition = {};
	definition.unitSize = this.roomUnitSize;
	definition.edgeSize = this.edgeSize;
	definition.lightAndClimEdgeSize = this.lightAndClimEdgeSize;
	definition.spaceShip = this;
	definition.size        = object.size;
	definition.position    = object.position;
	definition.minState    = object.min_state;
	definition.maxState    = object.max_state;
	definition.exertThrust = object.exert_thrust; // TODO attributes to put on .obj models
	
	var rotation = vec3.create();
	vec3.add(rotation, object.rotation, this.rotation);
	
	var entity;
	if(Models[object.model]) {
		entity = new Models[object.model](world, vec3.create(), quat.create(), definition, object.state);
	} else {
		entity = new Entity(world, vec3.create(), quat.create(), Models.loadMeshesFromObj(object.model), object.state);
		entity.model = object.model;
	}
	entity.spaceShip = this;
	entity.id = object.id;
	
	this.objectPositions[object.id] = object.position;
	this.objectSizes    [object.id] = object.size;
	this.objectModels   [object.id] = object.model;
	this.objectTypeIds  [object.id] = object.type_id;
	this.roomUnitObjects[object.id] = object.is_position_by_room_unit;
	this.entities       [object.id] = entity;
	if(object.rotation[0] != 0 || object.rotation[1] != 0 || object.rotation[2] != 0) {
		this.objectInitialRotations[object.id] = object.rotation;
	}
	if(!this.objectsByTypeIds[object.type_id]) this.objectsByTypeIds[object.type_id] = new Array();
	this.objectsByTypeIds[object.type_id].push(object.id);
	
	this.refreshObjectPositionAndRotation(entity.id);
	this.world.add(entity);
	this.updateAcceleration();
};

/**
 * Deletes an object from the spaceship, based on it's id.
 * @param int Id of the object to delete
 */
SpaceShip.prototype.deleteObject = function(id) {
	if(this.gapObjects[id]) {
		delete this.gapObjects[id];
		
		var position = this.objectPositions[id];
		var size = this.objectSizes[id];
		
		// Determining object bounds
		var beginX = position[0] - 0.5;
		var beginY = position[1];
		var beginZ = position[2] - 0.5;
		var endX = beginX + size[0];
		var endY = beginY + size[1];
		var endZ = beginZ + size[2];
		
		// Recreates the rooms concerned by the deletion
		for(var k in this.entities) {
			var entity = this.entities[k];
			if(entity instanceof Models.Room) {
				var pos  = this.objectPositions[k];
				var size = this.objectSizes[k];
				
				if(    !(pos[0] > endX || (pos[0] + size[0]) < beginX)
					&& !(pos[1] > endY || (pos[1] + size[1]) < beginY)
					&& !(pos[2] > endZ || (pos[2] + size[2]) < beginZ)
				) {
					entity.regenerate();
				}
			}
		}
	}
	
	var entity = this.entities[id];
	
	this.objectsByTypeIds[this.objectTypeIds[id]].splice(
		this.objectsByTypeIds[this.objectTypeIds[id]].indexOf(id),
		1
	);
	delete this.objectPositions[id];
	delete this.objectInitialRotations[id];
	delete this.objectSizes[id];
	delete this.objectTypeIds[id];
	delete this.objectModels[id];
	delete this.roomUnitObjects[id];
	delete this.entities[id];
	
	this._recalculateMinMaxBounds();
	this.world.remove(entity);
	this.updateAcceleration();
};

/**
 * Recalculates the position of the object
 * @param int The id of the object
 */
SpaceShip.prototype.refreshObjectPositionAndRotation = function(id) {
	var entity = this.entities[id];
	var position;
	
	if(this.roomUnitObjects[id]) {
		position = vec3.fromValues(
			(this.objectPositions[id][0] + (this.objectSizes[id][0] / 2) - 0.5) * this.roomUnitSize[0], 
			(this.objectPositions[id][1] + (this.objectSizes[id][1] / 2) - 0.5) * this.roomUnitSize[1], 
			(this.objectPositions[id][2] + (this.objectSizes[id][2] / 2) - 0.5) * this.roomUnitSize[2]
		);
	} else {
		position = vec3.clone(this.objectPositions[id]);
	}
	
	rotatePoint(position, [degToRad(this.rotation[0]), degToRad(this.rotation[1]), degToRad(this.rotation[2])]);
	vec3.add(position, position, this._position);
	
	this.entities[id].setPosition(position);
	
	// Rotating the entity
	quat.identity(entity.rotation);
	if(this.objectInitialRotations[id]) {
		var initialRotation = this.objectInitialRotations[id];
		quat.rotateX(entity.rotation, entity.rotation, degToRad(initialRotation[0]));
		quat.rotateY(entity.rotation, entity.rotation, degToRad(initialRotation[1]));
		quat.rotateZ(entity.rotation, entity.rotation, degToRad(initialRotation[2]));
	}
	if(this.rotation[0] != 0) quat.rotateX(entity.rotation, entity.rotation, degToRad(this.rotation[0]));
	if(this.rotation[1] != 0) quat.rotateY(entity.rotation, entity.rotation, degToRad(this.rotation[1]));
	if(this.rotation[2] != 0) quat.rotateZ(entity.rotation, entity.rotation, degToRad(this.rotation[2]));
};

/**
 * Returns the spaceship objects which are able to exert thrust.
 * @return Array List of the objects
 */
SpaceShip.prototype.getEntitiesWhichExertsThrust = function(modelClass) {
	var r = new Array();
	for(var id in this.entities) {
		var entity = this.entities[id];
		if(entity.exertThrust) {
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
	
	// Updating entities positions and rotations
	for(var k in this.entities) {
		this.refreshObjectPositionAndRotation(k);
	}
	this.world.lightManager.regenerateCache();
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
		if(this.entities[k].exertThrust) {
			var positionX = this.objectPositions[k][0] + (this.objectSizes[k][0] / 2 - 0.5);
			var positionY = this.objectPositions[k][1] + (this.objectSizes[k][1] / 2 - 0.5);
			
			var maxState = this.entities[k].maxState;
			var state = this.entities[k].state;
			var size = this.objectSizes[k];
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

// TODO door bugs with transparency ?!?