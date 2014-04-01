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
Building.builders.Room = function(building, state) {
	// Loading required textures
	Materials.loadMtl("materials/main.mtl");
	
	// TODO use obj files ?
	
	/**
	 * Regenerates all meshes, based on the known definition and the gaps listed in the SpaceShip object.
	 */
	building.regenerateMeshes = function() {
		if(building.hitBoxes.length > 0) {
			building.spaceShip.physics.remove(building.hitBoxes);
			building.hitBoxes = [];
		}
		
		var unitSize = building.spaceShip.roomUnitSize;
		
		var material_METAL_BOLT = Materials.get("METAL_BOLT");
		var material_METAL_WALL = Materials.get("METAL_WALL");
		var material_LINO_TILE  = Materials.get("LINO_TILE");
		
		var gaps = {
			front: [],
			back : [],
			left : [],
			right: []
		};
		for(var k in building.spaceShip.gapBuildings) {
			var gap = building.spaceShip.gapBuildings[k];
			
			var side = null;
			var pos = null;
			if(gap.isLeftOrRight) {
				// Checking that Y and Z points are in this room
				if(
					   gap.position[1] >= building.gridPosition[1] && gap.position[1] < building.gridPosition[1] + building.gridSize[1]
					&& gap.position[2] >= building.gridPosition[2] && gap.position[2] < building.gridPosition[2] + building.gridSize[2]
				) {
					if(Math.ceil(gap.position[0]) == building.gridPosition[0]) {
						side = "left";
						pos = [
							(building.gridPosition[2] + building.gridSize[2] - 1) - gap.position[2],
							(building.gridPosition[1] + building.gridSize[1] - 1) - gap.position[1]
						];
					} else if(Math.floor(gap.position[0]) == building.gridPosition[0] + building.gridSize[0] - 1) {
						side = "right";
						pos = [
							gap.position[2] - building.gridPosition[2],
							(building.gridPosition[1] + building.gridSize[1] - 1) - gap.position[1]
						];
					}
				}
			} else {
				// Checking that X and Y points are in this room
				if(
					   gap.position[0] >= building.gridPosition[0] && gap.position[0] < building.gridPosition[0] + building.gridSize[0]
					&& gap.position[1] >= building.gridPosition[1] && gap.position[1] < building.gridPosition[1] + building.gridSize[1]
				) {
					if(Math.ceil(gap.position[2]) == building.gridPosition[2]) {
						side = "back";
						pos = [
							gap.position[0] - building.gridPosition[0],
							(building.gridPosition[1] + building.gridSize[1] - 1) - gap.position[1]
						];
					} else if(Math.floor(gap.position[2]) == building.gridPosition[2] + building.gridSize[2] - 1) {
						side = "front";
						pos = [
							(building.gridPosition[0] + building.gridSize[0] - 1) - gap.position[0],
							(building.gridPosition[1] + building.gridSize[1] - 1) - gap.position[1]
						];
					}
				}
			}
			
			if(side != null) {
				if(!gaps[side]) gaps[side] = Array();
				gaps[side].push(pos);
			}
		}
		
		// Misc dimensions
		var edgeSize = building.spaceShip.edgeSize;
		
		// Walls positions
		var x2 = unitSize[0] * building.gridSize[0] / 2;
		var y2 = unitSize[1] * building.gridSize[1] / 2;
		var z2 = unitSize[2] * building.gridSize[2] / 2;
		var x1 = x2 - edgeSize;
		var y1 = y2 - edgeSize;
		var z1 = z2 - edgeSize;
		
		// Defining meshes
		var meshes = [];
		
		// Inner & outer walls
		var self = this;
		var createFace = function(faceGaps, unitWidth, unitHeight, coord1, coord2, yRotation, width, height) {
			for(var x = 0 ; x < width ; x++) {
				for(var y = 0 ; y < height ; y++) {
					var isGap = false;
					for(var i = 0 ; i < faceGaps.length ; i++) {
						if(faceGaps[i][0] == x && faceGaps[i][1] == y) {
							isGap = true;
							break;
						}
					}
					
					if(isGap) {
						// For parts where there are gaps, we have to draw just the frame
						for(var i = 0 ; i < faceGaps.length ; i++) { // TODO remove this loop ?
							var s = faceGaps[i];
							
							// Calculating texture bounds
							var textureBounds = [
								0,
								0,
								unitWidth,
								unitHeight
							];
							if(s[0]     ==      0 ) textureBounds[0] += edgeSize;
							if(s[1]     ==      0 ) textureBounds[1] += edgeSize;
							if(s[0] + 1 == width ) textureBounds[2] -= edgeSize;
							if(s[1] + 1 == height) textureBounds[3] -= edgeSize;
							if(s[1] % 2 == 1) {
								textureBounds[1] += 0.5;
								textureBounds[3] += 0.5;
							}
							
							// Sides addition
							var leftAdd   = s[0] == 0 ? -edgeSize : 0;
							var topAdd    = s[1] == 0 ? -edgeSize : 0;
							var rightAdd  = s[0] + 1 == width  ? edgeSize : 0;
							var bottomAdd = s[1] + 1 == height ? edgeSize : 0;
							
							if(s[1] > 0) {
								// Top
								var texture = [
									textureBounds[0], textureBounds[1],
									textureBounds[2], textureBounds[1],
									textureBounds[2], textureBounds[1] + edgeSize,
									textureBounds[0], textureBounds[1] + edgeSize
								];
								
								var hull = new Mesh(material_METAL_BOLT, [
									coord2[0] -  s[0]      * unitWidth + leftAdd,  coord2[1] - s[1] * unitHeight,            coord2[2],
									coord2[0] - (s[0] + 1) * unitWidth + rightAdd, coord2[1] - s[1] * unitHeight,            coord2[2],
									coord2[0] - (s[0] + 1) * unitWidth + rightAdd, coord2[1] - s[1] * unitHeight - edgeSize, coord2[2],
									coord2[0] -  s[0]      * unitWidth + leftAdd,  coord2[1] - s[1] * unitHeight - edgeSize, coord2[2]
								], [0, 0, 1], texture);
								var wall = new Mesh(material_METAL_WALL, [
									coord2[0] -  s[0]      * unitWidth + leftAdd,  coord2[1] - s[1] * unitHeight,            coord1[2],
									coord2[0] - (s[0] + 1) * unitWidth + rightAdd, coord2[1] - s[1] * unitHeight,            coord1[2],
									coord2[0] - (s[0] + 1) * unitWidth + rightAdd, coord2[1] - s[1] * unitHeight - edgeSize, coord1[2],
									coord2[0] -  s[0]      * unitWidth + leftAdd,  coord2[1] - s[1] * unitHeight - edgeSize, coord1[2]
								], [0, 0, -1], texture);
								
								meshes.push(hull);
								meshes.push(wall);
								
								if(yRotation && yRotation != 0) {
									hull.rotateY(yRotation);
									wall.rotateY(yRotation);
								}
							}
							if(s[1] < height - 1) {
								// Bottom
								var texture = [
									textureBounds[0], textureBounds[3] + edgeSize,
									textureBounds[2], textureBounds[3] + edgeSize,
									textureBounds[2], textureBounds[3],
									textureBounds[0], textureBounds[3]
								];
								
								var hull = new Mesh(material_METAL_BOLT, [
									coord2[0] -  s[0]      * unitWidth + leftAdd,  coord2[1] - (s[1] + 1) * unitHeight + edgeSize, coord2[2],
									coord2[0] - (s[0] + 1) * unitWidth + rightAdd, coord2[1] - (s[1] + 1) * unitHeight + edgeSize, coord2[2],
									coord2[0] - (s[0] + 1) * unitWidth + rightAdd, coord2[1] - (s[1] + 1) * unitHeight,            coord2[2],
									coord2[0] -  s[0]      * unitWidth + leftAdd,  coord2[1] - (s[1] + 1) * unitHeight,            coord2[2]
								], [0, 0, 1], texture);
								var wall = new Mesh(material_METAL_WALL, [
									coord2[0] -  s[0]      * unitWidth + leftAdd,  coord2[1] - (s[1] + 1) * unitHeight + edgeSize, coord1[2],
									coord2[0] - (s[0] + 1) * unitWidth + rightAdd, coord2[1] - (s[1] + 1) * unitHeight + edgeSize, coord1[2],
									coord2[0] - (s[0] + 1) * unitWidth + rightAdd, coord2[1] - (s[1] + 1) * unitHeight,            coord1[2],
									coord2[0] -  s[0]      * unitWidth + leftAdd,  coord2[1] - (s[1] + 1) * unitHeight,            coord1[2]
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
									coord2[0] - s[0] * unitWidth,            coord2[1] -  s[1]      * unitHeight + topAdd,    coord2[2],
									coord2[0] - s[0] * unitWidth - edgeSize, coord2[1] -  s[1]      * unitHeight + topAdd,    coord2[2],
									coord2[0] - s[0] * unitWidth - edgeSize, coord2[1] - (s[1] + 1) * unitHeight + bottomAdd, coord2[2],
									coord2[0] - s[0] * unitWidth,            coord2[1] - (s[1] + 1) * unitHeight + bottomAdd, coord2[2]
								], [0, 0, 1], texture);
								var wall = new Mesh(material_METAL_WALL, [
									coord2[0] - s[0] * unitWidth,            coord2[1] -  s[1]      * unitHeight + topAdd,    coord1[2],
									coord2[0] - s[0] * unitWidth - edgeSize, coord2[1] -  s[1]      * unitHeight + topAdd,    coord1[2],
									coord2[0] - s[0] * unitWidth - edgeSize, coord2[1] - (s[1] + 1) * unitHeight + bottomAdd, coord1[2],
									coord2[0] - s[0] * unitWidth,            coord2[1] - (s[1] + 1) * unitHeight + bottomAdd, coord1[2]
								], [0, 0, -1], texture);
								
								meshes.push(hull);
								meshes.push(wall);
								
								if(yRotation && yRotation != 0) {
									hull.rotateY(yRotation);
									wall.rotateY(yRotation);
								}
							}
							if(s[0] < width - 1) {
								// Right
								var texture = [
									textureBounds[2] - edgeSize, textureBounds[1],
									textureBounds[2],            textureBounds[1],
									textureBounds[2],            textureBounds[3],
									textureBounds[2] - edgeSize, textureBounds[3]
								];
								
								var hull = new Mesh(material_METAL_BOLT, [
									coord2[0] - (s[0] + 1) * unitWidth + edgeSize, coord2[1] -  s[1]      * unitHeight + topAdd,    coord2[2],
									coord2[0] - (s[0] + 1) * unitWidth,            coord2[1] -  s[1]      * unitHeight + topAdd,    coord2[2],
									coord2[0] - (s[0] + 1) * unitWidth,            coord2[1] - (s[1] + 1) * unitHeight + bottomAdd, coord2[2],
									coord2[0] - (s[0] + 1) * unitWidth + edgeSize, coord2[1] - (s[1] + 1) * unitHeight + bottomAdd, coord2[2]
								], [0, 0, 1], texture);
								var wall = new Mesh(material_METAL_WALL, [
									coord2[0] - (s[0] + 1) * unitWidth + edgeSize, coord2[1] -  s[1]      * unitHeight + topAdd,    coord1[2],
									coord2[0] - (s[0] + 1) * unitWidth,            coord2[1] -  s[1]      * unitHeight + topAdd,    coord1[2],
									coord2[0] - (s[0] + 1) * unitWidth,            coord2[1] - (s[1] + 1) * unitHeight + bottomAdd, coord1[2],
									coord2[0] - (s[0] + 1) * unitWidth + edgeSize, coord2[1] - (s[1] + 1) * unitHeight + bottomAdd, coord1[2]
								], [0, 0, -1], texture);
								
								meshes.push(hull);
								meshes.push(wall);
								
								if(yRotation && yRotation != 0) {
									hull.rotateY(yRotation);
									wall.rotateY(yRotation);
								}
							}
						}
					} else {
						// Meshes for faces parts where there are not gaps
						var textureBounds = [
							0,
							0,
							unitWidth,
							unitHeight
						];
						if(x == 0) textureBounds[0] += edgeSize;
						if(y == 0) textureBounds[1] += edgeSize;
						if(x + 1 == 1) textureBounds[2] -= edgeSize;
						if(y + 1 == 1) textureBounds[3] -= edgeSize;
						if(y % 2 == 1) {
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
						var leftAdd   = x == 0 ? edgeSize : 0;
						var topAdd    = y == 0 ? edgeSize : 0;
						var rightAdd  = x + 1 == width  ? edgeSize : 0;
						var bottomAdd = y + 1 == height ? edgeSize : 0;
						
						// Exterior (face), hull
						var hull = new Mesh(material_METAL_BOLT, [
							coord2[0] -  x      * unitWidth - leftAdd,  coord2[1] -  y      * unitHeight - topAdd,    coord2[2],
							coord2[0] - (x + 1) * unitWidth + rightAdd, coord2[1] -  y      * unitHeight - topAdd,    coord2[2],
							coord2[0] - (x + 1) * unitWidth + rightAdd, coord2[1] - (y + 1) * unitHeight + bottomAdd, coord2[2],
							coord2[0] -  x      * unitWidth - leftAdd,  coord2[1] - (y + 1) * unitHeight + bottomAdd, coord2[2]
						], [0, 0, 1], textureBounds);
						
						// Interior (Wall)
						var wall = new Mesh(material_METAL_WALL, [
							coord2[0] -  x      * unitWidth - leftAdd,  coord2[1] -  y      * unitHeight - topAdd,    coord1[2],
							coord2[0] - (x + 1) * unitWidth + rightAdd, coord2[1] -  y      * unitHeight - topAdd,    coord1[2],
							coord2[0] - (x + 1) * unitWidth + rightAdd, coord2[1] - (y + 1) * unitHeight + bottomAdd, coord1[2],
							coord2[0] -  x      * unitWidth - leftAdd,  coord2[1] - (y + 1) * unitHeight + bottomAdd, coord1[2]
						], [0, 0, -1], textureBounds);
						
						var hitBox = new HitBox(
							vec3.fromValues(
								coord2[0] - x * unitWidth,
								coord2[1] - y * unitHeight,
								coord2[2]
							), vec3.fromValues(
								coord2[0] - (x + 1) * unitWidth,
								coord2[1] - (y + 1) * unitHeight,
								coord1[2]
							)
						);
						building.hitBoxes.push(hitBox);
						
						// TODO + remove corners and extend doors and windows hitboxes ?
						
						meshes.push(hull);
						meshes.push(wall);
						
						if(yRotation && yRotation != 0) {
							hull.rotateY(yRotation);
							wall.rotateY(yRotation);
							
							// Rotating hitbox
							var cos = Math.cos(yRotation);
							var sin = Math.sin(yRotation);
							var minX = hitBox.min[0] * cos - hitBox.min[2] * sin;
							var minZ = hitBox.min[2] * cos + hitBox.min[0] * sin;
							hitBox.min[0] = minX;
							hitBox.min[2] = minZ;
							var maxX = hitBox.max[0] * cos - hitBox.max[2] * sin;
							var maxZ = hitBox.max[2] * cos + hitBox.max[0] * sin;
							hitBox.max[0] = maxX;
							hitBox.max[2] = maxZ;
						}
					}
				}
			}
		};
		
		// Creating faces
		createFace(gaps.front, unitSize[0], unitSize[1], [x1, y1, z1], [x2, y2, z2],  0,             building.gridSize[0], building.gridSize[1]);
		createFace(gaps.back,  unitSize[0], unitSize[1], [x1, y1, z1], [x2, y2, z2], -Math.PI,       building.gridSize[0], building.gridSize[1]);
		createFace(gaps.left,  unitSize[2], unitSize[1], [z1, y1, x1], [z2, y2, x2], -Math.PI * 1.5, building.gridSize[2], building.gridSize[1]);
		createFace(gaps.right, unitSize[2], unitSize[1], [z1, y1, x1], [z2, y2, x2], -Math.PI * 0.5, building.gridSize[2], building.gridSize[1]);
		
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
			-x1, y1, -z1,
			 x1, y1, -z1,
			 x1, y1,  z1,
			-x1, y1,  z1
		], [0, -1, 0])); // Ceil
		
		// ceil and groud hitboxes
		var groundGlitchAddition = 0.2; // Dirty way to avoid falling on the hole between two rooms
		building.hitBoxes.push(new HitBox(vec3.fromValues(-x1,  y1, -z1), vec3.fromValues(x1,  y2, z1)));
		building.hitBoxes.push(new HitBox(vec3.fromValues(
			-x1 - groundGlitchAddition,
			-y2,
			-z1 - groundGlitchAddition
		), vec3.fromValues(
			x1 + groundGlitchAddition,
			-y1,
			z1 + groundGlitchAddition
		)));
		
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
					
		building.model.meshes = meshes;
		building.model.regenerateCache();
		
		// No hitboxes if there are buildings on each wall
		if(building.hitBoxes.length > 0) building.spaceShip.physics.add(building.hitBoxes);
	};
	
	building.regenerateMeshes();
	
	var distance = Math.max.apply(Math, [
		building.spaceShip.roomUnitSize[0] * building.gridSize[0] - (building.spaceShip.edgeSize / 2),
		building.spaceShip.roomUnitSize[1] * building.gridSize[1] - (building.spaceShip.edgeSize / 2),
		building.spaceShip.roomUnitSize[2] * building.gridSize[2] - (building.spaceShip.edgeSize / 2)
	]);
	building.lights.push(new Light(vec3.clone(building.gridPosition), [1, 1, 1], distance, true, 0.8));
	
	building.world.add(building.lights);
};
