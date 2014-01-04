/**
 * Represents a WebGL world, with all contents and parameters
 */
var World = function() {
	this.camera           = new Camera(this);
	this.gl               = null;
	this.server           = null;
	
	this.lastMvMatrix     = this.camera.update();
	
	this.lastDrawMode     = null;
	
	this.mainShader       = new Shader();
	
	this._entities        = new Array();
	this.lightManager     = new LightManager(this);
	this.entitySortTimer  = null;
	
	this.animator         = new Animator();
	
	this.userSpaceShip    = null; // Initialized by ServerConnection
	this.userSpaceShipMoveTimer = null;
	this.userSpaceShipMoveTimerDelay = 5000;
	this.designer         = null; // Initialized by ServerConnection
	this.resourceManager  = null;
	this.spaceShips       = {};
	this.spaceContent     = new SpaceContent(this);
	
	// Starts with 1 because 0 = not pickable
	// TODO meshes in this array cannot be destroyed by garbage collector
	this.nextPickableColor = [0, 0, 1];
	this._pickableMeshes = {};
};

/**
 * Adds "something" to the world
 * @param Object An object to add to the world (currently, can be Entity, Light, or Array of one of these types)
 */
World.prototype.add = function(o) {
	if(o instanceof Entity) {
		this._entities.push(o);
		if(this.gl != null) {
			// When the world is already initialized, initialize the new entity
			o.init(this.gl);
		}
	} else if(o instanceof Array && o[0] instanceof Entity) {
		Array.prototype.push.apply(this._entities, o);
		if(this.gl != null) {
			for(var i = 0 ; i < o.length ; i++) {
				// When the world is already initialized, initialize the new entities
				o[i].init(this.gl);
			}
		}
	} else if(o instanceof Light || (o instanceof Array && o[0] instanceof Light)) {
		this.lightManager.add(o);
		this.lightManager.regenerateCache();
	} else if(o instanceof SpaceShip) {
		this.spaceShips[o.id] = o;
	} else if(o instanceof Array && o[0] instanceof SpaceShip) {
		for(var i = 0 ; i < o.length ; i++) {
			this.spaceShips[o[i].id] = o[i];
		}
	} else {
		throw new Error("Cannot add object type " + typeof(o) + " in world.");
	}
};

/**
 * Sorts the entity array. Entities with alpha textures will be 
 * at the end of the array, with nearest entities at last
 */
World.prototype.sortEntities = function() {
	var cameraPosition = this.camera.getAbsolutePosition();
	
	// Generating cache values (distance between entity and camera)
	this._entities.map(function(entity) {
		if(entity.isTransparency()) {
			entity.distanceFromCamera = vec3.distance(entity.position, cameraPosition);
		}
	});
	
	this._entities.sort(function(a, b) {
		if(a.isTransparency() && b.isTransparency()) {
			return b.distanceFromCamera - a.distanceFromCamera;
		} else if(a.isTransparency() /*&& !b.isTransparency()*/) {
			return 1;
		} else/* if(!a.isTransparency() && b.isTransparency())*/ {
			return -1;
		}
	});
};

/**
 * Defines the spaceship of the player. Also updates the designer.
 * The spaceship must be added to the world before calling this function.
 * @param int The id of the SpaceShip
 * @param SpaceShip the spaceship to set as user's one
 */
World.prototype.setUserSpaceShip = function(spaceShip) {
	this.userSpaceShip = spaceShip;
	this.designer       .setSpaceShip(this.userSpaceShip);
	this.resourceManager.setSpaceShip(this.userSpaceShip);
	
	var self = this;
	var lastPos = vec3.clone(this.userSpaceShip.getPosition());
	this.userSpaceShipMoveTimer = new Timer(function() {
		var newPosition = self.userSpaceShip.getPosition();
		if(newPosition[0] != lastPos[0] || newPosition[1] != lastPos[1] || newPosition[2] != lastPos[2]) {
			vec3.copy(lastPos, newPosition);
			self.server.sendMessage("update_position", {position: newPosition, rotation: self.userSpaceShip.rotation});
		}
	}, this.userSpaceShipMoveTimerDelay, false);
};

/**
 * Creates the designer with the given definition
 * @see Designer constructor definition
 */
World.prototype.setDesigner = function(definition) {
	this.designer = new Designer(this, definition);
	if(this.userSpaceShip != null) this.designer.setSpaceShip(this.userSpaceShip);
};

/**
 * Creates the resource manager with the given definition
 * @see ResourceManager constructor definition
 */
World.prototype.setResourceManager = function(definition) {
	this.resourceManager = new ResourceManager(definition);
	if(this.userSpaceShip != null) this.resourceManager.setSpaceShip(this.userSpaceShip);
};

/**
 * Configures a mesh as a pickable mesh
 * @param Mesh The mesh which is pickable
 * @param callback The function to execute when Mesh is picked. "this" will reference the mesh
 * @param boolean True if the mesh is a screen. If true, x and y coordinates of the click 
 *                on the screen will be passed to callback, as floats (0.0 .. 1.0)
 */
World.prototype.configurePickableMesh = function(mesh, callBack, isScreen) {
	mesh.pickColor    = this.nextPickableColor.slice(0); // = clone()
	mesh.pickCallBack = callBack;
	mesh.isScreen     = isScreen;
	this._pickableMeshes[this._colorToObjectKey(this.nextPickableColor)] = mesh;
	
	// Incrementing
	if(this.nextPickableColor[2] >= 255) {
		if(this.nextPickableColor[1] >= 255) {
			this.nextPickableColor[0]++;
			this.nextPickableColor[1] = 0;
		} else {
			this.nextPickableColor[1]++;
		}
		this.nextPickableColor[2] = 0;
	} else {
		this.nextPickableColor[2]++;
	}
};

/**
 * Returns the pickable mesh associated to the given color
 * @param vec3 RGB Color
 * @return Mesh The Mesh
 */
World.prototype.getPickableMeshByColor = function(color) {
	var key = this._colorToObjectKey(color);
	return this._pickableMeshes[key] ? this._pickableMeshes[key] : null;
};

/**
 * Returns a color With a unique String representation, easily usable as a key.
 * @param vec3 RGB Color
 * @returns String Representation of the color
 */
World.prototype._colorToObjectKey = function(color) {
	return color[0] + "," + color[1] + "," + color[2];
};

/**
 * Removes "something" from the world
 * @param Object An object to remove from the world (currently, can be Entity, Light, or Array of one of these types)
 */
World.prototype.remove = function(o) {
	if(o instanceof Entity) {
		var i = this._entities.indexOf(o);
		if(i != -1) this._entities.splice(i, 1);
	} else if(o instanceof Array && o[0] instanceof Entity) {
		this._entities = this._entities.filter(function(v) { return o.indexOf(v) == -1; });
	} else if(o instanceof Light || (o instanceof Array && o[0] instanceof Light)) {
		this.lightManager.remove(o);
		this.lightManager.regenerateCache();
	} else if(o instanceof SpaceShip) {
		this._removeSpaceShip(o);
	} else if(o instanceof Array && o[0] instanceof SpaceShip) {
		for(var i = 0 ; i < o.length ; i++) {
			this._removeSpaceShip(o[i]);
		}
	} else {
		throw new Error("Cannot remove object type " + typeof(o) + " in world.");
	}
};

/**
 * Removes a spaceShip and all it's entities
 * @param SpaceShip The spaceship to remove
 */
World.prototype._removeSpaceShip = function(ss) {
	if(ss != this.userSpaceShip) {
		delete this.spaceShips[ss.id];
		ss.destroy();
	}
};

/**
 * Reconfigures the WebGL context with the new screen sizes.
 * The world has to be initialized first
 * @param int The width of the screen
 * @param int The height of the screen
 */
World.prototype.resize = function(screenWidth, screenHeight) {
	var projectionMatrix = this.camera.updateProjectionMatrix(screenWidth, screenHeight);
	this.gl.viewport(0, 0, screenWidth, screenHeight);
	
	var shaders = [this.mainShader];
	for(var i = 0 ; i < shaders.length ; i++) {
		this.gl.useProgram(shaders[i].program);
		this.gl.uniformMatrix4fv(shaders[i].getVar("uPMatrix"), false, projectionMatrix);
	}
};

/**
 * Loads some world elements, for example the shader source files (*.glsl)
 */
World.prototype.load = function() {
	this.mainShader.loadVertexShader  ("main/vertexShader.glsl"  );
	this.mainShader.loadFragmentShader("main/fragmentShader.glsl");
};

/**
 * Initializes the world
 * @param WebGL The WebGL context
 */
World.prototype.init = function(gl) {
	this.gl = gl;
	
	this.mainShader.init(this.gl);
	this.gl.useProgram(this.mainShader.program);
	
	for(var i in this._entities) {
		this._entities[i].init(this.gl);
	}
	
	this.lightManager.init(this.gl);
	
	// Entity array has to be sorted regularly, but not necessarily at each frame
	var self = this;
	this.entitySortTimer = new Timer(function() {
		self.sortEntities();
	}, 1000);
};

/**
 * Updates the position of some moving elements
 */
World.prototype.update = function() {
	for(var k in this.spaceShips) {
		this.spaceShips[k].updatePosition();
	}
	this.lastMvMatrix = this.camera.update();
	
	this.gl.useProgram(this.mainShader.program);
	this.gl.uniformMatrix4fv(this.mainShader.getVar("uMVMatrix"), false, this.lastMvMatrix);
	
	this.animator.update();
};

/**
 * Converts an absolute position in the world to a position relative to the spaceship
 * @param vec3 The absolute position in the world
 * @return vec3 The position relative to the spaceship.
 */
World.prototype.positionAbsoluteToRelative = function(absolutePosition) {
	var r = vec3.create();
	if(this.userSpaceShip != null) vec3.subtract(r, absolutePosition, this.userSpaceShip.getPosition());
	return r;
};

// If these constants are changed, main fragmentShader.glsl and vertexShader.glsl must be updated too.
World.prototype.DRAW_MODE_NORMAL      = 0;
World.prototype.DRAW_MODE_PICK_MESH   = 1;
World.prototype.DRAW_MODE_PICK_SCREEN = 2;

/**
 * Draws the world at each frame
 * @param int (optional, ignore it for a normal draw) Draw mode, see World.prototype.DRAW_MODE_XXX
 */
World.prototype.draw = function(mode) {
	var drawMode = mode || this.DRAW_MODE_NORMAL;
	
	this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
	
	if(mode != this.lastDrawMode) {
		this.gl.uniform1i(this.mainShader.getVar("uDrawMode"), drawMode);
		this.lastDrawMode = mode;
	}
	
	this.lightManager.regenerateCache(); // TODO remove that from here, but necessary with relative positions
	
	this.gl.uniform1i(this.mainShader.getVar("uTexture"), 0);
	this.gl.uniform1i(this.mainShader.getVar("uMappedTexture"), 1);
	
	// Drawing entities
	this.gl.useProgram(this.mainShader.program);
	for(var i = 0 ; i < this._entities.length ; i++) {
		this._entities[i].draw(this.gl, this.mainShader, drawMode);
	}
	
	// Drawing additional windows
	if(this.designer != null && this.designer.isVisible) this.designer.draw();
};
