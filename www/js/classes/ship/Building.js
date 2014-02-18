/**
 * A building is an entity which is a part of a spaceship
 */
var Building = function(world, spaceShip, position, rotation, definition) {
	var sizeInSpaceShip = definition.size;
	
	this.spaceShip           = spaceShip;
	this.sizeInSpaceShip     = sizeInSpaceShip;
	this.positionInSpaceShip = definition.position;
	this.typeId              = definition.type_id;
	this.initialRotation     = definition.rotation;
	this.seed                = definition.seed;
	this.id                  = definition.id;
	
	this.isBuilt             = definition.is_built; // TODO when not built (ghost), make it unusable (including picking, state changes and some other operations (propeller directions ?))
	
	this.type = Building.types[this.typeId];
	
	this.modelName = this.type.model;
	
	var colorMask = this.isBuilt ? null : vec4.fromValues(0.5, 0.5, 1, 0.5); // TODO blinking textures -> cull faces everywhere
	
	if(Building.builders[this.modelName]) {
		this.parent(world, new Model(world, []), position, rotation, colorMask);
		Building.builders[this.modelName](this, definition.state);
	} else {
		var model;
		if(Building.alreadyCreatedModels[this.modelName]) {
			model = Building.alreadyCreatedModels[this.modelName];
		} else {
			model = new Model(world, []);
			model.loadMeshesFromObj(this.modelName, sizeInSpaceShip);
			model.regenerateCache();
			Building.alreadyCreatedModels[this.modelName] = model;
		}
		this.parent(world, model, position, rotation, colorMask);
	}
	
	this.refreshPositionAndRotation();
	
	// Inventory
	this.items = [];
	for(var i = 0 ; i < definition.items.length ; i++) {
		var item = new Item(definition.items[i], this);
		this.items.push(item);
	}
	this.inventoryDom = null;
	
	// TODO do it again when it's built
	this.slotSizeMultiplicator = this.sizeInSpaceShip[0] * this.sizeInSpaceShip[1] * this.sizeInSpaceShip[2];
	if(this.type.getSlotsCount(this.isBuilt) * this.slotSizeMultiplicator > 0) {
		this.createDomInventory();
		world.configurePickableContent(this, function() {
			this.toggleDomInventory();
		});
	}
};
Building.extend(Entity);

// TODO methods documentation here

// TODO move it in BuildingType ?
Building.alreadyCreatedModels = {}; // Static, cache of models created from obj

Building.builders = {}; // Static, files in js/buildingBuilders

Building.types = null; // Set by ServerConnection, key = id

Building.prototype.refreshPositionAndRotation = function() {
	var position;
	if(this.type.isRoomUnit) {
		position = vec3.fromValues(
			(this.positionInSpaceShip[0] + (this.sizeInSpaceShip[0] / 2) - 0.5) * this.spaceShip.roomUnitSize[0], 
			(this.positionInSpaceShip[1] + (this.sizeInSpaceShip[1] / 2) - 0.5) * this.spaceShip.roomUnitSize[1], 
			(this.positionInSpaceShip[2] + (this.sizeInSpaceShip[2] / 2) - 0.5) * this.spaceShip.roomUnitSize[2]
		);
	} else {
		position = vec3.clone(this.positionInSpaceShip);
	}
	
	rotatePoint(position, [degToRad(this.spaceShip.rotation[0]), degToRad(this.spaceShip.rotation[1]), degToRad(this.spaceShip.rotation[2])]);
	vec3.add(position, position, this.spaceShip.getPosition());
	
	this.setPosition(position);
	
	// Rotating the building
	var entityRotation = this.getRotation();
	quat.identity(entityRotation);
	if(this.initialRotation[0] != 0 || this.initialRotation[1] != 0 || this.initialRotation[2] != 0) {
		var initialRotation = this.initialRotation;
		quat.rotateX(entityRotation, entityRotation, degToRad(initialRotation[0]));
		quat.rotateY(entityRotation, entityRotation, degToRad(initialRotation[1]));
		quat.rotateZ(entityRotation, entityRotation, degToRad(initialRotation[2]));
	}
	if(this.spaceShip.rotation[0] != 0) quat.rotateX(entityRotation, entityRotation, degToRad(this.spaceShip.rotation[0]));
	if(this.spaceShip.rotation[1] != 0) quat.rotateY(entityRotation, entityRotation, degToRad(this.spaceShip.rotation[1]));
	if(this.spaceShip.rotation[2] != 0) quat.rotateZ(entityRotation, entityRotation, degToRad(this.spaceShip.rotation[2]));
	this.setRotation(entityRotation);
};

Building.prototype.toggleDomInventory = function() {
	if(this.inventoryDom != null) { // TODO delay between two toggles (in case of picking on the screen) ? Only showable via picking ?
		// TODO minimum distance to open an inventory (+ do it server side) ? How to handle big buildings (size > 1) ?
		this.inventoryDom.toggleWindow();
	}
};

Building.prototype._getInventoryWindowTitleName = function() {
	var name = this.seed != null ? this.seed : this.type.name;
	var windowTitle = this.isBuilt ? "Inventory" : "Building requirements";
	return windowTitle + " - " + name;
};

Building.prototype.createDomInventory = function() {
	this.inventoryDom = createWindow(200, 300, this._getInventoryWindowTitleName(), false);
	this.inventoryDom.hideWindow();
	
	this.regenDomInventoryItems();
};

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

Building.prototype.addItem = function(item) {
	this.items.push(item);
	this.regenDomInventoryItems();
	
	if(!this.isBuilt && this.items.length == this.type.getSlotsCount(this.isBuilt) * this.slotSizeMultiplicator) {
		this.world.server.sendMessage("achieve_building_query", this.id);
	}
};

Building.prototype.removeItem = function(item) {
	var index = this.items.indexOf(item);
	if(index >= 0) {
		this.items.splice(index, 1);
		this.regenDomInventoryItems();
	}
};

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
