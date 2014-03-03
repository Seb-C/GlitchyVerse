/**
 * AABB HitBox. setPositionAndRotation MUST be called before using the HitBox.
 * @param HitBoxDefinition Definition of the HitBox
 */
var HitBox = function(definition) {
	this.definition = definition;
	
	// Absolute min and max in the world
	this.absMin = vec3.create();
	this.absMax = vec3.create();
	this.absMiddle = vec3.create();
	
	// The size depends on the rotation, it must not be a part of HitBoxDefinition
	this.halfSize = vec3.create();
};

/**
 * Sets the position and rotation of the hitbox
 * @param vec3 The position of the hitbox
 * @param quat Rotation of the HitBox
 */
HitBox.prototype.setPositionAndRotation = function(position, rotation) {
	if(rotation[0] == 0 && rotation[1] == 0 && rotation[2] == 0) {
		// Empty rotation
		vec3.copy(this.absMin, this.definition.min);
		vec3.copy(this.absMax, this.definition.max);
	} else {
		var temp = vec3.create();
		var b = [this.definition.min, this.definition.max];
		for(var i = 0 ; i < 8 ; i++) { // Vertices of the box, looping bounds index from 000 to 111 for XYZ
			vec3.set(temp, b[(i&4)>>2][0], b[(i&2)>>1][1], b[i&1][2]);
			vec3.transformQuat(temp, temp, rotation);
			if(i == 0) {
				vec3.copy(this.absMin, temp);
				vec3.copy(this.absMax, temp);
			} else {
				vec3.min(this.absMin, this.absMin, temp);
				vec3.max(this.absMax, this.absMax, temp);
			}
		}
	}
	
	// Translating to the position
	vec3.add(this.absMin, this.absMin, position);
	vec3.add(this.absMax, this.absMax, position);
	
	// Additional values
	vec3.subtract(this.halfSize, this.absMax, this.absMin);
	vec3.scale(this.halfSize, this.halfSize, 0.5);
	vec3.add(this.absMiddle, this.absMin, this.halfSize);
};

/**
 * Checks if the hitbox will be colliding colliding with another after the application of a movement
 * @param HitBox The other hitbox to check
 * @param The movement that will be applied
 * @return boolean True if the hitbox is colliding with "b"
 */
HitBox.prototype.isCollision = function(b, movement) {
	return (
		   !(this.absMin[0] + movement[0] >= b.absMax[0] || this.absMax[0] + movement[0] <= b.absMin[0])
		&& !(this.absMin[1] + movement[1] >= b.absMax[1] || this.absMax[1] + movement[1] <= b.absMin[1])
		&& !(this.absMin[2] + movement[2] >= b.absMax[2] || this.absMax[2] + movement[2] <= b.absMin[2])
	);
};

/**
 * When the hitbox will collide with "b" after a movement, returns the penetration vector
 * @param HitBox The HitBox collided
 * @param The movement that will be applied
 * @return vec3 The penetration vector
 */
HitBox.prototype.getPenetrationVector = function(b, movement) {
	var r = vec3.create(); // TODO avoid creation of a vector here (+ solve memory leaks everywhere) ?
	var minAxisAbsolutePenetration = null;
	var minAxisAbsolutePenetrationIndex = null;
	for(var i = 0 ; i < 3 ; i++) {
		var minRequiredDistance = this.halfSize[i] + b.halfSize[i];
		var realDistance = this.absMiddle[i] + movement[i] - b.absMiddle[i];
		var direction = realDistance < 0 ? 1 : -1;
		var absolutePenetration = minRequiredDistance - Math.abs(realDistance);
		
		r[i] = absolutePenetration * direction;
		
		if(minAxisAbsolutePenetrationIndex == null || absolutePenetration < minAxisAbsolutePenetration) {
			minAxisAbsolutePenetration = absolutePenetration;
			minAxisAbsolutePenetrationIndex = i;
		}
	}
	
	// The penetration is made only on the smallest axis value
	for(var i = 0 ; i < 3 ; i++) {
		if(i != minAxisAbsolutePenetrationIndex) {
			r[i] = 0;
		}
	}
	
	return r;
};