DesignerModels.Propeller = function(entity, context, unitSize, borderSize) {
	var linesNumberPerSide = 3;
	
	var halfUnitSize = Math.ceil(unitSize / 2);
	var yTop = -halfUnitSize - borderSize + 1;
	var xCircle1 = halfUnitSize / entity.circleSizeDivide1 * 2;
	var xCircle2 = halfUnitSize / entity.circleSizeDivide2 * 2;
	var boxFront = Math.floor(halfUnitSize / 2);
	
	context.fillStyle = "gray";
	
	// Propeller back box
	context.fillRect(-halfUnitSize, yTop, unitSize, boxFront + borderSize - 1);
	
	// Propeller body
	context.beginPath();
	context.moveTo(-xCircle2, -boxFront);
	context.lineTo( xCircle2, -boxFront);
	context.lineTo( xCircle1,  boxFront);
	context.lineTo(-xCircle1,  boxFront);
	context.closePath();
	context.fill();
	
	context.strokeStyle = "black";
	context.lineWidth = 1;
	
	// Line between box and propeller
	context.beginPath();
	context.moveTo(-xCircle2, -boxFront);
	context.lineTo( xCircle2, -boxFront);
	context.closePath();
	context.stroke();
	
	// Drawing propeller vertical lines
	context.beginPath();
	for(var xSide = -1 ; xSide <= 1 ; xSide += 2) {
		for(var i = 1 ; i <= linesNumberPerSide ; i++) {
			var lineXPart = xSide * (i - 0.5) / linesNumberPerSide;
			context.moveTo(xCircle2 * lineXPart, -boxFront);
			context.lineTo(xCircle1 * lineXPart,  boxFront);
		}
	}
	context.closePath();
	context.stroke();
};