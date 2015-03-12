/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Sébastien CAPARROS (GlitchyVerse)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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
			// TODO add a small light to the screen (done ? to check)
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
				if(building.isBuilt && building.isEnabled) {
					building.spaceShip.screen.click(
						Math.round(x * building.spaceShip.screen.screenWidth), 
						Math.round(y * building.spaceShip.screen.screenHeight)
					);
				}
			}, true);
			
			break;
		}
	}
	
	building.model.regenerateCache();
	
	var hitBox = HitBox.createFromModel(building.model);
	building.hitBoxes.push(hitBox);
	building.spaceShip.physics.add(hitBox);
};
