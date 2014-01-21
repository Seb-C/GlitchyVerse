importScripts("/js/lib/rng.js");
importScripts("/js/lib/gl-matrix.min.js");

glMatrix.setMatrixArrayType(Array);

var TEXTURE_RESOLUTION_PER_UNIT = 1.2;
var TEXTURE_MIN_RESOLUTION      = 32;
var TEXTURE_MAX_RESOLUTION      = 4096; // TODO use gl constant MAX_TEXTURE_SIZE ?
var PLANET_SPHERE_MIN_LINES     = 6;
var PLANET_SPHERE_MAX_LINES     = 256;
var ATMOSPHERE_SPHERE_MIN_LINES = 6;
var ATMOSPHERE_SPHERE_MAX_LINES = 30;
var LINE_SIZE                   = 3;
var MAX_COULOURS                = 10;
var ATMOSPHERE_PROBABILITY      = 0.5;
var ATMOSPHERE_RADIUS           = 1.15; // Relative to the planet radius
var ORBIT_RADIUS                = ATMOSPHERE_RADIUS + 0.075;
var TREES_MIN_QUALITY           = 0.8; // Minimum quality to show trees
var MAX_TREE_DENSITY            = 0.5; // Density by radius unit

self.onmessage = function(event) {
	var seed = event.data.seed;
	
	var variabilityRate = 1.25; // Relies to diamond square
	var prng = new RNG(seed);
	var radius = event.data.radius;
	var maxRelief = radius * 0.3;
	
	var hasAtmosphere = prng.uniform() < ATMOSPHERE_PROBABILITY;
	var atmosphereRadius = (radius + maxRelief) * ATMOSPHERE_RADIUS;
	var orbitRadius      = (radius + maxRelief) * ORBIT_RADIUS;
	
	var quality = event.data.quality;
	var visibleSize = Math.PI * radius * quality;
	
	var hasTrees = hasAtmosphere && quality >= TREES_MIN_QUALITY;
	
	// Must generate atmosphere colour in first
	var atmosphereColor = null;
	if(hasAtmosphere) {
		atmosphereColor = [
			prng.uniform() * 255,
			prng.uniform() * 255,
			prng.uniform() * 255,
			75
		];
	}
	
	/*******************************************************************
	 ****************** Determining texture and relief *****************
	 *******************************************************************/
	
	// Determining texture resolution (and "rounding" it to a power of two)
	var targetResolution = radius * quality * TEXTURE_RESOLUTION_PER_UNIT;
	var resolution;
	if(targetResolution < TEXTURE_MIN_RESOLUTION) {
		resolution = TEXTURE_MIN_RESOLUTION;
	} else {
		resolution = Math.pow(2, Math.ceil(Math.log(targetResolution) / Math.log(2)));
	}
	if(resolution > TEXTURE_MAX_RESOLUTION) resolution = TEXTURE_MAX_RESOLUTION;
	
	// Colors depending on pixel value
	var colorsNumber = Math.ceil((1 - Math.exp(prng.uniform()) / Math.E) * MAX_COULOURS);
	var colorSteps = [];
	for(var i = 0 ; i < colorsNumber ; i++) {
		colorSteps.push({
			minValue: (1 / colorsNumber) * i,
			color: [
				prng.uniform() * 255,
				prng.uniform() * 255,
				prng.uniform() * 255
			]
		});
	}
	
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
	var halfSizeY = ((resolution + 1) / 2 + 0.5);
	for(var currentSize = resolution ; currentSize > 1 ; currentSize /= 2) {
		var halfCurrentSize = currentSize / 2;
		
		// Square
		for(var x = halfCurrentSize ; x < resolution + 1 ; x += currentSize) {
			for(var y = halfCurrentSize ; y <= halfSizeY ; y += currentSize) {
				var squareAvg = (
					  textureRelief[(x - halfCurrentSize) + (y - halfCurrentSize) * resolution]
					+ textureRelief[(x + halfCurrentSize) + (y - halfCurrentSize) * resolution]
					+ textureRelief[(x + halfCurrentSize) + (y + halfCurrentSize) * resolution]
					+ textureRelief[(x - halfCurrentSize) + (y + halfCurrentSize) * resolution]
				) / 4;
				
				var diamondAvg = diamondSum / diamondCount;
				if(y == 0 || y == halfSizeY - 1) {
					setPixel(x, y, 0.5);
				} else {
					setPixel(x, y, squareAvg + ((prng.uniform() * 2 - 1) * currentSize * variabilityRate) / (resolution + 1));
				}
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
				if(y == 0 || y == halfSizeY - 1) {
					setPixel(x, y, 0.5);
				} else {
					setPixel(x, y, diamondAvg + ((prng.uniform() * 2 - 1) * currentSize * variabilityRate) / (resolution + 1));
					if(x == 0) setPixel(resolution, y, textureRelief[x + y * resolution]);
				}
			}
		}
	}
	
	var texturePixelsBuffer = texturePixels.buffer;
	
	/*******************************************************************
	 ******************* Determining planet geometry *******************
	 *******************************************************************/
	
	// Determining number of lines and columns for the planet sphere
	var planetLines = Math.round(visibleSize / LINE_SIZE);
	if(planetLines < PLANET_SPHERE_MIN_LINES) {
		planetLines = PLANET_SPHERE_MIN_LINES;
	}
	if(planetLines > PLANET_SPHERE_MAX_LINES) planetLines = PLANET_SPHERE_MAX_LINES;
	var planetColumns = planetLines * 2;
	
	var verticesArray       = new Float32Array(18 * planetColumns * planetLines);
	var normalsArray        = new Float32Array(18 * planetColumns * planetLines);
	var texturePartArray    = new Float32Array(12 * planetColumns * planetLines);
	var textureMappingArray = new Float32Array(12 * planetColumns * planetLines);
	
	for(var i = 0 ; i < planetLines ; i++) {
		var angleY = Math.PI * (i / planetLines);
		var sinY   = Math.sin(angleY);
		var cosY   = Math.cos(angleY);
		var reliefPointY = Math.round((i / planetLines) * (resolution / 2));
		
		var nextAngleY = Math.PI * ((i + 1) / planetLines);
		var sinNextY   = Math.sin(nextAngleY);
		var cosNextY   = Math.cos(nextAngleY);
		var reliefPointNextY = Math.round(((i + 1) / planetLines) * (resolution / 2));
		
		for(var j = 0 ; j < planetColumns ; j++) {
			var angleX = Math.PI * 2 * (j / planetColumns);
			var sinX   = Math.sin(angleX);
			var cosX   = Math.cos(angleX);
			var reliefPointX = Math.round((j / planetColumns) * resolution);
			
			var nextAngleX = Math.PI * 2 * ((j + 1) / planetColumns);
			var sinNextX   = Math.sin(nextAngleX);
			var cosNextX   = Math.cos(nextAngleX);
			var reliefPointNextX = Math.round(((j + 1) / planetColumns) * resolution);
			if(reliefPointNextX == resolution) reliefPointNextX = 0;
			
			var radiusTopLeft     = radius + maxRelief * (textureRelief[reliefPointX     + reliefPointY     * resolution] - 0.5);
			var radiusTopRight    = radius + maxRelief * (textureRelief[reliefPointNextX + reliefPointY     * resolution] - 0.5);
			var radiusBottomRight = radius + maxRelief * (textureRelief[reliefPointNextX + reliefPointNextY * resolution] - 0.5);
			var radiusBottomLeft  = radius + maxRelief * (textureRelief[reliefPointX     + reliefPointNextY * resolution] - 0.5);
			
			var currentIndex = i * planetColumns + j;
			
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
			
			// Texture mapping (= relief texture) and ground textures positions
			var textureIndex = 12 * currentIndex;
			textureMappingArray[textureIndex     ] = textureMappingArray[textureIndex + 6 ] = (j    ) / planetColumns;
			textureMappingArray[textureIndex + 1 ] = textureMappingArray[textureIndex + 7 ] = (i    ) / planetLines;
			textureMappingArray[textureIndex + 4 ] = textureMappingArray[textureIndex + 8 ] = (j + 1) / planetColumns;
			textureMappingArray[textureIndex + 5 ] = textureMappingArray[textureIndex + 9 ] = (i + 1) / planetLines;
			textureMappingArray[textureIndex + 2 ] = (j + 1) / planetColumns;
			textureMappingArray[textureIndex + 3 ] = (i    ) / planetLines;
			textureMappingArray[textureIndex + 10] = (j    ) / planetColumns;
			textureMappingArray[textureIndex + 11] = (i + 1) / planetLines;
			
			texturePartArray[textureIndex     ] = 0;
			texturePartArray[textureIndex + 1 ] = 0;
			texturePartArray[textureIndex + 2 ] = 1;
			texturePartArray[textureIndex + 3 ] = 0;
			texturePartArray[textureIndex + 4 ] = 1;
			texturePartArray[textureIndex + 5 ] = 1;
			texturePartArray[textureIndex + 6 ] = 0;
			texturePartArray[textureIndex + 7 ] = 0;
			texturePartArray[textureIndex + 8 ] = 1;
			texturePartArray[textureIndex + 9 ] = 1;
			texturePartArray[textureIndex + 10] = 0;
			texturePartArray[textureIndex + 11] = 1;
		}
	}
	
	var geometryVerticesBuffer       = verticesArray      .buffer;
	var geometryNormalsBuffer        = normalsArray       .buffer;
	var geometryTexturePartBuffer    = texturePartArray   .buffer;
	var geometryTextureMappingBuffer = textureMappingArray.buffer;
	
	/*******************************************************************
	 ********************** Generating atmosphere **********************
	 *******************************************************************/
	
	var atmosphereTextureBuffer, atmosphereNormalsBuffer, atmosphereTexturePartBuffer, atmosphereVerticesBuffer;
	if(hasAtmosphere) {
		// Determining number of lines and columns for the atmosphere sphere
		var atmosphereLines = Math.round(visibleSize / LINE_SIZE);
		if(atmosphereLines < ATMOSPHERE_SPHERE_MIN_LINES) {
			atmosphereLines = ATMOSPHERE_SPHERE_MIN_LINES;
		}
		if(atmosphereLines > ATMOSPHERE_SPHERE_MAX_LINES) atmosphereLines = ATMOSPHERE_SPHERE_MAX_LINES;
		var atmosphereColumns = atmosphereLines * 2;
		
		// Generating texture
		var atmosphereTextureArray = new Uint8Array(16); // 2 * 2 * 4
		atmosphereTextureArray[0] = atmosphereTextureArray[4] = atmosphereTextureArray[8]  = atmosphereTextureArray[12] = atmosphereColor[0];
		atmosphereTextureArray[1] = atmosphereTextureArray[5] = atmosphereTextureArray[9]  = atmosphereTextureArray[13] = atmosphereColor[1];
		atmosphereTextureArray[2] = atmosphereTextureArray[6] = atmosphereTextureArray[10] = atmosphereTextureArray[14] = atmosphereColor[2];
		atmosphereTextureArray[3] = atmosphereTextureArray[7] = atmosphereTextureArray[11] = atmosphereTextureArray[15] = atmosphereColor[3];
		
		var atmosphereVerticesArray    = new Float32Array(18 * atmosphereColumns * atmosphereLines);
		var atmosphereNormalsArray     = new Float32Array(18 * atmosphereColumns * atmosphereLines);
		var atmosphereTexturePartArray = new Float32Array(12 * atmosphereColumns * atmosphereLines);
		
		for(var i = 0 ; i < atmosphereLines ; i++) {
			var angleY = Math.PI * (i / atmosphereLines);
			var sinY   = Math.sin(angleY);
			var cosY   = Math.cos(angleY);
			
			var nextAngleY = Math.PI * ((i + 1) / atmosphereLines);
			var sinNextY   = Math.sin(nextAngleY);
			var cosNextY   = Math.cos(nextAngleY);
			
			for(var j = 0 ; j < atmosphereColumns ; j++) {
				var angleX = Math.PI * 2 * (j / atmosphereColumns);
				var sinX   = Math.sin(angleX);
				var cosX   = Math.cos(angleX);
				var reliefPointX = Math.round((j / atmosphereColumns) * resolution);
				
				var nextAngleX = Math.PI * 2 * ((j + 1) / atmosphereColumns);
				var sinNextX   = Math.sin(nextAngleX);
				var cosNextX   = Math.cos(nextAngleX);
				
				var currentIndex = i * atmosphereColumns + j;
				
				// Vertices positions
				var verticesIndex = 18 * currentIndex;
				atmosphereVerticesArray[verticesIndex     ] = atmosphereVerticesArray[verticesIndex + 9 ] = sinY     * cosX     * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 1 ] = atmosphereVerticesArray[verticesIndex + 10] = cosY                * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 2 ] = atmosphereVerticesArray[verticesIndex + 11] = sinY     * sinX     * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 6 ] = atmosphereVerticesArray[verticesIndex + 12] = sinNextY * cosNextX * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 7 ] = atmosphereVerticesArray[verticesIndex + 13] = cosNextY            * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 8 ] = atmosphereVerticesArray[verticesIndex + 14] = sinNextY * sinNextX * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 3 ] = sinY     * cosNextX * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 4 ] = cosY                * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 5 ] = sinY     * sinNextX * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 15] = sinNextY * cosX     * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 16] = cosNextY            * atmosphereRadius;
				atmosphereVerticesArray[verticesIndex + 17] = sinNextY * sinX     * atmosphereRadius;
				
				// Normals (same than vertices, without multiplying it by the radius)
				var normalsIndex = 18 * currentIndex;
				atmosphereNormalsArray[normalsIndex     ] = atmosphereNormalsArray[normalsIndex + 9 ] = sinY     * cosX    ;
				atmosphereNormalsArray[normalsIndex + 1 ] = atmosphereNormalsArray[normalsIndex + 10] = cosY               ;
				atmosphereNormalsArray[normalsIndex + 2 ] = atmosphereNormalsArray[normalsIndex + 11] = sinY     * sinX    ;
				atmosphereNormalsArray[normalsIndex + 6 ] = atmosphereNormalsArray[normalsIndex + 12] = sinNextY * cosNextX;
				atmosphereNormalsArray[normalsIndex + 7 ] = atmosphereNormalsArray[normalsIndex + 13] = cosNextY           ;
				atmosphereNormalsArray[normalsIndex + 8 ] = atmosphereNormalsArray[normalsIndex + 14] = sinNextY * sinNextX;
				atmosphereNormalsArray[normalsIndex + 3 ] = sinY     * cosNextX;
				atmosphereNormalsArray[normalsIndex + 4 ] = cosY               ;
				atmosphereNormalsArray[normalsIndex + 5 ] = sinY     * sinNextX;
				atmosphereNormalsArray[normalsIndex + 15] = sinNextY * cosX    ;
				atmosphereNormalsArray[normalsIndex + 16] = cosNextY           ;
				atmosphereNormalsArray[normalsIndex + 17] = sinNextY * sinX    ;
				
				// Texture parts
				var textureIndex = 12 * currentIndex;
				atmosphereTexturePartArray[textureIndex     ] = 0;
				atmosphereTexturePartArray[textureIndex + 1 ] = 0;
				atmosphereTexturePartArray[textureIndex + 2 ] = 1;
				atmosphereTexturePartArray[textureIndex + 3 ] = 0;
				atmosphereTexturePartArray[textureIndex + 4 ] = 1;
				atmosphereTexturePartArray[textureIndex + 5 ] = 1;
				atmosphereTexturePartArray[textureIndex + 6 ] = 0;
				atmosphereTexturePartArray[textureIndex + 7 ] = 0;
				atmosphereTexturePartArray[textureIndex + 8 ] = 1;
				atmosphereTexturePartArray[textureIndex + 9 ] = 1;
				atmosphereTexturePartArray[textureIndex + 10] = 0;
				atmosphereTexturePartArray[textureIndex + 11] = 1;
			}
		}
	
		atmosphereTextureBuffer     = atmosphereTextureArray    .buffer;
		atmosphereNormalsBuffer     = atmosphereNormalsArray    .buffer;
		atmosphereTexturePartBuffer = atmosphereTexturePartArray.buffer;
		atmosphereVerticesBuffer    = atmosphereVerticesArray   .buffer;
	}
	
	/*******************************************************************
	 ******************* Generating trees if required ******************
	 *******************************************************************/
	
	var treesData = null;
	if(hasTrees) {
		var prng = new RNG(seed);
		
		var treeCount = Math.round(MAX_TREE_DENSITY * radius * prng.uniform());
		var treesData = {
			positions: new Array(treeCount), // vec3
			rotations: new Array(treeCount)  // quat
		};
		
		for(var i = 0 ; i < treeCount ; i++) {
			var angleX = Math.PI * 2 * prng.uniform();
			var angleY = Math.PI * prng.uniform();
			
			var reliefPointX = Math.round((angleX / (Math.PI * 2)) *  resolution     );
			var reliefPointY = Math.round((angleY /  Math.PI     ) * (resolution / 2));
			var pointRadius  = radius + maxRelief * (textureRelief[reliefPointX + reliefPointY * resolution] - 0.5);
			
			var cosX = Math.cos(angleX);
			var cosY = Math.cos(angleY);
			var sinX = Math.sin(angleX);
			var sinY = Math.sin(angleY);
			
			treesData.positions[i] = vec3.fromValues(
				sinY     * cosX * pointRadius,
				cosY            * pointRadius,
				sinY     * sinX * pointRadius
			);
			
			var rotation = quat.create();
			quat.rotateX(rotation, rotation, angleY);
			quat.rotateY(rotation, rotation, -angleX);
			treesData.rotations[i] = rotation;
		}
	}
	
	/*******************************************************************
	 *************************** Sending data **************************
	 *******************************************************************/
	
	// Sending data
	var buffersToSend = [
		texturePixelsBuffer,
		geometryVerticesBuffer,
		geometryNormalsBuffer,
		geometryTexturePartBuffer
	];
	var atmosphereData = null;
	if(hasAtmosphere) {
		buffersToSend.push(atmosphereTextureBuffer);
		buffersToSend.push(atmosphereVerticesBuffer);
		buffersToSend.push(atmosphereNormalsBuffer);
		buffersToSend.push(atmosphereTexturePartBuffer);
		atmosphereData = {
			texturePixels: atmosphereTextureBuffer,
			vertices     : atmosphereVerticesBuffer,
			normals      : atmosphereNormalsBuffer,
			texturePart  : atmosphereTexturePartBuffer,
			radius       : atmosphereRadius
			// Size of the texture is always 2 x 2.
		};
	}
	postMessage({
		orbitRadius: orbitRadius,
		texture: {
			width : resolution,
			height: resolution / 2,
			pixels: texturePixelsBuffer,
		},
		geometry: {
			vertices      : geometryVerticesBuffer,
			normals       : geometryNormalsBuffer,
			texturePart   : geometryTexturePartBuffer,
			textureMapping: geometryTextureMappingBuffer
		},
		atmosphere: atmosphereData,
		hasTrees: hasTrees,
		trees: treesData
	}, buffersToSend);
};
