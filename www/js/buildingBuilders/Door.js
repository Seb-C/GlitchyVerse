/**
 * A simple door. See Entity for other parameters.
 * @param {definition} Object Containing the definition of the door, with attributes : 
 *               - unitSize : Array(3) Vector(3), size of each unit (the smallest possible room size)
 *               - edgeSize : The side of the room edges
 */
Building.builders.Door = function(building, state) {
	var isAnimationStarted = false;
	
	// TODO make a single object
	building.model.loadMeshesFromObj("door.obj");
	building.model.loadMeshesFromObj("door_locks.obj");
	
	var isOpened = state == 1;
	
	// Hitboxes (TODO definition file + use door size ?)
	var hbLeft  = new HitBox(vec3.fromValues(-1.8,   -1.55, -0.2), vec3.fromValues(-0.675, 1.55, 0.2));
	var hbRight = new HitBox(vec3.fromValues( 0.675, -1.55, -0.2), vec3.fromValues( 1.8,   1.55, 0.2));
	var hbTop   = new HitBox(vec3.fromValues(-0.675,  0.97, -0.2), vec3.fromValues(0.675,  1.5,  0.2));
	var hbDoor  = new HitBox(vec3.fromValues(-0.675, -1.55, -0.2), vec3.fromValues(0.675,  0.97, 0.2));
	building.hitBoxes.push(hbLeft, hbRight, hbTop, hbDoor);
	building.spaceShip.physics.add(hbLeft);
	building.spaceShip.physics.add(hbRight);
	building.spaceShip.physics.add(hbTop);
	if(!isOpened) building.spaceShip.physics.add(hbDoor);
	
	// TODO ne pas ajouter si ouvert
	
	building.setOpened = function(newIsOpened) {
		if(building.isBuilt && !isAnimationStarted && isOpened != newIsOpened) {
			isAnimationStarted = true;
			
			var animationToCall;
			if(newIsOpened && !isOpened) {
				animationToCall = "open";
				building.spaceShip.physics.remove(hbDoor);
			} else {
				animationToCall = "close";
				building.spaceShip.physics.add(hbDoor);
			}
			
			building.world.animator.animate(building, animationToCall, function() {
				isAnimationStarted = false;
			});
			
			building.world.server.sendMessage("update_doors", {"id": building.id, "state": newIsOpened ? 1 : 0});
			isOpened = newIsOpened;
		}
	};
	
	building.isOpened = function() {
		return isOpened;
	};
	
	for(var i = 0 ; i < building.model.meshes.length ; i++) {
		var mesh = building.model.meshes[i];
		
		if(mesh.groups.indexOf("lock") != -1) {
			building.world.configurePickableContent(mesh, function() {
				building.setOpened(!isOpened);
			}, false);
		}
	}
	
	building.model.regenerateCache();
	
	if(isOpened) {
		isAnimationStarted = true;
		building.world.animator.animate(building, "open", function() {
			isAnimationStarted = false;
		});
	}
};
