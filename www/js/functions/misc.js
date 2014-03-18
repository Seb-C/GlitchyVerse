/**
 * Converts a degree maesure into radians
 * @param Float Degrees maesure
 * @return Float Radians
 */
function degToRad(degrees) {
	return degrees * Math.PI / 180;
}

/**
 * Converts a radians maesure into degree
 * @param Float Radians maesure
 * @return Float degrees
 */
function radToDeg(radians) {
	return (radians * 180) / Math.PI;
}

/**
 * Returns the euler rotation from a Quaternion
 * @param quat The rotation quaternion
 * @return vec3 The euler angles
 */
function quatToEuler(q) {
	var x = q[0], y = q[1], z = q[2], w = q[3];
	return vec3.fromValues(
		radToDeg(Math.atan2( 2 * (y * z + w * x), w * w - x * x - y * y + z * z)),
		radToDeg(Math.asin (-2 * (x * z - w * y))),
		radToDeg(Math.atan2( 2 * (x * y + w * z), w * w + x * x - y * y - z * z))
	);
}

/**
 * Returns the quaternion rotation from a vec3 (euler)
 * @param vec3 The euler rotation vector (degrees)
 * @return quat The quaternion
 */
function eulerToQuat(e) {
	var q = quat.create();
	if(e[0] != 0) quat.rotateX(q, q, degToRad(e[0]));
	if(e[1] != 0) quat.rotateY(q, q, degToRad(e[1]));
	if(e[2] != 0) quat.rotateZ(q, q, degToRad(e[2]));
	return q;
}

/**
 * Rotates a point around origin by a euler vec3
 * @param vec3 OUT The point to rotate around origin
 * @param rotation The euler rotation (radians)
 */
function rotatePoint(point, rotation) {
	var cos = [Math.cos(rotation[0]), Math.cos(rotation[1]), Math.cos(rotation[2])];
	var sin = [Math.sin(rotation[0]), Math.sin(rotation[1]), Math.sin(rotation[2])];
	
	// Temp vars
	var p0, p1, p2;
	
	// Rotating X
	p1 = point[1] * cos[0] + point[2] * sin[0];
	p2 = point[2] * cos[0] - point[1] * sin[0];
	point[1] = p1, point[2] = p2;
	
	// Rotating Y
	p0 = point[0] * cos[1] - point[2] * sin[1];
	p2 = point[2] * cos[1] + point[0] * sin[1];
	point[0] = p0, point[2] = p2;
	
	// Rotating Z
	p0 = point[0] * cos[2] - point[1] * sin[2];
	p1 = point[1] * cos[2] + point[0] * sin[2];
	point[0] = p0, point[1] = p1;
}

/**
 * Function which allows heritage and parent constructor calling.
 * Usage : 
 * var Child = function() {
 *     this.parent([parent constructor parameters]);
 * };
 * Child.extend(Parent);
 */
Function.prototype.extend = function(Parent) {
    this.prototype = Object.create(Parent.prototype);
    this.prototype.constructor = this;
    this.prototype.parent = function(/* any args */) {
        Parent.apply(this, arguments);
    };
};

/**
 * Debug function. Unlimited number of parameters can be passed
 */
function print(/* any objects, any type, any quantity */) {
	var s = "";
	var seen = [];
	for(i = 0 ; i < arguments.length ; i++) {
		if(i != 0) {
			s += "<br />";
		}
		s += JSON.stringify(
			arguments[i], 
			function(key, val) {
				if (typeof val == "object") {
					if (seen.indexOf(val) >= 0)
						return undefined;
					seen.push(val);
				}
				return val;
			}
		);
	}
	
	// Showing it in the debut container
	var container = document.getElementById('print');
	if(container !== null) {
		container.innerHTML = s;
	}
}

// TODO make windows movable to the left, but always seeing the title bar
// TODO dynamic size of window for small screens ?

/**
 * Draws an image as a tile, as many times needed to cover the given surface
 * @param CanvasRenderingContext2D The context where to draw image
 * @param Image The image to draw
 * @param int Left side position of the destination surface
 * @param int Upper side position of the destination surface
 * @param int Width of the destination surface
 * @param int Height of the destination surface
 * @param int The size of a tile
 */
function canvasDrawTiledImage(context, image, x, y, width, height, tileSize) {
	var xTimes = width  / tileSize;
	var yTimes = height / tileSize;
	var xLast = xTimes - Math.floor(xTimes);
	var yLast = yTimes - Math.floor(yTimes);
	xTimes = Math.ceil(xTimes);
	yTimes = Math.ceil(yTimes);
	// Now we know which part to take for the last images (right and bottom), and the repeat number
	
	for(var i = 0 ; i < xTimes ; i++) {
		var isLastAndNotFullWidth = i == xTimes - 1 && xLast > 0;
		var destX   = Math.floor(x + i * tileSize);
		var destW   = Math.ceil(isLastAndNotFullWidth ? tileSize    * xLast : tileSize);
		var sourceW = Math.ceil(isLastAndNotFullWidth ? image.width * xLast : image.width);
		for(var j = 0 ; j < yTimes ; j++) {
			var isLastAndNotFullHeight = j == yTimes - 1 && yLast > 0;
			var destY   = Math.floor(y + j * tileSize);
			var destH   = Math.ceil(isLastAndNotFullHeight ? tileSize     * yLast : tileSize);
			var sourceH = Math.ceil(isLastAndNotFullHeight ? image.height * yLast : image.height);
			
			context.drawImage(
				image,
				0,       // Source X
				0,       // Source Y
				sourceW, // Source width
				sourceH, // Source height
				destX,   // Destination X
				destY,   // Destination Y
				destW,   // Destination width
				destH    // Destination height
			);
		}
	}
};