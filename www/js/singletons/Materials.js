/**
 * Loads the textures from the network and loads it in WebGL
 */
var Materials = {
	_loadedMtlFiles: [],
	_gl: null, // If initialized, contains gl object
	_texturesToLoad: {},
	_transparency: {},
	_glTextures: {},
	images: {},
	
	get: function(name) {
		if(!this._glTextures[name]) {
			this._glTextures[name] = this._gl.createTexture();
		}
		return this._glTextures[name];
	},
	
	/**
	 * Reads a mtl file to load textures
	 * @param String The mtl file name (relatively to the "materials" directory)
	 */
	loadMtl: function(fileName) {
		if(this._loadedMtlFiles.indexOf(fileName) == -1) {
			this._loadedMtlFiles.push(fileName);
			
			var content = FILES.getText(Models.objectsDirectory + fileName);
			content = content.replace(/#.*$/gm, ""); // Removing comments
			content = content.replace(/\t/g, " "); // Replacing tabs with spaces
			content = content.replace(/(\r\n|\r|\n)+/g, "\n"); // Removing blank lines and using only \n
			content = content.replace(/^ +| +$/gm, ""); // Trim each line
			content = content.replace(/ +/g, " "); // Replacing multiple spaces by a single space
			var lines = content.split("\n");
			
			var currentMtlName = null;
			for(var i = 0 ; i < lines.length ; i++) {
				if(lines[i].length > 0) {
					var line = lines[i].split(" ");
					switch(line[0]) {
						case "newmtl":
							currentMtlName = line[1];
							break;
						case "map_Kd":
							if(currentMtlName == null) {
								throw new Error("Error reading material file " + fileName + " : newmtl must preceed map_Kd " + line[1]);
							} else {
								this._texturesToLoad[currentMtlName] = Models.objectsDirectory + line[1];
							}
							break;
						case "d":
							if(currentMtlName == null) {
								throw new Error("Error reading material file " + fileName + " : newmtl must preceed d " + line[1]);
							} else {
								this._transparency[currentMtlName] = (parseFloat(line[1]) != 1);
							}
							break;
						default:
							throw new Error("Only newmtl, map_Kd and d instructions are currently supported.");
					}
				}
			}
			
			if(this._gl != null) {
				this.init(this._gl);
			}
		}
	},
	
	/**
	 * Loads textures in WebGL, after receiving it from network
	 * @param WebGL The WebGL context
	 */
	init: function(gl) {
		var self = this;
		Object.keys(this._texturesToLoad).map(function(k) {
			var texture;
			if(self._glTextures[k]) {
				texture = self._glTextures[k];
			} else {
				var texture = self._glTextures[k] = gl.createTexture();
			}
			
			self.images[k] = FILES.getImage(self._texturesToLoad[k], function() {
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
				gl.generateMipmap(gl.TEXTURE_2D);
			});
			
			texture.isTransparency = self._transparency[k] ? true : false;
		});
		this._texturesToLoad = {};
		
		this._gl = gl;
	},
	
	/**
	 * Loads a canvas into a texture
	 * @param WebGL The WebGL context
	 * @param DOMCanvas|ImageData The canvas or ImageData object to load
	 * @param GLTexture The previously generated texture, or null
	 * @return GLTexture The texture
	 */
	setCanvasAsTexture: function(gl, canvas, glTexture) {
		var texture = glTexture ? glTexture : gl.createTexture();
		
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
		gl.generateMipmap(gl.TEXTURE_2D);
		
		return texture;
	},
	
	/**
	 * Loads a pixel array as a texture
	 * @param WebGL The WebGL context
	 * @param Array|ArrayBuffer The pixels list, as RGB components
	 * @param GLTexture The previously generated texture, or null
	 * @return GLTexture The texture
	 */
	setPixelArrayAsTexture: function(gl, width, height, pixels, glTexture) {
		var texture = glTexture ? glTexture : gl.createTexture();
		
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(pixels));
		gl.generateMipmap(gl.TEXTURE_2D);
		
		return texture;
	}
};
