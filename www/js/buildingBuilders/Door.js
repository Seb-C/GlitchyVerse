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
	
	building.setOpened = function(newIsOpened) {
		if(building.isBuilt && !isAnimationStarted && isOpened != newIsOpened) {
			isAnimationStarted = true;
			var animationToCall = newIsOpened && !isOpened ? "open" : "close";
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