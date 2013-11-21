/**
 * Generates the texture of a planet
 * @param int Size of the image required (must be a power of two)
 * @param float The seed of the planet
 * @return Object defining the texture, with attributes : width, height and pixels. pixels attribute must be a Uint8Array.
 */
function createPlanetTexture(imageSize, seed) {
	var variabilityRate = 0.65;
	Math.seedrandom(seed);
	
	// Colors depending on pixel value
	var colorSteps = [
		{minValue: 0, color: [
			Math.random() * 255,
			Math.random() * 255,
			Math.random() * 255
		]}, {minValue: 0.6, color: [
			Math.random() * 255,
			Math.random() * 255,
			Math.random() * 255
		]}, {minValue: 0.95, color: [
			Math.random() * 255,
			Math.random() * 255,
			Math.random() * 255
		]}
	];
	
	// Initializing array
	var point = [];
	for(var i = 0 ; i < imageSize + 1 ; i++) {
		point[i] = [];
	}
	
	// Points of the first square
	point[0][0]                 = 0.5;
	point[imageSize][0]         = 0.5;
	point[0][imageSize]         = 0.5;
	point[imageSize][imageSize] = 0.5;
	
	var pixels = new Uint8Array(imageSize * (imageSize / 2) * 3);
	
	var setPixel = function(x, y, value) {
		point[x][y] = value;
		
		var colorValue = value;
		if(colorValue < 0) colorValue = 0;
		if(colorValue > 1) colorValue = 1;
		
		// Determining pixel color
		var color = colorSteps[0].color;
		for(var i = 1 ; i < colorSteps.length ; i++) {
			if(colorValue >= colorSteps[i].minValue) {
				color = colorSteps[i].color;
			} else {
				break;
			}
		}
		
		// Setting pixel color
		var pixelIndex = (x + y * imageSize) * 3;
		pixels[pixelIndex    ] = Math.round(color[0] * colorValue); // R
		pixels[pixelIndex + 1] = Math.round(color[1] * colorValue); // G
		pixels[pixelIndex + 2] = Math.round(color[2] * colorValue); // B
	};
	
	// Diamond-Square algorithm
	for(var currentSize = imageSize ; currentSize > 1 ; currentSize /= 2) {
		var halfCurrentSize = currentSize / 2;
		var halfSizeY = ((imageSize + 1) / 2 + 0.5);
		
		// Square
		for(var x = halfCurrentSize ; x < imageSize + 1 ; x += currentSize) {
			for(var y = halfCurrentSize ; y <= halfSizeY ; y += currentSize) {
				var squareAvg = (
					  point[x - halfCurrentSize][y - halfCurrentSize]
					+ point[x + halfCurrentSize][y - halfCurrentSize]
					+ point[x + halfCurrentSize][y + halfCurrentSize]
					+ point[x - halfCurrentSize][y + halfCurrentSize]
				) / 4;
				setPixel(x, y, squareAvg + ((Math.random() * 2 - 1) * currentSize * variabilityRate) / (imageSize + 1));
			}
		}
		
		// Diamond
		for(var x = 0 ; x < imageSize ; x += halfCurrentSize) {
			var yStart = ((x / halfCurrentSize) % 2 == 0) ? halfCurrentSize : 0; 
			
			for(var y = yStart ; y <= halfSizeY ; y += currentSize) {
				var diamondSum = 0, diamondCount = 0;
				
				if(y - halfCurrentSize >= 0) {
					diamondSum += point[x][y - halfCurrentSize];
					diamondCount++
				}
				if(x + halfCurrentSize < imageSize + 1) {
					diamondSum += point[x + halfCurrentSize][y];
					diamondCount++
				}
				if(y + halfCurrentSize < halfSizeY) {
					diamondSum += point[x][y + halfCurrentSize];
					diamondCount++
				}
				if(x - halfCurrentSize >= 0) {
					diamondSum += point[x - halfCurrentSize][y];
					diamondCount++
				}
				
				var diamondAvg = diamondSum / diamondCount;
				setPixel(x, y, diamondAvg + ((Math.random() * 2 - 1) * currentSize * variabilityRate) / (imageSize + 1));
				if(x == 0) setPixel(imageSize, y, point[x][y]);
			}
		}
	}
	
	// Converting pixel array to a img, using a data-url
	return {width: imageSize, height: imageSize / 2, pixels: pixels};
}