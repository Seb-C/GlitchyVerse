/**
 * A mesh. 
 * @param WebGLTexture The texture which will be applied to the mesh
 * @param Array() An array of vertex (3 points per vertex in the same line)
 * @param Array() containing the normals of the mesh (simple vec3), or normals for each vertice
 * @param Array (optional) Size to select on the texture (xBegin, yBegin, xEnd, yEnd)
 *                         or list of 2D points for each vertice (x1, y1, x2, y2, ...)
 * @param Array(String) (optional) Groups where the mesh is.
 * @param Uint16Array (optional) The vertices indexes array
 * @param Array(float) (optional) The texture mapping array (2D points)
 */
var Mesh = function(texture, vertices, normals, texturePart, groups, verticesIndex, textureMapping) {
	this.texture = texture;
	this.vertices = vertices;
	this.pointsCount = this.vertices.length / 3;
	this.normals = normals || null;
	this.texturePart = texturePart || null;
	this.pickColor = null;
	this.pickCallBack = null;
	this.isScreen = null;
	this.groups = groups || ["default"];
	this.verticesIndex = verticesIndex || null;
	
	// To apply a second texture on the mesh. Mapped texture is defined by the entity
	this.textureMapping = textureMapping || null;
	
	if(this.pointsCount < 3) {
		throw new Error("A Mesh must at least have 3 vertices.");
	} else if(this.pointsCount == 3) {
		this.verticesCount = 3;
	} else if(this.pointsCount % 4 != 0) {
		//throw new Error("Error : big meshes must have a number of vertices multiple of 4.");
	} else {
		this.verticesCount = this.pointsCount / 4 * 6;
	}
};

/**
 * Determines and returns the vertex indices for each triangle
 * @return Array The indexes of each triangle of the mesh
 */
Mesh.prototype.getVerticesIndexArray = function() {
	if(this.verticesIndex !== null) {
		return this.verticesIndex;
	} else if(this.pointsCount == 3) {
		return [0, 1, 2];
	} else {
		var result = [];
		for(var i = 0 ; i < this.pointsCount ; i += 4) {
			result.push(
				i, i + 1, i + 2,
				i, i + 2, i + 3
			);
		}
		return result;
	}
};

/**
 * Determines and returns the number of triangles
 * @return int The number of triangles
 */
Mesh.prototype.getTrianglesCount = function() {
	return this.verticesCount / 3;
};

/**
 * Determines and returns the texture Array.
 * @return Array Containing the texture coordinates to apply to each vertex of each triangle
 */
Mesh.prototype.getTextureArray = function() {
	if(this.texturePart == null) {
		// Trying to automatically calculate texture bounds
		if(this.pointsCount == 3) {
			var topLeft     = vec3.fromValues(this.vertices[0], this.vertices[1], this.vertices[2 ]);
			var topRight    = vec3.fromValues(this.vertices[3], this.vertices[4], this.vertices[5 ]);
			var bottomRight = vec3.fromValues(this.vertices[6], this.vertices[7], this.vertices[8 ]);
			
			var topDist   = this._calculateDistanceForTextureArray(topLeft,  topRight   );
			var rightDist = this._calculateDistanceForTextureArray(topRight, bottomRight);
			
			return [
				0,       0,
				topDist, 0,
				topDist, rightDist
			];
		} else if(this.pointsCount == 4) {
			var topLeft     = vec3.fromValues(this.vertices[0], this.vertices[1 ], this.vertices[2 ]);
			var topRight    = vec3.fromValues(this.vertices[3], this.vertices[4 ], this.vertices[5 ]);
			var bottomRight = vec3.fromValues(this.vertices[6], this.vertices[7 ], this.vertices[8 ]);
			var bottomLeft  = vec3.fromValues(this.vertices[9], this.vertices[10], this.vertices[11]);
			
			var topDist    = this._calculateDistanceForTextureArray(topLeft,    topRight   );
			var bottomDist = this._calculateDistanceForTextureArray(bottomLeft, bottomRight);
			var leftDist   = this._calculateDistanceForTextureArray(topLeft,    bottomLeft );
			var rightDist  = this._calculateDistanceForTextureArray(topRight,   bottomRight);
			
			return [
				0,          0,
				topDist,    0,
				bottomDist, rightDist,
				0,          leftDist
			];
		} else {
			throw new Error("Cannot automatically determine texture array with more than 4 vertices.");
		}
	} else {
		return this.texturePart;
	}
};

/**
 * Determines and returns the normals array for each triangle of the mesh
 * @return Array() containing the normals of each vertex of each triangle
 */
Mesh.prototype.getVertexNormalsArray = function() {
	if(!this.normals) {
		if(this.pointsCount <= 4) {
			var p1 = vec3.fromValues(this.vertices[0], this.vertices[1], this.vertices[2]);
			var p2 = vec3.fromValues(this.vertices[3], this.vertices[4], this.vertices[5]);
			var p3 = vec3.fromValues(this.vertices[6], this.vertices[7], this.vertices[8]);
			
			var u = vec3.create();
			var v = vec3.create();
			vec3.subtract(u, p3, p2);
			vec3.subtract(v, p1, p2);
			
			var normals = [
				u[0] * v[2] - u[2] * v[1],
				u[2] * v[0] - u[0] * v[2],
				u[0] * v[1] - u[1] * v[0]
			];
			// Reducing to a maximum of 1
			var total = Math.abs(normals[0]) + Math.abs(normals[1]) + Math.abs(normals[2]);
			normals[0] = normals[0] / total;
			normals[1] = normals[1] / total;
			normals[2] = normals[2] / total;
			
			this.normals = normals;
		} else {
			throw new Error("Cannot automatically determine normals with more than 4 vertices.");
		}
	}
	
	if(this.normals.length == 3) {
		var result = Array();
		for(var i = 0 ; i < this.pointsCount ; i++) {
			result = result.concat(this.normals);
		}
		return result;
	} else {
		return this.normals;
	}
};

/**
 * Returns an array containing the pick color
 * @return Array() the pick color (3 float for each vertex)
 */
Mesh.prototype.getVertexPickColorArray = function() {
	// Translating color ranges from 0 - 255 to 0.0 - 1.0
	var color;
	if(this.pickColor == null) {
		color = [0, 0, 0];
	} else {
		color = this.pickColor;
	}
	
	var result = Array();
	for(var i = 0 ; i < this.pointsCount ; i++) {
		result = result.concat(color);
	}
	return result;
};

/**
 * Returns an array containing the pick color for screen meshes
 * Red components varies with x. Green varies with y.
 * @return Array() the pick color (3 float for each vertex)
 */
Mesh.prototype.getVertexPickScreenColorArray = function() {
	if(this.pointsCount == 3) {
		return [
			0, 0, 0,
			1, 0, 0,
			1, 1, 0
		];
	} else {
		var result = [];
		for(var i = 0 ; i < this.pointsCount ; i += 4) {
			result.push(
				0, 0, 0,
				1, 0, 0,
				1, 1, 0,
				0, 1, 0
			);
		}
		return result;
	}
};

/**
 * Applies a rotation to the 3 axis of the Mesh (one axis after the other)
 * @param Array(3) Vector(3) The rotation to apply to each axis, as degrees.
 */
Mesh.prototype.rotate = function(rotation) {
	if(rotation[0] != 0) this.rotateX(rotation[0]);
	if(rotation[1] != 0) this.rotateY(rotation[1]);
	if(rotation[2] != 0) this.rotateZ(rotation[2]);
};

/**
 * Applies a rotation to the X axis of the Mesh
 * @param float The rotation to apply to X axis, as degrees.
 */
Mesh.prototype.rotateX = function(deg) {
	var rad = degToRad(-deg);
	var cos = Math.cos(rad);
	var sin = Math.sin(rad);
	
	for(var i = 0 ; i < this.vertices.length ; i += 3) {
		var i1 = this.vertices[i    ];
		var i2 = this.vertices[i + 1] * cos + this.vertices[i + 2] * sin;
		var i3 = this.vertices[i + 2] * cos - this.vertices[i + 1] * sin;
		
		this.vertices[i    ] = i1;
		this.vertices[i + 1] = i2;
		this.vertices[i + 2] = i3;
	}
	
	if(this.normals != null) {
		var rotation = quat.create();
		quat.rotateX(rotation, rotation, degToRad(deg));
		vec3.transformQuat(this.normals, this.normals, rotation);
	}
};

/**
 * Applies a rotation to the Y axis of the Mesh
 * @param float The rotation to apply to Y axis, as degrees.
 */
Mesh.prototype.rotateY = function(deg) {
	var rad = degToRad(-deg);
	var cos = Math.cos(rad);
	var sin = Math.sin(rad);
	
	for(var i = 0 ; i < this.vertices.length ; i += 3) {
		var i1 = this.vertices[i    ] * cos - this.vertices[i + 2] * sin;
		var i2 = this.vertices[i + 1];
		var i3 = this.vertices[i + 2] * cos + this.vertices[i    ] * sin;
		
		this.vertices[i    ] = i1;
		this.vertices[i + 1] = i2;
		this.vertices[i + 2] = i3;
	}
	
	if(this.normals != null) {
		var rotation = quat.create();
		quat.rotateY(rotation, rotation, degToRad(deg));
		vec3.transformQuat(this.normals, this.normals, rotation);
	}
};

/**
 * Applies a rotation to the Z axis of the Mesh
 * @param float The rotation to apply to Z axis, as degrees.
 */
Mesh.prototype.rotateZ = function(deg) {
	var rad = degToRad(-deg);
	var cos = Math.cos(rad);
	var sin = Math.sin(rad);
	
	var r = Array();
	for(var i = 0 ; i < this.vertices.length ; i += 3) {
		var i1 = this.vertices[i    ] * cos - this.vertices[i + 1] * sin;
		var i2 = this.vertices[i + 1] * cos + this.vertices[i    ] * sin;
		var i3 = this.vertices[i + 2];
		
		r[i    ] = i1;
		r[i + 1] = i2;
		r[i + 2] = i3;
	}
	
	if(this.normals != null) {
		var rotation = quat.create();
		quat.rotateZ(rotation, rotation, degToRad(deg));
		vec3.transformQuat(this.normals, this.normals, rotation);
	}
};

/**
 * Calculates the distance between two 3D points, useful to bound textures
 * @param vec3 The first point
 * @param vec3 The second point
 * @return float Thedistance between the two points (always positive)
 */
Mesh.prototype._calculateDistanceForTextureArray = function(p1, p2) {
	var distance = vec3.distance(p1, p2);
	distance = Math.abs(distance);
	return distance;
};
