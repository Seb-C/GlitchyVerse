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
 * AABB HitBox. linkToBuilding MUST be called before using the HitBox.
 * @param vec3 The minimum x, y and z coordinates of the hitbox, relative to position
 * @param vec3 The maximum x, y and z coordinates of the hitbox, relative to position
 * @param boolean (optional) Default false. True if the hitbox can be moved.
 */
var HitBox = function(min, max, isDynamic) {
	this.min = min;
	this.max = max;
	this.bounds = [this.min, this.max];
	this.building = null;
	this.isDynamic = isDynamic || false;
	
	// Absolute min and max in the world
	this.absMin = vec3.create();
	this.absMax = vec3.create();
	this.absMiddle = vec3.create();
	
	this.halfSize = vec3.create();
	
	this.onCollide = null;
};

// TODO all times --> seconds instead of milliseconds ?

/**
 * Changes or sets the Building linked to the HitBox
 * @param Building The building linked to this HitBox
 */
HitBox.prototype.linkToBuilding = function(building) {
	this.building = building;
	
	var position = this.building.positionInSpaceShip;
	var rotation = this.building.rotationInSpaceShip;
	
	//if(rotation[0] == 0 && rotation[1] == 0 && rotation[2] == 0) {
	//	// Empty rotation
	//	vec3.copy(this.absMin, this.min);
	//	vec3.copy(this.absMax, this.max);
	//} else {
		var temp = vec3.create();
		for(var i = 0 ; i < 8 ; i++) { // Vertices of the box, looping bounds index from 000 to 111 for XYZ
			vec3.set(temp, this.bounds[(i&4)>>2][0], this.bounds[(i&2)>>1][1], this.bounds[i&1][2]);
			vec3.transformQuat(temp, temp, rotation);
			if(i == 0) {
				vec3.copy(this.absMin, temp);
				vec3.copy(this.absMax, temp);
			} else {
				vec3.min(this.absMin, this.absMin, temp);
				vec3.max(this.absMax, this.absMax, temp);
			}
		}
	//}
	
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
		this.building.isBuilt && b.building.isBuilt
		&& !(this.absMin[0] + movement[0] > b.absMax[0] || this.absMax[0] + movement[0] < b.absMin[0])
		&& !(this.absMin[1] + movement[1] > b.absMax[1] || this.absMax[1] + movement[1] < b.absMin[1])
		&& !(this.absMin[2] + movement[2] > b.absMax[2] || this.absMax[2] + movement[2] < b.absMin[2])
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

/**
 * (static) Creates a hitbox from the vertices of a model
 * @param Model A model, which has already been initialized
 * @return HitBox The created hitbox
 */
HitBox.createFromModel = function(model) {
	var min = null;
	var max = null;
	for(var i = 0 ; i < model.meshes.length ; i++) {
		var vertices = model.meshes[i].vertices;
		for(var j = 0 ; j < vertices.length ; j += 3) {
			if(min == null && max == null) {
				min = vec3.fromValues(vertices[j], vertices[j + 1], vertices[j + 2]);
				max = vec3.fromValues(vertices[j], vertices[j + 1], vertices[j + 2]);
			} else {
				if(vertices[j    ] < min[0]) min[0] = vertices[j    ];
				if(vertices[j + 1] < min[1]) min[1] = vertices[j + 1];
				if(vertices[j + 2] < min[2]) min[2] = vertices[j + 2];
				if(vertices[j    ] > max[0]) max[0] = vertices[j    ];
				if(vertices[j + 1] > max[1]) max[1] = vertices[j + 1];
				if(vertices[j + 2] > max[2]) max[2] = vertices[j + 2];
			}
		}
	}
	
	return new HitBox(min, max);
};
