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

var SpaceContent = function(world) {
	this.world = world;
	this.bodies = {}; // TODO change customEntities to the same structure than buildingBuilders
	
	this.skyBox = null;
	
	var self = this;
	// TODO put planet worker in Planet static class ?
	this.planetCreationWorker = new Worker("/js/workers/planetCreation.js");
	this.planetCreationQueue = [];
	this.planetCreationWorker.onmessage = function(event) {
		self.planetCreationQueue.shift()(event.data);
	};
};

/**
 * Initializes some space stuff (skybox ...)
 */
SpaceContent.prototype.init = function() {
	this.skyBox = new CustomEntities.SkyBox(this.world);
	this.world.add(this.skyBox);
};

/**
 * Sets bodies in the space. Non existing ids will be created.Ids which are not in this list will be removed.
 * @param Array containing the definition of bodies.
 */
SpaceContent.prototype.setContent = function(content) {
	var tempKeys = Object.keys(this.bodies);
	var entitiesToAddToWorld = [];
	for(var i = 0 ; i < content.length ; i++) {
		var bodyDefinition = content[i];
		var buildingIndex = tempKeys.indexOf(bodyDefinition.id.toString());
		if(buildingIndex == -1) {
			// Creating new building
			var body = new CustomEntities[bodyDefinition.model](this.world, bodyDefinition.position, bodyDefinition.radius, bodyDefinition.seed);
			this.bodies[bodyDefinition.id] = body;
			entitiesToAddToWorld.push(body);
		} else {
			// Already exists : just removing it from temp ids list
			tempKeys.splice(buildingIndex, 1);
		}
	}
	if(entitiesToAddToWorld.length > 0) this.world.add(entitiesToAddToWorld);
	
	// Removing elements that aren't visible anymore
	if(tempKeys.length > 0) {
		var entitiesToRemoveFromWorld = [];
		for(var i = 0 ; i < tempKeys.length ; i++) {
			var id = tempKeys[i];
			entitiesToRemoveFromWorld.push(this.bodies[id]);
			delete this.bodies[id];
		}
		this.world.remove(entitiesToRemoveFromWorld);
	}
};

/**
 * Executes the given callback for each body which can be collided.
 */
SpaceContent.prototype.forEachCollidableBody = function(callBack) {
	for(var k in this.bodies) {
		var body = this.bodies[k];
		if(body.orbitRadius != null) {
			callBack(body);
		}
	}
};

/**
 * Requests the generation of texture and meshes of the planet
 * @param float Radius of the planet
 * @param float Seed to use to generate the planet
 * @param float Quality of the planet (0 = lowest quality / 1 = highest quality)
 * @param CallBack Function to call when content has been generated
 */
SpaceContent.prototype.requestPlanetCreation = function(radius, seed, quality, callBack) {
	this.planetCreationQueue.push(callBack);
	this.planetCreationWorker.postMessage({radius: radius, seed: seed, quality: quality});
};
