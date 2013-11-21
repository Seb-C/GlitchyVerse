/**
 * An entity, formed by a set of meshes
 * @param World The World object
 * @param vec3 The position of the entity in the world
 * @param quat The rotation to apply to the entity
 * @param Array(Mesh) Meshes of the Entity.
 * @param Float (optional) The initial state of the entiy
 */
var Entity = function(world, position, rotation, meshes, state) {
	if(!this.model) this.model = null;
	this._gl = null;
	this.world = world;
	this.position = position;
	this.rotation = rotation;
	this.meshes = meshes;
	this.meshGroups = null;
	this.id = null; // Will be modified by the class which builds the entity
	
	this.lights = new Array(); // Lights associated to the entity (must be used when extended)
	
	// Used as cache by world to define draw order
	this.distanceFromCamera = 0;
	
	this._cacheIsTransparency = null;
	
	this._verticesArray        = null;
	this._textureCoordArray    = null;
	this._verticesIndexArray   = null;
	this._vertexNormalsArray   = null;
	this._verticesShiningArray = null;
	this._pickColorArray       = null;
	this._pickScreenColorArray = null;
	
	this._verticesBuffer        = null;
	this._textureCoordBuffer    = null;
	this._verticesIndexBuffer   = null;
	this._vertexNormalsBuffer   = null;
	this._verticesShiningBuffer = null;
	this._pickColorBuffer       = null;
	this._pickScreenColorBuffer = null;
	
	// Same order, same number of elements
	this._verticesCountToDraw = null;
	this._texturesToDraw      = null;
	
	this.regenerateCache();
	
	// Initializing object state
	if(this.changeState == null) {
		this.state = typeof(state) == "undefined" ? null : state;
	} else {
		this.state = null;
		this.changeState(state);
	}
};

/**
 * @return boolean True if at least one of the textures has transparency
 */
Entity.prototype.isTransparency = function() {
	if(this._cacheIsTransparency == null) {
		var result = false;
		for(var i = 0 ; i < this.meshes.length ; i++) {
			var texture = this.meshes[i].texture;
			if(typeof(texture.isTransparency) == "undefined" || texture.isTransparency == null) {
				// Not loaded yet --> Waiting for the next call to build cache var
				return false;
			} else if(texture.isTransparency) {
				result = true;
				break;
			}
		}
		this._cacheIsTransparency = result;
	}
	return this._cacheIsTransparency;
};

/**
 * Regenerates the cache arrays. 
 * Must be called after each meshes change.
 */
Entity.prototype.regenerateCache = function() {
	// When there is only one big mesh in the entity, we just re-use the existing Arrays instead of copying it
	var isSingleMesh = this.meshes.length == 1;
	
	// First, we sort the meshes array by texture (by reference)
	var tempSortTextures = [];
	this.meshes.sort(function(a, b) {
		var iA = null;
		var iB = null;
		for(var i = 0 ; i <= tempSortTextures.length ; i++) {
			if(i == tempSortTextures.length) {
				if(iA == null) {
					tempSortTextures.push(a.texture);
				} else /*if(iB == null)*/ {
					tempSortTextures.push(b.texture);
				}
			}
			var currentTexture = tempSortTextures[i];
			if(iA == null && a.texture === currentTexture) iA = i;
			if(iB == null && b.texture === currentTexture) iB = i;
			if(iA != null && iB != null) return iA - iB;
		}
	});
	
	// Determining the number of vertices and triangles in the entity
	var verticesCount = 0;
	var trianglesCount = 0;
	for(var i = 0 ; i < this.meshes.length ; i++) {
		var mesh = this.meshes[i];
		verticesCount += mesh.pointsCount;
		trianglesCount += mesh.getTrianglesCount();
	}
	
	// Creating arrays
	if(isSingleMesh) {
		this._verticesArray      = this.meshes[0].vertices;
		this._textureCoordArray  = this.meshes[0].getTextureArray();
		this._vertexNormalsArray = this.meshes[0].getVertexNormalsArray();
	} else {
		this._verticesArray      = new Float32Array(3 * verticesCount );
		this._textureCoordArray  = new Float32Array(2 * verticesCount );
		this._vertexNormalsArray = new Float32Array(3 * verticesCount );
	}
	this._verticesShiningArray = new Float32Array(    verticesCount);
	this._pickColorArray       = new Float32Array(3 * verticesCount);
	this._pickScreenColorArray = new Float32Array(3 * verticesCount);
		this._verticesIndexArray = new Uint16Array (3 * trianglesCount);
	
	this._verticesCountToDraw = [];
	this._texturesToDraw      = [];
	
	var currentTexture = null;
	var currentVerticesCountForTexture = 0;
	var self = this;
	var pushCurrentTexture = function() {
		if(currentTexture != null) {
			self._verticesCountToDraw.push(currentVerticesCountForTexture);
			self._texturesToDraw     .push(currentTexture);
		}
	};
	
	var addedVerticesCount  = 0;
	var addedTrianglesCount = 0;
	
	var indexArrayMapFunction = function(x) {
		return x + addedVerticesCount;
	};
	
	this.meshGroups = {};
	
	for(var i = 0 ; i < this.meshes.length ; i++) {
		var mesh = this.meshes[i];
		
		// Groups
		for(var j = 0 ; j < mesh.groups.length ; j++) {
			var g = mesh.groups[j];
			if(!this.meshGroups[g]) {
				this.meshGroups[g] = [];
			}
			this.meshGroups[g].push(mesh);
		}
		
		if(!isSingleMesh) {
			this._verticesArray       .set(mesh.vertices,                        3 * addedVerticesCount);
			this._textureCoordArray   .set(mesh.getTextureArray(),               2 * addedVerticesCount);
			this._vertexNormalsArray  .set(mesh.getVertexNormalsArray(),         3 * addedVerticesCount);
		}
		this._verticesShiningArray.set(mesh.getVertexShiningArray(),             addedVerticesCount);
		this._pickColorArray      .set(mesh.getVertexPickColorArray(),       3 * addedVerticesCount);
		this._pickScreenColorArray.set(mesh.getVertexPickScreenColorArray(), 3 * addedVerticesCount);
		this._verticesIndexArray  .set(mesh.getVerticesIndexArray().map(indexArrayMapFunction), 3 * addedTrianglesCount);
		
		addedVerticesCount  += mesh.pointsCount;
		addedTrianglesCount += mesh.getTrianglesCount();
		
		mesh.entity = this; // Initializing reference to entity in meshes
		
		if(mesh.texture === currentTexture) {
			currentVerticesCountForTexture += mesh.verticesCount;
		} else {
			pushCurrentTexture();
			currentTexture = mesh.texture;
			currentVerticesCountForTexture = mesh.verticesCount;
		}
	}
	pushCurrentTexture();
	
	if(this._gl != null) {
		this._regenerateBuffers();
	}
};

/**
 * Initializes the entity buffers
 * @param WebGL The WebGL object
 */
Entity.prototype.init = function(gl) {
	this._gl = gl;
	
	this._verticesBuffer        = this._gl.createBuffer();
	this._vertexNormalsBuffer   = this._gl.createBuffer();
	this._textureCoordBuffer    = this._gl.createBuffer();
	this._verticesShiningBuffer = this._gl.createBuffer();
	this._verticesIndexBuffer   = this._gl.createBuffer();
	this._pickColorBuffer       = this._gl.createBuffer();
	this._pickScreenColorBuffer = this._gl.createBuffer();
	
	this._regenerateBuffers();
};

/**
 * Regenerates the entity buffers
 */
Entity.prototype._regenerateBuffers = function() {
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._verticesBuffer);
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._verticesArray, this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._vertexNormalsBuffer);
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._vertexNormalsArray, this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._textureCoordBuffer);
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._textureCoordArray, this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._verticesShiningBuffer);
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._verticesShiningArray, this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pickColorBuffer);
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._pickColorArray, this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pickScreenColorBuffer);
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._pickScreenColorArray, this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._verticesIndexBuffer);
	this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, this._verticesIndexArray, this._gl.STATIC_DRAW);
};

/**
 * Draws the entity
 * @param WebGL The WebGL object
 * @param Shader The shader to use to draw the entity
 * @param int Draw mode, see World.prototype.DRAW_MODE_XXX
 */
Entity.prototype.draw = function(gl, shader, drawMode) {
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._verticesBuffer);
	this._gl.vertexAttribPointer(shader.getVar("aVertexPosition"), 3, this._gl.FLOAT, false, 0, 0);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._vertexNormalsBuffer);
	this._gl.vertexAttribPointer(shader.getVar("aVertexNormal"), 3, this._gl.FLOAT, false, 0, 0);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._textureCoordBuffer);
	this._gl.vertexAttribPointer(shader.getVar("aTextureCoord"), 2, this._gl.FLOAT, false, 0, 0);
	this._gl.activeTexture(this._gl.TEXTURE0);
	this._gl.uniform1i(shader.getVar("uSampler"), 0);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._verticesShiningBuffer);
	this._gl.vertexAttribPointer(shader.getVar("aVertexShining"), 1, this._gl.FLOAT, false, 0, 0);
	
	if(drawMode == this.world.DRAW_MODE_PICK_MESH) {
		this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pickColorBuffer);
		this._gl.vertexAttribPointer(shader.getVar("aPickColor"), 3, this._gl.FLOAT, false, 0, 0);
	} else /*if(drawMode == this.world.DRAW_MODE_PICK_SCREEN)*/ {
		// !!! When aPickColor is empty, there is a bug. Have to fill it everytime !!!
		this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pickScreenColorBuffer);
		this._gl.vertexAttribPointer(shader.getVar("aPickColor"), 3, this._gl.FLOAT, false, 0, 0);
	}
	
	this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._verticesIndexBuffer);
	
	var currentByteIndex = 0;
	for(var i = 0 ; i < this._texturesToDraw.length ; i++) {
		var verticesCount = this._verticesCountToDraw[i];
		var texture       = this._texturesToDraw[i];
		
		this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
		this._gl.drawElements(this._gl.TRIANGLES, verticesCount, this._gl.UNSIGNED_SHORT, currentByteIndex);
		
		currentByteIndex += 2 * verticesCount;
	}
};

/**
 * Returns the number of vertices of the entity
 * @returns int The number of vertices of the entity
 */
Entity.prototype.getVerticesNumber = function() {
	return this._verticesIndexArray.length;
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