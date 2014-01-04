/**
 * An entity, formed by a set of meshes
 * @param World The World object
 * @param vec3 The position of the entity in the world
 * @param quat The rotation to apply to the entity
 * @param Array(Mesh)|Mesh Meshes of the Entity. Can also be a single mesh, which will be optimized.
 * @param Float (optional) The initial state of the entiy
 * @param WebGLTexture (optional) A mapped texture to apply to the entity
 */
var Entity = function(world, position, rotation, meshes, state, mappedTexture) {
	if(!this.model) this.model = null;
	this._gl = null;
	this.world = world;
	this.position = position;
	this._rotation = rotation;
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
	this._pickColorArray       = null;
	this._pickScreenColorArray = null;
	this._textureMappingArray  = null;
	
	this._verticesBuffer        = null;
	this._textureCoordBuffer    = null;
	this._verticesIndexBuffer   = null;
	this._vertexNormalsBuffer   = null;
	this._pickColorBuffer       = null;
	this._pickScreenColorBuffer = null;
	this._textureMappingBuffer  = null;
	
	// Same order, same number of elements
	this._verticesCountToDraw = null;
	this._texturesToDraw      = null;
	
	this.mappedTexture = mappedTexture || null;
	
	this.drawTypeByElements = true;
	
	this.onbeforedraw = null;
	this.onafterdraw  = null;
	
	this.regenerateCache();
	
	// Initializing object state
	if(this.changeState == null) {
		this.state = typeof(state) == "undefined" ? null : state;
	} else {
		this.state = null;
		this.changeState(state);
	}
};

Entity.prototype.getRotation = function() {
	return this._rotation;
};

Entity.prototype.setRotation = function(newRotation) {
	this._rotation = newRotation;
};

/**
 * @return boolean True if at least one of the textures has transparency
 */
Entity.prototype.isTransparency = function() {
	if(this._cacheIsTransparency == null) {
		var meshes = (this.meshes instanceof Mesh) ? [this.meshes] : this.meshes;
		
		var result = false;
		for(var i = 0 ; i < meshes.length ; i++) {
			var texture = meshes[i].texture;
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
	var isSingleMesh = this.meshes instanceof Mesh;
	var meshes = isSingleMesh ? [this.meshes] : this.meshes;
	
	// First, we sort the meshes array by texture (by reference)
	var tempSortTextures = [];
	meshes.sort(function(a, b) {
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
	for(var i = 0 ; i < meshes.length ; i++) {
		var mesh = meshes[i];
		verticesCount += mesh.pointsCount;
		trianglesCount += mesh.getTrianglesCount();
	}
	
	// Creating arrays
	if(isSingleMesh) {
		this._verticesArray      = meshes[0].vertices;
		this._textureCoordArray  = meshes[0].getTextureArray();
		this._vertexNormalsArray = meshes[0].getVertexNormalsArray();
		if(this.mappedTexture != null) {
			this._textureMappingArray = meshes[0].textureMapping;
		}
		if(this.drawTypeByElements) {
			this._verticesIndexArray = meshes[0].getVerticesIndexArray();
		}
	} else {
		this._verticesArray      = new Float32Array(3 * verticesCount);
		this._textureCoordArray  = new Float32Array(2 * verticesCount);
		this._vertexNormalsArray = new Float32Array(3 * verticesCount);
		if(this.mappedTexture != null) {
			this._textureMappingArray = new Float32Array(3 * verticesCount);
		}
		if(this.drawTypeByElements) {
			this._verticesIndexArray = new Uint16Array (3 * trianglesCount);
		}
	}
	this._pickColorArray       = new Float32Array(3 * verticesCount);
	this._pickScreenColorArray = new Float32Array(3 * verticesCount);
	
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
	
	for(var i = 0 ; i < meshes.length ; i++) {
		var mesh = meshes[i];
		
		// Groups
		for(var j = 0 ; j < mesh.groups.length ; j++) {
			var g = mesh.groups[j];
			if(!this.meshGroups[g]) {
				this.meshGroups[g] = [];
			}
			this.meshGroups[g].push(mesh);
		}
		
		// TODO optimize mesh.getXXX by writing directly to an array with begin index
		
		if(!isSingleMesh) {
			this._verticesArray       .set(mesh.vertices,                3 * addedVerticesCount);
			this._textureCoordArray   .set(mesh.getTextureArray(),       2 * addedVerticesCount);
			this._vertexNormalsArray  .set(mesh.getVertexNormalsArray(), 3 * addedVerticesCount);
			if(this.mappedTexture != null) {
				if(mesh.textureMapping == null) throw new Error("textureMapping attribute must be set on all meshes when mappedTexture is defined.");
				this._textureMappingArray  .set(mesh.textureMapping, 3 * addedVerticesCount);
			}
			if(this.drawTypeByElements) {
				this._verticesIndexArray.set(mesh.getVerticesIndexArray().map(indexArrayMapFunction), 3 * addedTrianglesCount);
			}
		}
		
		if(mesh.pickColor != null) {
			// If the mesh is not pickable, values are 0, == default value of a TypedArray
			this._pickColorArray      .set(mesh.getVertexPickColorArray(),       3 * addedVerticesCount);
			this._pickScreenColorArray.set(mesh.getVertexPickScreenColorArray(), 3 * addedVerticesCount);
		}
		
		addedVerticesCount  += mesh.pointsCount;
		addedTrianglesCount += mesh.getTrianglesCount();
		
		mesh.entity = this; // Initializing reference to entity in meshes
		
		if(mesh.texture === currentTexture) {
			currentVerticesCountForTexture += this.drawTypeByElements ? mesh.verticesCount : mesh.pointsCount;
		} else {
			pushCurrentTexture();
			currentTexture = mesh.texture;
			currentVerticesCountForTexture = this.drawTypeByElements ? mesh.verticesCount : mesh.pointsCount;
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
	this._verticesIndexBuffer   = this._gl.createBuffer();
	this._pickColorBuffer       = this._gl.createBuffer();
	this._pickScreenColorBuffer = this._gl.createBuffer();
	this._textureMappingBuffer  = this._gl.createBuffer();
	
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
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pickColorBuffer);
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._pickColorArray, this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pickScreenColorBuffer);
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._pickScreenColorArray, this._gl.STATIC_DRAW);
	
	if(this.mappedTexture != null) {
		this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._textureMappingBuffer);
		this._gl.bufferData(this._gl.ARRAY_BUFFER, this._textureMappingArray, this._gl.STATIC_DRAW);
	}
	
	if(this.drawTypeByElements) {
		this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._verticesIndexBuffer);
		this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, this._verticesIndexArray, this._gl.STATIC_DRAW);
	}
};

/**
 * Draws the entity
 * @param WebGL The WebGL object
 * @param Shader The shader to use to draw the entity
 * @param int Draw mode, see World.prototype.DRAW_MODE_XXX
 */
Entity.prototype.draw = function(gl, shader, drawMode) {
	if(this.meshes instanceof Mesh || this.meshes.length > 0) {
		if(this.onbeforedraw != null) {
			this.onbeforedraw.call(this);
		}
		
		this._gl.uniform3fv(shader.getVar("uCurrentPosition"), this.world.positionAbsoluteToRelative(this.position));
		this._gl.uniform4fv(shader.getVar("uCurrentRotation"), this.getRotation());
		
		this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._verticesBuffer);
		this._gl.vertexAttribPointer(shader.getVar("aVertexPosition"), 3, this._gl.FLOAT, false, 0, 0);
		
		this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._vertexNormalsBuffer);
		this._gl.vertexAttribPointer(shader.getVar("aVertexNormal"), 3, this._gl.FLOAT, false, 0, 0);
		
		this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._textureCoordBuffer);
		this._gl.vertexAttribPointer(shader.getVar("aTextureCoord"), 2, this._gl.FLOAT, false, 0, 0);
		
		if(this.mappedTexture == null) {
			// Setting the mapped texture with normal texture buffer, only because we have to set it
			this._gl.uniform1f(shader.getVar("uHasMappedTexture"), 0);
			
			this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._textureCoordBuffer);
			this._gl.vertexAttribPointer(shader.getVar("aTextureMapping"), 2, this._gl.FLOAT, false, 0, 0);
		} else {
			this._gl.uniform1f(shader.getVar("uHasMappedTexture"), 1);
			
			this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._textureMappingBuffer);
			this._gl.vertexAttribPointer(shader.getVar("aTextureMapping"), 2, this._gl.FLOAT, false, 0, 0);
			
			this._gl.activeTexture(this._gl.TEXTURE1);
			this._gl.bindTexture(this._gl.TEXTURE_2D, this.mappedTexture);
		}
		
		if(drawMode == this.world.DRAW_MODE_PICK_MESH) {
			this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pickColorBuffer);
		} else {
			this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._pickScreenColorBuffer);
		}
		this._gl.vertexAttribPointer(shader.getVar("aPickColor"), 3, this._gl.FLOAT, false, 0, 0);
		
		if(this.drawTypeByElements) {
			this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._verticesIndexBuffer);		
		}
		
		this._gl.activeTexture(this._gl.TEXTURE0);
		
		var currentIndex = 0;
		for(var i = 0 ; i < this._texturesToDraw.length ; i++) {
			var verticesCount = this._verticesCountToDraw[i];
			var texture       = this._texturesToDraw[i];
			
			this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
			
			if(this.drawTypeByElements) {
				this._gl.drawElements(this._gl.TRIANGLES, verticesCount, this._gl.UNSIGNED_SHORT, currentIndex);
				currentIndex += 2 * verticesCount;
			} else {
				this._gl.drawArrays(this._gl.TRIANGLES, currentIndex, verticesCount);
				currentIndex += verticesCount;
			}
		}
		
		if(this.onafterdraw != null) {
			this.onafterdraw.call(this);
		}
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
