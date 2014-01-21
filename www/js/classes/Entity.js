/**
 * An entity
 * @param World The World object
 * @param Model the model of the entity
 * @param vec3 The position of the entity in the world
 * @param quat The rotation to apply to the entity
 * @param Float (optional) The initial state of the entity
 */
var Entity = function(world, model, position, rotation, state) {
	this.gl = null;
	this.world = world;
	this.model = model;
	this.position = position;
	this.rotation = rotation;
	
	this.id = null; // Will be modified by the class which builds the entity
	
	this.lights = new Array(); // Lights associated to the entity (must be used when extended)
	
	// Used as cache by world to define draw order
	this.distanceFromCamera = 0;
	
	// Initializing object state
	if(this.changeState == null) {
		this.state = typeof(state) == "undefined" ? null : state;
	} else {
		this.state = null;
		this.changeState(state);
	}
};

// TODO clean object (OOP) reference hierarchy
// TODO remove init and load methods

Entity.prototype.getRotation = function() {
	return this.rotation;
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
	gl.uniform3fv(shader.getVar("uCurrentPosition"), this.getRelativePosition());
	gl.uniform4fv(shader.getVar("uCurrentRotation"), this.getRotation());
	
	this.model.draw(shader, drawMode);
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

/**
 * Removes all it's content from the world
 */
Entity.prototype.destroy = function() {
	this.world.remove(this.lights);
};

/**
 * Abstract method called when changing the state of the entity, for example on user action. It can modify meshes.
 * @param float (optional) The new state of the object
 */
Entity.prototype.changeState = null;
