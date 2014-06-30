/**
 * A point light in the world
 * @param Array(3), position of the light in the world (absolute). Must not be a vec3.
 * @param Array(3) RGB components of the light's color
 * @param Float The maximum distance  where the lightcan glow a vertice
 * @param Boolean True if the light must be attenuated with the distance
 * @param float (optional) The max light power (it's the power at the middle point)
 */
var Light = function(position, color, maxDistance, isAttenuation, maxLightning) {
	this.position      = position;
	this.color         = color;
	this.maxDistance   = maxDistance;
	this.isAttenuation = isAttenuation;
	this.maxLightning  = maxLightning || 1;
	
	// Used by LightManager to sort lights
	// The min nearIndex is the most visible
	this.nearIndex     = 0;
};
