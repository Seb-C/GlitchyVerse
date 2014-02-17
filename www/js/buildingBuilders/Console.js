/**
 * Creates a console with a control screen
 * @param {definition} Object Containing the definition of the window
 */
Building.builders.Console = function(building, state) {
	building.model.loadMeshesFromObj("console.obj");
	var material_BLACK = Materials.get("BLACK");
	
	// Searching from mesh which has a black texture (it's used to identify where to draw the screen)
	// TODO replace black texture by a group to identify it
	for(var i = 0 ; i < building.model.meshes.length ; i++) {
		var mesh = building.model.meshes[i];
		if(mesh.texture == material_BLACK) {
			// TODO add a small light to the screen
			mesh.texture = building.spaceShip.screen.canvasTexture;
			
			var widthRatio  = building.spaceShip.screen.widthRatio;
			var heightRatio = building.spaceShip.screen.heightRatio;
			
			mesh.texturePart = [
				0,          0,
				widthRatio, 0,
				widthRatio, heightRatio,
				0,          heightRatio
			];
			
			building.world.configurePickableContent(mesh, function(x, y) {
				if(building.isBuilt) {
					building.spaceShip.screen.click(
						Math.round(x * building.spaceShip.screen.screenWidth), 
						Math.round(y * building.spaceShip.screen.screenHeight)
					);
				}
			}, true);
			
			break;
		}
	}
	
	// TODO use a special named material for the screen ?
	
	building.model.regenerateCache();
};