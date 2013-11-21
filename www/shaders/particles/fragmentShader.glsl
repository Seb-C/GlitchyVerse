uniform highp sampler2D uSampler;

varying highp float vTimePassedRate;
varying highp vec4 vColor;
varying highp float vDiscard;

void main(void) {
	if(vDiscard == 1.0) discard;
	gl_FragColor = vColor * texture2D(uSampler, gl_PointCoord);
	gl_FragColor.a *= 1.0 - vTimePassedRate;
}