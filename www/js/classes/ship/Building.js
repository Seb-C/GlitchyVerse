/**
 * A building is an entity which is a part of a spaceship
 */
var Building = function(world, spaceShip, position, rotation, definition) {
	var modelName = definition.model;
	var sizeInSpaceShip = definition.size;
	
	this.modelName           = modelName;
	this.spaceShip           = spaceShip;
	this.sizeInSpaceShip     = sizeInSpaceShip;
	this.exertThrust         = definition.exert_thrust;
	this.positionInSpaceShip = definition.position;
	this.isControllable      = definition.is_controllable;
	this.typeId              = definition.type_id;
	this.isRoomUnit          = definition.is_position_by_room_unit;
	this.initialRotation     = definition.rotation;
	this.minState            = definition.min_state;
	this.maxState            = definition.max_state;
	this.id                  = definition.id;
	
	this.slots = definition.definition; // TODO group, when_building, maximum_amount, state_variation
	
	// TODO server side : send items (for each building ?)
	
	if(Building.builders[modelName]) {
		this.parent(world, new Model(world, []), position, rotation);
		Building.builders[modelName](this, definition.state);
	} else {
		var model;
		if(Building.alreadyCreatedModels[modelName]) {
			model = Building.alreadyCreatedModels[modelName];
		} else {
			model = new Model(world, []);
			model.loadMeshesFromObj(modelName, sizeInSpaceShip);
			model.regenerateCache();
			Building.alreadyCreatedModels[modelName] = model;
		}
		this.parent(world, model, position, rotation);
	}
	
	this.refreshPositionAndRotation();
	
	// Inventory
	/*this.items = [];
	for(var i = 0 ; i < definition.length ; i++) {
		this.items.push(new Item(this, definition[i]));
	}
	this.inventoryDom = null;
	this.createDomInventory();*/
};
Building.extend(Entity);

Building.alreadyCreatedModels = {}; // Static, cache of models created from obj

Building.builders = {}; // Static, files in js/buildingBuilders

Building.prototype.refreshPositionAndRotation = function() {
	var position;
	if(this.isRoomUnit) {
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

Building.prototype.createDomInventory = function() {
	this.inventoryDom = document.createElement("div");
	this.inventoryDom.setAttribute("class", "inventory");
	
	var self = this;
	this.inventoryDom.addEventListener("dragover", function(event) {
		if(self.items.length < self.slotCount && Item.currentItemDragged.inventory != self) {
			event.preventDefault();
			event.dataTransfer.dropEffect = 'move';
		}
	});
	this.inventoryDom.addEventListener("drop", function(event) {
		if(self.items.length < self.slotCount && Item.currentItemDragged.inventory != self) {
			Item.currentItemDragged.moveTo(self);
		}
	});
	
	this.regenDomInventoryItems();
};

Building.prototype.regenDomInventoryItems = function() {
	while(this.inventoryDom.firstChild != null) {
		this.inventoryDom.removeChild(this.inventoryDom.firstChild);
	}
	
	for(var i = 0 ; i < this.items.length ; i++) {
		this.inventoryDom.appendChild(this.items[i].inventoryDom);
	}
	for(var i = this.items.length ; i < this.slotCount ; i++) {
		var emptySlot = document.createElement("div");
		emptySlot.setAttribute("class", "emptySlot");
		emptySlot.appendChild(document.createTextNode("vide"));
		this.inventoryDom.appendChild(emptySlot);
	}
};

Building.prototype.addItem = function(item) {
	this.items.push(item);
	this.regenDomInventoryItems();
};

Building.prototype.removeItem = function(item) {
	var index = this.items.indexOf(item);
	if(index >= 0) {
		this.items.splice(index, 1);
		this.regenDomInventoryItems();
	}
};
