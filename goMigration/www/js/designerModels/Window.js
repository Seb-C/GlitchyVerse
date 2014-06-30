DesignerModels["window.obj"] = function(entity, context, unitSize, borderSize) {
	var halfUnitSize = Math.ceil(unitSize / 2);
	context.fillStyle = "white";
	context.fillRect(-halfUnitSize, -borderSize, unitSize + 1, borderSize * 2);
};