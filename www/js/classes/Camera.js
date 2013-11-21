/**
 * The Camera object handles the position, rotation and configuration of the camera
 */
var Camera = function(world) {
	this.world = world;
	this.rotation = quat.create();
	this.moveSpeed = 0.003;
	this.position = vec3.fromValues(0, 0, 0); // TODO initial position should be dynamic
	this.lastAnimationTime = 0;
	this.screenSize = null;
	this.projectionMatrix = null;
	this.lastModelViewMatrix = mat4.create();
	this.fovy = 45;
	this.viewDistance = 1000000; // TODO
	// TODO customizable fovy and view distance
};

Camera.prototype.updateProjectionMatrix = function(screenWidth, screenHeight) {
	this.screenSize = vec2.fromValues(screenWidth, screenHeight);
	this.projectionMatrix = mat4.create();
	mat4.perspective(this.projectionMatrix, this.fovy, screenWidth / screenHeight, 0.45, this.viewDistance);
	return this.projectionMatrix;
};

// TODO option to freeze z axis (and synchronize camera rotation with spaceship + gravity and walls)

Camera.prototype.getPosition = function() {
	var pos = vec3.clone(this.position);
	if(this.world.userSpaceShip != null) {
		vec3.add(pos, pos, this.world.userSpaceShip.getPosition());
	}
	return pos;
};

/**
 * Updates the projection, model and view matrix, depending of Controls.
 * @return mat4 The model/view matrix
 */
Camera.prototype.update = function() {
	var negatedPosition = vec3.create();
	var invertedRotation = mat4.create();
	
	// Moves depends of elapsed time
	var timeNow = TimerManager.lastUpdateTimeStamp;
	if(this.lastAnimationTime != 0) {
		var elapsed = timeNow - this.lastAnimationTime;
		
		/**************************************************
		 ********************* Moves **********************
		 **************************************************/
		
		var movement = Controls.getMovement();
		var currentMove = vec3.create();
		vec3.scale(currentMove, movement, this.moveSpeed * elapsed);
		vec3.transformQuat(currentMove, currentMove, this.rotation);
		vec3.add(this.position, this.position, currentMove);
		
		vec3.negate(negatedPosition, this.position);
		
		/**************************************************
		 ******************** Rotation ********************
		 **************************************************/
		
		var rotationRate = Controls.getRotation();
		
		var tempQuat = quat.create();
		quat.rotateX(tempQuat, tempQuat, degToRad(rotationRate[0] * elapsed));
		quat.rotateY(tempQuat, tempQuat, degToRad(rotationRate[1] * elapsed));
		quat.rotateZ(tempQuat, tempQuat, degToRad(rotationRate[2] * elapsed));
		quat.normalize(tempQuat, tempQuat);
		quat.multiply(this.rotation, this.rotation, tempQuat);
		
		mat4.fromQuat(invertedRotation, this.rotation);
		mat4.invert(invertedRotation, invertedRotation);
	}
	this.lastAnimationTime = timeNow;
	
	mat4.identity(this.lastModelViewMatrix);
	
	mat4.multiply(this.lastModelViewMatrix, this.lastModelViewMatrix, invertedRotation);
	mat4.translate(this.lastModelViewMatrix, this.lastModelViewMatrix, negatedPosition);
	// TODO camera lagging --> webworker ?
	
	if(this.world.userSpaceShip != null) {
		var ssRotation = quat.create();
		quat.rotateX(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[0]));
		quat.rotateY(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[1]));
		quat.rotateZ(ssRotation, ssRotation, degToRad(this.world.userSpaceShip.rotation[2]));
		mat4.fromQuat(invertedRotation, ssRotation);
		
		vec3.negate(negatedPosition, this.world.userSpaceShip.getPosition());
		
		mat4.multiply(this.lastModelViewMatrix, this.lastModelViewMatrix, invertedRotation);
		mat4.translate(this.lastModelViewMatrix, this.lastModelViewMatrix, negatedPosition);
	}
	
	return this.lastModelViewMatrix;
};

// TODO propellers with size > 1 ==> problem in designer