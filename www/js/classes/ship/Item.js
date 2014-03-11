var Item = function(definition, container) {
	this.id          = definition.id;
	this.typeId      = definition.type_id;
	this.type        = Item.types[this.typeId];
	this.state       = definition.state;
	this.container   = container;
	this.slotGroupId = definition.slot_group_id; // TODO
	
	this.dom = null;
	this.domTooltipState = null;
	this.createDom();
};

// TODO methods documentations here

Item.groups = null; // Static (key = id, value = name), set by ServerConnection
Item.types  = null; // Static (key = id, value = Object), set by ServerConnection

Item.currentItemDragged = null; // Static

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

Item.prototype._updateDomTooltipState = function() {
	if(this.type.maxState > 0) {
		this.domTooltipState.innerHTML = (
			Math.round(this.state) + " / " + this.type.maxState
			+ " (" + Math.round(this.state / this.type.maxState * 100) + " %)"
		);
	}
};

Item.prototype.setState = function(newState) {
	this.state = newState;
	this._updateDomTooltipState();
};

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