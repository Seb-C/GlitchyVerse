/**
 * Manages the particle list and it's caches
 * @param Camera The camera, needed to determine distance between particles and camera
 */
var ParticleManager = function(camera) {
	this._gl = null;
	this.camera = camera;
	this._particles = Array();
	
	// We store the object creation time because it's useful
	// to avoid float precision problems in shaders
	this.baseTime = TimerManager.lastUpdateTimeStamp / 1000;
	
	// TODO optimize buffers, it's generation and draw loop like in Entity
	
	this._indexes         = new Array();
	this._positionArray   = new Array();
	this._sizeArray       = new Array();
	this._colorArray      = new Array();
	this._lifeTimeArray   = new Array();
	this._createTimeArray = new Array();
	this._movementArray   = new Array();
	
	this._indexesBuffer    = null;
	this._positionBuffer   = null;
	this._sizeBuffer       = null;
	this._colorBuffer      = null;
	this._lifeTimeBuffer   = null;
	this._createTimeBuffer = null;
	this._movementBuffer   = null;
};

/**
 * Adds a particle to the list. Function regenerateCache must be called after adding particle(s).
 * @param mixed A Particle object to add or an Array of particles
 */
ParticleManager.prototype.add = function(p) {
	if(p instanceof Particle) {
		this._particles.push(p);
	} else {
		this._particles = this._particles.concat(p);
	}
};

/**
 * Removes a particle from the list. Function regenerateCache must be called after removing particle(s).
 * @param mixed A Particle object to remove or an Array of particles
 */
ParticleManager.prototype.remove = function(p) {
	if(p instanceof Particle) {
		var i = this._particles.indexOf(p);
		if(i != -1) this._particles.splice(i, 1);
	} else {
		this._particles = this._particles.filter(function(v) { return p.indexOf(v) == -1; });
	}
};

/**
 * Removes dead particles and regenerates cache arrays and WebGL buffers
 */
ParticleManager.prototype.regenerateCache = function() {
	// Saving current array and pre-calculating time
	var particles = this._particles;
	var currentTime = TimerManager.lastUpdateTimeStamp / 1000;
	
	// Cleaning arrays
	this._particles = Array();
	var tempPositionArray   = Array();
	var tempSizeArray       = Array();
	var tempColorArray      = Array();
	var tempLifeTimeArray   = Array();
	var tempCreateTimeArray = Array();
	var tempMovementArray   = Array();
	var tempCacheIndexes    = Array();
	
	// Creating arrays without dead particles
	for(var i = 0 ; i < particles.length ; i++) {
		var particle = particles[i];
		if(!particle.isDead(currentTime)) {
			this._particles.push(particle);
			
			tempPositionArray = tempPositionArray.concat(particle.position);
			tempColorArray    = tempColorArray   .concat(particle.color   );
			tempMovementArray = tempMovementArray.concat(particle.movement);
			tempSizeArray      .push(particle.size      );
			tempLifeTimeArray  .push(particle.lifeTime  );
			tempCreateTimeArray.push(particle.createTime - this.baseTime);
			tempCacheIndexes   .push(tempCacheIndexes.length);
		}
	}
	
	this._positionArray   = new Float32Array(tempPositionArray  );
	this._sizeArray       = new Float32Array(tempSizeArray      );
	this._colorArray      = new Float32Array(tempColorArray     );
	this._lifeTimeArray   = new Float32Array(tempLifeTimeArray  );
	this._createTimeArray = new Float32Array(tempCreateTimeArray);
	this._movementArray   = new Float32Array(tempMovementArray  );
	this._indexes         = new Uint16Array (tempCacheIndexes   );
	
	if(this._gl != null) {
		this._regenerateBuffers();
	}
};

/**
 * Initializes the ParticleManager object, for example with creating WebGL buffers
 * @param WebGL The WebGL object
 */
ParticleManager.prototype.init = function(gl) {
	this._gl = gl;
	
	this._indexesBuffer    = this._gl.createBuffer();
	this._positionBuffer   = this._gl.createBuffer();
	this._sizeBuffer       = this._gl.createBuffer();
	this._colorBuffer      = this._gl.createBuffer();
	this._lifeTimeBuffer   = this._gl.createBuffer();
	this._createTimeBuffer = this._gl.createBuffer();
	this._movementBuffer   = this._gl.createBuffer();
	
	this._regenerateBuffers();
};

/**
 * Regenerates the WebGL array buffers
 */
ParticleManager.prototype._regenerateBuffers = function() {
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._movementBuffer  );
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._movementArray,   this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._positionBuffer  );
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._positionArray,   this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._sizeBuffer      );
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._sizeArray,       this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._colorBuffer     );
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._colorArray,      this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._lifeTimeBuffer  );
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._lifeTimeArray,   this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._createTimeBuffer);
	this._gl.bufferData(this._gl.ARRAY_BUFFER, this._createTimeArray, this._gl.STATIC_DRAW);
	
	this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer);
	this._gl.bufferData(this._gl.ELEMENT_ARRAY_BUFFER, this._indexes, this._gl.STATIC_DRAW);
};

/**
 * Draws the particles
 * @param WebGL The WebGL object.
 * @param Shader The shader to use to draw the particles
 * @param mat4 The model-view matrix
 */
ParticleManager.prototype.draw = function(gl, shader, mvMatrix) {
	this._gl.uniform1f(shader.getVar("uCurrentTime"), TimerManager.lastUpdateTimeStamp / 1000 - this.baseTime);
	this._gl.uniform3fv(shader.getVar("uCameraPosition"), this.camera.getPosition());
	this._gl.uniform2fv(shader.getVar("uScreenSize"), this.camera.screenSize);
	this._gl.uniform1f(shader.getVar("uFovy"), this.camera.fovy);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._positionBuffer);
	this._gl.vertexAttribPointer(shader.getVar("aPosition"), 3, this._gl.FLOAT, false, 0, 0);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._sizeBuffer);
	this._gl.vertexAttribPointer(shader.getVar("aSize"), 1, this._gl.FLOAT, false, 0, 0);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._colorBuffer);
	this._gl.vertexAttribPointer(shader.getVar("aColor"), 4, this._gl.FLOAT, false, 0, 0);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._lifeTimeBuffer);
	this._gl.vertexAttribPointer(shader.getVar("aLifeTime"), 1, this._gl.FLOAT, false, 0, 0);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._createTimeBuffer);
	this._gl.vertexAttribPointer(shader.getVar("aCreateTime"), 1, this._gl.FLOAT, false, 0, 0);
	
	this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._movementBuffer);
	this._gl.vertexAttribPointer(shader.getVar("aMovement"), 3, this._gl.FLOAT, false, 0, 0);
	
	this._gl.activeTexture(this._gl.TEXTURE0);
	this._gl.uniform1i(shader.getVar("uSampler"), 0);
	
	this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._indexesBuffer);
	
	gl.depthMask(false);
	// TODO don't create those objects here
	var currentMvMatrix = mat4.create();
	var emptyVec3 = vec3.create();
	var position = vec3.create();
	var tempQuat = quat.create();
	for(var i = 0 ; i < this._particles.length ; i++) {
		var realIndex = this._indexes[i];
		var p = this._particles[realIndex];
		
		if(p.entity != null) {
			// Position of the particle is relative to an entity position
			vec3.copy(position, p.position);
			
			var invertedRotation = quat.copy(tempQuat, p.entity.rotation);
			quat.invert(tempQuat, tempQuat);
			vec3.transformQuat(position, position, tempQuat);
			
			vec3.add(position, position, p.entity.position);
			mat4.translate(currentMvMatrix, mvMatrix, position);
			this._gl.uniform3fv(shader.getVar("uEntityPosition"), p.entity.position);
		} else {
			mat4.translate(currentMvMatrix, mvMatrix, p.position);
			this._gl.uniform3fv(shader.getVar("uEntityPosition"), emptyVec3);
		}
		this._gl.uniformMatrix4fv(shader.getVar("uMVMatrix"), false, currentMvMatrix);
		
		this._gl.bindTexture(this._gl.TEXTURE_2D, p.texture);
		this._gl.drawElements(this._gl.POINTS, 1, this._gl.UNSIGNED_SHORT, 2 * i);
	}
	gl.depthMask(true);
};