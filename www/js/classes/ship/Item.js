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
 * An item in the inventory
 * @param Object Definition of the item
 * @param Building The building where the item is
 */
var Item = function(definition, container) {
	this.id          = definition.id;
	this.typeId      = definition.typeId;
	this.type        = Item.types[this.typeId];
	this.state       = definition.state;
	this.container   = container;
	this.slotGroupId = definition.slotGroupId;
	
	this.dom = null;
	this.domTooltipState = null;
	this.createDom();
};

Item.groups = null; // Static (key = id, value = name), set by ServerConnection
Item.types  = null; // Static (key = id, value = Object), set by ServerConnection

Item.currentItemDragged = null; // Static

/**
 * Creates the DOM Element of the item
 */
Item.prototype.createDom = function() {
	this.dom = document.createElement("div");
	this.dom.setAttribute("class", "item");
	this.dom.setAttribute("draggable", true);
	
	var self = this;
	this.dom.addEventListener("dragstart", function(event) {
		Item.currentItemDragged = self;
		self.dom.classList.add("moving");
		event.dataTransfer.setData("text", ""); // Required for visual move effect
		event.dataTransfer.setDragImage(this, this.offsetWidth / 2, this.offsetHeight / 2);
	});
	this.dom.addEventListener("dragend", function(event) {
		self.dom.classList.remove("moving");
		Item.currentItemDragged = null;
	});
	
	this.domSlotGroupName = document.createElement("span");
	this.domSlotGroupName.setAttribute("class", "slotGroup");
	if(this.slotGroupId != null && this.slotGroupId != 0) {
		this.domSlotGroupName.innerHTML = "(" + Item.groups[this.slotGroupId] + ")&nbsp;";
	}
	this.dom.appendChild(this.domSlotGroupName);
	
	this.dom.appendChild(document.createTextNode(this.type.name));
	
	// Tooltip
	var tooltip = document.createElement("div");
	tooltip.setAttribute("class", "tooltip");
	this.dom.appendChild(tooltip);
	
	// Item name in tooltip
	var ttName = document.createElement("div");
	ttName.setAttribute("class", "h1");
	ttName.appendChild(document.createTextNode(this.type.name));
	tooltip.appendChild(ttName);
	
	// Item state in tooltip
	if(this.type.maxState > 0) {
		var ttStateTitle = document.createElement("div");
		ttStateTitle.setAttribute("class", "h2");
		ttStateTitle.appendChild(document.createTextNode("State"));
		tooltip.appendChild(ttStateTitle);
		
		this.domTooltipState = document.createElement("span");
		this._updateDomTooltipState();
		tooltip.appendChild(this.domTooltipState);
	}
	
	// TODO add attribute in item group to hide it from item description (+ use it instead of filter of the "any" group (3 times here))
	
	// Item groups in tooltip
	if(this.type.groups.length > 1) { // Assuming there is always the "any" group
		var ttGroupsTitle = document.createElement("div");
		ttGroupsTitle.setAttribute("class", "h2");
		ttGroupsTitle.appendChild(document.createTextNode("Usable as ..."));
		tooltip.appendChild(ttGroupsTitle);
		
		var ttGroups = document.createElement("span");
		var groups = "";
		for(var i = 0 ; i < this.type.groups.length ; i++) {
			var id = this.type.groups[i];
			if(id != 0) {
				if(groups != "") groups += ", "; // First iteration
				groups += Item.groups[id];
			}
		}
		ttGroups.appendChild(document.createTextNode(groups));
		tooltip.appendChild(ttGroups);
	}
};

/**
 * Updates the state of the item in the DOM tooltip
 */
Item.prototype._updateDomTooltipState = function() {
	if(this.type.maxState > 0) {
		this.domTooltipState.innerHTML = (
			Math.round(this.state) + " / " + this.type.maxState
			+ " (" + Math.round(this.state / this.type.maxState * 100) + " %)"
		);
	}
};

/**
 * Changes the state of the item
 */
Item.prototype.setState = function(newState) {
	this.state = newState;
	this._updateDomTooltipState();
};

/**
 * Moves the item to another building inventory
 */
Item.prototype.moveTo = function(newContainer, slotGroupId) {
	this.slotGroupId = slotGroupId;
	this.container.removeItem(this);
	this.container = newContainer;
	this.container.addItem(this);
	if(this.slotGroupId != null && this.slotGroupId != 0) {
		this.domSlotGroupName.innerHTML = "(" + Item.groups[this.slotGroupId] + ")&nbsp;";
	} else {
		this.domSlotGroupName.innerHTML = null;
	}
};
