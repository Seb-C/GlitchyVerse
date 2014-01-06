/**
 * Creates a console with a control screen
 * @param {definition} Object Containing the definition of the window
 */
Models.Console = function(world, position, rotation, definition, state) {
	var meshes = Models.loadMeshesFromObj("console.obj");
	var material_BLACK = Materials.get("BLACK");
	
	// Searching from mesh which has a black texture (it's used to identify where to draw the screen)
	// TODO replace black texture by a group to identify it
	for(var i = 0 ; i < meshes.length ; i++) {
		var mesh = meshes[i];
		if(mesh.texture == material_BLACK) {
			// TODO add a small light to the screen
			mesh.texture = definition.spaceShip.screen.canvasTexture;
			
			var widthRatio  = definition.spaceShip.screen.widthRatio;
			var heightRatio = definition.spaceShip.screen.heightRatio;
			
			mesh.texturePart = [
				0,          0,
				widthRatio, 0,
				widthRatio, heightRatio,
				0,          heightRatio
			];
			
			world.configurePickableMesh(mesh, function(x, y) {
				definition.spaceShip.screen.click(
					Math.round(x * definition.spaceShip.screen.screenWidth), 
					Math.round(y * definition.spaceShip.screen.screenHeight)
				);
			}, true);
			
			break;
		}
	}
	
	// TODO use a special named material for the screen ?
	
	this.parent(world, position, rotation, meshes, state);
	this.model = "Console";
};
Models.Console.extend(Entity);