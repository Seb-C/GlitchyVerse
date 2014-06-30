DesignerModels["power_station.obj"] = function(entity, context, unitSize, borderSize) {
	var halfSize = Math.floor(unitSize / 2);
	
	var whiteSquareHalfSize = Math.floor(halfSize * 0.7);
	context.fillStyle = "white";
	context.fillRect(-whiteSquareHalfSize, -whiteSquareHalfSize, whiteSquareHalfSize * 2, whiteSquareHalfSize * 2);
	
	var blackRectangleHalfWidth = Math.floor(halfSize / 2);
	context.fillStyle = "black";
	context.fillRect(-blackRectangleHalfWidth, -halfSize, blackRectangleHalfWidth * 2, halfSize * 2);
	
	context.textAlign    = "center";
	context.textBaseline = "middle";
	context.fillStyle    = "white";
	context.font         = Math.round(unitSize * 0.15) + "px Arial";
	context.fillText("Power", 0, 0);
};