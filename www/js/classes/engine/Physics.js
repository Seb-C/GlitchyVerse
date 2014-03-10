/**
 * Represents a physics world
 */
var Physics = function() {
	this.hitBoxes = [];
};

/**
 * Checks if a future movement of the hitbox will be possible. If not, the movement will be modified
 * @param HitBox The hitbox which requires to move
 * @param vec3 The required movement. If it can't be applied, it will be modified to the optimal movement
 */
Physics.prototype.preventCollision = function(hitBox, requiredMovement) {
	if(hitBox.isInitialized) {
		for(var i = 0 ; i < this.hitBoxes.length ; i++) {
			var currentHitBox = this.hitBoxes[i];
			if(currentHitBox != hitBox && currentHitBox.isInitialized) {
				if(hitBox.isCollision(currentHitBox, requiredMovement)) {
					var penetration = hitBox.getPenetrationVector(currentHitBox, requiredMovement);
					vec3.subtract(requiredMovement, requiredMovement, penetration);
				}
			}
		}
	}
};

/**
 * Adds a HitBox or an array of HitBox to the physics world
 * @param HitBox|Array(HitBox)
 */
Physics.prototype.add = function(o) {
	if(o instanceof HitBox) {
		this.hitBoxes.push(o);
	} else if(o instanceof Array && o[0] instanceof HitBox) {
		Array.prototype.push.apply(this.hitBoxes, o);
	} else {
		throw new Error("Cannot add object type " + typeof(o) + " in Physics.");
	}
};

/**
 * Removes a HitBox or an array of HitBox from the physics world
 * @param HitBox|Array(HitBox)
 */
Physics.prototype.remove = function(o) {
	if(o instanceof HitBox) {
		var i = this.hitBoxes.indexOf(o);
		if(i != -1) this.hitBoxes.splice(i, 1);
	} else if(o instanceof Array && o[0] instanceof HitBox) {
		this.hitBoxes = this.hitBoxes.filter(function(v) { return o.indexOf(v) == -1; });
	} else {
		throw new Error("Cannot remove object type " + typeof(o) + " from Physics.");
	}
};
