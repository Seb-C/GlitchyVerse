var SpaceContent = function(world) {
	this.world = world;
	this.bodies = {};
	
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
		var objectIndex = tempKeys.indexOf(bodyDefinition.id.toString());
		if(objectIndex == -1) {
			// Creating new object
			var body = new CustomEntities[bodyDefinition.model](this.world, bodyDefinition.position, bodyDefinition.radius, bodyDefinition.seed);
			this.bodies[bodyDefinition.id] = body;
			entitiesToAddToWorld.push(body);
		} else {
			// Already exists : just removing it from temp ids list
			tempKeys.splice(objectIndex, 1);
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
