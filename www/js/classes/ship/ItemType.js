/**
 * Defines the type of an item
 */
var ItemType = function(definition) {
	this.id       = definition.id;
	this.name     = definition.name;
	this.maxState = definition.maxState;
	this.groups   = definition.groups;
};
