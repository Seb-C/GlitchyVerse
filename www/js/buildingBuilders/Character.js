Building.builders.Character = function(building, state) {
	building.model.loadMeshesFromObj("character.obj");
	building.model.regenerateCache();
	
	var hitBox = HitBox.createFromModel(building.model);
	building.hitBoxes.push(hitBox);
	building.spaceShip.physics.add(hitBox);
};
