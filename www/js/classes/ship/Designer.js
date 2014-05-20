/**
 * Interface allowing the player to modify his spaceship
 */
var Designer = function(world) {
	this.world = world;
	this.spaceShip = null;
	this.ghostBuildings = null;
	this.ghostColor = vec4.fromValues(1, 1, 1, 0.5);
	
	this.selectedType = null; // When choosing a new building in a tree
	
	this._DOMWindow = null;
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
			size      : vec3.fromValues(1, 1, 1),
			position  : vec3.create(),
			rotation  : quat.create(),
			type_id   : typeId,
			is_enabled: true,
			seed      : null,
			id        : -1,
			is_built  : false,
			state     : null,
			items     : []
		}, this.ghostColor);
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
				if(    position[0] >= entity.gridPosition[0] && position[0] <= entity.gridPosition[0] + entity.gridSize[0] - 1
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
			
			if(entity != ghost && Building.types[entity.typeId].isInside == this.selectedType.isInside
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
			// TODO choose size
			
			this.spaceShip.addBuilding(ghost);
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
			self.selectedType = null;
		}
		
	}, "left", "middle");
	this._DOMWindow.setAttribute("id", "designerWindowContent");
	
	this._createDesignerTree();
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
					// TODO bug with transparent textures ?
				}
				if(self.selectedType == building) {
					self.selectedType = null;
				} else {
					this.setAttribute("data-isSelected", true);
					self.selectedType = building;
				}
			});
			tempCategoriesDOMSubElements[building.category].appendChild(building.domElement);
		}
	});
	
	// TODO buildings names --> client only (in a lang singleton ? How to manage category names ?), then remove names from database
};