/**
 * A building is an entity which is a part of a spaceship
 * @param World The world where the spaceship is
 * @param SpaceShip The spaceship containing the building
 * @param vec3 TODO it's useless here ?!?
 * @param quat TODO it's useless here ?!?
 * @param Object The definition of the building
 */
var Building = function(world, spaceShip, position, rotation, definition) {
	this.spaceShip    = spaceShip;
	this.gridSize     = definition.size;
	this.gridPosition = definition.position;
	this.typeId       = definition.type_id;
	this.isEnabled    = definition.is_enabled;
	this.seed         = definition.seed;
	this.id           = definition.id;
	this.isBuilt      = definition.is_built;
	this.eulerRotationInSpaceShip = vec3.fromValues(
		degToRad(definition.rotation[0]),
		degToRad(definition.rotation[1]),
		degToRad(definition.rotation[2])
	);
	
	this.hitBoxes = [];
	
	this.type = Building.types[this.typeId];
	
	this.modelName = this.type.model;
	
	var colorMask = this.isBuilt ? null : vec4.fromValues(0.5, 0.5, 1, 0.5); // TODO blinking textures -> cull faces everywhere
	
	this.onMoveInSpaceShip = null;
	
	if(Building.builders[this.modelName]) {
		this.parent(world, new Model(world, []), position, rotation, colorMask);
		Building.builders[this.modelName](this, definition.state);
	} else {
		if(!Building.alreadyCreatedModels[this.modelName]) {
			var model = new Model(world, []);
			model.loadMeshesFromObj(this.modelName, this.gridSize);
			model.regenerateCache();
			
			Building.alreadyCreatedModels[this.modelName] = model;
		}
		var model = Building.alreadyCreatedModels[this.modelName];
		this.parent(world, model, position, rotation, colorMask);
		var hitBox = HitBox.createFromModel(model);
		this.hitBoxes.push(hitBox);
		this.spaceShip.physics.add(hitBox);
	}
	
	this.positionInSpaceShip = vec3.create();
	this.rotationInSpaceShip = quat.create();
	
	this.refreshPositionAndRotationInSpaceShip();
	
	// Initializing hitboxes with position and rotation
	for(var i = 0 ; i < this.hitBoxes.length ; i++) {
		this.hitBoxes[i].linkToBuilding(this);
	}
	
	// Inventory
	this.items = [];
	for(var i = 0 ; i < definition.items.length ; i++) {
		var item = new Item(definition.items[i], this);
		this.items.push(item);
	}
	this.inventoryDom = null;
	
	// TODO do it again when it's built
	this.slotSizeMultiplicator = this.gridSize[0] * this.gridSize[1] * this.gridSize[2];
	if(this.type.getSlotsCount(this.isBuilt) * this.slotSizeMultiplicator > 0) {
		this.createDomInventory();
		world.configurePickableContent(this, function() {
			this.toggleDomInventory();
		});
	}
};
Building.extend(Entity);

// TODO move it in BuildingType ?
Building.alreadyCreatedModels   = {}; // Static, cache of models created from obj

Building.builders = {}; // Static, files in js/buildingBuilders

Building.types = null; // Set by ServerConnection, key = id

/**
 * Moves (translates the position) and rotates the entity
 * @param vec3 Translation
 * @param Euler rotation to apply
 * @param boolean True if the translation is relative to the entity rotation and must be transformed. Default false
 * @return boolean true if the rotation or position in spaceship has changed
 */
Building.prototype.translateAndRotateInSpaceShip = function(translation, rotation, isTranslationRelative) {
	if(translation[0] != 0 || translation[1] != 0 || translation[2] != 0 || rotation[0] != 0 || rotation[1] != 0 || rotation[2] != 0) {
		var translationToApply = vec3.clone(translation);
		
		if(isTranslationRelative) {
			vec3.transformQuat(translationToApply, translationToApply, this.rotationInSpaceShip);
		}
		
		for(var i = 0 ; i < this.hitBoxes.length ; i++) {
			this.spaceShip.physics.preventCollision(this.hitBoxes[i], translationToApply);
		}
		
		if(this.type.isRoomUnit) {
			vec3.divide(translationToApply, translationToApply, this.spaceShip.roomUnitSize);
		}
		vec3.add(this.gridPosition, this.gridPosition, translationToApply);
		
		vec3.add(this.eulerRotationInSpaceShip, this.eulerRotationInSpaceShip, rotation);
		
		this.refreshPositionAndRotationInSpaceShip();
		
		return true;
	}
	
	return false;
};

/**
 * It's basically the same method than translateAndRotateInSpaceShip, but it also throws some events like walk animations.
 */
Building.prototype.moveAndRotateInSpaceShip = function(translation, rotation, isTranslationRelative) {
	if(this.translateAndRotateInSpaceShip(translation, rotation, isTranslationRelative)) {
		if(this.onMoveInSpaceShip != null) {
			this.onMoveInSpaceShip();
		}
		
		return true;
	}
	return false;
};

/**
 * Refreshes the position and rotation of the building in the spaceship, based on it's grid position.
 * Also refreshes it's absolute position and rotation.
 */
Building.prototype.refreshPositionAndRotationInSpaceShip = function() {
	// Refreshing position
	if(this.type.isRoomUnit) {
		vec3.set(
			this.positionInSpaceShip,
			(this.gridPosition[0] + (this.gridSize[0] / 2) - 0.5) * this.spaceShip.roomUnitSize[0], 
			(this.gridPosition[1] + (this.gridSize[1] / 2) - 0.5) * this.spaceShip.roomUnitSize[1], 
			(this.gridPosition[2] + (this.gridSize[2] / 2) - 0.5) * this.spaceShip.roomUnitSize[2]
		);
	} else {
		vec3.copy(this.positionInSpaceShip, this.gridPosition);
	}
	
	// Refreshing rotation
	quat.identity(this.rotationInSpaceShip);
	if(this.eulerRotationInSpaceShip[0] != 0 || this.eulerRotationInSpaceShip[1] != 0 || this.eulerRotationInSpaceShip[2] != 0) {
		quat.rotateY(this.rotationInSpaceShip, this.rotationInSpaceShip, this.eulerRotationInSpaceShip[1]);
		quat.rotateX(this.rotationInSpaceShip, this.rotationInSpaceShip, this.eulerRotationInSpaceShip[0]);
		quat.rotateZ(this.rotationInSpaceShip, this.rotationInSpaceShip, this.eulerRotationInSpaceShip[2]);
	}
	quat.invert(this.rotationInSpaceShip, this.rotationInSpaceShip);
	
	// Refreshing HitBoxes
	for(var i = 0 ; i < this.hitBoxes.length ; i++) {
		this.hitBoxes[i].linkToBuilding(this);
	}
	
	// Refreshing absolute position and rotation
	this.refreshAbsolutePositionAndRotation();
};

/**
 * Refreshes the absolute position and rotation of the building in the world.
 */
Building.prototype.refreshAbsolutePositionAndRotation = function() {
	// Refreshing position
	var position = vec3.clone(this.positionInSpaceShip);
	rotatePoint(position, [degToRad(this.spaceShip.rotation[0]), degToRad(this.spaceShip.rotation[1]), degToRad(this.spaceShip.rotation[2])]);
	vec3.add(position, position, this.spaceShip.getPosition());
	this.setPosition(position);
	
	// Refreshing rotation
	var entityRotation = this.getRotation();
	quat.copy(entityRotation, this.rotationInSpaceShip);
	if(this.spaceShip.rotation[0] != 0) quat.rotateX(entityRotation, entityRotation, degToRad(this.spaceShip.rotation[0]));
	if(this.spaceShip.rotation[1] != 0) quat.rotateY(entityRotation, entityRotation, degToRad(this.spaceShip.rotation[1]));
	if(this.spaceShip.rotation[2] != 0) quat.rotateZ(entityRotation, entityRotation, degToRad(this.spaceShip.rotation[2]));
	this.setRotation(entityRotation);
};

/**
 * Returns an item by it's id
 * @param int Id of the item to find
 * @return Item or null if not found
 */
Building.prototype.getItemById = function(id) {
	for(var i = 0 ; i < this.items.length ; i++) {
		if(this.items[i].id == id) {
			return this.items[i];
		}
	}
	return null;
};

/**
 * Hides or shows the inveotory window of the building inventory
 */
Building.prototype.toggleDomInventory = function() {
	if(this.inventoryDom != null) { // TODO delay between two toggles (in case of picking on the screen) ? Only showable via picking ?
		// TODO minimum distance to open an inventory (+ do it server side) ? How to handle big buildings (size > 1) ?
		this.inventoryDom.toggleWindow();
	}
};

/**
 * Generates the name of the inventory window (which is different when it's a building requirements window)
 */
Building.prototype._getInventoryWindowTitleName = function() {
	var name = this.seed != null ? this.seed : this.type.name;
	var windowTitle = this.isBuilt ? "Inventory" : "Building requirements";
	return windowTitle + " - " + name;
};

/**
 * Creates the DOM inventory window of the building.
 */
Building.prototype.createDomInventory = function() {
	this.inventoryDom = createWindow(200, 300, this._getInventoryWindowTitleName(), false);
	this.inventoryDom.hideWindow();
	
	this.regenDomInventoryItems();
};

/**
 * Regenerates the DOM inventory contents
 */
Building.prototype.regenDomInventoryItems = function() {
	var self = this;
	
	// Emptying dom inventory
	while(this.inventoryDom.firstChild != null) {
		this.inventoryDom.removeChild(this.inventoryDom.firstChild);
	}
	
	// Adding items in dom inventory
	for(var i = 0 ; i < this.items.length ; i++) { // TODO sort by groups ?
		this.inventoryDom.appendChild(this.items[i].dom);
	}
	
	// Adding empty slots at last
	var slots = this.type.getSlots(this.isBuilt);
	Object.keys(slots).forEach(function(id) {
		var slotGroupId = parseInt(id);
		var slot = slots[slotGroupId];
		
		// Determining remaining space in the slot
		var slotsRemaining = slot.maximumAmount * self.slotSizeMultiplicator;
		for(var i = 0 ; i < self.items.length ; i++) {
			if(self.items[i].slotGroupId == slotGroupId) {
				slotsRemaining--;
			}
		}
		
		if(slotsRemaining > 0) {
			// Showing empty slot
			var emptySlot = document.createElement("div");
			emptySlot.setAttribute("class", "emptySlot");
			emptySlot.innerHTML = slotsRemaining + " &times; " + Item.groups[slotGroupId];
			self.inventoryDom.appendChild(emptySlot);
			
			emptySlot.addEventListener("dragover", function(event) {
				var item = Item.currentItemDragged;
				if((item.container != self || item.slotGroupId != slotGroupId) && item.type.groups.indexOf(slotGroupId) >= 0) {
					event.preventDefault();
					event.dataTransfer.dropEffect = 'move';
				}
			});
			emptySlot.addEventListener("drop", function(event) {
				var item = Item.currentItemDragged;
				if((item.container != self || item.slotGroupId != slotGroupId) && item.type.groups.indexOf(slotGroupId) >= 0) {
					self.world.server.sendMessage("move_item_query", {
						"item_id"      : Item.currentItemDragged.id,
						"building_id"  : self.id,
						"slot_group_id": slotGroupId
					});
				}
			});
		}
	});
};

/**
 * Adds an item to the building inventory
 * @param Item The item to add
 */
Building.prototype.addItem = function(item) {
	this.items.push(item);
	this.regenDomInventoryItems();
	
	if(!this.isBuilt && this.items.length == this.type.getSlotsCount(this.isBuilt) * this.slotSizeMultiplicator) {
		this.world.server.sendMessage("achieve_building_query", this.id);
	}
};

/**
 * Removes an item from the building inventory
 * @param Item The item to remove
 */
Building.prototype.removeItem = function(item) {
	var index = this.items.indexOf(item);
	if(index >= 0) {
		this.items.splice(index, 1);
		this.regenDomInventoryItems();
	}
};

/**
 * Transforms the building requirements window to an inventory one.
 * Must be called only when a building is achieved.
 */
Building.prototype.achieveBuilding = function() {
	this.isBuilt = true;
	this.items = [];
	this.inventoryDom.changeWindowTitle(this._getInventoryWindowTitleName());
	this.regenDomInventoryItems();
	this.setColorMask(null);
	if(this.type.getSlotsCount(this.isBuilt) * this.slotSizeMultiplicator <= 0) {
		this.inventoryDom.hideWindow();
		this.inventoryDom = null;
	}
};
