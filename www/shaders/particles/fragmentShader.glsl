precision mediump float;
precision mediump int;
precision mediump sampler2D;

uniform sampler2D uSampler;

varying float vTimePassedRate;
varying vec4 vColor;
varying float vDiscard;

void main(void) {
	if(vDiscard == 1.0) discard;
	gl_FragColor = vColor * texture2D(uSampler, gl_PointCoord);
	gl_FragColor.a *= 1.0 - vTimePassedRate;
}
