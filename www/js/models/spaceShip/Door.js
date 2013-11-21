/**
 * A simple door. See Entity for other parameters.
 * @param {definition} Object Containing the definition of the door, with attributes : 
 *               - unitSize : Array(3) Vector(3), size of each unit (the smallest possible room size)
 *               - edgeSize : The side of the room edges
 */
Models.Door = function(world, position, rotation, definition, state) {
	this.animCurrentTimeRate = null; // Open and close animations can be stored here to be used in designer
	this.openDistance = 0.9; // Useful for open/close animation
	this.isAnimationStarted = false;
	
	var meshes = Models.loadMeshesFromObj("door.obj");
	meshes = meshes.concat(Models.loadMeshesFromObj("door_locks.obj"));
	
	this.meshesDoorLeft  = [];
	this.meshesDoorRight = [];
	for(var i = 0 ; i < meshes.length ; i++) {
		var mesh = meshes[i];
		
		if(mesh.groups.indexOf("doorLeft") != -1) {
			this.meshesDoorLeft.push(mesh);
		}
		if(mesh.groups.indexOf("doorRight") != -1) {
			this.meshesDoorRight.push(mesh);
		}
		if(mesh.groups.indexOf("lock") != -1) {
			world.configurePickableMesh(mesh, function() {
				this.entity.changeState(1 - this.entity.state);
			}, false);
		}
		
		// Doing it for all meshes, but we should filter on doors
		mesh.initialVertices = mesh.vertices.slice(0);
	}
	
	this.model = "door.obj";
	this.parent(world, position, rotation, meshes, state);
};
Models.Door.extend(Entity);

Models.Door.prototype.changeState = function(newState) {
	if(this.state == null && newState == 0) {
		// First call and door is closed --> nothing to do
		this.state = newState;
	} else if(/*this.animTimer*/this.isAnimationStarted || this.state == newState) {
		// Not changing the state
	} else {
		var self = this;
		this.isAnimationStarted = true;
		var animationToCall = this.state == null || newState > this.state ? "open" : "close";
		this.world.animator.animate(this, animationToCall, function() {
			// TODO in animator, use apply on entity to avoid using "self" variable + do it everywhere possible
			self.isAnimationStarted = false;
		});
		
		if(this.state != null) {
			this.world.server.sendMessage("update_doors", {"id": this.id, "state": newState});
		}
		this.state = newState;
	}
};