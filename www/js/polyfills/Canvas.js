if(!CanvasRenderingContext2D.prototype.setLineDash) {
	CanvasRenderingContext2D.prototype.setLineDash = function() {
		// To avoid bug when it doesn't exists, and to avoid ugly conditions in code
	};
}