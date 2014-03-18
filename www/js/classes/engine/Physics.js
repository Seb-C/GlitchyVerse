/**
 * Represents a physics world
 * @param vec3 (optional) The gravity vector
 */
var Physics = function(gravity) {
	this.hitBoxes = [];
	this.gravity = gravity || vec3.create();
	this.lastUpdateTime = null;
};

/**
 * Applies gravity to every dynamic hitbox in the physics world
 */
Physics.prototype.update = function() {
	// TODO gravity boxes instead of a uniform one ?
	if(this.lastUpdateTime != null) {
		var alpha = (TimerManager.lastUpdateTimeStamp - this.lastUpdateTime) / 1000;
		var gravityToApply = vec3.scale(vec3.create(), this.gravity, alpha); // TODO don't create a vector here
		var emptyRotation = vec3.create();
		// TODO optimize this loop by caching static/dynamic hitboxes ?
		for(var i = 0 ; i < this.hitBoxes.length ; i++) {
			var a = this.hitBoxes[i];
			if(a.building != null && a.isDynamic) {
				a.building.translateAndRotateInSpaceShip(gravityToApply, emptyRotation);
			}
		}
	}
	this.lastUpdateTime = TimerManager.lastUpdateTimeStamp;
};

/**
 * Checks if a future movement of the hitbox will be possible. If not, the movement will be modified
 * @param HitBox The hitbox which requires to move
 * @param vec3 The required movement. If it can't be applied, it will be modified to the optimal movement
 */
Physics.prototype.preventCollision = function(hitBox, requiredMovement) {
	if(hitBox.building != null) {
		for(var i = 0 ; i < this.hitBoxes.length ; i++) {
			var currentHitBox = this.hitBoxes[i];
			if(!currentHitBox.isDynamic && currentHitBox.building != null && currentHitBox != hitBox) {
				if(hitBox.isCollision(currentHitBox, requiredMovement)) {
					var penetration = hitBox.getPenetrationVector(currentHitBox, requiredMovement);
					vec3.subtract(requiredMovement, requiredMovement, penetration);
					if(currentHitBox.movementTransformer != null) {
						currentHitBox.movementTransformer(requiredMovement);
					}
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
