/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Sébastien CAPARROS (GlitchyVerse)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Interface allowing the player to modify his spaceship
 */
var Designer = function(world) {
	this.world = world;
	this.spaceShip = null;
	this.ghostBuildings = null;
	this.ghostColor = vec4.fromValues(1, 1, 1, 0.5);
	this.sizeSelector = null;
	
	this.selectedType = null; // When choosing a new building in a tree
	this.isDestroyMode = false;
	this.selectedBuildingToDestroy = null;
	this.selectedGhostPosition = vec3.create();
	
	this._DOMWindow = null;
	this._DOMConfirmBuildingButton = null;
	this._DOMConfirmDestruction = null;
	this._DOMConfirmDestroyButton = null;
	this._DOMNotEmptyError = null;
	this._DOMDestroyBuilding = null;
	this.isVisible  = false;
	
	// TODO in database, add a field to forbid removing the last building of a determined type (propeller, room ...) ?
	
	// Creating designer button
	this._DOMShowButton = document.createElement("div");
	this._DOMShowButton.setAttribute("id", "designerButton");
	this._DOMShowButton.setAttribute("class", "hudButton");
	this._DOMShowButton.appendChild(document.createTextNode("Designer"));
	var self = this;
	this._DOMShowButton.addEventListener("click", function() {
		if(self._DOMWindow) {
			self._DOMWindow.showWindow();
		} else {
			self._createDesignerWindow();
		}
		self.isVisible = true;
	});
};

// TODO history window

Designer.prototype.setSpaceShip = function(spaceShip) {
	this.spaceShip = spaceShip;
	
	document.body.appendChild(this._DOMShowButton);
	
	// Creating ghost models
	this.ghostBuildings = {};
	for(var k in Building.types) {
		var typeId = Building.types[k].id;
		this.ghostBuildings[typeId] = new Building(this.world, this.spaceShip, {
			size     : vec3.fromValues(1, 1, 1),
			position : vec3.create(),
			rotation : quat.create(),
			typeId   : typeId,
			isEnabled: true,
			seed     : null,
			id       : -1,
			isBuilt  : false,
			state    : null,
			items    : []
		}, this.ghostColor);
	}
	
	this.sizeSelector = new Building(this.world, this.spaceShip, {
		size     : vec3.fromValues(1, 1, 1),
		position : vec3.create(),
		rotation : quat.create(),
		typeId   : "sizeSelector",
		isEnabled: false,
		seed     : null,
		id       : -2,
		isBuilt  : true,
		state    : null,
		items    : []
	});
	
	var self = this;
	new Timer(function() {
		if(self.selectedType != null && self.selectedType.isSizeable) {
			var cameraPos = self.world.camera.targetBuilding.gridPosition;
			self.sizeSelector.gridPosition[0] = Math.round(cameraPos[0]);
			self.sizeSelector.gridPosition[1] = Math.round(cameraPos[1]);
			self.sizeSelector.gridPosition[2] = Math.round(cameraPos[2]);
			self.sizeSelector.refreshPositionAndRotationInSpaceShip();
		}
	}, 0);
};

/**
 * Changes the size of the ghost
 * @param vec3 The translation to apply to the min bounds of the ghost
 * @param vec3 The translation to apply to the max bounds of the ghost
 */
Designer.prototype.translateSize = function(min, max) {
	var ghost = this.ghostBuildings[this.selectedType.id];
	
	var newPosition = vec3.clone(ghost.gridPosition);
	var newSize = vec3.clone(ghost.gridSize);
	
	vec3.add(newSize, newSize, max);
	
	vec3.subtract(newSize, newSize, min);
	vec3.add(newPosition, newPosition, min);
	
	// Checking if new size/position are valid
	if(
		newSize[0] >= 1 && newSize[1] >= 1 && newSize[2] >= 1
		&& newPosition[0] <= this.selectedGhostPosition[0] && this.selectedGhostPosition[0] <= newPosition[0] + newSize[0] - 1
		&& newPosition[1] <= this.selectedGhostPosition[1] && this.selectedGhostPosition[1] <= newPosition[1] + newSize[1] - 1
		&& newPosition[2] <= this.selectedGhostPosition[2] && this.selectedGhostPosition[2] <= newPosition[2] + newSize[2] - 1
	) {
		var isPlaceableHere;
		if(this.selectedType.isGap) {
			isPlaceableHere = true;
		} else {
			var mustBeInside = this.selectedType.isInside && !this.selectedType.isContainer;
			
			isPlaceableHere = !mustBeInside;
			for(var k in this.spaceShip.entities) {
				var entity = this.spaceShip.entities[k];
				if(entity != ghost
					&& !(newPosition[0] > entity.gridPosition[0] + entity.gridSize[0] - 1 || entity.gridPosition[0] > newPosition[0] + newSize[0] - 1)
					&& !(newPosition[1] > entity.gridPosition[1] + entity.gridSize[1] - 1 || entity.gridPosition[1] > newPosition[1] + newSize[1] - 1)
					&& !(newPosition[2] > entity.gridPosition[2] + entity.gridSize[2] - 1 || entity.gridPosition[2] > newPosition[2] + newSize[2] - 1)
				) {
					isPlaceableHere = mustBeInside;
					break;
				}
			}
		}
		
		// Checking that there is no building here with the same value for isInside
		var isPositionOccupied = false;
		for(var k in this.spaceShip.entities) {
			var entity = this.spaceShip.entities[k];
			
			if(entity != ghost && entity.type.isInside == this.selectedType.isInside
				&& !(newPosition[0] > entity.gridPosition[0] + entity.gridSize[0] - 1 || entity.gridPosition[0] > newPosition[0] + newSize[0] - 1)
				&& !(newPosition[1] > entity.gridPosition[1] + entity.gridSize[1] - 1 || entity.gridPosition[1] > newPosition[1] + newSize[1] - 1)
				&& !(newPosition[2] > entity.gridPosition[2] + entity.gridSize[2] - 1 || entity.gridPosition[2] > newPosition[2] + newSize[2] - 1)
			) {
				isPositionOccupied = true;
				break;
			}
		}
		
		// Refreshing ghost size
		if(isPlaceableHere && !isPositionOccupied) {
			ghost.gridPosition = newPosition;
			ghost.gridSize = newSize;
			if(ghost.regenerateMeshes != null) ghost.regenerateMeshes();
			ghost.refreshPositionAndRotationInSpaceShip();
		}
	}
};

/**
 * Called when the player clicks on a buildable wall.
 * Does nothing if no building type is selected in the tree
 * @param vec3 Position of the wall clicked (integers, except one element which is a multiple of 0.5).
 * @param vec3 direction to build, relatively to the element choosed. One of the component should be equal to -1 or 1, the others 0.
 * @param quat Default rotation of the building for this direction
 * @param float Relative y rotation to apply to the building
 */
Designer.prototype.setPickedPosition = function(clickedPosition, direction, defaultRotation, yAngle) {
	if(this.selectedType != null) {
		var ghost = this.ghostBuildings[this.selectedType.id];
		
		var position = vec3.create();
		vec3.copy(position, clickedPosition);
		if(!this.selectedType.isGap) {
			position[0] += direction[0] / 2;
			position[1] += direction[1] / 2;
			position[2] += direction[2] / 2;
		}
		
		// Checking positioning inside/outside of a container
		var isPlaceableHere;
		if(this.selectedType.isGap) {
			isPlaceableHere = true;
		} else {
			var mustBeInside = this.selectedType.isInside && !this.selectedType.isContainer;
			
			isPlaceableHere = !mustBeInside;
			for(var k in this.spaceShip.entities) {
				var entity = this.spaceShip.entities[k];
				if(entity != ghost
					&& position[0] >= entity.gridPosition[0] && position[0] <= entity.gridPosition[0] + entity.gridSize[0] - 1
					&& position[1] >= entity.gridPosition[1] && position[1] <= entity.gridPosition[1] + entity.gridSize[1] - 1
					&& position[2] >= entity.gridPosition[2] && position[2] <= entity.gridPosition[2] + entity.gridSize[2] - 1
				) {
					isPlaceableHere = mustBeInside;
					break;
				}
			}
		}
		
		// Checking that there is no building here with the same value for isInside
		var isPositionOccupied = false;
		for(var k in this.spaceShip.entities) {
			var entity = this.spaceShip.entities[k];
			
			if(entity != ghost && entity.type.isInside == this.selectedType.isInside
				&& position[0] >= entity.gridPosition[0] && position[0] <= entity.gridPosition[0] + entity.gridSize[0] - 1
				&& position[1] >= entity.gridPosition[1] && position[1] <= entity.gridPosition[1] + entity.gridSize[1] - 1
				&& position[2] >= entity.gridPosition[2] && position[2] <= entity.gridPosition[2] + entity.gridSize[2] - 1
			) {
				isPositionOccupied = true;
				break;
			}
		}
		
		// Showing ghost
		if(isPlaceableHere && !isPositionOccupied) {
			vec3.copy(ghost.gridPosition, position);
			vec3.copy(this.selectedGhostPosition, position);
			
			vec3.set(ghost.gridSize, 1, 1, 1);
			
			quat.identity(ghost.gridRotation);
			if(this.selectedType.isGap) {
				if(clickedPosition[0] % 1 != 0) {
					quat.rotateY(ghost.gridRotation, ghost.gridRotation, Math.PI / 2);
				} else if(clickedPosition[1] % 1 != 0) {
					quat.rotateX(ghost.gridRotation, ghost.gridRotation, Math.PI / 2);
				}/* else if(clickedPosition[2] % 1 != 0) {
					// Nothing to do (default rotation)
				}*/
			} else if(!this.selectedType.isContainer) {
				quat.copy(ghost.gridRotation, defaultRotation);
				
				// Determining relative Y angle of the building
				var roundedYAngle = Math.round(yAngle * 2 / Math.PI) * Math.PI / 2; // Rounding angle to quarters
				var yRotation = quat.create(); // TODO don't create a quat here, cache it
				quat.rotateY(yRotation, yRotation, roundedYAngle);
				quat.multiply(ghost.gridRotation, ghost.gridRotation, yRotation);
			}
			
			ghost.refreshPositionAndRotationInSpaceShip();
			
			// TODO check inside / outside constraints
			
			this.spaceShip.addBuilding(ghost);
			
			if(this.selectedType.isSizeable) {
				this.spaceShip.addBuilding(this.sizeSelector);
			}
			
			this._DOMConfirmBuildingButton.setAttribute("data-isVisible", true);
		}
	}
};

Designer.prototype.setPickedBuildingToDestroy = function(building) {
	if(building.type.category != null) {
		var isContainerEmpty = true;
		if(building.type.isContainer) {
			// Checking that there is nothing inside this container
			for(var k in this.spaceShip.entities) {
				var b = this.spaceShip.entities[k];
				if(b.type.isInside && (
					   !(b.gridPosition[0] > building.gridPosition[0] + building.gridSize[0] - 1 || b.gridPosition[0] + b.gridSize[0] - 1 < building.gridPosition[0])
					&& !(b.gridPosition[1] > building.gridPosition[1] + building.gridSize[1] - 1 || b.gridPosition[1] + b.gridSize[1] - 1 < building.gridPosition[1])
					&& !(b.gridPosition[2] > building.gridPosition[2] + building.gridSize[2] - 1 || b.gridPosition[2] + b.gridSize[2] - 1 < building.gridPosition[2])
				)) {
					isContainerEmpty = false;
					break;
				}
			}
		}
		
		if(!building.type.isContainer || isContainerEmpty) {
			this._DOMConfirmDestroyButton.setAttribute("value", "Destroy this " + building.type.name + " !");
			this._DOMConfirmDestruction.setAttribute("data-isInventoryWarning", building.items.length > 0);
			this._DOMConfirmDestruction.setAttribute("data-isVisible", true);
			this._DOMNotEmptyError.setAttribute("data-isVisible", false);
			this.selectedBuildingToDestroy = building;
		} else {
			this._DOMConfirmDestruction.setAttribute("data-isVisible", false);
			this._DOMNotEmptyError.setAttribute("data-isVisible", true);
		}
	}
};

/**
 * Creates the designer window and it's content
 */
Designer.prototype._createDesignerWindow = function() {
	var self = this;
	this._DOMWindow = createWindow(250, 400, "Designer", false, function() {
		self.isVisible = false;
		
		if(self.selectedType != null) {
			self.selectedType.domElement.setAttribute("data-isSelected", false); // TODO don't create a dom element attribute in type
			self.spaceShip.deleteBuilding(self.ghostBuildings[self.selectedType.id]);
			if(self.selectedType.isSizeable) {
				self._DOMConfirmBuildingButton.setAttribute("data-isVisible", false);
				self._DOMConfirmDestruction.setAttribute("data-isVisible", false);
				self._DOMNotEmptyError.setAttribute("data-isVisible", false);
				self.spaceShip.deleteBuilding(self.sizeSelector);
			}
			self.selectedType = null;
		}
		
	}, "left", "middle");
	this._DOMWindow.setAttribute("id", "designerWindowContent");
	
	this._createDesignerTree();
	this._createDOMConfirmActions();
};

Designer.prototype._createDesignerTree = function() {
	var self = this;
	
	var tree = document.createElement("ul");
	tree.setAttribute("class", "tree");
	this._DOMWindow.appendChild(tree);
	
	var tempCategoriesDOMSubElements = {};
	Object.keys(Building.types).map(function(id) {
		var building = Building.types[id];
		if(building.category != null) {
			if(!tempCategoriesDOMSubElements[building.category]) {
				// Creating category li
				var categoryDOMElement = document.createElement("li");
				categoryDOMElement.appendChild(document.createTextNode(building.category));
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
				tempCategoriesDOMSubElements[building.category] = categoryDOMSubElement;
			}
			
			building.domElement = document.createElement("li");
			building.domElement.appendChild(document.createTextNode(building.name));
			building.domElement.addEventListener("click", function(event) {
				if(self.selectedType != null) {
					self.selectedType.domElement.setAttribute("data-isSelected", false);
					self.spaceShip.deleteBuilding(self.ghostBuildings[self.selectedType.id]);
					if(self.selectedType.isSizeable) {
						self.spaceShip.deleteBuilding(self.sizeSelector);
					}
					self._DOMConfirmBuildingButton.setAttribute("data-isVisible", false);
					self._DOMConfirmDestruction.setAttribute("data-isVisible", false);
					self._DOMNotEmptyError.setAttribute("data-isVisible", false);
					// TODO bug with transparent textures ?
				}
				if(self.selectedType == building) {
					self.selectedType = null;
				} else {
					this.setAttribute("data-isSelected", true);
					self.selectedType = building;
				}
				
				self.isDestroyMode = false;
				self._DOMDestroyBuilding.setAttribute("data-isSelected", false);
			});
			tempCategoriesDOMSubElements[building.category].appendChild(building.domElement);
		}
	});
	
	this._DOMDestroyBuilding = document.createElement("li");
	this._DOMDestroyBuilding.appendChild(document.createTextNode("Destroy ..."));
	this._DOMDestroyBuilding.addEventListener("click", function(event) {
		if(self.selectedType != null) {
			self.selectedType.domElement.setAttribute("data-isSelected", false);
			self.spaceShip.deleteBuilding(self.ghostBuildings[self.selectedType.id]);
			if(self.selectedType.isSizeable) {
				self.spaceShip.deleteBuilding(self.sizeSelector);
			}
			self._DOMConfirmBuildingButton.setAttribute("data-isVisible", false);
			self._DOMConfirmDestruction.setAttribute("data-isVisible", false);
			self._DOMNotEmptyError.setAttribute("data-isVisible", false);
			self.selectedType = null;
		}
		
		self.isDestroyMode = !self.isDestroyMode;
		self._DOMDestroyBuilding.setAttribute("data-isSelected", self.isDestroyMode);
	});
	tree.appendChild(this._DOMDestroyBuilding);
	
	// TODO buildings names --> client only (in a lang singleton ? How to manage category names ?), then remove names from database
};

Designer.prototype._createDOMConfirmActions = function() {
	var self = this;
	
	// Confirm building
	
	this._DOMConfirmBuildingButton = document.createElement("input");
	this._DOMConfirmBuildingButton.setAttribute("type", "button");
	this._DOMConfirmBuildingButton.setAttribute("value", "Build it !");
	this._DOMConfirmBuildingButton.setAttribute("class", "confirmBuildingButton");
	this._DOMConfirmBuildingButton.setAttribute("data-isVisible", false);
	this._DOMConfirmBuildingButton.addEventListener("click", function() {
		var ghost = self.ghostBuildings[self.selectedType.id];
		self.world.server.sendMessage("buildQuery", {
			"typeId" : self.selectedType.id,
			"position": ghost.gridPosition,
			"size"    : ghost.gridSize,
			"rotation": ghost.gridRotation
		});
		
		self.selectedType.domElement.setAttribute("data-isSelected", false);
		self.spaceShip.deleteBuilding(ghost);
		if(self.selectedType.isSizeable) {
			self.spaceShip.deleteBuilding(self.sizeSelector);
		}
		this.setAttribute("data-isVisible", false);
		self.selectedType = null;
	});
	this._DOMWindow.appendChild(this._DOMConfirmBuildingButton);
	
	// Confirm destruction
	
	this._DOMConfirmDestruction = document.createElement("div");
	this._DOMConfirmDestruction.setAttribute("class", "confirmDestruction");
	this._DOMConfirmDestruction.setAttribute("data-isVisible", false);
	this._DOMConfirmDestruction.setAttribute("data-isInventoryWarning", false);
	this._DOMWindow.appendChild(this._DOMConfirmDestruction);
	
	var warningMessage = document.createElement("div");
	warningMessage.setAttribute("class", "inventoryWarning");
	warningMessage.appendChild(document.createTextNode("Warning : Everything in it's inventory will be destroyed."));
	this._DOMConfirmDestruction.appendChild(warningMessage);
	
	this._DOMConfirmDestroyButton = document.createElement("input");
	this._DOMConfirmDestroyButton.setAttribute("type", "button");
	//this._DOMConfirmDestroyButton.setAttribute("value", "Destroy it !");
	this._DOMConfirmDestroyButton.addEventListener("click", function() {
		self.world.server.sendMessage("destroyQuery", self.selectedBuildingToDestroy.id);
		self._DOMConfirmDestruction.setAttribute("data-isVisible", false);
		self._DOMDestroyBuilding.setAttribute("data-isSelected", false);
		self.isDestroyMode = false;
	});
	this._DOMConfirmDestruction.appendChild(this._DOMConfirmDestroyButton);
	
	// Error message when a container building is not empty
	this._DOMNotEmptyError = document.createElement("div");
	this._DOMNotEmptyError.setAttribute("class", "notEmptyError");
	this._DOMNotEmptyError.setAttribute("data-isVisible", false);
	this._DOMNotEmptyError.appendChild(document.createTextNode("You must first destroy everything inside it."));
	this._DOMWindow.appendChild(this._DOMNotEmptyError);
};
