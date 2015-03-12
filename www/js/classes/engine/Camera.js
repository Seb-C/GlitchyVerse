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
 * The Camera object handles the position, rotation and configuration of the camera
 */
var Camera = function(world) {
	this.world = world;
	this._rotation = quat.create();
	this._eulerRotation = vec3.create(); // FPS mode
	this.moveSpeed = 0.003;
	this._position = vec3.fromValues(0, 0, 0);
	this.lastAnimationTime = 0;
	this.screenSize = null;
	this.projectionMatrix = null;
	this.lastModelViewMatrix = mat4.create();
	this.fovy = 45;
	this.viewDistance = 1000000;
	this.targetBuilding = null;
	this.controls = new Controls(this);
	this.clipMode = false;
	// TODO customizable fovy and view distance (+fog ?)
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
		quat.copy(rotation, this._eulerRotation);
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
	
	// TODO optimize by not creating temp vectors everytime
	
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
			
			// First person euler rotation
			var yEulerRotation = degToRad(rotationRate[1] * elapsed);
			this._eulerRotation[0] += degToRad(rotationRate[0] * elapsed);
			if(this._eulerRotation[0] >  halfPI) this._eulerRotation[0] =  halfPI;
			if(this._eulerRotation[0] < -halfPI) this._eulerRotation[0] = -halfPI;
			
			// Moves
			var currentMove = vec3.create();
			vec3.scale(currentMove, movement, this.moveSpeed * elapsed);
			
			// Only rotating the character over the Y axis
			var targetBuildingRotation = quat.create();
			quat.rotateY(targetBuildingRotation, targetBuildingRotation, yEulerRotation);
			this.targetBuilding.moveAndLookInSpaceShip(currentMove, targetBuildingRotation);
			
			// Camera rotation
			var cameraQuat = quat.create();
			quat.rotateX(cameraQuat, cameraQuat, this._eulerRotation[0]);
			quat.multiply(cameraQuat, this.targetBuilding.rotationInSpaceShip, cameraQuat);
			mat4.fromQuat(invertedRotation, cameraQuat);
			mat4.invert(invertedRotation, invertedRotation);
			
			var eye = this.targetBuilding.model.meshGroups["eye"];
			if(eye) {
				var vertices = eye[0].vertices;
				negatedPosition[0] += vertices[0];
				negatedPosition[1] += vertices[1];
				negatedPosition[2] += vertices[2];
				vec3.transformQuat(negatedPosition, negatedPosition, this.targetBuilding.rotationInSpaceShip);
			}
			vec3.add(negatedPosition, negatedPosition, this.targetBuilding.positionInSpaceShip);
			vec3.negate(negatedPosition, negatedPosition);
			
			// TODO send building moves to server and other players (+ animate on other clients)
			// TODO stop animation when the character stops walking
		}
	}
	this.lastAnimationTime = timeNow;
	
	// TODO separate mtl files ?
	
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
	
	// TODO character rotation is inverted ?!?
	
	return this.lastModelViewMatrix;
};
