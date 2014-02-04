var Item = function() {
	// TODO
	//this.container = inventory;
	
	this.dom = null;
	this.createDom();
};

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
		event.dataTransfer.setData("text", ""); // Required for visual move effect
		event.dataTransfer.setDragImage(this, this.offsetWidth / 2, this.offsetHeight / 2);
	});
	this.dom.addEventListener("dragend", function(event) {
		Item.currentItemDragged = null;
	});
	
	this.dom.appendChild(document.createTextNode(this.name));
};

Item.prototype.moveTo = function(newInventory) {
	this.container.removeItem(this);
	newInventory.addItem(this);
	this.container = newInventory;
};
