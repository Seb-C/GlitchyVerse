/**
 * Creates a star
 * @param World The world where to put the star
 * @param vec3 The position of the star in space (it's the center of the sphere)
 * @param float The radius of the star
 * @param Array(3) Color of the star and it's light (RGB components between 0.0 and 1.0)
 */
CustomEntities.Planet = function(world, position, radius, seed) {
	var self = this;
	
	this.seed = seed;
	
	this.MAX_DISTANCE_VISIBILITY_PER_UNIT = 14;
	this.REBUILD_TIME_INTERVAL            = 5000;
	this.MIN_QUALITY_DIFFERENCE_TO_UPDATE = 0.03;
	
	this.lastQuality = null;
	
	this.isWaitingForCreation = false;
	this.texture = null;
	
	this.orbitRadius = null; // Will be initialized with the worker result
	
	this.atmosphere = null;
	
	this.treesAddedToWorld = false;
	this.treeModel = null;
	this.treesColourTexture = null;
	this.trees = [];
	
	this.regenerationTimer = new Timer(function() {
		var maxVisibleDistance = Math.PI * radius * self.MAX_DISTANCE_VISIBILITY_PER_UNIT;
		
		// Determining quality factor
		var distanceFromCamera = vec3.distance(position, world.camera.getAbsolutePosition()) - radius;
		if(distanceFromCamera > maxVisibleDistance) {
			distanceFromCamera = maxVisibleDistance;
		} else if(distanceFromCamera < 0) {
			distanceFromCamera = 0;
		}
		var quality = (Math.exp(1 - (distanceFromCamera / maxVisibleDistance)) - 1) / (Math.E - 1);
		
		// If quality difference is significative, recreating the planet
		if(self.lastQuality == null || Math.abs((quality / self.lastQuality) - 1) >= self.MIN_QUALITY_DIFFERENCE_TO_UPDATE) {
			// Creating planet, based on the given definition
			if(!self.isWaitingForCreation) {
				self.lastQuality = quality;
				self.isWaitingForCreation = true;
				world.spaceContent.requestPlanetCreation(radius, seed, quality, function(result) {
					self.model.mappedTexture = Materials.setPixelArrayAsTexture(world.gl, result.texture.width, result.texture.height, result.texture.pixels, self.model.mappedTexture);
					
					self.orbitRadius = result.orbitRadius;
					
					// Creating mesh with the texture
					self.model.meshes = new Mesh(
						Materials.get("PLANET"),
						new Float32Array(result.geometry.vertices   ),
						new Float32Array(result.geometry.normals    ),
						new Float32Array(result.geometry.texturePart),
						null,
						null,
						new Float32Array(result.geometry.textureMapping)
					);
					self.model.regenerateCache();
					
					// Creating atmosphere
					if(result.atmosphere != null) {
						if(self.atmosphere == null) {
							self.atmosphere = new Entity(world, new Model(world, []), position, quat.create());
							self.atmosphere.model.drawTypeByElements = false;
							self.atmosphereTexture = null;
							world.add(self.atmosphere);
						}
						
						self.atmosphereTexture = Materials.setPixelArrayAsTexture(world.gl, 2, 2, result.atmosphere.texturePixels, self.atmosphereTexture, true);
						self.atmosphereTexture.isTransparency = true;
						
						self.atmosphere.model.meshes = new Mesh(
							self.atmosphereTexture,
							new Float32Array(result.atmosphere.vertices   ),
							new Float32Array(result.atmosphere.normals    ),
							new Float32Array(result.atmosphere.texturePart)
						);
						self.atmosphere.model.onbeforedraw = function() {
							this.gl.enable(this.gl.CULL_FACE);
							
							// Culling only the front or the back, depending if the camera is on the surface or not
							var cameraDistance = vec3.distance(this.world.camera.getAbsolutePosition(), self.position);
							if(cameraDistance < result.atmosphere.radius) {
								this.gl.cullFace(this.gl.FRONT);
							} else {
								this.gl.cullFace(this.gl.BACK);
							}
						};
						self.atmosphere.model.onafterdraw = function() {
							this.gl.disable(this.gl.CULL_FACE);
						};
						
						self.atmosphere.model.regenerateCache();
					}
					
					// Generating trees if required
					if(result.hasTrees && self.treeModel == null) {
						self.generateTreeModel();
						
						// Creating trees from the model
						var treePositions = result.trees.positions;
						var treeRotations = result.trees.rotations;
						for(var i = 0 ; i < treePositions.length ; i++) {
							// Translating position
							var treePosition = treePositions[i];
							vec3.add(treePosition, treePosition, position);
							
							self.trees.push(new Entity(
								world,
								self.treeModel,
								treePosition,
								treeRotations[i]
								/*[
									self.world.camera.getAbsolutePosition()[0],
									self.world.camera.getAbsolutePosition()[1],
									self.world.camera.getAbsolutePosition()[2] - 2,
								], [0, 0, 0, 1]*/
							));
						}
					}
					
					// Showing or hiding trees if required
					if(result.hasTrees && !self.treesAddedToWorld) {
						world.add(self.trees);
					} else if(!result.hasTrees && self.treesAddedToWorld) {
						world.remove(self.trees);
					}
					
					self.isWaitingForCreation = false;
				});
			}
		}
	}, this.REBUILD_TIME_INTERVAL, true);
	
	this.parent(world, new Model(world, []), position, quat.create());
	this.model.drawTypeByElements = false;
		
	this.model.onbeforedraw = function() {
		this.gl.enable(this.gl.CULL_FACE);
		this.gl.cullFace(this.gl.BACK);
	};
	this.model.onafterdraw = function() {
		this.gl.disable(this.gl.CULL_FACE);
	};
};
CustomEntities.Planet.extend(Entity);

/**
 * Generates the trees model in this.treeModel
 */
CustomEntities.Planet.prototype.generateTreeModel = function() {
	var prng = new RNG("tree_" + this.seed);
	
	// Creating colours mapping texture
	this.treesColourTexture = Materials.setPixelArrayAsTexture(world.gl, 1, 2, [
		Math.round(prng.uniform() * 255), Math.round(prng.uniform() * 255), Math.round(prng.uniform() * 255), 255,
		Math.round(prng.uniform() * 255), Math.round(prng.uniform() * 255), Math.round(prng.uniform() * 255), 255
	], this.treesColourTexture);
	
	var branchWidthRatio  = 0.3  * prng.uniform();
	var angleMaxVariation = 0.20 * prng.uniform() * Math.PI;
	var maxBranches       = 5    * prng.uniform();
	var maxLeafSize       = 0.5  * prng.uniform();
	var leafProbability   = prng.uniform();
	var minStepLength     = 0.1;
	
	var firstBranchMinSize = 3;
	var firstBranchMaxSize = 10;
	
	var barkVertices   = [];
	var barkNormals    = [];
	var barkTexParts   = [];
	var barkTexMapping = [];
	var leafVertices   = [];
	var leafNormals    = [];
	var leafTexParts   = [];
	var leafTexMapping = [];
	
	// Everything is equal to 1 or -1 in order to be scaled
	var defaultBarkVertices = [
		// Front
		-1, 1, 1,
		 1, 1, 1,
		 1, 0, 1,
		-1, 1, 1,
		 1, 0, 1,
		-1, 0, 1,
		
		// Right
		1, 1,  1,
		1, 1, -1,
		1, 0, -1,
		1, 1,  1,
		1, 0, -1,
		1, 0,  1,
		
		// Back
		 1, 1, -1,
		-1, 1, -1,
		-1, 0, -1,
		 1, 1, -1,
		-1, 0, -1,
		 1, 0, -1,
		
		// Left
		-1, 1, -1,
		-1, 1,  1,
		-1, 0,  1,
		-1, 1, -1,
		-1, 0,  1,
		-1, 0, -1,
		
		// Top
		-1, 1, -1,
		 1, 1, -1,
		 1, 1,  1,
		-1, 1, -1,
		 1, 1,  1,
		-1, 1,  1,
		
		// Bottom
		-1, 0,  1,
		 1, 0,  1,
		 1, 0, -1,
		-1, 0,  1,
		 1, 0, -1,
		-1, 0, -1
	];
	
	var defaultBarkNormals = [
		// Front
		0, 0, 1,
		0, 0, 1,
		0, 0, 1,
		0, 0, 1,
		0, 0, 1,
		0, 0, 1,
		
		// Right
		1, 0, 0,
		1, 0, 0,
		1, 0, 0,
		1, 0, 0,
		1, 0, 0,
		1, 0, 0,
		
		// Back
		0, 0, -1,
		0, 0, -1,
		0, 0, -1,
		0, 0, -1,
		0, 0, -1,
		0, 0, -1,
		
		// Left
		-1, 0, 0,
		-1, 0, 0,
		-1, 0, 0,
		-1, 0, 0,
		-1, 0, 0,
		-1, 0, 0,
		
		// Top
		0, 1, 0,
		0, 1, 0,
		0, 1, 0,
		0, 1, 0,
		0, 1, 0,
		0, 1, 0,
		
		// Bottom
		0, -1, 0,
		0, -1, 0,
		0, -1, 0,
		0, -1, 0,
		0, -1, 0,
		0, -1, 0
	];
	
	// Used in loops
	var tempVertices = new Array(defaultBarkVertices.length);
	var tempNormals  = new Array(defaultBarkNormals .length);
	
	(function(rootPosition, stepLength, angle) {
		if(stepLength >= minStepLength) {
			var branchesCount = Math.round(prng.uniform() * maxBranches + 1);
			var halfBranchWidth = (stepLength * branchWidthRatio) / 2;
			
			for(var i = 1 ; i <= branchesCount ; i++) {
				var angleX = angle[0] + prng.uniform() * Math.PI + Math.PI / 2;
				var angleZ = angle[2] + prng.uniform() * Math.PI + Math.PI / 2;
				var sinX = Math.sin(angleX);
				var sinZ = Math.sin(angleZ);
				var cosX = Math.cos(angleX);
				var cosZ = Math.cos(angleZ);
				
				var target = [
					rootPosition[0] - stepLength * cosX * sinZ,
					rootPosition[1] + stepLength * cosX * cosZ,
					rootPosition[2] - stepLength * sinX
				];
				
				// Setting vertices and adding it to main vertices array
				var x1, y1, z1, x2, y2, z2;
				for(var j = 0 ; j < defaultBarkVertices.length ; j += 3) {
					// Copying branch vertices and scaling it
					x1 = defaultBarkVertices[j    ] * halfBranchWidth;
					y1 = defaultBarkVertices[j + 1] * stepLength;
					z1 = defaultBarkVertices[j + 2] * halfBranchWidth;
					
					// Rotating branch
					y2 = y1 * cosX + z1 * sinX;
					z2 = z1 * cosX - y1 * sinX;
					y1 = y2;
					z1 = z2;
					x2 = x1 * cosZ - y1 * sinZ;
					y2 = y1 * cosZ + x1 * sinZ;
				
					// Moving (translating) branch to rootPosition
					tempVertices[j    ] = x2 + rootPosition[0];
					tempVertices[j + 1] = y2 + rootPosition[1];
					tempVertices[j + 2] = z2 + rootPosition[2];
					
					// Getting normals
					x1 = defaultBarkNormals[j    ];
					y1 = defaultBarkNormals[j + 1];
					z1 = defaultBarkNormals[j + 2];
					
					// Rotating normals
					y2 = y1 * cosX + z1 * sinX;
					z2 = z1 * cosX - y1 * sinX;
					y1 = y2;
					z1 = z2;
					x2 = x1 * cosZ - y1 * sinZ;
					y2 = y1 * cosZ + x1 * sinZ;
					
					// Setting normals
					tempNormals[j    ] = x2;
					tempNormals[j + 1] = y2;
					tempNormals[j + 2] = z2;
				}
				Array.prototype.push.apply(barkVertices, tempVertices);
				Array.prototype.push.apply(barkNormals,  tempNormals );
				
				barkTexParts.push(
					0, 0,
					1, 0,
					1, 1,
					0, 0,
					1, 1,
					0, 1,
					
					0, 0,
					1, 0,
					1, 1,
					0, 0,
					1, 1,
					0, 1,
					
					0, 0,
					1, 0,
					1, 1,
					0, 0,
					1, 1,
					0, 1,
					
					0, 0,
					1, 0,
					1, 1,
					0, 0,
					1, 1,
					0, 1,
					
					0, 0,
					1, 0,
					1, 1,
					0, 0,
					1, 1,
					0, 1,
					
					0, 0,
					1, 0,
					1, 1,
					0, 0,
					1, 1,
					0, 1
				);
				
				barkTexMapping.push(
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25,
					0.25, 0.25
				);
				
				arguments.callee(
					target,
					stepLength * ((Math.exp(prng.uniform()) - 1) / (Math.E - 1)),
					[
						angle[0] + (((angle[0] == 0 && prng.uniform() < 0.5) || angle[0] < 0) ? -1 : 1) * (prng.uniform() / 2) * angleMaxVariation,
						0,
						angle[2] + (((angle[2] == 0 && prng.uniform() < 0.5) || angle[2] < 0) ? -1 : 1) * (prng.uniform() / 2) * angleMaxVariation
					]
				);
			}
		} else if(prng.uniform() < leafProbability) {
			var leafRadius = prng.uniform() * maxLeafSize / 2;
			
			leafVertices.push(
				rootPosition[0],              rootPosition[1] + leafRadius, rootPosition[2],
				rootPosition[0] + leafRadius, rootPosition[1],              rootPosition[2] + leafRadius,
				rootPosition[0] - leafRadius, rootPosition[1],              rootPosition[2] + leafRadius,
				
				rootPosition[0],              rootPosition[1] + leafRadius, rootPosition[2],
				rootPosition[0] - leafRadius, rootPosition[1],              rootPosition[2] + leafRadius,
				rootPosition[0],              rootPosition[1],              rootPosition[2] - leafRadius,
				
				rootPosition[0],              rootPosition[1] + leafRadius, rootPosition[2],
				rootPosition[0],              rootPosition[1],              rootPosition[2] - leafRadius,
				rootPosition[0] + leafRadius, rootPosition[1],              rootPosition[2] + leafRadius
			);
			leafNormals.push(
				0, 0.5, 0.5,
				0, 0.5, 0.5,
				0, 0.5, 0.5,
				
				-0.33, 0.33, -0.33,
				-0.33, 0.33, -0.33,
				-0.33, 0.33, -0.33,
				
				0.33, 0.33, -0.33,
				0.33, 0.33, -0.33,
				0.33, 0.33, -0.33
			);
			leafTexParts.push(
				0.5, 0,
				0,   1,
				1,   1,
				
				0.5, 0,
				0,   1,
				1,   1,
				
				0.5, 0,
				0,   1,
				1,   1
			);
			leafTexMapping.push(
				0.5, 0.5,
				0.5, 0.5,
				0.5, 0.5,
				
				0.5, 0.5,
				0.5, 0.5,
				0.5, 0.5,
				
				0.5, 0.5,
				0.5, 0.5,
				0.5, 0.5
			);
		}
	})([0, 0, 0], prng.uniform() * (firstBranchMaxSize - firstBranchMinSize) + firstBranchMinSize, [0, 0, 0]);
	
	// TODO add other textures, take one randomly
	
	var meshesArray = [new Mesh(
		Materials.get("TREE_BARK"),
		barkVertices,
		barkNormals,
		barkTexParts,
		null,
		null,
		barkTexMapping
	)];
	if(leafVertices.length > 0) {
		meshesArray.push(new Mesh(
			Materials.get("TREE_LEAF"),
			leafVertices,
			leafNormals,
			leafTexParts,
			null,
			null,
			leafTexMapping
		));
	}
	
	this.treeModel = new Model(this.world, meshesArray, this.treesColourTexture, false);
};
