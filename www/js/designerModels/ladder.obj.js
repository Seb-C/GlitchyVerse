DesignerModels["ladder.obj"] = function(entity, context, unitSize, borderSize) {
	var holeSizePart = 2/5;
	var ladderSizePart = 7/10;
	
	var ladderTopAdditionPart   = 0.05;
	var ladderHorizontalBarPart = 0.1;
	var ladderThicknessPart     = 0.04;
	
	// Floor main points
	var halfSize      = Math.ceil(unitSize / 2);
	var holeSize      = Math.ceil(holeSizePart * unitSize);
	var halfHole      = Math.ceil(holeSizePart  * halfSize);
	var halfHoleFloor = Math.floor(holeSizePart * halfSize);
	var halfFloor     = Math.ceil((1 - holeSizePart) * halfSize);
	
	// Ground
	context.fillStyle = "gray";
	context.fillRect(-halfSize,      -halfSize, halfFloor, unitSize);  // Left
	context.fillRect( halfHoleFloor, -halfSize, halfFloor, unitSize);  // Right
	context.fillRect(-halfSize,      -halfSize, unitSize,  halfFloor); // Top
	context.fillRect(-halfSize,       halfHole, unitSize,  halfFloor); // Bottom
	
	// Ladder main points
	var ladderAbsolutePart = ladderSizePart     * holeSizePart;
	var halfLadder         = ladderAbsolutePart      * halfSize;
	var ladderThickness    = ladderThicknessPart     * unitSize;
	var ladderBarsY        = ladderHorizontalBarPart * unitSize;
	var ladderTop          = -halfHole     - ladderTopAdditionPart * unitSize;
	var ladderHeight       =  halfHole * 2 + ladderTopAdditionPart * unitSize;
	
	// Ladder bars color
	context.fillStyle = "black";
	
	// Vertical bars (left then right)
	context.fillRect(-halfLadder - ladderThickness / 2, ladderTop, ladderThickness, ladderHeight);
	context.fillRect( halfLadder - ladderThickness / 2, ladderTop, ladderThickness, ladderHeight);
	
	// Horizontal bars (top then bottom)
	context.fillRect(-halfLadder, -ladderBarsY, halfLadder * 2, ladderThickness);
	context.fillRect(-halfLadder,  ladderBarsY, halfLadder * 2, ladderThickness);
};