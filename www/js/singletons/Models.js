/**
 * Contains some models which needs to be generated dynamically (other are in obj files).
 * Models are in separated files, in /js/models/*.js
 * Each model is a class extending Entity.
 */
var Models = {
	objectsDirectory: "www/objects/",
	_loadedObjFiles: {},
	
	/**
	 * Loads a list of meshes from an obj file
	 * @param String the name of the obj file (relatively to the objects directory), with it's extension
	 * @param vec3 (optional) The scale to apply to the vertices
	 * @return Array Containing the meshes
	 */
	loadMeshesFromObj: function(fileName, scale) {
		if(!this._loadedObjFiles[fileName]) {
			this._loadedObjFiles[fileName] = FILES.getText(Models.objectsDirectory + fileName);
		}
		
		var verticesScale = scale || [1, 1, 1];
		
		// TODO optimize it : store data in this._loadedObjFiles after regexp and splits
		
		var fileContent = this._loadedObjFiles[fileName];
		fileContent = fileContent.replace(/#.*$/gm, ""); // Removing comments
		fileContent = fileContent.replace(/\t/g, " "); // Replacing tabs with spaces
		fileContent = fileContent.replace(/(\r\n|\r|\n)+/g, "\n"); // Removing blank lines and using only \n
		fileContent = fileContent.replace(/^ +| +$/gm, ""); // Trim each line
		fileContent = fileContent.replace(/ +/g, " "); // Replacing multiple spaces by a single space
		var lines = fileContent.split("\n");
		
		var verticesList      = [];
		var normalsList       = [];
		var texturesPartsList = [];
		var currentMaterial = Materials.get("WHITE");
		var currentGroups = ["default"];
		var meshes = [];
		var groupedMeshes = {};
		for(var i = 0 ; i < lines.length ; i++) {
			var line = lines[i].split(" ");
			switch(line[0]) {
				case "mtllib":
					Materials.loadMtl(line[1]);
					break;
				case "v":
					verticesList.push(parseFloat(line[1]) * verticesScale[0]);
					verticesList.push(parseFloat(line[2]) * verticesScale[1]);
					verticesList.push(parseFloat(line[3]) * verticesScale[2]);
					break;
				case "vn":
					normalsList.push(parseFloat(line[1]));
					normalsList.push(parseFloat(line[2]));
					normalsList.push(parseFloat(line[3]));
					break;
				case "vt":
					texturesPartsList.push(parseFloat(line[1]));
					texturesPartsList.push(parseFloat(line[2]));
					break;
				case "usemtl":
					currentMaterial = Materials.get(line[1]);
					break;
				case "f":
					var vertices     = [];
					var normals      = [];
					var textureParts = [];
					for(var j = 1 ; j < line.length ; j++) {
						var definition = line[j].split("/");
						
						var defIndex0 = parseInt(definition[0]);
						vertices.push(verticesList[(defIndex0 - 1) * 3    ]);
						vertices.push(verticesList[(defIndex0 - 1) * 3 + 1]);
						vertices.push(verticesList[(defIndex0 - 1) * 3 + 2]);
						
						if(definition[1] && definition[1] != "") {
							var defIndex1 = parseInt(definition[1]);
							textureParts.push(texturesPartsList[(defIndex1 - 1) * 2    ]);
							textureParts.push(texturesPartsList[(defIndex1 - 1) * 2 + 1]);
						}
						
						if(definition[2] && definition[2] != "") {
							var defIndex2 = parseInt(definition[2]);
							normals.push(normalsList[(defIndex2 - 1) * 3    ]);
							normals.push(normalsList[(defIndex2 - 1) * 3 + 1]);
							normals.push(normalsList[(defIndex2 - 1) * 3 + 2]);
						} else {
							normals.push(0);
							normals.push(0);
							normals.push(0);
						}
					}
					if(textureParts.length == 0) textureParts = null;
					
					var mesh = new Mesh(currentMaterial, vertices, normals, textureParts, currentGroups);
					meshes.push(mesh);
					
					break;
				case "g": 
					currentGroups = line.slice(1);
					break;
				default:
					//throw new Error("Instruction " + line[0] + " in obj file " + fileName + " is not supported.");
			}
		}
		
		return meshes;
	}
};
