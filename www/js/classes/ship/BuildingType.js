var BuildingType = function(definition) {
	this.id                       = definition.id;
	this.name                     = definition.name;
	this.category                 = definition.category;
	this.model                    = definition.model;
	this.isGap                    = definition.isGap;
	this.defaultState             = definition.defaultState;
	this.isSizeable               = definition.isSizeable;
	this.isContainer              = definition.isContainer;
	this.isInside                 = definition.isInside;
	this.isRoomUnit               = definition.isPositionByRoomUnit;
	this.isControllable           = definition.isControllable;
	this.exertThrust              = definition.canExertThrust;
	this.minState                 = definition.minState;
	this.maxState                 = definition.maxState;
	
	// Key = group id
	this.slotsWhenBuilt    = {};
	this.slotsWhenNotBuilt = {};
	
	for(var i = 0 ; i < definition.slots.length ; i++) {
		var slot = definition.slots[i];
		var container = slot.whenBuilding ? this.slotsWhenNotBuilt : this.slotsWhenBuilt;
		container[slot.group] = {
			maximumAmount : slot.maximumAmount,
			stateVariation: slot.stateVariation
		};
	}
};

/**
 * @param boolean False if the building has not been built yet
 * @return int The number of slots for this building type, depending if it's built or not
 */
BuildingType.prototype.getSlotsCount = function(isBuilt) {
	var slots = isBuilt ? this.slotsWhenBuilt : this.slotsWhenNotBuilt;
	var slotsCount = 0;
	for(var k in slots) {
		slotsCount += slots[k].maximumAmount;
	}
	return slotsCount;
};

/**
 * @param boolean False if the building has not been built yet
 * @return Object key = group id
 */
BuildingType.prototype.getSlots = function(isBuilt) {
	return isBuilt ? this.slotsWhenBuilt : this.slotsWhenNotBuilt;
};
