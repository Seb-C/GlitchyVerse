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
	
	// TODO when regenerating texture --> delete the old one from webgl memory
	
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
			self.lastQuality = quality;
			
			// Creating planet, based on the given definition
			if(!self.isWaitingForCreation) {
				self.isWaitingForCreation = true;
				world.spaceContent.requestPlanetCreation(radius, seed, quality, function(result) {
					var texture = Materials.setPixelArrayAsTexture(world.gl, result.texture.width, result.texture.height, result.texture.pixels);
					
					// Creating mesh with the texture
					self.meshes = [new Mesh(
						texture,
						new Float32Array(result.geometry.vertices),
						new Float32Array(result.geometry.normals),
						1,
						new Float32Array(result.geometry.texturePart)
					)];
					self.regenerateCache();
					self.isWaitingForCreation = false;
				});
			}
		}
	}, this.REBUILD_TIME_INTERVAL, true);
	
	this.parent(world, position, quat.create(), []);
};
Models.Planet.extend(Entity);