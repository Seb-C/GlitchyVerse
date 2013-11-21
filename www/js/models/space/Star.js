/**
 * Creates a star
 * @param World The world where to put the star
 * @param vec3 The position of the star in space (it's the center of the sphere)
 * @param float The seed of the star (determines it's color)
 * @param Array(3) Color of the star and it's light (RGB components between 0.0 and 1.0)
 */
Models.Star = function(world, position, radius, seed) {
	this.parent(world, position, quat.create(), []);
	
	Math.seedrandom(seed);
	var color = [ // Components between 0.5 and 1.0
		Math.random() / 2 + 0.5,
		Math.random() / 2 + 0.5,
		Math.random() / 2 + 0.5
	];
	
	// Adding light
	var lightPower = radius * 40; // TODO light power depending on the star size
	this.lights.push(new Light(position, color, lightPower, true));
	world.add(this.lights);
	
	// Adding particle
	this.particle = new Particle(Materials.get("P_STAR"), [0, 0, 0], radius * 2.5, color.concat(1), 0, [0, 0, 0], this);
	world.add(this.particle);
};
Models.Star.extend(Entity);