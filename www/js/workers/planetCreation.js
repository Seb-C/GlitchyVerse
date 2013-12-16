importScripts("/js/lib/seedrandom.js");

var TEXTURE_RESOLUTION_PER_UNIT = 1.2;
var TEXTURE_MIN_RESOLUTION      = 32;
var TEXTURE_MAX_RESOLUTION      = 4096; // TODO use gl constant MAX_TEXTURE_SIZE ?
var SPHERE_MIN_LINES            = 6;
var SPHERE_MAX_LINES            = 256; // depending on WebGL max indices by draw
var LINE_SIZE                   = 3;

self.onmessage = function(event) {
	var variabilityRate = 0.65; // Relies to diamond square
	Math.seedrandom(event.data.seed);
	var radius = event.data.radius;
	var maxRelief = radius * 0.3;
	
	/*******************************************************************
	 *********** Determining texture and geometry precision ************
	 *******************************************************************/
	
	var quality = event.data.quality;
	var visibleSize = Math.PI * radius * quality;
	
	// Determining texture resolution (and "rounding" it to a power of two)
	var targetResolution = radius * quality * TEXTURE_RESOLUTION_PER_UNIT;
	var resolution;
	if(targetResolution < TEXTURE_MIN_RESOLUTION) {
		resolution = TEXTURE_MIN_RESOLUTION;
	} else {
		resolution = Math.pow(2, Math.ceil(Math.log(targetResolution) / Math.log(2)));
	}
	if(resolution > TEXTURE_MAX_RESOLUTION) resolution = TEXTURE_MAX_RESOLUTION;
	
	// Determining number of lines for the sphere
	var lines = Math.round(visibleSize / LINE_SIZE);
	if(lines < SPHERE_MIN_LINES) {
		lines = SPHERE_MIN_LINES;
	}
	if(lines > SPHERE_MAX_LINES) lines = SPHERE_MAX_LINES;
	
	/*******************************************************************
	 ****************** Determining texture and relief *****************
	 *******************************************************************/
	
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
	
	var texturePixels = new Uint8Array(resolution * (resolution / 2) * 3);
	var textureRelief = new Float32Array((resolution + 1) * (resolution + 1));
	
	// Points of the first square
	textureRelief[0                                   ] = 0.5;
	textureRelief[resolution                          ] = 0.5;
	textureRelief[             resolution * resolution] = 0.5;
	textureRelief[resolution + resolution * resolution] = 0.5;
	
	var setPixel = function(x, y, value) {
		var pixelIndex = x + y * resolution;
		
		textureRelief[pixelIndex] = value;
		
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
		var pixelIndexRGB = pixelIndex * 3;
		texturePixels[pixelIndexRGB    ] = Math.round(color[0] * colorValue); // R
		texturePixels[pixelIndexRGB + 1] = Math.round(color[1] * colorValue); // G
		texturePixels[pixelIndexRGB + 2] = Math.round(color[2] * colorValue); // B
	};
	
	// Diamond-Square algorithm
	for(var currentSize = resolution ; currentSize > 1 ; currentSize /= 2) {
		var halfCurrentSize = currentSize / 2;
		var halfSizeY = ((resolution + 1) / 2 + 0.5);
		
		// Square
		for(var x = halfCurrentSize ; x < resolution + 1 ; x += currentSize) {
			for(var y = halfCurrentSize ; y <= halfSizeY ; y += currentSize) {
				var squareAvg = (
					  textureRelief[(x - halfCurrentSize) + (y - halfCurrentSize) * resolution]
					+ textureRelief[(x + halfCurrentSize) + (y - halfCurrentSize) * resolution]
					+ textureRelief[(x + halfCurrentSize) + (y + halfCurrentSize) * resolution]
					+ textureRelief[(x - halfCurrentSize) + (y + halfCurrentSize) * resolution]
				) / 4;
				setPixel(x, y, squareAvg + ((Math.random() * 2 - 1) * currentSize * variabilityRate) / (resolution + 1));
			}
		}
		
		// Diamond
		for(var x = 0 ; x < resolution ; x += halfCurrentSize) {
			var yStart = ((x / halfCurrentSize) % 2 == 0) ? halfCurrentSize : 0; 
			
			for(var y = yStart ; y <= halfSizeY ; y += currentSize) {
				var diamondSum = 0, diamondCount = 0;
				
				if(y - halfCurrentSize >= 0) {
					diamondSum += textureRelief[x + (y - halfCurrentSize) * resolution];
					diamondCount++
				}
				if(x + halfCurrentSize < resolution + 1) {
					diamondSum += textureRelief[(x + halfCurrentSize) + y * resolution];
					diamondCount++
				}
				if(y + halfCurrentSize < halfSizeY) {
					diamondSum += textureRelief[x + (y + halfCurrentSize) * resolution];
					diamondCount++
				}
				if(x - halfCurrentSize >= 0) {
					diamondSum += textureRelief[(x - halfCurrentSize) + y * resolution];
					diamondCount++
				}
				
				var diamondAvg = diamondSum / diamondCount;
				setPixel(x, y, diamondAvg + ((Math.random() * 2 - 1) * currentSize * variabilityRate) / (resolution + 1));
				if(x == 0) setPixel(resolution, y, textureRelief[x + y * resolution]);
			}
		}
	}
	
	var texturePixelsBuffer = texturePixels.buffer;
	
	/*******************************************************************
	 ******************* Determining planet geometry *******************
	 *******************************************************************/
	
	var lines   = lines;
	var columns = lines * 2;
	
	var verticesArray    = new Float32Array(18 * columns * lines);
	var normalsArray     = new Float32Array(18 * columns * lines);
	var texturePartArray = new Float32Array(12 * columns * lines);
	
	for(var i = 0 ; i < lines ; i++) {
		var angleY = Math.PI * (i / lines);
		var sinY   = Math.sin(angleY);
		var cosY   = Math.cos(angleY);
		var reliefPointY = Math.round((i / lines) * (resolution / 2));
		
		var nextAngleY = Math.PI * ((i + 1) / lines);
		var sinNextY   = Math.sin(nextAngleY);
		var cosNextY   = Math.cos(nextAngleY);
		var reliefPointNextY = Math.round(((i + 1) / lines) * (resolution / 2));
		
		for(var j = 0 ; j < columns ; j++) {
			var angleX = Math.PI * 2 * (j / columns);
			var sinX   = Math.sin(angleX);
			var cosX   = Math.cos(angleX);
			var reliefPointX = Math.round((j / columns) * resolution);
			
			var nextAngleX = Math.PI * 2 * ((j + 1) / columns);
			var sinNextX   = Math.sin(nextAngleX);
			var cosNextX   = Math.cos(nextAngleX);
			var reliefPointNextX = Math.round(((j + 1) / columns) * resolution);
			
			var radiusTopLeft     = radius + maxRelief * (textureRelief[reliefPointX     + reliefPointY     * resolution] - 0.5);
			var radiusTopRight    = radius + maxRelief * (textureRelief[reliefPointNextX + reliefPointY     * resolution] - 0.5);
			var radiusBottomRight = radius + maxRelief * (textureRelief[reliefPointNextX + reliefPointNextY * resolution] - 0.5);
			var radiusBottomLeft  = radius + maxRelief * (textureRelief[reliefPointX     + reliefPointNextY * resolution] - 0.5);
			
			var currentIndex = i * columns + j;
			
			// Vertices positions
			var verticesIndex = 18 * currentIndex;
			verticesArray[verticesIndex     ] = verticesArray[verticesIndex + 9 ] = sinY     * cosX     * radiusTopLeft    ;
			verticesArray[verticesIndex + 1 ] = verticesArray[verticesIndex + 10] = cosY                * radiusTopLeft    ;
			verticesArray[verticesIndex + 2 ] = verticesArray[verticesIndex + 11] = sinY     * sinX     * radiusTopLeft    ;
			verticesArray[verticesIndex + 6 ] = verticesArray[verticesIndex + 12] = sinNextY * cosNextX * radiusBottomRight;
			verticesArray[verticesIndex + 7 ] = verticesArray[verticesIndex + 13] = cosNextY            * radiusBottomRight;
			verticesArray[verticesIndex + 8 ] = verticesArray[verticesIndex + 14] = sinNextY * sinNextX * radiusBottomRight;
			verticesArray[verticesIndex + 3 ] = sinY     * cosNextX * radiusTopRight   ;
			verticesArray[verticesIndex + 4 ] = cosY                * radiusTopRight   ;
			verticesArray[verticesIndex + 5 ] = sinY     * sinNextX * radiusTopRight   ;
			verticesArray[verticesIndex + 15] = sinNextY * cosX     * radiusBottomLeft ;
			verticesArray[verticesIndex + 16] = cosNextY            * radiusBottomLeft ;
			verticesArray[verticesIndex + 17] = sinNextY * sinX     * radiusBottomLeft ;
			
			// Normals (same than vertices, without multiplying it by the radius)
			var normalsIndex = 18 * currentIndex;
			normalsArray[normalsIndex     ] = normalsArray[normalsIndex + 9 ] = sinY     * cosX    ;
			normalsArray[normalsIndex + 1 ] = normalsArray[normalsIndex + 10] = cosY               ;
			normalsArray[normalsIndex + 2 ] = normalsArray[normalsIndex + 11] = sinY     * sinX    ;
			normalsArray[normalsIndex + 6 ] = normalsArray[normalsIndex + 12] = sinNextY * cosNextX;
			normalsArray[normalsIndex + 7 ] = normalsArray[normalsIndex + 13] = cosNextY           ;
			normalsArray[normalsIndex + 8 ] = normalsArray[normalsIndex + 14] = sinNextY * sinNextX;
			normalsArray[normalsIndex + 3 ] = sinY     * cosNextX;
			normalsArray[normalsIndex + 4 ] = cosY               ;
			normalsArray[normalsIndex + 5 ] = sinY     * sinNextX;
			normalsArray[normalsIndex + 15] = sinNextY * cosX    ;
			normalsArray[normalsIndex + 16] = cosNextY           ;
			normalsArray[normalsIndex + 17] = sinNextY * sinX    ;
			
			// Texture positions
			var textureIndex = 12 * currentIndex;
			texturePartArray[textureIndex     ] = texturePartArray[textureIndex + 6 ] = (j    ) / columns;
			texturePartArray[textureIndex + 1 ] = texturePartArray[textureIndex + 7 ] = (i    ) / lines;
			texturePartArray[textureIndex + 4 ] = texturePartArray[textureIndex + 8 ] = (j + 1) / columns;
			texturePartArray[textureIndex + 5 ] = texturePartArray[textureIndex + 9 ] = (i + 1) / lines;
			texturePartArray[textureIndex + 2 ] = (j + 1) / columns;
			texturePartArray[textureIndex + 3 ] = (i    ) / lines;
			texturePartArray[textureIndex + 10] = (j    ) / columns;
			texturePartArray[textureIndex + 11] = (i + 1) / lines;
		}
	}
	
	var geometryVerticesBuffer    = verticesArray   .buffer;
	var geometryNormalsBuffer     = normalsArray    .buffer;
	var geometryTexturePartBuffer = texturePartArray.buffer;
	
	/*******************************************************************
	 *************************** Sending data **************************
	 *******************************************************************/
	
	// Sending data
	postMessage({
		texture: {
			width : resolution,
			height: resolution / 2,
			pixels: texturePixelsBuffer,
		},
		geometry: {
			vertices   : geometryVerticesBuffer,
			normals    : geometryNormalsBuffer,
			texturePart: geometryTexturePartBuffer
		}
	}, [
		texturePixelsBuffer,
		geometryVerticesBuffer,
		geometryNormalsBuffer,
		geometryTexturePartBuffer
	]);
};