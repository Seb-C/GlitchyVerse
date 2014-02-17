var BuildingType = function(definition) {
	this.id                       = definition.id;
	this.name                     = definition.name;
	this.category                 = definition.category;
	this.model                    = definition.model;
	this.isGap                    = definition.is_gap;
	this.defaultState             = definition.default_state;
	this.allowRotation            = definition.allow_rotation; // vec3
	this.isSizeable               = definition.is_sizeable;
	this.rotationAllowedDivisions = definition.rotation_allowed_divisions;
	this.isRoomUnit               = definition.is_position_by_room_unit;
	this.isControllable           = definition.is_controllable;
	this.exertThrust              = definition.can_exert_thrust;
	this.minState                 = definition.min_state;
	this.maxState                 = definition.max_state;
	
	// Key = group id
	this.slotsWhenBuilt    = {};
	this.slotsWhenNotBuilt = {};
	
	for(var i = 0 ; i < definition.slots.length ; i++) {
		var slot = definition.slots[i];
		var container = slot.when_building ? this.slotsWhenNotBuilt : this.slotsWhenBuilt;
		container[slot.group] = {
			maximumAmount : slot.maximum_amount,
			stateVariation: slot.state_variation
		};
	}
	
	this.slotsCountWhenBuilt    = Object.keys(this.slotsWhenBuilt   ).length;
	this.slotsCountWhenNotBuilt = Object.keys(this.slotsWhenNotBuilt).length;
};

/**
 * @param boolean False if the building has not been built yet
 * @return int The number of slots for this building type, depending if it's built or not
 */
BuildingType.prototype.getSlotsCount = function(isBuilt) {
	return isBuilt ? this.slotsCountWhenBuilt : this.slotsCountWhenNotBuilt;
};

/**
 * @param boolean False if the building has not been built yet
 * @return Object key = group id
 */
BuildingType.prototype.getSlots = function(isBuilt) {
	return isBuilt ? this.slotsWhenBuilt : this.slotsWhenNotBuilt;
};