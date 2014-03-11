Building.builders.Ladder = function(building, state) {
	building.model.loadMeshesFromObj("ladder.obj");
	building.model.regenerateCache();
	
	var edgeSize = building.spaceShip.edgeSize;
	var unitSize = building.spaceShip.roomUnitSize;
	
	building.hitBoxes.push(new HitBox(vec3.fromValues(-1.8,  1.75, -1.8 ), vec3.fromValues(-0.72, 1.95,  1.8 ))); // Left
	building.hitBoxes.push(new HitBox(vec3.fromValues( 0.72, 1.75, -1.8 ), vec3.fromValues( 1.8,  1.95,  1.8 ))); // Right
	building.hitBoxes.push(new HitBox(vec3.fromValues(-0.72, 1.75,  0.72), vec3.fromValues( 0.72, 1.95,  1.8 ))); // Front
	building.hitBoxes.push(new HitBox(vec3.fromValues(-0.72, 1.75, -1.8 ), vec3.fromValues( 0.72, 1.95, -0.72))); // Back
	
	building.spaceShip.physics.add(building.hitBoxes);
};
