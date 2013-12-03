precision mediump float;
precision mediump int;

uniform float uCurrentTime;
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform vec3 uCameraPosition;
uniform vec2 uScreenSize;
uniform float uFovy;
uniform vec3 uEntityPosition;

attribute vec3 aPosition;
attribute float aSize;
attribute vec4 aColor;
attribute float aLifeTime;
attribute float aCreateTime;
attribute vec3 aMovement;

varying float vTimePassedRate;
varying vec4 vColor;

// Boolean : True if particle is dead and must be discarded in fragment shader
varying float vDiscard;

void main(void) {
	vColor          = aColor; // To fragment shader
	vDiscard        = 0.0;    // Default Value = false
	vTimePassedRate = 0.0;    // Default value = no life limit
	
	// Determining life time passed
	float timePassed = uCurrentTime - aCreateTime;
	if(aLifeTime > 0.0) vTimePassedRate = clamp(timePassed / aLifeTime, 0.0, 1.0);
	
	// Setting position and size, only if it's not dead. Else, discarding.
	if(vTimePassedRate < 1.0) {
		// We don't use aPosition because mvMatrix has already been translated
		gl_Position = uPMatrix * uMVMatrix * vec4(timePassed * aMovement, 1.0);
		
		// Point size is different than viewed size because of distance
		float pointSize = aSize * (0.5 + (1.0 - vTimePassedRate) / 2.0);
		float pixelsPerRadian = uScreenSize.y / 2.0 / uFovy;
		float pointDistance = abs(length((aPosition + uEntityPosition) - uCameraPosition));
		// Multiplying it to have (approximately) the same unit shared by vertices and particles
		gl_PointSize = pixelsPerRadian * pointSize / pointDistance * 82.0;
	} else {
		vDiscard = 1.0;
	}
}

/*mat4 translate(mat4 a, vec3 v) {
	mat4 o = mat4(0);
	
	float x = v[0]; float y = v[1]; float z = v[2];
	float a00; float a01; float a02; float a03;
	float a10; float a11; float a12; float a13;
	float a20; float a21; float a22; float a23;
	
	a00 = a[0][0]; a01 = a[0][1]; a02 = a[0][2]; a03 = a[0][3];
	a10 = a[1][0]; a11 = a[1][1]; a12 = a[1][2]; a13 = a[1][3];
	a20 = a[2][0]; a21 = a[2][1]; a22 = a[2][2]; a23 = a[2][3];
	
	o[0][0] = a00; o[0][1] = a01; o[0][2] = a02; o[0][3] = a03;
	o[1][0] = a10; o[1][1] = a11; o[1][2] = a12; o[1][3] = a13;
	o[2][0] = a20; o[2][1] = a21; o[2][2] = a22; o[2][3] = a23;
	
	o[3][0] = a00 * x + a10 * y + a20 * z + a[3][0];
	o[3][1] = a01 * x + a11 * y + a21 * z + a[3][1];
	o[3][2] = a02 * x + a12 * y + a22 * z + a[3][2];
	o[3][3] = a03 * x + a13 * y + a23 * z + a[3][3];
	
	return o;
}*/
