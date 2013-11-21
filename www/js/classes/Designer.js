/**
 * Interface allowing the player to modify his spaceship
 * @param Object containing object types definition
 */
var Designer = function(world, definition) {
	this.world = world;
	this.spaceShip = null;
	this.types     = definition;
	
	this.selectedType      = null; // When choosing a new building in a tree
	this.selectedPosition  = null;
	this.selectedRotation  = null;
	this.currentBuildPopup = null;
	
	this.contextMenuTargetObject = null;
	this.contextMenu             = null;
	
	this._DOMWindow = null;
	this.canvas     = null;
	this.context    = null;
	this.isVisible  = false; // Used by world.draw
	
	this.canvasSize = vec2.fromValues(640, 480);
	
	this.roomUnitSize = 50;
	this.zoom         = 1;
	this.scroll       = vec3.fromValues(0, 0, 0); // scroll including floor (y), initialized by setSpaceShip
	this.currentMousePositionInCanvas = vec2.create();
	
	this.angleSelectorPointsRadius = 6;
	this.angleSelectorArrowSize    = 10;
	
	// TODO in database, add a field to forbid removing the last object of a determined type (propeller, room ...)
	
	// Creating designer button
	this._DOMShowButton = document.createElement("div");
	this._DOMShowButton.setAttribute("id",    "designerButton");
	this._DOMShowButton.setAttribute("alt",   "Designer");
	this._DOMShowButton.setAttribute("title", "Designer");
	var self = this;
	this._DOMShowButton.addEventListener("click", function() {
		if(self._DOMWindow) {
			self._DOMWindow.showWindow();
		} else {
			self._createDesignerWindow();
		}
		self.isVisible = true;
	});
	document.body.appendChild(this._DOMShowButton);
};

// TODO building times + "ghost" objects while building
// TODO history window

Designer.prototype.setSpaceShip = function(spaceShip) {
	this.spaceShip = spaceShip;
	
	this.scroll = vec3.clone(this.spaceShip.maxBounds);
	vec3.subtract(this.scroll, this.scroll, this.spaceShip.minBounds);
	vec3.scale(this.scroll, this.scroll, 0.5);
	vec3.add(this.scroll, this.scroll, this.spaceShip.minBounds);
	
	this.scroll[0] += (this.canvasSize[0] / 2) / this.roomUnitSize;
	this.scroll[1] = Math.round(this.scroll[1]);
	this.scroll[2] = -this.scroll[2] + (this.canvasSize[1] / 2) / this.roomUnitSize;
};

/**
 * Creates the designer window and it's content
 */
Designer.prototype._createDesignerWindow = function() {
	var self = this;
	this._DOMWindow = createWindow(this.canvasSize[0], this.canvasSize[1], "Designer", false, function() {
		self.isVisible = false;
	});
	this._DOMWindow.setAttribute("id", "designerWindowContent");
	
	this._createDesignerCanvas();
	this._createDesignerTree();
	this._createSizeSelectors();
	this._createContextMenu();
};

Designer.prototype._createDesignerCanvas = function() {
	var self = this;
	
	// Creating canvas
	this.canvas = document.createElement("canvas");
	this.canvas.width  = this._DOMWindow.clientWidth;
	this.canvas.height = this._DOMWindow.clientHeight;
	
	// Zoom with mouse wheel
	var mouseWheelCallBack = function(delta, mouseX, mouseY) {
		// Applying zoom
		var delta2 = (delta < 0 ? -1 : 1) * 0.075;
		self.zoom *= 1 + delta2;
		
		// Centering zoom on cursor
		self.scroll[0] -= (mouseX / (self.roomUnitSize * self.zoom)) * delta2;
		self.scroll[2] -= (mouseY / (self.roomUnitSize * self.zoom)) * delta2;
	};
	// First version = all browsers except firefox. Second = firefox ...
	this.canvas.addEventListener("mousewheel",     function(event) { mouseWheelCallBack(event.wheelDelta, event.layerX, event.layerY); });
	this.canvas.addEventListener("DOMMouseScroll", function(event) { mouseWheelCallBack(-40*event.detail, event.layerX, event.layerY); });
	
	// Moving
	var initialMousePos = null;
	var lastMousePos = null;
	this.canvas.addEventListener("mousedown", function(event) {
		lastMousePos    = vec2.fromValues(event.clientX, event.clientY);
		initialMousePos = vec2.clone(lastMousePos);
		self.contextMenu.setAttribute("data-isVisible", false);
	});
	this.canvas.addEventListener("mouseup", function(event) {
		if(lastMousePos != null && lastMousePos[0] == initialMousePos[0] && lastMousePos[1] == initialMousePos[1]) {
			// Simple click
			
			var mouseRoomCoordinates = vec2.fromValues(
				Math.round((self.currentMousePositionInCanvas[0] / (self.roomUnitSize * self.zoom) - self.scroll[0]) * 2) / 2,
				Math.round((self.currentMousePositionInCanvas[1] / (self.roomUnitSize * self.zoom) - self.scroll[2]) * 2) / 2
			);
			var isXInteger = mouseRoomCoordinates[0] == Math.floor(mouseRoomCoordinates[0]);
			var isYInteger = mouseRoomCoordinates[1] == Math.floor(mouseRoomCoordinates[1]);
			
			if(event.button == 2) { // Right click
				var isGap = (isXInteger || isYInteger) && !(isXInteger && isYInteger); // (isXInteger XOR isYInteger)
				
				self.contextMenuTargetObject = null;
				var keys = Object.keys(self.spaceShip.entities);
				for(var i = keys.length - 1 ; i >= 0 ; i--) {
					var k = keys[i];
					var entity   = self.spaceShip.entities[k];
					var position = self.spaceShip.objectPositions[k];
					var size     = self.spaceShip.objectSizes[k];
					
					if(
						(
							!isGap
							&& mouseRoomCoordinates[0] >= position[0] && mouseRoomCoordinates[0] <= position[0] + size[0] - 1
							&& self.scroll[1]          >= position[1] && self.scroll[1]          <= position[1] + size[1] - 1
							&& mouseRoomCoordinates[1] >= position[2] && mouseRoomCoordinates[1] <= position[2] + size[2] - 1
						) || (
							isGap
							&& mouseRoomCoordinates[0] == position[0]
							&& self.scroll[1]          == position[1]
							&& mouseRoomCoordinates[1] == position[2]
						)
					) {
						self.contextMenuTargetObject = entity;
						if(!(entity instanceof Models.Room)) {
							// If it's a Room, we have to check if there's another entity on it
							break;
						}
					}
				}
				if(self.contextMenuTargetObject != null) {
					// User has right-clicked on something, so we open the menu
					self.contextMenu.setPosition(event.layerX, event.layerY);
					self.contextMenu.setAttribute("data-isVisible", true);
				}
			} else if(self.selectedType != null) {
				var rotation = null;
				if(self.selectedPosition == null) {
					if(self.selectedType.is_gap) {
						self.selectedPosition = [mouseRoomCoordinates[0], self.scroll[1], mouseRoomCoordinates[1]];
						if(isXInteger && !isYInteger) {
							self.selectedRotation = [0, 0, 0];
						} else if(!isXInteger && isYInteger) {
							self.selectedRotation = [0, 90, 0];
						} else {
							return;
						}
					} else {
						self.selectedPosition = [Math.round(mouseRoomCoordinates[0]), self.scroll[1], Math.round(mouseRoomCoordinates[1])];
						if(self.selectedType.rotation_allowed_divisions[1] == 0) {
							// TODO rotation for x and z ?
							self.selectedRotation = [0, 0, 0];
						}
					}
				}
				
				// (cannot be in "else" of the previous "if")
				if(self.selectedPosition != null && self.selectedRotation != null) {
					var size = (self.selectedType.is_sizeable ? [self.domSizeX.value, self.domSizeY.value, self.domSizeZ.value] : [1, 1, 1]);
					self.currentBuildPopup = confirmPopup(
						self._DOMWindow,
						"Build : " + self.selectedType.name,
						function() {
							self.selectedType.domElement.setAttribute("data-isSelected", false);
							self.sizeSelectorsContainer.style.display = "none";
							self.canvas.style.cursor = "default";
							self.selectedType      = null;
							self.selectedPosition  = null;
							self.selectedRotation  = null;
							
							return true;
						},
						function() {
							self.world.server.sendMessage("build_query", {
								"type_id": self.selectedType.id,
								"position": self.selectedPosition,
								"size": size,
								"rotation": self.selectedRotation,
								"use_money": self.currentBuildPopup.useMoney
							});
							// TODO database : ressources + build times
							self.currentBuildPopup.disableButtons(true);
							self.currentBuildPopup.setMessage("Please wait ...");
							
							return false;
						}
					);
					self.world.resourceManager.buildCostTable(self.currentBuildPopup, self.selectedType.id, size, false);
				}
			}
		} else {
			self.canvas.style.cursor = self.selectedType == null ? "default" : "copy";
		}
		lastMousePos = null;
	});
	this.canvas.addEventListener("mousemove", function(event) {
		vec2.set(self.currentMousePositionInCanvas, event.layerX, event.layerY);
		
		// Scrolling
		if(lastMousePos != null) {
			self.canvas.style.cursor = "move";
			var currentPosition = vec2.fromValues(event.clientX, event.clientY);
			vec2.subtract(currentPosition, currentPosition, lastMousePos);
			self.scroll[0] += (currentPosition[0] / self.zoom) / self.roomUnitSize;
			self.scroll[2] += (currentPosition[1] / self.zoom) / self.roomUnitSize;
			vec2.set(lastMousePos, event.clientX, event.clientY);
			
			// Checking that scroll is inside SpaceShip bounds
			var trueSize  = self.zoom * self.roomUnitSize;
			var xToMiddle = (self.canvasSize[0] / 2) / trueSize;
			var yToMiddle = (self.canvasSize[1] / 2) / trueSize;
			
			if(self.scroll[0] - xToMiddle < self.spaceShip.minBounds[0]) {
				self.scroll[0] = self.spaceShip.minBounds[0] + xToMiddle;
			} else if(self.scroll[0] - xToMiddle > self.spaceShip.maxBounds[0]) {
				self.scroll[0] = self.spaceShip.maxBounds[0] + xToMiddle;
			}
			
			if(-(self.scroll[2] - yToMiddle) < self.spaceShip.minBounds[2]) {
				self.scroll[2] = -self.spaceShip.minBounds[2] + yToMiddle;
			} else if(-(self.scroll[2] - yToMiddle) > self.spaceShip.maxBounds[2]) {
				self.scroll[2] = -self.spaceShip.maxBounds[2] + yToMiddle;
			}
		}
		
		// Choosing angle when building
		if(self.selectedType != null && self.selectedPosition != null && self.selectedType.rotation_allowed_divisions[1] != 0) {
			if(self.selectedRotation == null) self.selectedRotation = [0, 0, 0];
			
			var trueSize = self.roomUnitSize * self.zoom;
			var position = [
				trueSize * self.selectedPosition[0] + self.scroll[0] * trueSize,
				trueSize * self.selectedPosition[2] + self.scroll[2] * trueSize
			];
			var rotation = Math.atan2(event.layerY - position[1], event.layerX - position[0]);
			if(rotation < 0) rotation += Math.PI * 2;
			
			if(self.selectedType.rotation_allowed_divisions[1] > 0) {
				// Constraining the angle
				var angleByPart = Math.PI * 2 / self.selectedType.rotation_allowed_divisions[1];
				var angleMod = (rotation % angleByPart);
				rotation -= angleMod;
				if(angleMod > angleByPart / 2) rotation += angleByPart;
			}
			
			self.selectedRotation[1] = radToDeg(rotation) + 90;
		}
	});
	
	this._DOMWindow.appendChild(this.canvas);
	this.context = this.canvas.getContext("2d");
	this.context.imageSmoothingEnabled = true;
	
	// Current floor number (creating it at first because it's referenced bu button events)
	this.floorSelectorLabel = document.createElement("div");
	this.floorSelectorLabel.setAttribute("class", "floorSelectorLabel");
	this.floorSelectorLabel.innerHTML = this.scroll[1];
	this._DOMWindow.appendChild(this.floorSelectorLabel);
	
	// Floor +1
	this.floorSelectorPlus = document.createElement("div");
	this.floorSelectorPlus.setAttribute("class", "floorSelectorPlus");
	this.floorSelectorPlus.innerHTML = "&uarr;";
	this.floorSelectorPlus.addEventListener("click", function(event) {
		self.floorSelectorLabel.innerHTML = ++self.scroll[1];
		if(self.scroll[1] > self.spaceShip.maxBounds[1] + 1) {
			self.scroll[1] = self.spaceShip.maxBounds[1] + 1;
			self.floorSelectorLabel.innerHTML = self.scroll[1];
		}
	});
	this._DOMWindow.appendChild(this.floorSelectorPlus);
	
	// Floor -1
	this.floorSelectorMinus = document.createElement("div");
	this.floorSelectorMinus.setAttribute("class", "floorSelectorMinus");
	this.floorSelectorMinus.innerHTML = "&darr;";
	this.floorSelectorMinus.addEventListener("click", function(event) {
		self.floorSelectorLabel.innerHTML = --self.scroll[1];
		if(self.scroll[1] < self.spaceShip.minBounds[1] - 1) {
			self.scroll[1] = self.spaceShip.minBounds[1] - 1;
			self.floorSelectorLabel.innerHTML = self.scroll[1];
		}
	});
	this._DOMWindow.appendChild(this.floorSelectorMinus);
};

Designer.prototype._createDesignerTree = function() {
	var self = this;
	
	var tree = document.createElement("ul");
	tree.setAttribute("class", "tree");
	this._DOMWindow.appendChild(tree);
	
	var tempCategoriesDOMSubElements = {};
	this.types.map(function(object) {
		if(!tempCategoriesDOMSubElements[object.category]) {
			// Creating category li
			var categoryDOMElement = document.createElement("li");
			categoryDOMElement.appendChild(document.createTextNode(object.category));
			categoryDOMElement.setAttribute("data-isOpened", false);
			categoryDOMElement.addEventListener("click", function(event) {
				if(event.target == this) {
					this.setAttribute("data-isOpened", this.getAttribute("data-isOpened") == "false");
				}
			});
			tree.appendChild(categoryDOMElement);
			
			// Creating category ul where to put types
			categoryDOMSubElement = document.createElement("ul");
			categoryDOMElement.appendChild(categoryDOMSubElement);
			tempCategoriesDOMSubElements[object.category] = categoryDOMSubElement;
		}
		
		object.domElement = document.createElement("li");
		object.domElement.appendChild(document.createTextNode(object.name));
		object.domElement.addEventListener("click", function(event) {
			if(self.selectedType != null) {
				self.selectedType.domElement.setAttribute("data-isSelected", false);
			}
			if(self.selectedType == object) {
				self.selectedType     = null;
				self.selectedPosition = null;
				self.selectedRotation = null;
				self.canvas.style.cursor = "default";
			} else {
				this.setAttribute("data-isSelected", true);
				self.selectedType = object;
				self.canvas.style.cursor = "copy";
			}
			
			self.sizeSelectorsContainer.style.display = (self.selectedType != null && self.selectedType.is_sizeable) ? "block" : "none";
		});
		tempCategoriesDOMSubElements[object.category].appendChild(object.domElement);
	});
	
	// TODO objects names --> client only (in a lang singleton ? How to manage category names ?), then remove names from database
};

Designer.prototype._createSizeSelectors = function() {
	this.sizeSelectorsContainer = document.createElement("div");
	this.sizeSelectorsContainer.setAttribute("class", "sizeSelectorsContainer");
	this._DOMWindow.appendChild(this.sizeSelectorsContainer);
	this.sizeSelectorsContainer.style.display = "none";
	
	this.domSizeX = document.createElement("input");
	this.domSizeX.setAttribute("type",  "number");
	this.domSizeX.setAttribute("class", "sizeSelector");
	this.domSizeX.setAttribute("step",  "1");
	this.domSizeX.setAttribute("min",   "1");
	this.domSizeX.setAttribute("title", "Width (X)");
	this.domSizeX.value = 1;
	this.domSizeX.addEventListener("change", function(event) {
		if(!/^[1-9][0-9]*$/.test(this.value)) {
			this.value = 1;
		}
	});
	this.sizeSelectorsContainer.appendChild(this.domSizeX);
	
	var multiplicatorSpan1 = document.createElement("span");
	multiplicatorSpan1.innerHTML = "&times";
	this.sizeSelectorsContainer.appendChild(multiplicatorSpan1);
	
	this.domSizeY = document.createElement("input");
	this.domSizeY.setAttribute("type",  "number");
	this.domSizeY.setAttribute("class", "sizeSelector");
	this.domSizeY.setAttribute("step",  "1");
	this.domSizeY.setAttribute("min",   "1");
	this.domSizeY.setAttribute("title", "Height (Y)");
	this.domSizeY.value = 1;
	this.domSizeY.addEventListener("change", function(event) {
		if(!/^[1-9][0-9]*$/.test(this.value)) {
			this.value = 1;
		}
	});
	this.sizeSelectorsContainer.appendChild(this.domSizeY);
	
	var multiplicatorSpan2 = document.createElement("span");
	multiplicatorSpan2.innerHTML = "&times";
	this.sizeSelectorsContainer.appendChild(multiplicatorSpan2);
	
	this.domSizeZ = document.createElement("input");
	this.domSizeZ.setAttribute("type",  "number");
	this.domSizeZ.setAttribute("class", "sizeSelector");
	this.domSizeZ.setAttribute("step",  "1");
	this.domSizeZ.setAttribute("min",   "1");
	this.domSizeZ.setAttribute("title", "Length (Z)");
	this.domSizeZ.value = 1;
	this.domSizeZ.addEventListener("change", function(event) {
		if(!/^[1-9][0-9]*$/.test(this.value)) {
			this.value = 1;
		}
	});
	this.sizeSelectorsContainer.appendChild(this.domSizeZ);
};

Designer.prototype._createContextMenu = function() {
	var self = this;
	this.contextMenu = contextMenu(this._DOMWindow, {
		"Dismantle": function(event) {
			// Determining selection type name
			var objectTypeName = null;
			for(var i = 0 ; i < self.types.length ; i++) {
				var type = self.types[i];
				
				if(self.contextMenuTargetObject.model == type.model) {
					objectTypeName = type.name; // TODO better use of a lang/locale class
				}
			}
			
			self.currentBuildPopup = confirmPopup(
				self._DOMWindow,
				"Dismantle : " + objectTypeName,
				function() {
					self.contextMenuTargetObject = null;
					self.contextMenu.setAttribute("data-isVisible", false);
					
					return true;
				},
				function() {
					self.world.server.sendMessage("dismantle_query", self.contextMenuTargetObject.id);
					
					// TODO database : ressources + build times
					self.contextMenuTargetObject = null;
					self.contextMenu.setAttribute("data-isVisible", false);
					
					return false;
				}
			);
			var targetObjectId = self.contextMenuTargetObject.id;
			var targetTypeId   = self.spaceShip.objectTypeIds[targetObjectId];
			var targetSize     = self.spaceShip.objectSizes[targetObjectId];
			self.world.resourceManager.buildCostTable(self.currentBuildPopup, targetTypeId, targetSize, true);
		}
	}, false);
};

/**
 * Changes the popup with the received result.
 * Called by ServerConnection.
 * @param boolean True if building was allowed
 */
Designer.prototype.setBuildResult = function(result) {
	if(result) {
		this.selectedType.domElement.setAttribute("data-isSelected", false);
		this.sizeSelectorsContainer.style.display = "none";
		this.currentBuildPopup.close();
		this.selectedType      = null;
		this.selectedPosition  = null;
		this.selectedRotation  = null;
		this.canvas.style.cursor = "default";
	} else {
		this.currentBuildPopup.disableButtons(false);
		this.currentBuildPopup.setMessage("You can't build that here.");
	}
};

/**
 * Changes the popup with the received result.
 * Called by ServerConnection.
 * @param boolean True if deletion was allowed
 */
Designer.prototype.setDismantleResult = function(result) {
	if(result) {
		this.contextMenuTargetObject = null;
		this.currentBuildPopup.close();
	} else {
		this.currentBuildPopup.disableButtons(false);
		this.currentBuildPopup.setMessage("You can't do that now.");
	}
};

/**
 * Re-draws the designer content
 */
Designer.prototype.draw = function() {
	// Determining room size on screen and border size
	var trueSize = this.roomUnitSize * this.zoom;
	var borderSize = trueSize / 20; // (trueSize / 2) * (0.2 * 2)
	var halfBorderSize = borderSize / 2;
	var objectsUnitSize = trueSize - borderSize * 2 + 1;
	
	// Initializing canvas
	this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
	this.context.strokeStyle = "black";
	this.context.lineWidth = borderSize;
	
	// TODO move room draw in Models as for other models ?
	
	// Looping rooms and drawing it
	var positionAlreadyDrawn = new MDArray(); // To debug some cases + TODO replace MDArray by ES6 maps (see WeakMap for example) and with polyfill ?
	var objectsKeysToDraw = new Array();
	for(var k in this.spaceShip.entities) {
		var entity   = this.spaceShip.entities[k];
		var size     = this.spaceShip.objectSizes[k];
		var position = this.spaceShip.objectPositions[k];
		
		if(entity instanceof Models.Room && (
			position[1] == this.scroll[1]
			|| (
				position[1] < this.scroll[1]
				&& (position[1] + size[1] - 1) >= this.scroll[1] - 1
			)
		)) {
			var posX  = (trueSize * position[0]) - (trueSize / 2) + (this.scroll[0] * trueSize);
			var posY  = (trueSize * position[2]) - (trueSize / 2) + (this.scroll[2] * trueSize);
			var sizeX = trueSize * size[0];
			var sizeY = trueSize * size[2];
			
			var isOut = (position[1] + size[1]) == this.scroll[1];
			
			if(isOut) {
				// TODO optimize that (and also the second loop like that) ?
				var goNextLoop = false;
				for(var i = 0 ; i < size[0] ; i++) {
					for(var j = 0 ; j < size[2] ; j++) {
						if(positionAlreadyDrawn.is([position[0] + i, position[2] + j])) {
							goNextLoop = true;
							break;
						}
					}
					if(goNextLoop) break;
				}
				if(goNextLoop) continue;
			}
			
			var image = isOut ? Materials.images.METAL : Materials.images.LINO_TILE;
			
			// Drawing floor
			canvasDrawTiledImage(
				this.context, 
				image,
				posX,
				posY,
				sizeX,
				sizeY,
				trueSize / 3.5
			);
			
			if(!isOut) {
				// Drawing gray mask if necessary
				if(position[1] != this.scroll[1]) {
					this.context.fillStyle = "rgba(0, 0, 0, 0.4)";
					this.context.fillRect(posX, posY, sizeX, sizeY);
				}
				
				// Drawing walls as a simple border
				this.context.strokeRect(
					posX + halfBorderSize - 1,
					posY + halfBorderSize - 1,
					sizeX - borderSize + 2,
					sizeY - borderSize + 2
				);
			}
			
			for(var i = 0 ; i < size[0] ; i++) {
				for(var j = 0 ; j < size[2] ; j++) {
					positionAlreadyDrawn.set([position[0] + i, position[2] + j], true);
				}
			}
		} else if(position[1] == this.scroll[1]) {
			objectsKeysToDraw.push(k);
		}
	}
	
	for(var i = 0 ; i < objectsKeysToDraw.length ; i++) {
		var k        = objectsKeysToDraw[i];
		var entity   = this.spaceShip.entities[k];
		var model    = this.spaceShip.objectModels[k];
		var size     = this.spaceShip.objectSizes[k];
		var position = this.spaceShip.objectPositions[k];
		var rotation = this.spaceShip.objectInitialRotations[k];
		
		this.context.save();
		this.context.translate(
			trueSize * (position[0] + this.scroll[0] + size[0] / 2 - 0.5),
			trueSize * (position[2] + this.scroll[2] + size[2] / 2 - 0.5)
		);
		if(rotation) this.context.rotate(degToRad(rotation[1]));
		
		this.context.scale(size[0], size[2]);
		
		if(DesignerModels[model]) {
			DesignerModels[model](entity, this.context, objectsUnitSize, borderSize);
		} else {
			this.context.textAlign    = "center";
			this.context.textBaseline = "middle";
			this.context.textBaseline = "middle";
			this.context.fillStyle    = "white";
			this.context.strokeStyle  = "black";
			this.context.lineWidth    = 1;
			this.context.font         = Math.round(objectsUnitSize * 0.5) + "px Arial";
			this.context.fillText  ("?", 0, 0);
			this.context.strokeText("?", 0, 0);
		}
		
		this.context.restore();
	}
	
	// Choosing the y angle of the new object
	if(this.selectedType != null && this.selectedPosition != null && this.selectedType.rotation_allowed_divisions[1] != 0) {
		if(this.selectedRotation == null) this.selectedRotation = [0, 0, 0];
		
		var trueSize = this.roomUnitSize * this.zoom;
		var position = [
			trueSize * this.selectedPosition[0] + this.scroll[0] * trueSize,
			trueSize * this.selectedPosition[2] + this.scroll[2] * trueSize
		];
		var circleRadius = trueSize / 2 - borderSize * 2;
		var pointsNumber = this.selectedType.rotation_allowed_divisions[1];
		var angleByPart = Math.PI * 2 / pointsNumber;
		
		this.context.fillStyle   = "black";
		this.context.strokeStyle = "black";
		
		if(pointsNumber == -1) {
			// Drawing circle
			this.context.lineWidth = this.angleSelectorPointsRadius * 2;
			this.context.beginPath();
			this.context.arc(position[0], position[1], circleRadius, 0, Math.PI * 2, true);
			this.context.stroke();
		} else {
			// Looping each point
			for(var i = 0 ; i < pointsNumber ; i++) {
				// Point center
				var x = Math.round(position[0] + circleRadius * Math.cos(i * angleByPart));
				var y = Math.round(position[1] + circleRadius * Math.sin(i * angleByPart));
				
				// Drawing point
				this.context.beginPath();
				this.context.arc(x, y, this.angleSelectorPointsRadius, 0, Math.PI * 2, true);
				this.context.fill();
			}
		}
		
		// Beginning drawing arrow
		this.context.lineWidth = 1;
		this.context.save();
		
		// Arrow position and rotation
		this.context.translate(position[0], position[1]);
		this.context.rotate(degToRad(this.selectedRotation[1] - 90));
		this.context.beginPath();
		this.context.moveTo(0, 0);
		
		// Drawing arrow as if it has an angle equal to 0 (= pointing to the right)
		var arrowEndX = circleRadius - this.angleSelectorPointsRadius;
		this.context.lineTo(arrowEndX, 0);
		this.context.lineTo(arrowEndX - this.angleSelectorArrowSize, -this.angleSelectorArrowSize);
		this.context.moveTo(arrowEndX, 0);
		this.context.lineTo(arrowEndX - this.angleSelectorArrowSize, this.angleSelectorArrowSize);
		
		// End of arrow drawing
		this.context.stroke();
		this.context.restore();
	} else {
		// Cursor selection
		this.context.fillStyle = "rgba(150, 150, 255, 0.5)";
		
		var mouseRoomCoordinates = vec2.fromValues(
			Math.round((this.currentMousePositionInCanvas[0] / trueSize - this.scroll[0]) * 2) / 2,
			Math.round((this.currentMousePositionInCanvas[1] / trueSize - this.scroll[2]) * 2) / 2
		);
		
		// Determining which positions the mouse cursor can hover
		var hoverWalls, hoverRooms, isSizeable;
		if(this.selectedType == null) {
			hoverWalls = hoverRooms = true;
			isSizeable = false;
		} else {
			hoverWalls = this.selectedType.is_gap;
			hoverRooms = !this.selectedType.is_gap;
			isSizeable = this.selectedType.is_sizeable;
		}
		
		var isXInteger = mouseRoomCoordinates[0] == Math.floor(mouseRoomCoordinates[0]);
		var isYInteger = mouseRoomCoordinates[1] == Math.floor(mouseRoomCoordinates[1]);
		if(hoverWalls && isXInteger && !isYInteger) {
			// Horizontal
			this.context.fillRect(
				trueSize * (mouseRoomCoordinates[0] - 0.5       ) + this.scroll[0] * trueSize,
				trueSize * (mouseRoomCoordinates[1]) - borderSize + this.scroll[2] * trueSize,
				trueSize,
				borderSize * 2
			);
		} else if(hoverWalls && !isXInteger && isYInteger) {
			// Vertical
			this.context.fillRect(
				trueSize * (mouseRoomCoordinates[0]) - borderSize + this.scroll[0] * trueSize,
				trueSize * (mouseRoomCoordinates[1] - 0.5       ) + this.scroll[2] * trueSize,
				borderSize * 2,
				trueSize
			);
		} else if(hoverRooms) {
			// Room
			this.context.fillRect(
				trueSize * (Math.round(mouseRoomCoordinates[0]) - 0.5) + this.scroll[0] * trueSize,
				trueSize * (Math.round(mouseRoomCoordinates[1]) - 0.5) + this.scroll[2] * trueSize,
				trueSize * (isSizeable ? this.domSizeX.value : 1),
				trueSize * (isSizeable ? this.domSizeZ.value : 1)
			);
		}
	}
};

// TODO window to view a table of all resources and capacities