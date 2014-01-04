var LightManager = function(world) {
	this._gl              = null;
	this.world            = world;
	this._shader          = this.world.mainShader;
	this._lights          = new Array();
	
	this.defaultAmbientLightning = 0.2;
	this.ambientLightning = 0.2;
	
	this.lightUpdateTimer = null;
	
	this.viewableLightsNumber   = 0;
	this.lightPositionArray     = new Array();
	this.lightColorArray        = new Array();
	this.lightMaxDistanceArray  = new Array();
	this.lightAttenuationArray  = new Array();
	this.lightMaxLightningArray = new Array();
};

/**
 * Changes the current ambient lightning.
 * @param float The new ambient lighning. null to reset to default.
 */
LightManager.prototype.setAmbientLightning = function(ambientLightning) {
	this.ambientLightning = ambientLightning == null ? this.defaultAmbientLightning : ambientLightning;
	this._gl.uniform1f(this._shader.getVar("uAmbientLight"), this.ambientLightning);
};

// In case of change, it must be edited in main fragmentShader too
LightManager.prototype.MAX_LIGHTS_NUMBER = 16;

/**
 * Adds a light to the list. Function regenerateCache must be called after adding light(s).
 * @param mixed A Light object to add or an Array of lights
 */
LightManager.prototype.add = function(l) {
	if(l instanceof Light) {
		this._lights.push(l);
	} else {
		this._lights = this._lights.concat(l);
	}
};

/**
 * Removes a light from the list. Function regenerateCache must be called after removing light(s).
 * @param mixed A Light object to remove or an Array of lights
 */
LightManager.prototype.remove = function(l) {
	if(l instanceof Light) {
		var i = this._lights.indexOf(l);
		if(i != -1) this._lights.splice(i, 1);
	} else {
		this._lights = this._lights.filter(function(v) { return l.indexOf(v) == -1; });
	}
};

/**
 * Sorts the light Array
 */
LightManager.prototype.sortLights = function() {
	var cameraPosition = this.world.camera.getAbsolutePosition();
	var cameraViewDistance = this.world.camera.viewDistance;
	
	// Generating cache values of the light
	this._lights.map(function(light) {
		light.nearIndex = vec3.distance(light.position, cameraPosition) - (cameraViewDistance + light.maxDistance);
	});
	
	this._lights.sort(function(a, b) {
		return a.nearIndex - b.nearIndex;
	});
};

/**
 * Regenerates cache arrays and updates WebGL uniforms
 */
LightManager.prototype.regenerateCache = function() {
	this.sortLights();
	
	this.lightPositionArray     = new Array();
	this.lightColorArray        = new Array();
	this.lightMaxDistanceArray  = new Array();
	this.lightAttenuationArray  = new Array();
	this.lightMaxLightningArray = new Array();
	
	this.viewableLightsNumber = null;
	for(var i = 0 ; i < this._lights.length && i < this.MAX_LIGHTS_NUMBER ; i++) {
		var light = this._lights[i];
		if(light.nearIndex < 0) {
			this.lightPositionArray    = this.lightPositionArray.concat(this.world.positionAbsoluteToRelative(light.position));
			this.lightColorArray       = this.lightColorArray   .concat(light.color   );
			this.lightMaxDistanceArray .push(light.maxDistance);
			this.lightAttenuationArray .push(light.isAttenuation ? 1 : 0);
			this.lightMaxLightningArray.push(light.maxLightning);
		} else {
			// Array sorted --> when we have a unvisible light, all lights after are unvisible too
			this.viewableLightsNumber = i;
			break;
		}
	}
	if(this.viewableLightsNumber == null) this.viewableLightsNumber = this._lights.length;
	
	if(this._gl) {
		this._regenerateUniforms();
	}
};

/**
 * Regenerates WebGL uniforms
 */
LightManager.prototype._regenerateUniforms = function() {
	this._gl.useProgram(this._shader.program);
	
	var lightNumber = this.viewableLightsNumber;
	
	this._gl.uniform1i     (this._shader.getVar("uPointLightingArrayLength"),       lightNumber                );
	if(lightNumber > 0) {
		this._gl.uniform3fv(this._shader.getVar("uPointLightingPositionArray"),     this.lightPositionArray    );
		this._gl.uniform3fv(this._shader.getVar("uPointLightingColorArray"),        this.lightColorArray       );
		this._gl.uniform1fv(this._shader.getVar("uPointLightingMaxDistanceArray"),  this.lightMaxDistanceArray );
		this._gl.uniform1iv(this._shader.getVar("uPointLightingAttenuationArray"),  this.lightAttenuationArray );
		this._gl.uniform1fv(this._shader.getVar("uPointLightingMaxLightningArray"), this.lightMaxLightningArray);
	}
	this.setAmbientLightning(null);
};

/**
 * Initializes the LightManager object, for example with creating WebGL buffers
 * @param WebGL The WebGL object
 */
LightManager.prototype.init = function(gl) {
	this._gl = gl;
	
	// Light has to be updated regularly, but not necessarily at each frame
	var self = this;
	this.lightUpdateTimer = new Timer(function() {
		self.regenerateCache();
	}, 1000, true);
};