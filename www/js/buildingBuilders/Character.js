Building.builders.Character = function(building, state) {
	building.model.loadMeshesFromObj("character.obj");
	building.model.regenerateCache();
	
	var hitBox = HitBox.createFromModel(building.model);
	hitBox.isDynamic = true;
	building.hitBoxes.push(hitBox);
	building.spaceShip.physics.add(hitBox);
	
	// TODO texture
	// TODO animations
	// TODO avoid X rotation of the character when controlled by the camera
	// TODO face
};
