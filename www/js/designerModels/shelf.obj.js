DesignerModels["shelf.obj"] = function(entity, context, unitSize, borderSize) {
	var halfUnitSize = Math.round(unitSize / 2);
	
	context.fillStyle = "gray";
	context.fillRect(-halfUnitSize * 0.6, -halfUnitSize, unitSize * 0.6, unitSize);
	
	context.textAlign    = "center";
	context.textBaseline = "middle";
	context.textBaseline = "middle";
	context.fillStyle    = "white";
	context.font         = Math.round(unitSize * 0.2) + "px Arial";
	context.fillText("Shelf", 0, 0); // TODO put the name of the resource stored here ("Shelf (Xxx)")
};