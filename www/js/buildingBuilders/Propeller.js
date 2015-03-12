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
 * Creates a propeller. See Entity for other parameters
 * @param {definition} Object Containing the definition of the window, with attributes : 
 *               - unitSize : Array(3) Vector(3), size of each unit (the smallest possible room size)
 *               - edgeSize : The side of the room edges
 */
Building.builders.Propeller = function(building, state) {
	building.model.loadMeshesFromObj("propeller.obj", building.gridSize);
	building.model.regenerateCache();
	
	var hitBox = HitBox.createFromModel(building.model);
	building.hitBoxes.push(hitBox);
	building.spaceShip.physics.add(hitBox);
	
	var currentState = state;
	
	var lightColor = [0.5, 0.4, 0.25];
	
	// Storing min and max Z for flame, based on the default position
	var firstFlameMeshVertices = building.model.meshGroups["flame"][0].vertices;
	var minFlameZ = firstFlameMeshVertices[2]; // 2 = Z of 1st vertice
	var maxFlameZ = firstFlameMeshVertices[8]; // 8 = Z of 3rd vertice
	
	/**
	 * Determines the current power rate of the propeller, based on it's maximum power capacity.
	 * @param float (optional) To compare a future state value with it's min and max states instead of current state
	 * @return float -1.0 .. 1.0
	 */
	building.getPowerRate = function(forceValue) {
		var state = forceValue ? forceValue : currentState;
		var result;
		if(state < 0) {
			result = state / -building.type.minState;
		} else {
			result = state / building.type.maxState;
		}
		
		return Math.round(result * 100) / 100;
	};
	
	building.getState = function() {
		return currentState;
	};
	
	var changeState = function(newState) {
		currentState = newState;
		if(currentState < building.type.minState) currentState = building.type.minState;
		if(currentState > building.type.maxState) currentState = building.type.maxState;
		
		var powerRate = building.getPowerRate();
		
		// Recreating light
		if(building.lights[0] != null) {
			building.world.remove(building.lights[0]);
			building.lights[0] = null;
		}
		if(currentState > 0) {
			building.lights[0] = new Light([
				building.position[0], 
				building.position[1], 
				building.position[2] + 3
			], lightColor, 30 * powerRate * Math.max.apply(null, building.gridSize), true);
			building.world.add(building.lights[0]);
		}
		
		// Changing lid color
		var lidMeshes = building.model.meshGroups["lid"];
		var lidTexture = Materials.get(powerRate == 0 ? "BLACK" : "WHITE");
		for(var i = 0 ; i < lidMeshes.length ; i++) {
			lidMeshes[i].texture = lidTexture;
		}
		
		// Changing flame size
		var flameMeshes = building.model.meshGroups["flame"];
		var flameZ = minFlameZ + powerRate * (maxFlameZ - minFlameZ);
		for(var i = 0 ; i < flameMeshes.length ; i++) {
			flameMeshes[i].vertices[8] = flameZ; // 8 = Z of 3rd vertice
		}
		
		building.model.regenerateCache();
			
		building.spaceShip.updateAcceleration();
	};
	
	/**
	 * Sets the power state with percents instead of raw values
	 * @param float The value to set (-1.0 .. 1.0)
	 */
	building.setPowerRate = function(powerRate) {
		if(building.isBuilt) {
			if(powerRate < 0) {
				changeState(powerRate * -building.type.minState);
			} else {
				changeState(powerRate * building.type.maxState);
			}
		}
	};
	
	building.onbeforedraw = function() {
		this._gl.enable(this._gl.CULL_FACE);
		this._gl.cullFace(this._gl.FRONT);
	};
	building.onafterdraw = function() {
		this._gl.disable(this._gl.CULL_FACE);
	};
	
	changeState(currentState);
};
