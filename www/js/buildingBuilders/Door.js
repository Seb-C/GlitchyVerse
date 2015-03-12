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
 * A simple door. See Entity for other parameters.
 * @param {definition} Object Containing the definition of the door, with attributes : 
 *               - unitSize : Array(3) Vector(3), size of each unit (the smallest possible room size)
 *               - edgeSize : The side of the room edges
 */
Building.builders.Door = function(building, state) {
	var isAnimationStarted = false;
	
	building.model.loadMeshesFromObj("door.obj");
	
	var isOpened = state == 1;
	
	// Hitboxes (TODO definition file + use door size if > 1 ?)
	var hbTopLeft     = new HitBox(vec3.fromValues(-1.8,  0.9, -0.2), vec3.fromValues(-0.9,  1.8, 0.2));
	var hbTopRight    = new HitBox(vec3.fromValues( 0.9,  0.9, -0.2), vec3.fromValues( 1.8,  1.8, 0.2));
	var hbBottomLeft  = new HitBox(vec3.fromValues(-1.8, -1.8, -0.2), vec3.fromValues(-0.9, -0.9, 0.2));
	var hbBottomRight = new HitBox(vec3.fromValues( 0.9, -1.8, -0.2), vec3.fromValues( 1.8, -0.9, 0.2));
	var hbDoor = new HitBox(vec3.fromValues(-1.8, -1.8, -0.2), vec3.fromValues(1.8, 1.8, 0.2));
	building.hitBoxes.push(hbTopLeft, hbTopRight, hbBottomLeft, hbBottomRight, hbDoor);
	building.spaceShip.physics.add(hbTopLeft    );
	building.spaceShip.physics.add(hbTopRight   );
	building.spaceShip.physics.add(hbBottomLeft );
	building.spaceShip.physics.add(hbBottomRight);
	if(!isOpened) building.spaceShip.physics.add(hbDoor);
	
	building.setOpened = function(newIsOpened) {
		if(building.isBuilt && building.isEnabled && !isAnimationStarted && isOpened != newIsOpened) {
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
			
			building.world.server.sendMessage("updateDoors", {"id": building.id, "state": newIsOpened ? 1 : 0});
			isOpened = newIsOpened;
		}
	};
	
	building.isOpened = function() {
		return isOpened;
	};
	
	for(var i = 0 ; i < building.model.meshes.length ; i++) {
		var mesh = building.model.meshes[i];
		
		if(mesh.groups.indexOf("lock") != -1) {
			building.world.configurePickableContent(mesh, function(x, y, isReleasing) {
				if(isReleasing) building.setOpened(!isOpened);
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
