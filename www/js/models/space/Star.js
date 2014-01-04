/**
 * Creates a star
 * @param World The world where to put the star
 * @param vec3 The position of the star in space (it's the center of the sphere)
 * @param float The seed of the star (determines it's color)
 * @param Array(3) Color of the star and it's light (RGB components between 0.0 and 1.0)
 */
Models.Star = function(world, position, radius, seed) {
	var realRadius = radius * 1.25;
	var textureParts = [
		0, 0,
		1, 0,
		1, 1,
		0, 1
	];
	var meshes = [new Mesh(Materials.get("STAR"), [
		-realRadius, -realRadius, 0,
		 realRadius, -realRadius, 0,
		 realRadius,  realRadius, 0,
		-realRadius,  realRadius, 0
	], [0, 0, 0], textureParts, null, null, textureParts)];
	
	Math.seedrandom(seed);
	var color = [ // Components between 0.5 and 1.0
		Math.random() / 2 + 0.5,
		Math.random() / 2 + 0.5,
		Math.random() / 2 + 0.5,
	];
	
	// TODO bug : sometimes, we can see the black square of the texture ?
	
	var colorTexture = Materials.setPixelArrayAsTexture(world.gl, 1, 1, [color[0] * 255, color[1] * 255, color[2] * 255, 255], null, true);
	
	this.parent(world, position, quat.create(), meshes, null, colorTexture);
	
	// Adding light
	var lightPower = radius * 100; // TODO light power depending on the star size
	this.lights.push(new Light(position, color, lightPower, true));
	world.add(this.lights);
	
	/**
	 * Redefining getRotation, because the star is a plane which always have the same rotation than the camera
	 */
	this.getRotation = function() {
		return this.world.camera.getRotation();
	};
	
	this.onbeforedraw = function() {
		world.lightManager.setAmbientLightning(1);
	};
	this.onafterdraw = function() {
		world.lightManager.setAmbientLightning(null);
	};
};
Models.Star.extend(Entity);