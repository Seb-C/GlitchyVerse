DesignerModels.Door = function(entity, context, unitSize, borderSize) {
	var halfUnitSize = Math.ceil(unitSize / 2);
	var doorSize = Math.floor(halfUnitSize / 2);
	var frameWidth = halfUnitSize - doorSize
	var doorThickness = Math.floor(entity.doorThicknessPart * borderSize * 2);
	var frameThickness = borderSize - doorThickness;
	
	// Colouring with gray for the ground
	context.fillStyle = "gray";
	context.fillRect(-halfUnitSize, -borderSize + 1, unitSize + 1, borderSize * 2);
	
	// Door and frame colors
	context.fillStyle = "black";
	
	// Door frame
	context.fillRect(-halfUnitSize - 1, -borderSize    + 1, frameWidth + 1, doorThickness); // Top    Left
	context.fillRect(-halfUnitSize - 1, frameThickness + 1, frameWidth + 1, doorThickness); // Bottom Left
	context.fillRect(doorSize, -borderSize    + 1, frameWidth + 1, doorThickness);          // Top    Right
	context.fillRect(doorSize, frameThickness + 1, frameWidth + 1, doorThickness);          // Bottom Right
	
	// Doors
	var openDistance = doorSize * (entity.animCurrentTimeRate == null ? entity.state : entity.animCurrentTimeRate);
	context.fillRect(-doorSize - openDistance, -doorThickness + 1, doorSize, doorThickness * 2); // Left
	context.fillRect(    /*0 +*/ openDistance, -doorThickness + 1, doorSize, doorThickness * 2); // Left
};