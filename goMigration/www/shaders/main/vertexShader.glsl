precision mediump float;
precision mediump int;

// If these constants are changed, World.js and fragmentShader.glsl must be updated too.
const int DRAW_MODE_NORMAL       = 0;
const int DRAW_MODE_PICK_CONTENT = 1;
const int DRAW_MODE_PICK_SCREEN  = 2;

// TODO use uniforms instead of these constants ?
// TODO values precision ?

attribute vec3 aVertexPosition;
attribute vec3 aVertexNormal;
attribute vec2 aTextureCoord;
attribute vec3 aPickColor;
attribute vec2 aTextureMapping;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform vec3 uCurrentPosition;
uniform vec4 uCurrentRotation;

uniform float uAmbientLight;

uniform int uDrawMode;
uniform float uHasMappedTexture;

varying vec2 vTextureCoord;
varying float vLighting;
varying vec3 vPickColor;
varying vec3 vRotatedVertexPosition;
varying vec3 vRotatedNormals;
varying vec2 vTextureMapping;

vec3 rotate_vector(vec4 quat, vec3 vec);

void main(void) {
	vRotatedVertexPosition = rotate_vector(uCurrentRotation, aVertexPosition);
	gl_Position = uPMatrix * uMVMatrix * vec4(vRotatedVertexPosition + uCurrentPosition, 1.0);
	
	if(uDrawMode == DRAW_MODE_NORMAL) {
		vRotatedNormals = rotate_vector(uCurrentRotation, aVertexNormal);
		
		vTextureCoord = aTextureCoord;
		if(uHasMappedTexture == 1.0) vTextureMapping = aTextureMapping;
		
		// Applying ambient light only when normals are defined (!= [0, 0, 0])
		if(aVertexNormal == vec3(0)) {
			vLighting = 1.0;
		} else {
			vLighting = uAmbientLight;
		}
		
	} else /*if(uDrawMode == DRAW_MODE_PICK_CONTENT || uDrawMode == DRAW_MODE_PICK_SCREEN)*/ {
		vPickColor = aPickColor;
	}
}

// https://twistedpairdevelopment.wordpress.com/2013/02/11/rotating-a-vector-by-a-quaternion-in-glsl/
vec3 rotate_vector(vec4 quat, vec3 vec) {
	return vec + 2.0 * cross(cross(vec, quat.xyz) + quat.w * vec, quat.xyz);
}
