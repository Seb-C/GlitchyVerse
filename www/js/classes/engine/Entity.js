/**
 * An entity
 * @param World The World object
 * @param Model the model of the entity
 * @param vec3 The position of the entity in the world
 * @param quat The rotation to apply to the entity
 * @param vec4 (optional) A color mask to apply to the entity
 */
var Entity = function(world, model, position, rotation, colorMask) {
	this.gl = null;
	this.world = world;
	this.model = model;
	this.position = position;
	this.rotation = rotation;
	this.setColorMask(colorMask);
	this.pickColor = vec3.create(); // In case the entity is made pickable, else it stays to (0, 0, 0)
	this.isVisible = true;
	this.wireFrameMode = false;
	
	this.lights = new Array(); // Lights associated to the entity (must be used when extended)
	
	// Used as cache by world to define draw order
	this.distanceFromCamera = 0;
};

// TODO clean object (OOP) reference hierarchy
// TODO remove init and load methods

Entity.prototype.getRotation = function() {
	return this.rotation;
};

Entity.prototype.setColorMask = function(colorMask) {
	this.colorMask = colorMask || vec4.create();
};

Entity.prototype.setRotation = function(newRotation) {
	this.rotation = newRotation;
};

Entity.prototype.getRelativePosition = function() {
	return this.world.positionAbsoluteToRelative(this.position);
};

/**
 * Draws the entity
 * @param WebGL The WebGL object
 * @param Shader The shader to use to draw the entity
 * @param int Draw mode, see World.prototype.DRAW_MODE_XXX
 */
Entity.prototype.draw = function(gl, shader, drawMode) {
	if(this.isVisible) {
		gl.uniform3fv(shader.getVar("uCurrentPosition"), this.getRelativePosition());
		gl.uniform4fv(shader.getVar("uCurrentRotation"), this.getRotation());
		gl.uniform4fv(shader.getVar("uColorMask"), this.colorMask);
		
		if(drawMode == this.world.DRAW_MODE_PICK_CONTENT) {
			gl.uniform3fv(shader.getVar("uEntityPickColor"), this.pickColor);
		}
		
		this.model.draw(shader, drawMode, this.wireFrameMode);
	}
};

/**
 * Changes the position of the entity
 * @param vec3 New position of the entity
 */
Entity.prototype.setPosition = function(newPos) {
	// Determining the difference between the two positions
	var difference = vec3.create();
	vec3.subtract(difference, newPos, this.position);
	
	// Setting the new position
	vec3.copy(this.position, newPos);
	
	// Moving the lights
	this.lights.map(function(light) {
		vec3.add(light.position, light.position, difference);
	});
};

Entity.prototype.isTransparency = function() {
	return (this.colorMask[3] > 0 && this.colorMask[3] < 1) || this.model.isTransparency();
};

/**
 * Removes all it's content from the world
 */
Entity.prototype.destroy = function() {
	this.world.remove(this.lights);
};
