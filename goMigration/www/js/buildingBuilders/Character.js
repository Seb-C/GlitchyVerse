Building.builders.Character = (function() {
	var facesTextures = {};
	var defaultFace = "[+]:)";
	var faceTextureSize = 64;
	
	return function(building, state) {
		building.model.loadMeshesFromObj("character.obj");
		building.model.regenerateCache();
		
		var hitBox = HitBox.createFromModel(building.model);
		hitBox.isDynamic = true;
		building.hitBoxes.push(hitBox);
		building.spaceShip.physics.add(hitBox);
		
		building.changeFace = function(asciiFace) {
			var newTexture;
			if(facesTextures[asciiFace]) {
				newTexture = facesTextures[asciiFace];
			} else {
				var canvas = document.createElement("canvas");
				canvas.width = canvas.height = faceTextureSize;
				var context = canvas.getContext("2d");
				
				var text = asciiFace, x = faceTextureSize / 2, y = x;
				if(text.substr(0, 3) == "[-]") {
					x -= faceTextureSize;
					text = text.substr(3);
					context.rotate(-Math.PI / 2);
				} else if(text.substr(0, 3) == "[+]") {
					y -= faceTextureSize;
					text = text.substr(3);
					context.rotate(Math.PI / 2);
				}
				
				context.fillStyle = "black";
				context.textAlign = "center";
				context.textBaseline = "middle";
				context.font = Math.round(faceTextureSize / text.length) + "px monospace";
				context.fillText(text, x, y);
				
				newTexture = Materials.setCanvasAsTexture(building.world.gl, canvas, null);
				facesTextures[asciiFace] = newTexture;
				newTexture.isTransparency = true;
			}
			
			var meshes = building.model.meshGroups["face"];
			for(var i = 0 ; i < meshes.length ; i++) {
				meshes[i].texture = newTexture;
			}
			building.model.regenerateCache();
		};
		building.changeFace(defaultFace);
		
		var isWalking = false;
		building.onMoveInSpaceShip = function() {
			if(!isWalking) {
				isWalking = true;
				building.world.animator.animate(building, "walk", function() {
					isWalking = false;
				});
			}
		};
		
		// TODO interface for the controlled character + for the A.I.
		// TODO better prefixes (like hats with "<" and ">" (+ "v" + "^") ?)
		setTimeout(function() { building.changeFace("[+]:s"); },  2000);
		setTimeout(function() { building.changeFace("[+]:("); },  4000);
		setTimeout(function() { building.changeFace("[+]:D"); },  6000);
		setTimeout(function() { building.changeFace("[+]:P"); },  8000);
		setTimeout(function() { building.changeFace("[-]D:"); }, 10000);
		setTimeout(function() { building.changeFace("T_T");   }, 12000);
		setTimeout(function() { building.changeFace("Zzz");   }, 14000);
	};
})();