/**
 * The Camera object handles the position, rotation and configuration of the camera
 */
var Camera = function(world) {
	this.world = world;
	this._rotation = quat.create();
	this.moveSpeed = 0.003;
	//this.moveSpeed = 0.15; // TODO only for tests, remove it
	this._position = vec3.fromValues(0, 0, 0); // TODO initial position should be dynamic
	this.lastAnimationTime = 0;
	this.screenSize = null;
	this.projectionMatrix = null;
	this.lastModelViewMatrix = mat4.create();
	this.fovy = 45;
	this.viewDistance = 1000000;
	this.targetBuilding = null;
	this.controls = new Controls(this);
	this.clipMode = false;
	// TODO customizable fovy and view distance
};

Camera.prototype.updateProjectionMatrix = function(screenWidth, screenHeight) {
	this.screenSize = vec2.fromValues(screenWidth, screenHeight);
	this.projectionMatrix = mat4.create();
	mat4.perspective(this.projectionMatrix, this.fovy, screenWidth / screenHeight, 0.1, this.viewDistance);
	return this.projectionMatrix;
};

Camera.prototype.init = function(canvas) {
	this.controls.init(canvas);
};

// TODO option to freeze z axis (and synchronize camera rotation with spaceship + gravity and walls)

/*Camera.prototype.getPosition = function() {
	return vec3.clone(this._position); // TODO is it useful to clone it ?
};*/

/**
 * Resets the camera if the building which has been removed is the one targetted by the camera.
 * @param Building The removed building
 */
Camera.prototype.notifyBuildingRemoved = function(building) {
	if(building == this.targetBuilding) {
		this.setTargetBuilding(null);
	}
};

Camera.prototype.setTargetBuilding = function(newTarget) {
	if(this.targetBuilding != null) this.targetBuilding.isVisible = true;
	if(newTarget != null) newTarget.isVisible = false;
	this.targetBuilding = newTarget;
};

Camera.prototype.getRotation = function() {
	var rotation = quat.create();
	if(this.clipMode || this.targetBuilding == null) {
		quat.copy(rotation, this._rotation);
		quat.invert(rotation, rotation);
		
		if(this.world.userSpaceShip != null) {
			var ssRotation = quat.create();
			quat.rotateX(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[0]));
			quat.rotateY(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[1]));
			quat.rotateZ(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[2]));
			quat.multiply(rotation, rotation, ssRotation);
		}
	} else {
		quat.copy(rotation, this.targetBuilding.rotation);
	}
	
	return rotation;
};

/**
 * @return The camera absolute position in the world
 */
Camera.prototype.getAbsolutePosition = function() { // TODO optimize by caching it for each frame
	var pos = vec3.create();
	if(this.clipMode || this.targetBuilding == null) {
		vec3.copy(pos, this._position);
		
		if(this.world.userSpaceShip != null) {
			var ssRotation = quat.create();
			quat.rotateX(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[0]));
			quat.rotateY(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[1]));
			quat.rotateZ(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[2]));
			quat.invert(ssRotation, ssRotation);
			vec3.transformQuat(pos, pos, ssRotation);
			
			vec3.add(pos, pos, this.world.userSpaceShip.getPosition());
		}
	} else {
		vec3.copy(pos, this.targetBuilding.position);
	}
	
	return pos;
};

/**
 * Updates the projection, model and view matrix, depending of Controls.
 * @return mat4 The model/view matrix
 */
Camera.prototype.update = function() {
	var userSpaceShip = this.world.userSpaceShip;
	
	// TODO add an inventory button in hud
	
	if(this.targetBuilding == null && userSpaceShip != null) {
		for(var k in userSpaceShip.entities) {
			if(userSpaceShip.entities[k].type.isControllable) {
				this.setTargetBuilding(userSpaceShip.entities[k]);
				break;
			}
		}
	}
	
	var invertedRotation = mat4.create();
	var negatedPosition = vec3.create();
	
	// TODO only for tests, remove it
	if(this.controls._keys[107]) this.moveSpeed *= 1.05;
	if(this.controls._keys[109]) this.moveSpeed /= 1.05;
	
	// Moves depends of elapsed time
	var timeNow = TimerManager.lastUpdateTimeStamp;
	if(this.lastAnimationTime != 0) {
		var elapsed = timeNow - this.lastAnimationTime;
		
		var movement = this.controls.getMovement();
		var rotationRate = this.controls.getRotation();
		
		if(this.clipMode || this.targetBuilding == null) {
			// Moves
			var currentMove = vec3.create();
			vec3.scale(currentMove, movement, this.moveSpeed * elapsed);
			vec3.transformQuat(currentMove, currentMove, this._rotation);
			vec3.add(this._position, this._position, currentMove);
			
			vec3.negate(negatedPosition, this._position);
			
			// Rotation
			
			var tempQuat = quat.create();
			quat.rotateX(tempQuat, tempQuat, degToRad(rotationRate[0] * elapsed));
			quat.rotateY(tempQuat, tempQuat, degToRad(rotationRate[1] * elapsed));
			quat.rotateZ(tempQuat, tempQuat, degToRad(rotationRate[2] * elapsed));
			
			quat.normalize(tempQuat, tempQuat);
			quat.multiply(this._rotation, this._rotation, tempQuat);
			
			mat4.fromQuat(invertedRotation, this._rotation);
			mat4.invert(invertedRotation, invertedRotation);
		} else {
			var halfPI = Math.PI / 2;
			
			var targetEuler = this.targetBuilding.eulerRotationInSpaceShip;
			
			// First person euler rotation
			var eulerRotation = vec3.fromValues(
				degToRad(rotationRate[0] * elapsed),
				degToRad(rotationRate[1] * elapsed),
				0
			);
			// Constraints X
			if(targetEuler[0] + eulerRotation[0] >  halfPI) eulerRotation[0] =  halfPI - targetEuler[0];
			if(targetEuler[0] + eulerRotation[0] < -halfPI) eulerRotation[0] = -halfPI - targetEuler[0];
			
			// Moves
			var currentMove = vec3.create();
			vec3.scale(currentMove, movement, this.moveSpeed * elapsed);
			var translation = vec3.fromValues(
				Math.sin(targetEuler[1]) * currentMove[2] + Math.sin(targetEuler[1] + halfPI) * currentMove[0],
				0,
				Math.cos(targetEuler[1]) * currentMove[2] + Math.cos(targetEuler[1] + halfPI) * currentMove[0]
			);
			
			// Camera rotation
			mat4.identity(invertedRotation);
			mat4.rotateY(invertedRotation, invertedRotation, targetEuler[1]);
			mat4.rotateX(invertedRotation, invertedRotation, targetEuler[0]);
			mat4.invert(invertedRotation, invertedRotation);
			
			this.targetBuilding.translateAndRotateInSpaceShip(translation, eulerRotation);
			
			vec3.negate(negatedPosition, this.targetBuilding.positionInSpaceShip);
			
			// TODO building moves (db + multiplayer)
			// TODO stairs/ladders in physics
			// TODO gravity in physics
			// TODO in Room, create hitboxes
		}
	}
	this.lastAnimationTime = timeNow;
	
	// TODO separate mtl files ?
	// TODO clean door obj file
	
	mat4.identity(this.lastModelViewMatrix);
	
	mat4.multiply(this.lastModelViewMatrix, this.lastModelViewMatrix, invertedRotation);
	mat4.translate(this.lastModelViewMatrix, this.lastModelViewMatrix, negatedPosition);
	// TODO camera lagging --> webworker ?
	
	if(userSpaceShip != null) {
		var ssRotation = quat.create();
		quat.rotateX(ssRotation, ssRotation, degToRad(userSpaceShip.rotation[0]));
		quat.rotateY(ssRotation, ssRotation, degToRad(userSpaceShip.rotation[1]));
		quat.rotateZ(ssRotation, ssRotation, degToRad(userSpaceShip.rotation[2]));
		mat4.fromQuat(invertedRotation, ssRotation);
		
		//mat4.translate(this.lastModelViewMatrix, this.lastModelViewMatrix, negatedPosition);
		mat4.multiply(this.lastModelViewMatrix, this.lastModelViewMatrix, invertedRotation);
	}
	
	return this.lastModelViewMatrix;
};
