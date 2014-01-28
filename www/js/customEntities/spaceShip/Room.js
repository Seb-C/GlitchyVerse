/**
 * Creates a standard room. See Entity for other parameters
 * @param {definition} Object Containing the definition of the room, with attributes : 
 *               - unitSize : Array(3) Vector(3), size of each unit (the smallest possible room size)
 *               - edgeSize : The side of the room edges
 *               - position : Position in the SpaceShip (room units)
 *               - size     : Array(3) Vector(3) or integers, size of the room in unitSize
 *               - gaps     : An object defining the gaps (for windows or doors for example) of each face.
 *                            Keys of this objects can be : front, back, left, right, top or bottom (all relative to the origin rotation).
 *                            Values are are Array(Array(2)), a list of Vector(2), position of gaps. Positions are defined with 2D coordinates 
 *                            (beginning with [0, 0], which is the top left point), saw from the inside of the room.
 */
CustomEntities.Room = function(world, position, rotation, definition, state) {
	// Loading required textures
	Materials.loadMtl("materials/main.mtl");
	
	this.definition = definition;
	
	var meshes = this._regenerateMeshes();
	this.parent(world, new Model(world, meshes), position, rotation, state);
	var distance = Math.max.apply(Math, [
		this.definition.unitSize[0] * this.definition.size[0] - (this.definition.edgeSize / 2),
		this.definition.unitSize[1] * this.definition.size[1] - (this.definition.edgeSize / 2),
		this.definition.unitSize[2] * this.definition.size[2] - (this.definition.edgeSize / 2)
	]);
	this.lights.push(new Light([position[0], position[1], position[2]], [1, 1, 1], distance, true, 0.8));
	
	world.add(this.lights);
	this.modelName = "Room";
};
CustomEntities.Room.extend(Entity);

/**
 * Regenerates meshes, based on the known definition and the gaps listed in the SpaceShip object.
 * Also regenerates buffers and caches
 */
CustomEntities.Room.prototype.regenerate = function() {
	this.model.meshes = this._regenerateMeshes();
	this.model.regenerateCache();
};

/**
 * Regenerates all meshes, based on the known definition and the gaps listed in the SpaceShip object.
 * @return Object containing meshes list
 */
CustomEntities.Room.prototype._regenerateMeshes = function() {
	var unitSize = this.definition.unitSize;
	
	var material_METAL_BOLT     = Materials.get("METAL_BOLT");
	var material_METAL_WALL     = Materials.get("METAL_WALL");
	var material_LINO_TILE      = Materials.get("LINO_TILE");
	var material_LIGHT_AND_CLIM = Materials.get("LIGHT_AND_CLIM");
	
	var gaps = {};
	for(var k in this.definition.spaceShip.gapBuildings) {
		var gap = this.definition.spaceShip.gapBuildings[k];
		
		var side = null;
		var pos = null;
		if(gap.isLeftOrRight) {
			// Checking that Y and Z points are in this room
			if(
				   gap.position[1] >= this.definition.position[1] && gap.position[1] < this.definition.position[1] + this.definition.size[1]
				&& gap.position[2] >= this.definition.position[2] && gap.position[2] < this.definition.position[2] + this.definition.size[2]
			) {
				if(Math.ceil(gap.position[0]) == this.definition.position[0]) {
					side = "left";
					pos = [
						(this.definition.position[2] + this.definition.size[2] - 1) - gap.position[2],
						(this.definition.position[1] + this.definition.size[1] - 1) - gap.position[1]
					];
				} else if(Math.floor(gap.position[0]) == this.definition.position[0] + this.definition.size[0] - 1) {
					side = "right";
					pos = [
						gap.position[2] - this.definition.position[2],
						(this.definition.position[1] + this.definition.size[1] - 1) - gap.position[1]
					];
				}
			}
		} else {
			// Checking that X and Y points are in this room
			if(
				   gap.position[0] >= this.definition.position[0] && gap.position[0] < this.definition.position[0] + this.definition.size[0]
				&& gap.position[1] >= this.definition.position[1] && gap.position[1] < this.definition.position[1] + this.definition.size[1]
			) {
				if(Math.ceil(gap.position[2]) == this.definition.position[2]) {
					side = "back";
					pos = [
						gap.position[0] - this.definition.position[0],
						(this.definition.position[1] + this.definition.size[1] - 1) - gap.position[1]
					];
				} else if(Math.floor(gap.position[2]) == this.definition.position[2] + this.definition.size[2] - 1) {
					side = "front";
					pos = [
						(this.definition.position[0] + this.definition.size[0] - 1) - gap.position[0],
						(this.definition.position[1] + this.definition.size[1] - 1) - gap.position[1]
					];
				}
			}
		}
		
		if(side != null) {
			if(!gaps[side]) gaps[side] = Array();
			gaps[side].push(pos);
		}
	}
	
	// Calculating rectangles to create at each face, to fill the surface without the gaps
	var surfaces = {
		front  : [{position: [0, 0], size: [this.definition.size[0], this.definition.size[1]]}],
		back   : [{position: [0, 0], size: [this.definition.size[0], this.definition.size[1]]}],
		left   : [{position: [0, 0], size: [this.definition.size[2], this.definition.size[1]]}],
		right  : [{position: [0, 0], size: [this.definition.size[2], this.definition.size[1]]}]//,
		//top    : [{position: [0, 0], size: [this.definition.size[0], this.definition.size[2]]}],
		//bottom : [{position: [0, 0], size: [this.definition.size[0], this.definition.size[2]]}]
	};
	
	if(gaps.front ) surfaces.front  = splitSurfaceNotOptimized([this.definition.size[0], this.definition.size[1]], gaps.front );
	if(gaps.back  ) surfaces.back   = splitSurfaceNotOptimized([this.definition.size[0], this.definition.size[1]], gaps.back  );
	if(gaps.left  ) surfaces.left   = splitSurfaceNotOptimized([this.definition.size[2], this.definition.size[1]], gaps.left  );
	if(gaps.right ) surfaces.right  = splitSurfaceNotOptimized([this.definition.size[2], this.definition.size[1]], gaps.right );
	//if(gaps.top   ) surfaces.top    = splitSurfaceNotOptimized([this.definition.size[0], this.definition.size[2]], gaps.top   );
	//if(gaps.bottom) surfaces.bottom = splitSurfaceNotOptimized([this.definition.size[0], this.definition.size[2]], gaps.bottom);
	
	// Misc dimensions
	var edgeSize = this.definition.edgeSize;
	var lightAndClimEdgeSize = this.definition.lightAndClimEdgeSize;
	
	// Walls positions
	var x2 = unitSize[0] * this.definition.size[0] / 2;
	var y2 = unitSize[1] * this.definition.size[1] / 2;
	var z2 = unitSize[2] * this.definition.size[2] / 2;
	var x1 = x2 - edgeSize;
	var y1 = y2 - edgeSize;
	var z1 = z2 - edgeSize;
	
	// Defining meshes
	var meshes = [];
	
	// Inner & outer walls
	var self = this;
	var createFace = function(faceName, unitSize, size, coord1, coord2, yRotation) {
		// Meshes for faces parts where there are not gaps
		for(var i = 0 ; i < surfaces[faceName].length ; i++) {
			var s = surfaces[faceName][i];
			
			// Calculating texture bounds
			var textureBounds = [
				0,
				0,
				s.size[0] * unitSize[0],
				s.size[1] * unitSize[1]
			];
			if(s.position[0] == 0) textureBounds[0] += edgeSize;
			if(s.position[1] == 0) textureBounds[1] += edgeSize;
			if(s.position[0] + s.size[0] == size[0]) textureBounds[2] -= edgeSize;
			if(s.position[1] + s.size[1] == size[1]) textureBounds[3] -= edgeSize;
			if(s.position[1] % 2 == 1) {
				textureBounds[1] += 0.5;
				textureBounds[3] += 0.5;
			}
			
			textureBounds = [
				textureBounds[0], textureBounds[1],
				textureBounds[2], textureBounds[1],
				textureBounds[2], textureBounds[3],
				textureBounds[0], textureBounds[3]
			]
			
			// Sides additions
			var leftAdd   = s.position[0] == 0 ? edgeSize : 0;
			var topAdd    = s.position[1] == 0 ? edgeSize : 0;
			var rightAdd  = s.position[0] + s.size[0] == size[0] ? edgeSize : 0;
			var bottomAdd = s.position[1] + s.size[1] == size[1] ? edgeSize : 0;
			
			// Exterior (face), hull
			var hull = new Mesh(material_METAL_BOLT, [
				coord2[0] -  s.position[0]              * unitSize[0] - leftAdd,  coord2[1] -  s.position[1]              * unitSize[1] - topAdd,    coord2[2],
				coord2[0] - (s.position[0] + s.size[0]) * unitSize[0] + rightAdd, coord2[1] -  s.position[1]              * unitSize[1] - topAdd,    coord2[2],
				coord2[0] - (s.position[0] + s.size[0]) * unitSize[0] + rightAdd, coord2[1] - (s.position[1] + s.size[1]) * unitSize[1] + bottomAdd, coord2[2],
				coord2[0] -  s.position[0]              * unitSize[0] - leftAdd,  coord2[1] - (s.position[1] + s.size[1]) * unitSize[1] + bottomAdd, coord2[2]
			], [0, 0, 1], textureBounds);
			
			// Interior (Wall)
			var wall = new Mesh(material_METAL_WALL, [
				coord2[0] -  s.position[0]              * unitSize[0] - leftAdd,  coord2[1] -  s.position[1]              * unitSize[1] - topAdd,    coord1[2],
				coord2[0] - (s.position[0] + s.size[0]) * unitSize[0] + rightAdd, coord2[1] -  s.position[1]              * unitSize[1] - topAdd,    coord1[2],
				coord2[0] - (s.position[0] + s.size[0]) * unitSize[0] + rightAdd, coord2[1] - (s.position[1] + s.size[1]) * unitSize[1] + bottomAdd, coord1[2],
				coord2[0] -  s.position[0]              * unitSize[0] - leftAdd,  coord2[1] - (s.position[1] + s.size[1]) * unitSize[1] + bottomAdd, coord1[2]
			], [0, 0, -1], textureBounds);
			
			meshes.push(hull);
			meshes.push(wall);
			
			if(yRotation && yRotation != 0) {
				hull.rotateY(yRotation);
				wall.rotateY(yRotation);
			}
		}
		
		// For parts where there are gaps, we have to draw just the frame
		if(gaps[faceName]) {
			for(var i = 0 ; i < gaps[faceName].length ; i++) {
				var s = gaps[faceName][i];
				
				// Calculating texture bounds
				var textureBounds = [
					0,
					0,
					unitSize[0],
					unitSize[1]
				];
				if(s[0]     ==      0 ) textureBounds[0] += edgeSize;
				if(s[1]     ==      0 ) textureBounds[1] += edgeSize;
				if(s[0] + 1 == size[0]) textureBounds[2] -= edgeSize;
				if(s[1] + 1 == size[1]) textureBounds[3] -= edgeSize;
				if(s[1] % 2 == 1) {
					textureBounds[1] += 0.5;
					textureBounds[3] += 0.5;
				}
				
				// Sides addition
				var leftAdd   = s[0] == 0 ? -edgeSize : 0;
				var topAdd    = s[1] == 0 ? -edgeSize : 0;
				var rightAdd  = s[0] + 1 == size[0] ? edgeSize : 0;
				var bottomAdd = s[1] + 1 == size[1] ? edgeSize : 0;
				
				if(s[1] > 0) {
					// Top
					var texture = [
						textureBounds[0], textureBounds[1],
						textureBounds[2], textureBounds[1],
						textureBounds[2], textureBounds[1] + edgeSize,
						textureBounds[0], textureBounds[1] + edgeSize
					];
					
					var hull = new Mesh(material_METAL_BOLT, [
						coord2[0] -  s[0]      * unitSize[0] + leftAdd,  coord2[1] - s[1] * unitSize[1],            coord2[2],
						coord2[0] - (s[0] + 1) * unitSize[0] + rightAdd, coord2[1] - s[1] * unitSize[1],            coord2[2],
						coord2[0] - (s[0] + 1) * unitSize[0] + rightAdd, coord2[1] - s[1] * unitSize[1] - edgeSize, coord2[2],
						coord2[0] -  s[0]      * unitSize[0] + leftAdd,  coord2[1] - s[1] * unitSize[1] - edgeSize, coord2[2]
					], [0, 0, 1], texture);
					var wall = new Mesh(material_METAL_WALL, [
						coord2[0] -  s[0]      * unitSize[0] + leftAdd,  coord2[1] - s[1] * unitSize[1],            coord1[2],
						coord2[0] - (s[0] + 1) * unitSize[0] + rightAdd, coord2[1] - s[1] * unitSize[1],            coord1[2],
						coord2[0] - (s[0] + 1) * unitSize[0] + rightAdd, coord2[1] - s[1] * unitSize[1] - edgeSize, coord1[2],
						coord2[0] -  s[0]      * unitSize[0] + leftAdd,  coord2[1] - s[1] * unitSize[1] - edgeSize, coord1[2]
					], [0, 0, -1], texture);
					
					meshes.push(hull);
					meshes.push(wall);
					
					if(yRotation && yRotation != 0) {
						hull.rotateY(yRotation);
						wall.rotateY(yRotation);
					}
				}
				if(s[1] < size[1] - 1) {
					// Bottom
					var texture = [
						textureBounds[0], textureBounds[3] + edgeSize,
						textureBounds[2], textureBounds[3] + edgeSize,
						textureBounds[2], textureBounds[3],
						textureBounds[0], textureBounds[3]
					];
					
					var hull = new Mesh(material_METAL_BOLT, [
						coord2[0] -  s[0]      * unitSize[0] + leftAdd,  coord2[1] - (s[1] + 1) * unitSize[1] + edgeSize, coord2[2],
						coord2[0] - (s[0] + 1) * unitSize[0] + rightAdd, coord2[1] - (s[1] + 1) * unitSize[1] + edgeSize, coord2[2],
						coord2[0] - (s[0] + 1) * unitSize[0] + rightAdd, coord2[1] - (s[1] + 1) * unitSize[1],            coord2[2],
						coord2[0] -  s[0]      * unitSize[0] + leftAdd,  coord2[1] - (s[1] + 1) * unitSize[1],            coord2[2]
					], [0, 0, 1], texture);
					var wall = new Mesh(material_METAL_WALL, [
						coord2[0] -  s[0]      * unitSize[0] + leftAdd,  coord2[1] - (s[1] + 1) * unitSize[1] + edgeSize, coord1[2],
						coord2[0] - (s[0] + 1) * unitSize[0] + rightAdd, coord2[1] - (s[1] + 1) * unitSize[1] + edgeSize, coord1[2],
						coord2[0] - (s[0] + 1) * unitSize[0] + rightAdd, coord2[1] - (s[1] + 1) * unitSize[1],            coord1[2],
						coord2[0] -  s[0]      * unitSize[0] + leftAdd,  coord2[1] - (s[1] + 1) * unitSize[1],            coord1[2]
					], [0, 0, -1], texture);
					
					meshes.push(hull);
					meshes.push(wall);
					
					if(yRotation && yRotation != 0) {
						hull.rotateY(yRotation);
						wall.rotateY(yRotation);
					}
				}
				if(s[0] > 0) {
					// Left
					var texture = [
						textureBounds[0],            textureBounds[1],
						textureBounds[0] + edgeSize, textureBounds[1],
						textureBounds[0] + edgeSize, textureBounds[3],
						textureBounds[0],            textureBounds[3]
					];
					
					var hull = new Mesh(material_METAL_BOLT, [
						coord2[0] - s[0] * unitSize[0],            coord2[1] -  s[1]      * unitSize[1] + topAdd,    coord2[2],
						coord2[0] - s[0] * unitSize[0] - edgeSize, coord2[1] -  s[1]      * unitSize[1] + topAdd,    coord2[2],
						coord2[0] - s[0] * unitSize[0] - edgeSize, coord2[1] - (s[1] + 1) * unitSize[1] + bottomAdd, coord2[2],
						coord2[0] - s[0] * unitSize[0],            coord2[1] - (s[1] + 1) * unitSize[1] + bottomAdd, coord2[2]
					], [0, 0, 1], texture);
					var wall = new Mesh(material_METAL_WALL, [
						coord2[0] - s[0] * unitSize[0],            coord2[1] -  s[1]      * unitSize[1] + topAdd,    coord1[2],
						coord2[0] - s[0] * unitSize[0] - edgeSize, coord2[1] -  s[1]      * unitSize[1] + topAdd,    coord1[2],
						coord2[0] - s[0] * unitSize[0] - edgeSize, coord2[1] - (s[1] + 1) * unitSize[1] + bottomAdd, coord1[2],
						coord2[0] - s[0] * unitSize[0],            coord2[1] - (s[1] + 1) * unitSize[1] + bottomAdd, coord1[2]
					], [0, 0, -1], texture);
					
					meshes.push(hull);
					meshes.push(wall);
					
					if(yRotation && yRotation != 0) {
						hull.rotateY(yRotation);
						wall.rotateY(yRotation);
					}
				}
				if(s[0] < size[0] - 1) {
					// Right
					var texture = [
						textureBounds[2] - edgeSize, textureBounds[1],
						textureBounds[2],            textureBounds[1],
						textureBounds[2],            textureBounds[3],
						textureBounds[2] - edgeSize, textureBounds[3]
					];
					
					var hull = new Mesh(material_METAL_BOLT, [
						coord2[0] - (s[0] + 1) * unitSize[0] + edgeSize, coord2[1] -  s[1]      * unitSize[1] + topAdd,    coord2[2],
						coord2[0] - (s[0] + 1) * unitSize[0],            coord2[1] -  s[1]      * unitSize[1] + topAdd,    coord2[2],
						coord2[0] - (s[0] + 1) * unitSize[0],            coord2[1] - (s[1] + 1) * unitSize[1] + bottomAdd, coord2[2],
						coord2[0] - (s[0] + 1) * unitSize[0] + edgeSize, coord2[1] - (s[1] + 1) * unitSize[1] + bottomAdd, coord2[2]
					], [0, 0, 1], texture);
					var wall = new Mesh(material_METAL_WALL, [
						coord2[0] - (s[0] + 1) * unitSize[0] + edgeSize, coord2[1] -  s[1]      * unitSize[1] + topAdd,    coord1[2],
						coord2[0] - (s[0] + 1) * unitSize[0],            coord2[1] -  s[1]      * unitSize[1] + topAdd,    coord1[2],
						coord2[0] - (s[0] + 1) * unitSize[0],            coord2[1] - (s[1] + 1) * unitSize[1] + bottomAdd, coord1[2],
						coord2[0] - (s[0] + 1) * unitSize[0] + edgeSize, coord2[1] - (s[1] + 1) * unitSize[1] + bottomAdd, coord1[2]
					], [0, 0, -1], texture);
					
					meshes.push(hull);
					meshes.push(wall);
					
					if(yRotation && yRotation != 0) {
						hull.rotateY(yRotation);
						wall.rotateY(yRotation);
					}
				}
			}
		}
	};
	
	// Creating faces
	createFace("front", [unitSize[0], unitSize[1]], [this.definition.size[0], this.definition.size[1]], [x1, y1, z1], [x2, y2, z2], 0  );
	createFace("right", [unitSize[2], unitSize[1]], [this.definition.size[2], this.definition.size[1]], [z1, y1, x1], [z2, y2, x2], 90 );
	createFace("back",  [unitSize[0], unitSize[1]], [this.definition.size[0], this.definition.size[1]], [x1, y1, z1], [x2, y2, z2], 180);
	createFace("left",  [unitSize[2], unitSize[1]], [this.definition.size[2], this.definition.size[1]], [z1, y1, x1], [z2, y2, x2], 270);
	
	// Outer top and bottom, Inner ground and ceil
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x1, y2,  z1,
		 x1, y2,  z1,
		 x1, y2, -z1,
		-x1, y2, -z1
	], [0, 1, 0])); // Out top
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x1, -y2, -z1,
		 x1, -y2, -z1,
		 x1, -y2,  z1,
		-x1, -y2,  z1
	], [0, -1, 0])); // Out bottom
	meshes.push(new Mesh(material_LINO_TILE, [
		-x1, -y1,  z1,
		 x1, -y1,  z1,
		 x1, -y1, -z1,
		-x1, -y1, -z1
	], [0, 1, 0])); // Ground
	meshes.push(new Mesh(material_METAL_WALL, [
		-x1+lightAndClimEdgeSize, y1, -z1+lightAndClimEdgeSize,
		 x1-lightAndClimEdgeSize, y1, -z1+lightAndClimEdgeSize,
		 x1-lightAndClimEdgeSize, y1,  z1-lightAndClimEdgeSize,
		-x1+lightAndClimEdgeSize, y1,  z1-lightAndClimEdgeSize
	], [0, -1, 0])); // Ceil
	
	// Outer diagonals top
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x1,  y2,  z1,
		 x1,  y2,  z1,
		 x1,  y1,  z2,
		-x1,  y1,  z2
	], [0, 1, 1])); // Front top
	meshes.push(new Mesh(material_METAL_BOLT, [
		 x1,  y2,  z1,
		 x1,  y2, -z1,
		 x2,  y1, -z1,
		 x2,  y1,  z1
	], [1, 1, 0])); // Right top
	meshes.push(new Mesh(material_METAL_BOLT, [
		 x1,  y2, -z1,
		-x1,  y2, -z1,
		-x1,  y1, -z2,
		 x1,  y1, -z2
	], [0, 1, -1])); // Back top
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x1,  y2, -z1,
		-x1,  y2,  z1,
		-x2,  y1,  z1,
		-x2,  y1, -z1
	], [-1, 1, 0])); // Left top
	
	// Outer diagonals sides
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x2, -y1,  z1,
		-x2,  y1,  z1,
		-x1,  y1,  z2,
		-x1, -y1,  z2
	], [-1, 0, 1])); // Front left
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x1, -y1, -z2,
		-x1,  y1, -z2,
		-x2,  y1, -z1,
		-x2, -y1, -z1
	], [-1, 0, -1])); // Left back
	meshes.push(new Mesh(material_METAL_BOLT, [
		 x2, -y1, -z1,
		 x2,  y1, -z1,
		 x1,  y1, -z2,
		 x1, -y1, -z2
	], [1, 0, -1])); // Back right
	meshes.push(new Mesh(material_METAL_BOLT, [
		 x1, -y1,  z2,
		 x1,  y1,  z2,
		 x2,  y1,  z1,
		 x2, -y1,  z1
	], [1, 0, 1])); // Right front
	
	// Outer diagonals bottom
	meshes.push(new Mesh(material_METAL_BOLT, [
		 x1, -y2,  z1,
		-x1, -y2,  z1,
		-x1, -y1,  z2,
		 x1, -y1,  z2
	], [0, -1, 1])); // Front bottom
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x1, -y2,  z1,
		-x1, -y2, -z1,
		-x2, -y1, -z1,
		-x2, -y1,  z1
	], [-1, -1, 0])); // Left bottom
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x1, -y2, -z1,
		 x1, -y2, -z1,
		 x1, -y1, -z2,
		-x1, -y1, -z2
	], [0, -1, -1])); // Back bottom
	meshes.push(new Mesh(material_METAL_BOLT, [
		 x1, -y2, -z1,
		 x1, -y2,  z1,
		 x2, -y1,  z1,
		 x2, -y1, -z1
	], [1, -1, 0])); // Right bottom
	
	// Outer corners top
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x2,  y1,  z1,
		-x1,  y2,  z1,
		-x1,  y1,  z2
	], [-1, 1, 1])); // Front left top
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x1,  y1, -z2,
		-x1,  y2, -z1,
		-x2,  y1, -z1
	], [-1, 1, -1])); // Left back top
	meshes.push(new Mesh(material_METAL_BOLT, [
		 x2,  y1, -z1,
		 x1,  y2, -z1,
		 x1,  y1, -z2
	], [1, 1, -1])); // Back right top
	meshes.push(new Mesh(material_METAL_BOLT, [
		 x1,  y1,  z2,
		 x1,  y2,  z1,
		 x2,  y1,  z1
	], [1, 1, 1])); // Right front top
	
	// Outer corners bottom
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x1, -y2,  z1,
		-x2, -y1,  z1,
		-x1, -y1,  z2
	], [-1, -1, 1])); // Front left bottom
	meshes.push(new Mesh(material_METAL_BOLT, [
		-x1, -y2, -z1,
		-x1, -y1, -z2,
		-x2, -y1, -z1
	], [-1, -1, -1])); // Left back bottom
	meshes.push(new Mesh(material_METAL_BOLT, [
		 x1, -y2, -z1,
		 x2, -y1, -z1,
		 x1, -y1, -z2
	], [1, -1, -1])); // Back right bottom
	meshes.push(new Mesh(material_METAL_BOLT, [
		 x1, -y2,  z1,
		 x1, -y1,  z2,
		 x2, -y1,  z1
	], [1, -1, 1])); // Right front bottom
	
	// Inner lights + clims
	meshes.push(new Mesh(material_LIGHT_AND_CLIM, [
		-x1+lightAndClimEdgeSize,  y1,                       z1-lightAndClimEdgeSize,
		-x1+lightAndClimEdgeSize,  y1,                      -z1+lightAndClimEdgeSize,
		-x1,                       y1-lightAndClimEdgeSize, -z1,
		-x1,                       y1-lightAndClimEdgeSize,  z1
	], [1, -1, 0])); // Left
	meshes.push(new Mesh(material_LIGHT_AND_CLIM, [
		 x1-lightAndClimEdgeSize,  y1,                      -z1+lightAndClimEdgeSize,
		 x1-lightAndClimEdgeSize,  y1,                       z1-lightAndClimEdgeSize,
		 x1,                       y1-lightAndClimEdgeSize,  z1,
		 x1,                       y1-lightAndClimEdgeSize, -z1
	], [-1, -1, 0])); // Right
	meshes.push(new Mesh(material_LIGHT_AND_CLIM, [
		 x1-lightAndClimEdgeSize,  y1,                       z1-lightAndClimEdgeSize,
		-x1+lightAndClimEdgeSize,  y1,                       z1-lightAndClimEdgeSize,
		-x1,                       y1-lightAndClimEdgeSize,  z1,
		 x1,                       y1-lightAndClimEdgeSize,  z1
	], [0, -1, -1])); // Front
	meshes.push(new Mesh(material_LIGHT_AND_CLIM, [
		 x1-lightAndClimEdgeSize,  y1,                      -z1+lightAndClimEdgeSize,
		-x1+lightAndClimEdgeSize,  y1,                      -z1+lightAndClimEdgeSize,
		-x1,                       y1-lightAndClimEdgeSize, -z1,
		 x1,                       y1-lightAndClimEdgeSize, -z1
	], [0, -1, 1])); // Back
	
	return meshes;
};