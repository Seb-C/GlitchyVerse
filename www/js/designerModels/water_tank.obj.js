DesignerModels["water_tank.obj"] = function(entity, context, unitSize, borderSize) {
	context.fillStyle = "rgb(60, 111, 174)";
	context.beginPath();
	context.arc(0, 0, unitSize * 0.4, 0, Math.PI * 2);
	context.fill();
	
	context.textAlign    = "center";
	context.textBaseline = "middle";
	context.fillStyle    = "white";
	context.font         = Math.round(unitSize * 0.2) + "px Arial";
	context.fillText("Water", 0, 0);
};