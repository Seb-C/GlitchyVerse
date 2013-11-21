/**
 * Creates a particle with given parameters
 * @param WebGLTextureThe texture of the particle
 * @param vec3 The initial position of the particle
 * @param float The size of the particle
 * @param Array(4) The color of the particle (RGBA components between 0.0 and 1.0)
 * @param float (optional) The maximum life time of a particle, in seconds
 * @param vec3 (optional) The movement to apply to the particle each second
 * @param Entity (optional) If the particle position is relative to an entity position.
 */
var Particle = function(texture, position, size, color, lifeTime, movement, entity) {
	this.texture = texture;
	this.position = position;
	this.size = size;
	this.color = color;
	this.lifeTime = lifeTime || 0;
	this.createTime = TimerManager.lastUpdateTimeStamp / 1000;
	this.movement = movement || [0, 0, 0];
	this.entity = entity || null;
	
	//this.position[0] += (Math.random() - 0.5) / 10;
	//this.position[1] += (Math.random() - 0.5) / 10;
	//this.position[2] += (Math.random() - 0.5) / 10;
};

/**
 * Determines if particle is dead and should be deleted
 * @param float (optional) The current time, in seconds. 
 *              If not given, the time will be calculated for each particle.
 * @return boolean True if particle is dead
 */
Particle.prototype.isDead = function(currentTime) {
	var time = currentTime || TimerManager.lastUpdateTimeStamp / 1000;
	var isDead = this.lifeTime > 0 && time - this.createTime >= this.lifeTime;
	return isDead;
};

/**
 * Returns the current position of the particle
 * @param float (optional) The current time, in seconds. 
 *              If not given, the time will be calculated for each particle.
 * @return vec3 The current position of the particle
 */
Particle.prototype.getCurrentPosition = function(currentTime) {
	var time = currentTime || TimerManager.lastUpdateTimeStamp / 1000;
	
	var moved = vec3.create();
	vec3.scale(moved, this.movement, time - this.createTime);
	vec3.add(moved, moved, this.position);
	return moved;
};