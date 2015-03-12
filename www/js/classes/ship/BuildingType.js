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
