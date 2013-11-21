var Shader = function() {
	this.directory = "/shaders/";
	this._shaders = new Array();
	this.program = null;
	this._gl = null;
	this._vars = {};
};

/**
 * Loads a fragment shader file from network
 * @param String The glsl file to load (relative to the shaders directory)
 */
Shader.prototype.loadFragmentShader = function(fileName) {
	this._load("FRAGMENT_SHADER", fileName);
};

/**
 * Loads a vertex shader file from network
 * @param String The glsl file to load (relative to the shaders directory)
 */
Shader.prototype.loadVertexShader = function(fileName) {
	this._load("VERTEX_SHADER", fileName);
};

/**
 * Loads the shaders from network
 * @param String The name of the WebGL constant of the shader type (FRAGMENT_SHADER, VERTEX_SHADER ...)
 * @param String The glsl file to load (relative to the shaders directory)
 */
Shader.prototype._load = function(typeConstantName, fileName) {
	var shader = {
		source: null,
		typeConstantName: typeConstantName,
		shader: null
	};
	this._shaders.push(shader);

	var ajax = new XMLHttpRequest();
	ajax.open("GET", this.directory + fileName, false);
	ajax.send(null);

	if(ajax.readyState == ajax.DONE && ajax.status == 200) {
		shader.source = ajax.responseText;
	}
};

/**
 * Initialises the shaders
 * @param WebGL The WebGl context
 */
Shader.prototype.init = function(gl) {
	this._gl = gl;
	this.program = gl.createProgram();
	for(var i in this._shaders) {
		var s = this._shaders[i];
		
		s.shader = gl.createShader(gl[s.typeConstantName]);
		gl.shaderSource(s.shader, s.source);
		gl.compileShader(s.shader);
		
		if(!gl.getShaderParameter(s.shader, gl.COMPILE_STATUS)) {  
			throw new Error("An error occurred compiling the shader " + s.typeConstantName + " : " + gl.getShaderInfoLog(s.shader));
		}
		
		gl.attachShader(this.program, s.shader);
	}
	gl.linkProgram(this.program);
	
	if(!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
		throw new Error("Unable to initialize the shader program.");
	}
};

/**
 * Initialises (if required) and returns a link to a shader uniform or attribute
 * @param String The name of the variable in the shader
 * @returns The link to the variable
 */
Shader.prototype.getVar = function(varName) {
	if(this._vars[varName]) {
		return this._vars[varName];
	} else {
		switch(varName.substring(0, 1)) {
			case 'a':
				this._vars[varName] = this._gl.getAttribLocation(this.program, varName);
				this._gl.enableVertexAttribArray(this._vars[varName]);
				return this._vars[varName];
			case 'u':
				this._vars[varName] = this._gl.getUniformLocation(this.program, varName);
				return this._vars[varName];
			default: 
				throw new Error("Cannot determine var type in shader " 
							  + "(must start with 'a' or 'u', " + varName + " given.");
		}
	}
};