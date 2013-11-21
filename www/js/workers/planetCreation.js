importScripts("/js/polyfills/base64.min.js");
importScripts("/js/lib/gl-matrix.min.js");
importScripts("/js/lib/seedrandom.js");
//importScripts("/js/functions/pixelArrayToDataURL.js");
importScripts("/js/functions/createPlanetTexture.js");
importScripts("/js/functions/createPlanetGeometry.js");

var TEXTURE_RESOLUTION_PER_UNIT = 0.6;
var TEXTURE_MIN_RESOLUTION      = 16;
var TEXTURE_MAX_RESOLUTION      = 1024; // TODO use gl constant MAX_TEXTURE_SIZE ?
var SPHERE_MIN_LINES            = 6;
var SPHERE_MAX_LINES            = 25;
var LINE_SIZE                   = 3;

self.onmessage = function(event) {
	var seed    = event.data.seed;
	var radius  = event.data.radius;
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
	
	var texture = createPlanetTexture(resolution * 2, seed);
	var geometry = createPlanetGeometry(radius, lines);
	
	// Getting the transferable buffer
	texture.pixels       = texture .pixels     .buffer;
	geometry.vertices    = geometry.vertices   .buffer;
	geometry.normals     = geometry.normals    .buffer;
	geometry.texturePart = geometry.texturePart.buffer;
	
	// Sending data
	postMessage({texture: texture, geometry: geometry}, [texture.pixels, geometry.vertices, geometry.normals, geometry.texturePart]);
};