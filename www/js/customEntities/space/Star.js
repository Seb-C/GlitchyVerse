/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Sébastien CAPARROS (GlitchyVerse)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Creates a star
 * @param World The world where to put the star
 * @param vec3 The position of the star in space (it's the center of the sphere)
 * @param float The seed of the star (determines it's color)
 * @param Array(3) Color of the star and it's light (RGB components between 0.0 and 1.0)
 */
CustomEntities.Star = function(world, position, radius, seed) {
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
	
	var prng = new RNG(seed);
	var color = [ // Components between 0.5 and 1.0
		prng.uniform() / 2 + 0.5,
		prng.uniform() / 2 + 0.5,
		prng.uniform() / 2 + 0.5
	];
	
	// TODO bug : sometimes, we can see the black square of the texture ?
	
	var colorTexture = Materials.setPixelArrayAsTexture(world.gl, 1, 1, [color[0] * 255, color[1] * 255, color[2] * 255, 255], null, true);
	
	this.parent(world, new Model(world, meshes, colorTexture), position, quat.create());
	
	this.orbitRadius = null;
	
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
CustomEntities.Star.extend(Entity);
