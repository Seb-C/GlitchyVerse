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