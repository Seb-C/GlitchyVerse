// If these constants are changed, World.js and fragmentShader.glsl must be updated too.
const int DRAW_MODE_NORMAL      = 0;
const int DRAW_MODE_PICK_MESH   = 1;
const int DRAW_MODE_PICK_SCREEN = 2;

// TODO use uniforms instead of these constants ?
// TODO values precision ?

attribute highp vec3  aVertexPosition;
attribute highp vec3  aVertexNormal;
attribute highp vec2  aTextureCoord;
attribute highp float aVertexShining;
attribute highp vec3  aPickColor;

uniform highp mat4 uMVMatrix;
uniform highp mat4 uPMatrix;
uniform highp vec3 uCurrentPosition;
uniform highp vec4 uCurrentRotation;

uniform highp float uAmbientLight;

uniform highp int uDrawMode;

varying highp vec2 vTextureCoord;
varying highp float vLighting;
varying highp vec3 vPickColor;
varying highp vec3 vRotatedVertexPosition;
varying highp vec3 vRotatedNormals;

highp vec3 rotate_vector(highp vec4 quat, highp vec3 vec);

void main(void) {
	vRotatedVertexPosition = rotate_vector(uCurrentRotation, aVertexPosition);
	gl_Position = uPMatrix * uMVMatrix * vec4(vRotatedVertexPosition, 1.0);
	
	if(uDrawMode == DRAW_MODE_NORMAL) {
		vRotatedNormals = rotate_vector(uCurrentRotation, aVertexNormal);
		
		vTextureCoord = aTextureCoord;
		vLighting = uAmbientLight * abs(aVertexShining);
	} else /*if(uDrawMode == DRAW_MODE_PICK_MESH || uDrawMode == DRAW_MODE_PICK_SCREEN)*/ {
		vPickColor = aPickColor;
	}
}

// https://twistedpairdevelopment.wordpress.com/2013/02/11/rotating-a-vector-by-a-quaternion-in-glsl/
highp vec3 rotate_vector(highp vec4 quat, highp vec3 vec) {
	return vec + 2.0 * cross(cross(vec, quat.xyz) + quat.w * vec, quat.xyz);
}