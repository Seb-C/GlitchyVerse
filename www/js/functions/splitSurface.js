/**
 * Splits a 2D surface into a minimum rectangle number
 * @param Array(2) containing width and height of the surface
 * @param Array(Array(2)) An array of vectors, points which shouldn't be included in the surface
 * @param Array An array of objects representing rectangles, each one with the following attributes : 
 *                  - position : Vector(2) containing the position of the rectangle
 *                  - size : Vector(2) containing the size of the rectangle
 */
/*function splitSurfaceOptimized(size, openedParts) {
	
	// Unused because it's buggy and so somplicated to debug ... 
	// Current bug: surface size = [3, 2], openedParts = [[1, 0], [1, 1], [2, 0], [2, 1]]
	
	// Compiling opened parts ( = parts to ignore) into a hash
	var toIgnore = new Array();
	for(var i = 0 ; i < openedParts.length ; i++) {
		var part = openedParts[i];
		if(!toIgnore[part[0]]) toIgnore[part[0]] = new Array();
		toIgnore[part[0]][part[1]] = true;
	}
	
	var ret = Array();
	var rectBegan = new Array();
	for(var y = 0 ; y < size[1] ; y++) {
		var curColStart = null;
		for(var x = 0 ; x < size[0] ; x++) {
			if((
				toIgnore[x] && toIgnore[x][y]
			) || (
				rectBegan[curColStart] && rectBegan[curColStart].sizeX == x - curColStart
			) || (
				rectBegan[x] && curColStart != null
			)) {
				if(curColStart != null && rectBegan[curColStart] && rectBegan[curColStart].sizeX == x - curColStart) {
					// Rectangle already began at same x and size
					if(toIgnore[x] && toIgnore[x][y]) {
						curColStart = null;
					} else {
						curColStart = x;
					}
				} else if(rectBegan[x] && curColStart != null && !(toIgnore[x] && toIgnore[x][y])) {
					// Rectangle began at previous position, but another is already began here
					rectBegan[curColStart] = {sizeX: x - curColStart, yBegin: y};
					curColStart = x;
				} else {
					// Removing started rectangles we have to close
					for(var curX = (curColStart || 0), curL = x ; curX <= curL ; curX++) {
						if(rectBegan[curX]) {
							ret.push({
								position: [
									curX,
									rectBegan[curX].yBegin
								], 
								size: [
									rectBegan[curX].sizeX,
									y - rectBegan[curX].yBegin + (y == size[1] - 1 && !(toIgnore[curX] && toIgnore[curX][y]) ? 1 : 0)
								]
							});
							delete rectBegan[curX];
						}
					}
					
					if(curColStart != null) {
						// Adding current rectangle
						rectBegan[curColStart] = {sizeX: x - curColStart, yBegin: y};
						curColStart = null;
					}
				}
			} else if(curColStart == null) {
				curColStart = x;
			}
		}
		
		// Closing last column
		if(curColStart != null) {
			if(rectBegan[curColStart] && rectBegan[curColStart].sizeX == x - curColStart) {
				// Rectangle already began at same x and size
			} else {
				// Adding current rectangle
				rectBegan[curColStart] = {sizeX: x - curColStart, yBegin: y};
			}
		}
	}
	
	// Closing last lines
	for(var key in rectBegan) {
		ret.push({
			position: [
				parseInt(key), 
				rectBegan[key].yBegin
			],
			size: [
				rectBegan[key].sizeX,
				(size[1] - rectBegan[key].yBegin)
			]
		});
	}
	
	return ret;
}*/

/**
 * Splits a 2D surface into a rectangle list. Should do the same than optimized version, but with more rectangles.
 * @param Array(2) containing width and height of the surface
 * @param Array(Array(2)) An array of vectors, points which shouldn't be included in the surface
 * @param Array An array of objects representing rectangles, each one with the following attributes : 
 *                  - position : Vector(2) containing the position of the rectangle
 *                  - size : Vector(2) containing the size of the rectangle
 */
function splitSurfaceNotOptimized(size, openedParts) {
	var toIgnore = new Array();
	for(var i = 0 ; i < openedParts.length ; i++) {
		var part = openedParts[i];
		if(!toIgnore[part[0]]) toIgnore[part[0]] = new Array();
		toIgnore[part[0]][part[1]] = true;
	}
	
	var ret = new Array();
	for(var x = 0 ; x < size[0] ; x++) {
		for(var y = 0 ; y < size[1] ; y++) {
			if(!toIgnore[x] || !toIgnore[x][y]) {
				ret.push({
					position: [x, y],
					size: [1, 1]
				});
			}
		}
	}
	
	return ret;
}