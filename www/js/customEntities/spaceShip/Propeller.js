/**
 * Creates a propeller. See Entity for other parameters
 * @param {definition} Object Containing the definition of the window, with attributes : 
 *               - unitSize : Array(3) Vector(3), size of each unit (the smallest possible room size)
 *               - edgeSize : The side of the room edges
 */
CustomEntities.Propeller = function(world, position, rotation, definition, state) {
	this.spaceShip   = definition.spaceShip;
	this.minState    = definition.minState;
	this.maxState    = definition.maxState;
	this.exertThrust = definition.exertThrust;
	
	var model = new Model(world, []);
	model.loadMeshesFromObj("propeller.obj", definition.size);
	model.regenerateCache();
	this.parent(world, model, position, rotation, state);
	this.modelName = "Propeller";
	
	this.onbeforedraw = function() {
		this._gl.enable(this._gl.CULL_FACE);
		this._gl.cullFace(this._gl.FRONT);
	};
	this.onafterdraw = function() {
		this._gl.disable(this._gl.CULL_FACE);
	};
};
CustomEntities.Propeller.extend(Entity);

/**
 * Determines the current power rate of the propeller, based on it's maximum power capacity.
 * @param float (optional) To compare a future state value with it's min and max states instead of current state
 * @return float -1.0 .. 1.0
 */
CustomEntities.Propeller.prototype.getPowerRate = function(forceValue) {
	var state = forceValue ? forceValue : this.state;
	var result;
	if(state < 0) {
		result = state / -this.minState;
	} else {
		result = state / this.maxState;
	}
	
	return Math.round(result * 100) / 100;
};

/**
 * Sets the power state with percents instead of raw values
 * @param float The value to set (-1.0 .. 1.0)
 */
CustomEntities.Propeller.prototype.setPowerRate = function(powerRate) {
	if(powerRate < 0) {
		this.changeState(powerRate * -this.minState);
	} else {
		this.changeState(powerRate * this.maxState);
	}
};

CustomEntities.Propeller.prototype.changeState = function(newState) {
	this.state = newState;
	if(this.state < this.minState) this.state = this.minState;
	if(this.state > this.maxState) this.state = this.maxState;
	
	var lightColor = [0.5, 0.4, 0.25];
	
	var powerRate = this.getPowerRate();
	
	// Recreating light
	if(this.lights[0]) {
		this.world.remove(this.lights[0]);
		delete this.lights[0];
	}
	if(this.state > 0) {
		this.lights[0] = new Light([
			this.position[0], 
			this.position[1], 
			this.position[2] + 3
		], lightColor, 30 * powerRate * Math.max.apply(null, this.size), true);
		this.world.add(this.lights[0]);
	}
	
	// If required, storing min and max Z for flame, based on the default position
	if(!this.minFlameZ || !this.maxFlameZ) {
		var firstFlameMeshVertices = this.model.meshGroups["flame"][0].vertices;
		this.minFlameZ = firstFlameMeshVertices[2]; // 2 = Z of 1st vertice
		this.maxFlameZ = firstFlameMeshVertices[8]; // 8 = Z of 3rd vertice
	}
	
	// Changing lid color
	var lidMeshes = this.model.meshGroups["lid"];
	var lidTexture = Materials.get(powerRate == 0 ? "BLACK" : "WHITE");
	for(var i = 0 ; i < lidMeshes.length ; i++) {
		lidMeshes[i].texture = lidTexture;
	}
	
	// Changing flame size
	var flameMeshes = this.model.meshGroups["flame"];
	var flameZ = this.minFlameZ + powerRate * (this.maxFlameZ - this.minFlameZ);
	for(var i = 0 ; i < flameMeshes.length ; i++) {
		flameMeshes[i].vertices[8] = flameZ; // 8 = Z of 3rd vertice
	}
	
	this.model.regenerateCache();
		
	this.spaceShip.updateAcceleration();
};