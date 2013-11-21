DesignerModels.Console = function(entity, context, unitSize, borderSize) {
	var xCoordinateRatio = 0.25;
	var xCoordinate = unitSize * xCoordinateRatio;
	context.drawImage(
		entity.spaceShip.screen.canvas,
		0,
		0,
		entity.spaceShip.screen.screenWidth,
		entity.spaceShip.screen.screenHeight,
		-xCoordinate,
		-(unitSize / 2),
		xCoordinate * 2,
		unitSize / 4
	);
};