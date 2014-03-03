/**
 * Defines an AABB HitBox
 * @param vec3 The minimum x, y and z coordinates of the hitbox, relative to position
 * @param vec3 The maximum x, y and z coordinates of the hitbox, relative to position
 */
var HitBoxDefinition = function(min, max) {
	this.min = min;
	this.max = max;
};

/**
 * Creates a hitbox definition from the vertices of a model
 * @param Model A model, which has already been initialized
 * @return HitBoxDefinition The created hitbox definition
 */
HitBoxDefinition.createFromModel = function(model) {
	var min = null;
	var max = null;
	for(var i = 0 ; i < model.meshes.length ; i++) {
		var vertices = model.meshes[i].vertices;
		for(var j = 0 ; j < vertices.length ; j += 3) {
			if(min == null && max == null) {
				min = vec3.fromValues(vertices[j], vertices[j + 1], vertices[j + 2]);
				max = vec3.fromValues(vertices[j], vertices[j + 1], vertices[j + 2]);
			} else {
				if(vertices[j    ] < min[0]) min[0] = vertices[j    ];
				if(vertices[j + 1] < min[1]) min[1] = vertices[j + 1];
				if(vertices[j + 2] < min[2]) min[2] = vertices[j + 2];
				if(vertices[j    ] > max[0]) max[0] = vertices[j    ];
				if(vertices[j + 1] > max[1]) max[1] = vertices[j + 1];
				if(vertices[j + 2] > max[2]) max[2] = vertices[j + 2];
			}
		}
	}
	
	return new HitBoxDefinition(min, max);
};