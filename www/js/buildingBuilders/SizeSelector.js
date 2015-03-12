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
 * A size selector used in the designer
 */
Building.builders.SizeSelector = function(building, state) {
	building.model.loadMeshesFromObj("size_selector.obj");
	
	var configureArrowMesh = function(mesh, minChange, maxChange) {
		building.world.configurePickableContent(mesh, function(x, y, isReleasing) {
			if(isReleasing) {
				building.world.designer.translateSize(minChange, maxChange);
			}
		}, false);
	};
	
	var meshes = building.model.meshes;
	for(var i = 0 ; i < meshes.length ; i++) {
		var mesh = meshes[i];
		for(var j = 0 ; j < mesh.groups.length ; j++) {
			switch(mesh.groups[j]) {
				case "-X-": configureArrowMesh(mesh, vec3.fromValues(-1, 0, 0), vec3.fromValues( 0, 0, 0)); break;
				case "-X+": configureArrowMesh(mesh, vec3.fromValues(+1, 0, 0), vec3.fromValues( 0, 0, 0)); break;
				case "+X-": configureArrowMesh(mesh, vec3.fromValues( 0, 0, 0), vec3.fromValues(-1, 0, 0)); break;
				case "+X+": configureArrowMesh(mesh, vec3.fromValues( 0, 0, 0), vec3.fromValues(+1, 0, 0)); break;
				case "-Y-": configureArrowMesh(mesh, vec3.fromValues(0, -1, 0), vec3.fromValues(0,  0, 0)); break;
				case "-Y+": configureArrowMesh(mesh, vec3.fromValues(0, +1, 0), vec3.fromValues(0,  0, 0)); break;
				case "+Y-": configureArrowMesh(mesh, vec3.fromValues(0,  0, 0), vec3.fromValues(0, -1, 0)); break;
				case "+Y+": configureArrowMesh(mesh, vec3.fromValues(0,  0, 0), vec3.fromValues(0, +1, 0)); break;
				case "-Z-": configureArrowMesh(mesh, vec3.fromValues(0, 0, -1), vec3.fromValues(0, 0,  0)); break;
				case "-Z+": configureArrowMesh(mesh, vec3.fromValues(0, 0, +1), vec3.fromValues(0, 0,  0)); break;
				case "+Z-": configureArrowMesh(mesh, vec3.fromValues(0, 0,  0), vec3.fromValues(0, 0, -1)); break;
				case "+Z+": configureArrowMesh(mesh, vec3.fromValues(0, 0,  0), vec3.fromValues(0, 0, +1)); break;
			}
		}
	}
	
	building.model.regenerateCache();
};

// Creating size selector building type
Building.types["sizeSelector"] = new BuildingType({
	id                  : "sizeSelector",
	name                : null,
	category            : null,
	model               : "SizeSelector",
	isGap               : false,
	defaultState        : null,
	isSizeable          : false,
	isContainer         : false,
	isInside            : false,
	isPositionByRoomUnit: true,
	isControllable      : false,
	canExertThrust      : false,
	minState            : null,
	maxState            : null,
	slots               : []
});
