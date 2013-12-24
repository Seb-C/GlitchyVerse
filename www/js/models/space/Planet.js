/**
 * Creates a star
 * @param World The world where to put the star
 * @param vec3 The position of the star in space (it's the center of the sphere)
 * @param float The radius of the star
 * @param Array(3) Color of the star and it's light (RGB components between 0.0 and 1.0)
 */
Models.Planet = function(world, position, radius, seed) {
	var self = this;
	
	this.MAX_DISTANCE_VISIBILITY_PER_UNIT = 14;
	this.REBUILD_TIME_INTERVAL            = 5000;
	this.MIN_QUALITY_DIFFERENCE_TO_UPDATE = 0.03;
	
	this.lastQuality = null;
	
	this.isWaitingForCreation = false;
	this.texture = null;
	
	this.atmosphere = new Entity(world, position, quat.create(), []);
	this.atmosphere.drawTypeByElements = false;
	this.atmosphereTexture = null;
	world.add(this.atmosphere);
	
	this.regenerationTimer = new Timer(function() {
		var maxVisibleDistance = Math.PI * radius * self.MAX_DISTANCE_VISIBILITY_PER_UNIT;
		
		// Determining quality factor
		var distanceFromCamera = vec3.distance(position, world.camera.getPosition()) - radius;
		if(distanceFromCamera > maxVisibleDistance) {
			distanceFromCamera = maxVisibleDistance;
		} else if(distanceFromCamera < 0) {
			distanceFromCamera = 0;
		}
		var quality = (Math.exp(1 - (distanceFromCamera / maxVisibleDistance)) - 1) / (Math.E - 1);
		
		// If quality difference is significative, rebuilding the planet
		if(self.lastQuality == null || Math.abs((quality / self.lastQuality) - 1) >= self.MIN_QUALITY_DIFFERENCE_TO_UPDATE) {
			// Creating planet, based on the given definition
			if(!self.isWaitingForCreation) {
				self.lastQuality = quality;
				self.isWaitingForCreation = true;
				world.spaceContent.requestPlanetCreation(radius, seed, quality, function(result) {
					self.mappedTexture = Materials.setPixelArrayAsTexture(world.gl, result.texture.width, result.texture.height, result.texture.pixels, self.mappedTexture);
					
					// Creating mesh with the texture
					self.meshes = [new Mesh(
						Materials.get("PLANET"),
						new Float32Array(result.geometry.vertices   ),
						new Float32Array(result.geometry.normals    ),
						new Float32Array(result.geometry.texturePart),
						null,
						null,
						new Float32Array(result.geometry.textureMapping)
					)];
					self.regenerateCache();
					
					if(result.atmosphere != null) {
						self.atmosphereTexture = Materials.setPixelArrayAsTexture(world.gl, 2, 2, result.atmosphere.texturePixels, self.atmosphereTexture, true);
						self.atmosphereTexture.isTransparency = true;
						
						self.atmosphere.meshes = [new Mesh(
							self.atmosphereTexture,
							new Float32Array(result.atmosphere.vertices   ),
							new Float32Array(result.atmosphere.normals    ),
							new Float32Array(result.atmosphere.texturePart)
						)];
						self.atmosphere._cacheIsTransparency = null; // TODO this is dirty
						self.atmosphere.onbeforedraw = function() {
							this._gl.enable(this._gl.CULL_FACE);
							
							// Culling only the front or the back, depending if the camera is on the surface or not
							var cameraDistance = vec3.distance(this.world.camera.getPosition(), this.position);
							if(cameraDistance < result.atmosphere.radius) {
								this._gl.cullFace(this._gl.FRONT);
							} else {
								this._gl.cullFace(this._gl.BACK);
							}
						};
						self.atmosphere.onafterdraw = function() {
							this._gl.disable(this._gl.CULL_FACE);
						};
						
						self.atmosphere.regenerateCache();
					}
					
					self.isWaitingForCreation = false;
				});
			}
		}
	}, this.REBUILD_TIME_INTERVAL, true);
	
	this.parent(world, position, quat.create(), []);
	this.drawTypeByElements = false;
};
Models.Planet.extend(Entity);