/**
 * Manages the stock values, the resource types and the build costs
 * @param Object Definition of resources and build costs, from the server
 */
var ResourceManager = function(definition) {
	this.stocks = null; // Initialized by ServerConnection via setStocks
	this.spaceShip = null;
	
	this.types = definition;
	this.costsByObjectTypeId = {};
	this.containerObjectsCapacity = {};
	this.containerObjectsResourceType = {};
	
	for(var k in this.types) {
		var type = this.types[k];
		for(var j = 0 ; j < type.costs.length ; j++) {
			var cost = type.costs[j];
			
			if(!this.costsByObjectTypeId[cost.object_type_id]) this.costsByObjectTypeId[cost.object_type_id] = {};
			this.costsByObjectTypeId[cost.object_type_id][k] = cost;
		}
		
		for(var j = 0 ; j < type.containers.length ; j++) {
			var container = type.containers[j];
			this.containerObjectsCapacity[container.object_type_id] = container.capacity;
			this.containerObjectsResourceType[container.object_type_id] = k;
		}
	}
};

ResourceManager.prototype.setSpaceShip = function(spaceShip) {
	this.spaceShip = spaceShip;
};

/**
 * Changes the stock values
 * @param Object With key = resource type id, value = stock
 */
ResourceManager.prototype.setStocks = function(stocks) {
	this.stocks = stocks;
};

/**
 * Determines the number to multiply to the cost of a building.
 * @param vec3 The size of the object
 * @return float the multiplicator
 */
ResourceManager.prototype.getCostMultiplicator = function(size) {
	return size[0] * size[1] * size[2];
};

/**
 * Calculates the current consumption of a resource
 * @param int- The id of the resource type
 * @return float The consumption of the resource
 */
ResourceManager.prototype.getConsumption = function(resourceTypeId) {
	var consumption = 0;
	var resourceCosts = this.types[resourceTypeId].costs;
	for(var i = 0 ; i < resourceCosts.length ; i++) {
		var objectTypeConsumption = resourceCosts[i].consumption;
		var consumerIds = this.spaceShip.objectsByTypeIds[resourceCosts[i].object_type_id];
		if(consumerIds) {
			for(var j = 0 ; j < consumerIds.length ; j++) {
				consumption += objectTypeConsumption * this.getCostMultiplicator(this.spaceShip.objectSizes[consumerIds[j]]);
			}
		}
	}
	return consumption;
};

ResourceManager.prototype.getStorageCapacity = function(resourceTypeId) {
	var capacity = 0;
	
	var containers = this.types[resourceTypeId].containers;
	for(var i = 0 ; i < containers.length ; i++) {
		var containerTypeCapacity = containers[i].capacity;
		
		var containerObjects = this.spaceShip.objectsByTypeIds[containers[i].object_type_id];
		if(containerObjects) {
			for(var j = 0 ; j < containerObjects.length ; j++) {
				capacity += containerTypeCapacity * this.getCostMultiplicator(this.spaceShip.objectSizes[containerObjects[j]]);
			}
		}
	}
	
	return capacity;
};

/**
 * Builds a table showing stocks and costs for a building.
 * A new attribute called useMoney (boolean) will be added to the popup DomElement.
 * @param DomElement The element (created with confirmPopup) where to append the table
 * @param int The id of the object type
 * @param vec3 The size of the object
 * @param boolean True if selling, false if buying
 * @return boolean True if the action is allowed (has enough resource and storage capacity)
 */
ResourceManager.prototype.buildCostTable = function(confirmPopup, targetTypeId, targetSize, isSelling) {
	var table = document.createElement("table");
	table.setAttribute("class", "resourceCostTable");
	
	var createCell = function(parentNode, tagName, value, className, colspan) {
		var cell = document.createElement(tagName);
		if(typeof(value) != "undefined") {
			cell.appendChild(document.createTextNode(value));
			cell.setAttribute("data-value", value);
		}
		if(className) cell.setAttribute("class", className);
		if(colspan) cell.setAttribute("colspan", colspan);
		parentNode.appendChild(cell);
	};
	
	// TODO don't dismantle if it reduces the storage capacity too much (+ same server-side)
	// TODO allow negative total consumption ?
	
	var resourceQuantityToString = function(x) {
		var r = "";
		if(x == 0) {
			return "-";
		} else if(x > 0) {
			r += "+";
		}
		
		r += x.toLocaleString();
		
		return r;
	};
	
	// Table head line 1
	var titleTr1 = document.createElement("tr");
	createCell(titleTr1, "th");
	createCell(titleTr1, "th", "Current", null, 3);
	createCell(titleTr1, "th", "Cost",    null, 3);
	table.appendChild(titleTr1);
	
	// TODO regularly synchronize stocks with server (+ update it with consumption)
	// TODO window to show details about resources
	// TODO container models
	
	// Table head line 2
	var titleTr2 = document.createElement("tr");
	createCell(titleTr2, "th");
	createCell(titleTr2, "th", "Stock");
	createCell(titleTr2, "th", "Max.");
	createCell(titleTr2, "th", "Daily");
	createCell(titleTr2, "th", "Stock");
	createCell(titleTr2, "th", "Max.");
	createCell(titleTr2, "th", "Daily");
	table.appendChild(titleTr2);
	
	var moneyRows = new Array();
	var hasEnoughResources = true;
	var hasEnoughProduction = true;
	var hasEnoughMoney = true;
	var costMultiplicator = this.getCostMultiplicator(targetSize);
	var negativeMultiplicator = isSelling ? -1 : 1;
	for(var k in this.types) {
		var buildStorage;
		if(this.containerObjectsResourceType[targetTypeId] && this.containerObjectsResourceType[targetTypeId] == k) {
			buildStorage = this.containerObjectsCapacity[targetTypeId] * negativeMultiplicator;
		} else {
			buildStorage = 0;
		}
		
		if(this.costsByObjectTypeId[targetTypeId][k] || buildStorage != 0) {
			var resource = this.costsByObjectTypeId[targetTypeId][k] ? this.costsByObjectTypeId[targetTypeId][k] : null;
			
			var currentStock       = this.stocks[k];
			var currentConsumption = this.getConsumption(k);
			var currentStorage     = this.getStorageCapacity(k);
			
			var buildConsumption;
			if(resource != null) {
				buildConsumption = resource.consumption * costMultiplicator * negativeMultiplicator;
			} else {
				buildConsumption = 0;
			}
			
			var buildCost;
			if((!isSelling || this.types[k].is_money) && resource != null) {
				buildCost = resource.build_cost * costMultiplicator * negativeMultiplicator;
			} else {
				buildCost = 0;
			}
			
			var tr = document.createElement("tr");
			createCell(tr, "th", this.types[k].name, "resourceName");
			createCell(tr, "td", currentStock);
			createCell(tr, "td", currentStorage);
			createCell(tr, "td", resourceQuantityToString(-currentConsumption));
			createCell(tr, "td", resourceQuantityToString(-buildCost         ));
			createCell(tr, "td", resourceQuantityToString(buildStorage));
			createCell(tr, "td", resourceQuantityToString(-buildConsumption  ));
			
			if(this.types[k].is_money) {
				moneyRows.push(tr);
			} else {
				table.appendChild(tr);
			}
			
			if((buildCost > 0 && currentStock < buildCost)
			|| (buildCost < 0 && currentStock + buildCost > currentStorage)) {
				if(this.types[k].is_money) {
					hasEnoughMoney = false;
				} else {
					hasEnoughResources = false;
				}
			}
			if(buildConsumption > 0 && -currentConsumption < buildConsumption) {
				hasEnoughProduction = false;
			}
		}
	}
	
	if(moneyRows.length > 0) {
		if(!isSelling) {
			var checkBox = document.createElement("input");
			checkBox.setAttribute("type", "checkbox");
			checkBox.disabled = !hasEnoughMoney;
			checkBox.addEventListener("change", function(event) {
				confirmPopup.useMoney = this.checked;
				if(this.checked) {
					confirmPopup.disableConfirmButton(!hasEnoughProduction || !hasEnoughMoney);
				} else {
					confirmPopup.disableConfirmButton(!hasEnoughProduction || !hasEnoughResources);
				}
			});
			
			var tr = document.createElement("tr");
			var td = document.createElement("td");
			td.setAttribute("colspan", 6);
			var label = document.createElement("label");
			label.appendChild(checkBox);
			label.appendChild(document.createTextNode("Use spare parts"));
			td.appendChild(label);
			tr.appendChild(td);
			table.appendChild(tr);
		}
		
		for(var i = 0 ; i < moneyRows.length ; i++) {
			table.appendChild(moneyRows[i]);
		}
	}
	
	confirmPopup.appendChild(table);
	confirmPopup.useMoney = false;
	
	if(!hasEnoughResources || !hasEnoughProduction) {
		confirmPopup.disableConfirmButton(true);
	}
};