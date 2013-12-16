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
	
	for(var i = 0 ; i < circleVerticesNumber ; i++) {
		var currentAngle = circlePartSize * i;
		var nextAngle    = circlePartSize * (i + 1);
		var sinCurrentAngle = Math.sin(currentAngle);
		var sinNextAngle    = Math.sin(nextAngle   );
		var cosCurrentAngle = Math.cos(currentAngle);
		var cosNextAngle    = Math.cos(nextAngle   );
		
		meshes.push(new Mesh(material_PROPELLER, [
			circle1Rad1X * cosCurrentAngle, circle1Rad1Y * sinCurrentAngle, frontZ,
			circle2Rad1X * cosCurrentAngle, circle2Rad1Y * sinCurrentAngle, backZ,
			circle2Rad1X * cosNextAngle,    circle2Rad1Y * sinNextAngle,    backZ,
			circle1Rad1X * cosNextAngle,    circle1Rad1Y * sinNextAngle,    frontZ
		], [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1])); // Body out
		
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
			circle1Rad2X * cosCurrentAngle, circle1Rad2Y * sinCurrentAngle, middleZ,
			circle1Rad2X * cosNextAngle,    circle1Rad2Y * sinNextAngle,    middleZ,
			0, 0, middleZ
		], [0, 0, 1])); // Lid
	}
	
	// Propeller box
	meshes.push(new Mesh(material_METAL_BOLT, [
		-boxHalfX,  boxHalfY,  boxBack,
		 boxHalfX,  boxHalfY,  boxBack,
		 boxHalfX, -boxHalfY,  boxBack,
		-boxHalfX, -boxHalfY,  boxBack
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
		 boxHalfX,  boxHalfY,  boxBack,
		 boxHalfX,  boxHalfY,  boxFront,
		 boxHalfX, -boxHalfY,  boxFront,
		 boxHalfX, -boxHalfY,  boxBack
	], [1, 0, 0])); // Left
	meshes.push(new Mesh(material_METAL_BOLT, [
		-boxHalfX, -boxHalfY,  boxBack,
		 boxHalfX, -boxHalfY,  boxBack,
		 boxHalfX, -boxHalfY,  boxFront,
		-boxHalfX, -boxHalfY,  boxFront
	], [0, 1, 0])); // Top
	meshes.push(new Mesh(material_METAL_BOLT, [
		-boxHalfX,  boxHalfY,  boxBack,
		 boxHalfX,  boxHalfY,  boxBack,
		 boxHalfX,  boxHalfY,  boxFront,
		-boxHalfX,  boxHalfY,  boxFront
	], [0, -1, 0])); // Bottom
	
	this.parent(world, position, rotation, meshes, state);
	this.model = "Propeller";
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
	
	var material_P_SMOKE = Materials.get("P_SMOKE");
	
	var lightColor = [0.5, 0.4, 0.25];
	var particleLifeTime = 6;
	var self = this;
	
	var maxSize = Math.max.apply(null, this.size);
	
	// Recreating light
	// TODO use a timer here too instead of setTimeout ?
	setTimeout(function() {
		if(self.lights[0]) {
			self.world.remove(self.lights[0]);
			delete self.lights[0];
		}
		
		if(self.state > 0) {
			self.lights[0] = new Light([
				self.position[0], 
				self.position[1], 
				self.position[2] + 3
			], lightColor, 30 * self.getPowerRate() * maxSize, true);
			self.world.add(self.lights[0]);
		}
	}, particleLifeTime * 1000);
	
	if(!this.lastFlameTime) this.lastFlameTime = TimerManager.lastUpdateTimeStamp;
	var tempQuat = quat.create();
	var particleTimerCallBack = function() {
		if(self.state > 0) {
			var particlesToAdd = new Array();
			var partsNumber = 8;
			var partAngle = (Math.PI * 2) / partsNumber;
			var particleSize = 0.8 * maxSize;
			var particleColor = [lightColor[0] * 2, lightColor[1] * 2, lightColor[2] * 2, 1];
			var radiusX = 0.6 * self.size[0];
			var radiusY = 0.6 * self.size[1];
			var zMovement = 0.65 * self.getPowerRate() * maxSize;
			for(var i = 0 ; i < partsNumber ; i++) {
				var angle = i * partAngle;
				var sinAngleMulRadius = Math.sin(angle);
				var cosAngleMulRadius = Math.cos(angle);
				var movement = [
					-cosAngleMulRadius * radiusX * (1 / (1 + particleLifeTime)),
					-sinAngleMulRadius * radiusY * (1 / (1 + particleLifeTime)),
					zMovement
				];
				
				// Adding spaceship rotation in movement
				var rotationQuat = quat.clone(self.rotation);
				quat.invert(rotationQuat, rotationQuat);
				vec3.transformQuat(movement, movement, rotationQuat);
				
				var position = [
					cosAngleMulRadius * radiusX, 
					sinAngleMulRadius * radiusY, 
					0
				];
				
				particlesToAdd.push(
					new Particle(material_P_SMOKE, position, particleSize, particleColor, particleLifeTime, movement, self)
				);
			}
			self.world.add(particlesToAdd);
			self.lastFlameTime = TimerManager.lastUpdateTimeStamp;
		}
	};
	
	if(this.state > 0) {
		var timeBetweenFlames = 400 * (2 - this.getPowerRate());
		if(this.flameTimer) {
			this.flameTimer.reset(particleTimerCallBack, timeBetweenFlames, false);
		} else {
			// First call : initializing
			this.flameTimer = new Timer(particleTimerCallBack, timeBetweenFlames, false);
		}
		
		if(this.lastFlameTime < TimerManager.lastUpdateTimeStamp - timeBetweenFlames) {
			// Update if last change wasn't too near
			this.flameTimer.forceExecutionNow();
		}
	}
	
	this.spaceShip.updateAcceleration();
};