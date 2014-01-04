/**
 * Creates a propeller. See Entity for other parameters
 * @param {definition} Object Containing the definition of the window, with attributes : 
 *               - unitSize : Array(3) Vector(3), size of each unit (the smallest possible room size)
 *               - edgeSize : The side of the room edges
 */
Models.Propeller = function(world, position, rotation, definition, state) {
	// Loading required textures
	Materials.loadMtl("materials/main.mtl");
	var material_PROPELLER  = Materials.get("PROPELLER");
	var material_BLACK      = Materials.get("BLACK");
	var material_FLAME      = Materials.get("FLAME");
	var material_METAL_BOLT = Materials.get("METAL_BOLT");
	
	this.spaceShip   = definition.spaceShip;
	this.minState    = definition.minState;
	this.maxState    = definition.maxState;
	this.exertThrust = definition.exertThrust;
	
	this.size = definition.size;
	
	var meshes = [];
	
	this.circleSizeDivide1 = 3;
	this.circleSizeDivide2 = 4;
	var circleThickness = 0.5;
	var circleVerticesNumber = 30;
	var circlePartSize = (Math.PI * 2) / circleVerticesNumber;
	
	var minUnitSize = Math.min.apply(null, definition.unitSize);
	
	var circle1Rad1X =  minUnitSize                    * this.size[0] / this.circleSizeDivide1;
	var circle1Rad2X = (minUnitSize - circleThickness) * this.size[0] / this.circleSizeDivide1;
	var circle2Rad1X =  minUnitSize                    * this.size[0] / this.circleSizeDivide2;
	
	var circle1Rad1Y =  minUnitSize                    * this.size[1] / this.circleSizeDivide1;
	var circle1Rad2Y = (minUnitSize - circleThickness) * this.size[1] / this.circleSizeDivide1;
	var circle2Rad1Y =  minUnitSize                    * this.size[1] / this.circleSizeDivide2;
	
	var boxBack  = -definition.unitSize[2] * this.size[2] / 2;
	var boxFront = -definition.unitSize[2] * this.size[2] / 4;
	var boxHalfY =  definition.unitSize[1] * this.size[1] / 2 - definition.edgeSize;
	var boxHalfX =  definition.unitSize[0] * this.size[0] / 2 - definition.edgeSize;
	
	var frontZ  = -boxFront;
	var backZ   = boxFront;
	var middleZ = frontZ - (0.125 * definition.unitSize[2] * this.size[2]);
	
	this.minFlameZ = middleZ - 0.1;
	this.maxFlameZ = this.minFlameZ + 2.5 * Math.max.apply(null, this.size);
	
	for(var i = 0 ; i < circleVerticesNumber ; i++) {
		var currentAngle = circlePartSize * i;
		var nextAngle    = circlePartSize * (i + 1);
		var sinCurrentAngle = Math.sin(currentAngle);
		var sinNextAngle    = Math.sin(nextAngle   );
		var cosCurrentAngle = Math.cos(currentAngle);
		var cosNextAngle    = Math.cos(nextAngle   );
		
		meshes.push(new Mesh(material_PROPELLER, [
			circle2Rad1X * cosCurrentAngle, circle2Rad1Y * sinCurrentAngle, backZ,
			circle1Rad1X * cosCurrentAngle, circle1Rad1Y * sinCurrentAngle, frontZ,
			circle1Rad1X * cosNextAngle,    circle1Rad1Y * sinNextAngle,    frontZ,
			circle2Rad1X * cosNextAngle,    circle2Rad1Y * sinNextAngle,    backZ
		], [0, 0, 1], [1, 0, 0, 0, 0, 1, 1, 1])); // Body out
		
		meshes.push(new Mesh(material_PROPELLER, [
			circle1Rad2X * cosCurrentAngle, circle1Rad2Y * sinCurrentAngle, frontZ,
			circle1Rad2X * cosCurrentAngle, circle1Rad2Y * sinCurrentAngle, middleZ,
			circle1Rad2X * cosNextAngle,    circle1Rad2Y * sinNextAngle,    middleZ,
			circle1Rad2X * cosNextAngle,    circle1Rad2Y * sinNextAngle,    frontZ
		], [0, 0, 1], [0, 0, 0.2, 0, 0.2, 1, 0, 1])); // Body in
		
		// TODO bodys bug with normals ?
		
		meshes.push(new Mesh(material_PROPELLER, [
			circle1Rad1X * cosCurrentAngle, circle1Rad1Y * sinCurrentAngle, frontZ,
			circle1Rad2X * cosCurrentAngle, circle1Rad2Y * sinCurrentAngle, frontZ,
			circle1Rad2X * cosNextAngle,    circle1Rad2Y * sinNextAngle,    frontZ,
			circle1Rad1X * cosNextAngle,    circle1Rad1Y * sinNextAngle,    frontZ
		], [0, 0, 1], [0, 0, 0.2, 0, 0.2, 1, 0, 1])); // Edge
		
		meshes.push(new Mesh(material_BLACK, [
			circle1Rad2X * cosNextAngle,    circle1Rad2Y * sinNextAngle,    middleZ,
			circle1Rad2X * cosCurrentAngle, circle1Rad2Y * sinCurrentAngle, middleZ,
			0, 0, middleZ
		], [0, 0, -1], null, ["lid"])); // Lid
		
		meshes.push(new Mesh(material_FLAME, [
			circle1Rad2X * cosNextAngle,    circle1Rad2Y * sinNextAngle,    this.minFlameZ,
			circle1Rad2X * cosCurrentAngle, circle1Rad2Y * sinCurrentAngle, this.minFlameZ,
			0, 0, this.maxFlameZ
		], [0, 0, -0.2], [
			0, 0,
			0, 1,
			1, 1
		], ["flame"])); // Flame
	}
	
	// Propeller box
	meshes.push(new Mesh(material_METAL_BOLT, [
		 boxHalfX,  boxHalfY,  boxBack,
		-boxHalfX,  boxHalfY,  boxBack,
		-boxHalfX, -boxHalfY,  boxBack,
		 boxHalfX, -boxHalfY,  boxBack
	], [0, 0, -1])); // Back
	meshes.push(new Mesh(material_METAL_BOLT, [
		-boxHalfX,  boxHalfY,  boxFront,
		 boxHalfX,  boxHalfY,  boxFront,
		 boxHalfX, -boxHalfY,  boxFront,
		-boxHalfX, -boxHalfY,  boxFront
	], [0, 0, 1])); // Front
	meshes.push(new Mesh(material_METAL_BOLT, [
		-boxHalfX,  boxHalfY,  boxBack,
		-boxHalfX,  boxHalfY,  boxFront,
		-boxHalfX, -boxHalfY,  boxFront,
		-boxHalfX, -boxHalfY,  boxBack
	], [-1, 0, 0])); // Right
	meshes.push(new Mesh(material_METAL_BOLT, [
		 boxHalfX,  boxHalfY,  boxFront,
		 boxHalfX,  boxHalfY,  boxBack,
		 boxHalfX, -boxHalfY,  boxBack,
		 boxHalfX, -boxHalfY,  boxFront
	], [1, 0, 0])); // Left
	meshes.push(new Mesh(material_METAL_BOLT, [
		 boxHalfX, -boxHalfY,  boxBack,
		-boxHalfX, -boxHalfY,  boxBack,
		-boxHalfX, -boxHalfY,  boxFront,
		 boxHalfX, -boxHalfY,  boxFront
	], [0, 1, 0])); // Top
	meshes.push(new Mesh(material_METAL_BOLT, [
		-boxHalfX,  boxHalfY,  boxBack,
		 boxHalfX,  boxHalfY,  boxBack,
		 boxHalfX,  boxHalfY,  boxFront,
		-boxHalfX,  boxHalfY,  boxFront
	], [0, -1, 0])); // Bottom
	
	this.parent(world, position, rotation, meshes, state);
	this.model = "Propeller";
	
	this.onbeforedraw = function() {
		this._gl.enable(this._gl.CULL_FACE);
		this._gl.cullFace(this._gl.FRONT);
	};
	this.onafterdraw = function() {
		this._gl.disable(this._gl.CULL_FACE);
	};
};
Models.Propeller.extend(Entity);

/**
 * Determines the current power rate of the propeller, based on it's maximum power capacity.
 * @param float (optional) To compare a future state value with it's min and max states instead of current state
 * @return float -1.0 .. 1.0
 */
Models.Propeller.prototype.getPowerRate = function(forceValue) {
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
Models.Propeller.prototype.setPowerRate = function(powerRate) {
	if(powerRate < 0) {
		this.changeState(powerRate * -this.minState);
	} else {
		this.changeState(powerRate * this.maxState);
	}
};

Models.Propeller.prototype.changeState = function(newState) {
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
		var firstFlameMeshVertices = this.meshGroups["flame"][0].vertices;
		this.minFlameZ = firstFlameMeshVertices[2]; // 2 = Z of 1st vertice
		this.maxFlameZ = firstFlameMeshVertices[8]; // 8 = Z of 3rd vertice
	}
	
	// Changing lid color
	var lidMeshes = this.meshGroups["lid"];
	var lidTexture = Materials.get(powerRate == 0 ? "BLACK" : "WHITE");
	for(var i = 0 ; i < lidMeshes.length ; i++) {
		lidMeshes[i].texture = lidTexture;
	}
	
	// Changing flame size
	var flameMeshes = this.meshGroups["flame"];
	var flameZ = this.minFlameZ + powerRate * (this.maxFlameZ - this.minFlameZ);
	for(var i = 0 ; i < flameMeshes.length ; i++) {
		flameMeshes[i].vertices[8] = flameZ; // 8 = Z of 3rd vertice
	}
	
	this.regenerateCache();
		
	this.spaceShip.updateAcceleration();
};