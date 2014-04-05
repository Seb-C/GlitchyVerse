/**
 * An model, formed by a set of meshes
 * @param World The World object
 * @param Array(Mesh)|Mesh Meshes of the model. Can also be a single mesh, which will be optimized.
 * @param WebGLTexture (optional) A mapped texture to apply to the entire model
 * @param boolean (optional) True to use an index array (gl.drawElements), false to use gl.drawArrays
 */
var Model = function(world, meshes, mappedTexture, drawTypeByElements) {
	this.gl = world.gl;
	this.world = world;
	this.meshes = meshes;
	this.meshGroups = null;
	
	this._cacheIsTransparency = null;
	
	this._verticesArray        = null;
	this._textureCoordArray    = null;
	this._verticesIndexArray   = null;
	this._vertexNormalsArray   = null;
	this._pickColorArray       = null;
	this._pickScreenColorArray = null;
	this._textureMappingArray  = null;
	
	this._verticesBuffer        = this.gl.createBuffer();
	this._vertexNormalsBuffer   = this.gl.createBuffer();
	this._textureCoordBuffer    = this.gl.createBuffer();
	this._verticesIndexBuffer   = this.gl.createBuffer();
	this._pickColorBuffer       = this.gl.createBuffer();
	this._pickScreenColorBuffer = this.gl.createBuffer();
	this._textureMappingBuffer  = this.gl.createBuffer();
	
	// Same order, same number of elements
	this._verticesCountToDraw = null;
	this._texturesToDraw      = null;
	
	this.mappedTexture = mappedTexture || null;
	
	this.drawTypeByElements = typeof(drawTypeByElements) == "undefined" || drawTypeByElements == null ? true : drawTypeByElements;
	
	this.onbeforedraw = null;
	this.onafterdraw  = null;
	
	this.regenerateCache();
};

/**
 * @return boolean True if at least one of the textures has transparency
 */
Model.prototype.isTransparency = function() {
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
Model.prototype.regenerateCache = function() {
	this._cacheIsTransparency = null;
	
	// When there is only one big mesh in the model, we just re-use the existing Arrays instead of copying it
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
	
	// Determining the number of vertices and triangles in the model
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
		
		if(mesh.texture === currentTexture) {
			currentVerticesCountForTexture += this.drawTypeByElements ? mesh.verticesCount : mesh.pointsCount;
		} else {
			pushCurrentTexture();
			currentTexture = mesh.texture;
			currentVerticesCountForTexture = this.drawTypeByElements ? mesh.verticesCount : mesh.pointsCount;
		}
	}
	pushCurrentTexture();
	
	this._regenerateBuffers();
};

/**
 * Regenerates the model buffers
 */
Model.prototype._regenerateBuffers = function() {
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._verticesBuffer);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this._verticesArray, this.gl.STATIC_DRAW);
	
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._vertexNormalsBuffer);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this._vertexNormalsArray, this.gl.STATIC_DRAW);
	
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._textureCoordBuffer);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this._textureCoordArray, this.gl.STATIC_DRAW);
	
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._pickColorBuffer);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this._pickColorArray, this.gl.STATIC_DRAW);
	
	this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._pickScreenColorBuffer);
	this.gl.bufferData(this.gl.ARRAY_BUFFER, this._pickScreenColorArray, this.gl.STATIC_DRAW);
	
	if(this.mappedTexture != null) {
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._textureMappingBuffer);
		this.gl.bufferData(this.gl.ARRAY_BUFFER, this._textureMappingArray, this.gl.STATIC_DRAW);
	}
	
	if(this.drawTypeByElements) {
		this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this._verticesIndexBuffer);
		this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this._verticesIndexArray, this.gl.STATIC_DRAW);
	}
};

// Static, to avoir binding multiple times the same buffers
Model.lastModelDrawn = null;

/**
 * Draws the model
 * @param Shader The shader to use to draw the model
 * @param int Draw mode, see World.prototype.DRAW_MODE_XXX
 */
Model.prototype.draw = function(shader, drawMode) {
	if(this.meshes instanceof Mesh || this.meshes.length > 0) {
		if(this.onbeforedraw != null) {
			this.onbeforedraw.call(this);
		}
		
		if(Model.lastModelDrawn != this) {
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._verticesBuffer);
			this.gl.vertexAttribPointer(shader.getVar("aVertexPosition"), 3, this.gl.FLOAT, false, 0, 0);
			
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._vertexNormalsBuffer);
			this.gl.vertexAttribPointer(shader.getVar("aVertexNormal"), 3, this.gl.FLOAT, false, 0, 0);
			
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._textureCoordBuffer);
			this.gl.vertexAttribPointer(shader.getVar("aTextureCoord"), 2, this.gl.FLOAT, false, 0, 0);
			
			if(this.mappedTexture == null) {
				// Setting the mapped texture with normal texture buffer, only because we have to set it
				this.gl.uniform1f(shader.getVar("uHasMappedTexture"), 0);
				
				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._textureCoordBuffer);
				this.gl.vertexAttribPointer(shader.getVar("aTextureMapping"), 2, this.gl.FLOAT, false, 0, 0);
			} else {
				this.gl.uniform1f(shader.getVar("uHasMappedTexture"), 1);
				
				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._textureMappingBuffer);
				this.gl.vertexAttribPointer(shader.getVar("aTextureMapping"), 2, this.gl.FLOAT, false, 0, 0);
				
				this.gl.activeTexture(this.gl.TEXTURE1);
				this.gl.bindTexture(this.gl.TEXTURE_2D, this.mappedTexture);
			}
			
			if(drawMode == this.world.DRAW_MODE_PICK_CONTENT) {
				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._pickColorBuffer);
			} else {
				this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._pickScreenColorBuffer);
			}
			this.gl.vertexAttribPointer(shader.getVar("aPickColor"), 3, this.gl.FLOAT, false, 0, 0);
			
			if(this.drawTypeByElements) {
				this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this._verticesIndexBuffer);		
			}
			
			this.gl.activeTexture(this.gl.TEXTURE0);
			
			Model.lastModelDrawn = this;
		}
		
		var currentIndex = 0;
		for(var i = 0 ; i < this._texturesToDraw.length ; i++) {
			var verticesCount = this._verticesCountToDraw[i];
			var texture       = this._texturesToDraw[i];
			
			this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
			
			if(this.drawTypeByElements) {
				this.gl.drawElements(this.gl.TRIANGLES, verticesCount, this.gl.UNSIGNED_SHORT, currentIndex);
				currentIndex += 2 * verticesCount;
			} else {
				this.gl.drawArrays(this.gl.TRIANGLES, currentIndex, verticesCount);
				currentIndex += verticesCount;
			}
		}
		
		if(this.onafterdraw != null) {
			this.onafterdraw.call(this);
		}
	}
};

/**
 * Loads and adds a list of meshes from an obj file. regenerateCache method MUST be called after that
 * @param String the name of the obj file (relatively to the objects directory), with it's extension
 * @param vec3 (optional) The scale to apply to the vertices
 */
Model.prototype.loadMeshesFromObj = function(fileName, scale) {
	var verticesScale = scale || [1, 1, 1];
	
	var fileContent = FILES.getText("www/objects/" + fileName);
	fileContent = fileContent.replace(/#.*$/gm, ""); // Removing comments
	fileContent = fileContent.replace(/\t/g, " "); // Replacing tabs with spaces
	fileContent = fileContent.replace(/(\r\n|\r|\n)+/g, "\n"); // Removing blank lines and using only \n
	fileContent = fileContent.replace(/^ +| +$/gm, ""); // Trim each line
	fileContent = fileContent.replace(/ +/g, " "); // Replacing multiple spaces by a single space
	var lines = fileContent.split("\n");
	
	var verticesList      = [];
	var normalsList       = [];
	var texturesPartsList = [];
	var currentMaterial = Materials.get("WHITE");
	var currentGroups = ["default"];
	for(var i = 0 ; i < lines.length ; i++) {
		var line = lines[i].split(" ");
		switch(line[0]) {
			case "mtllib":
				Materials.loadMtl(line[1]);
				break;
			case "v":
				verticesList.push(parseFloat(line[1]) * verticesScale[0]);
				verticesList.push(parseFloat(line[2]) * verticesScale[1]);
				verticesList.push(parseFloat(line[3]) * verticesScale[2]);
				break;
			case "vn":
				normalsList.push(parseFloat(line[1]));
				normalsList.push(parseFloat(line[2]));
				normalsList.push(parseFloat(line[3]));
				break;
			case "vt":
				texturesPartsList.push(parseFloat(line[1]));
				texturesPartsList.push(1 - parseFloat(line[2]));
				break;
			case "usemtl":
				currentMaterial = Materials.get(line[1]);
				break;
			case "f":
				var vertices     = [];
				var normals      = [];
				var textureParts = [];
				for(var j = 1 ; j < line.length ; j++) {
					var definition = line[j].split("/");
					
					var defIndex0 = parseInt(definition[0]);
					vertices.push(verticesList[(defIndex0 - 1) * 3    ]);
					vertices.push(verticesList[(defIndex0 - 1) * 3 + 1]);
					vertices.push(verticesList[(defIndex0 - 1) * 3 + 2]);
					
					if(definition[1] && definition[1] != "") {
						var defIndex1 = parseInt(definition[1]);
						textureParts.push(texturesPartsList[(defIndex1 - 1) * 2    ]);
						textureParts.push(texturesPartsList[(defIndex1 - 1) * 2 + 1]);
					}
					
					if(definition[2] && definition[2] != "") {
						var defIndex2 = parseInt(definition[2]);
						normals.push(normalsList[(defIndex2 - 1) * 3    ]);
						normals.push(normalsList[(defIndex2 - 1) * 3 + 1]);
						normals.push(normalsList[(defIndex2 - 1) * 3 + 2]);
					} else {
						normals.push(0);
						normals.push(0);
						normals.push(0);
					}
				}
				if(textureParts.length == 0) textureParts = null;
				
				var mesh = new Mesh(currentMaterial, vertices, normals, textureParts, currentGroups);
				this.meshes.push(mesh);
				
				break;
			case "g": 
				currentGroups = line.slice(1);
				break;
			default:
				//throw new Error("Instruction " + line[0] + " in obj file " + fileName + " is not supported.");
		}
	}
};