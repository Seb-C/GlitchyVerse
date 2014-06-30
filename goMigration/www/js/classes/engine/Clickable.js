/**
 * A clickable object on a control screen
 * @param float Left position of the rectangle
 * @param float Top position of the rectangle
 * @param float Right position of the rectangle
 * @param float Bottom position of the rectangle
 * @param callback Function to call when clicked
 */
var Clickable = function(x1, y1, x2, y2, callback) {
	this.x1 = x1;
	this.y1 = y1;
	this.x2 = x2;
	this.y2 = y2;
	this.callback = callback;
};

Clickable.prototype.isClicked = function(x, y) {
	return this.x1 <= x
	    && this.y1 <= y
		&& this.x2 >= x
		&& this.y2 >= y
	;
};