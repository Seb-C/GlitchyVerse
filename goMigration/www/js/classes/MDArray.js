/**
 * A multi-dimensional associative Array
 * @param Object (optional) A simple JS Object to convert to a MDArray
 * @param int (required when first parameter is set) The deep of the object.
 */
var MDArray = function(object, maxDeep) {
	if(arguments.length == 2) {
		this.addObjectContents(object, maxDeep);
	}
};

/**
 * Adds object properties to the current MDArray
 * @param Object (optional) A simple JS Object.
 * @param int (required when first parameter is set) The deep of the object.
 */
MDArray.prototype.addObjectContents = function(object, maxDeep) {
	for(var i in object) {
		if(object.hasOwnProperty(i)) {
			if(maxDeep == 1) {
				this[i] = object[i];
			} else /*if(maxDeep > 1)*/ {
				if(!this[i]) this[i] = new this.constructor();
				this[i].addObjectContents(object[i], maxDeep - 1);
			}
		}
	}
};

/**
 * Returns a value, giving it's position
 * @param Array Containing the position
 * @return Object The value, or null
 */
MDArray.prototype.get = function(position) {
	var pos = position[0];
	if(this[pos]) {
		if(position.length == 1) {
			return this[pos];
		} else {
			return this[pos].get(position.slice(1));
		}
	} else {
		return null;
	}
};

/**
 * Determines if a value exists
 * @param Array Containing the position
 * @return Boolean true if the value exists
 */
MDArray.prototype.is = function(position) {
	var pos = position[0];
	if(this[pos]) {
		if(position.length == 1) {
			return true;
		} else {
			return this[pos].is(position.slice(1));
		}
	} else {
		return false;
	}
};

/**
 * Changes or creates a value, giving it's position
 * @param Array Containing the position
 * @param Object The new value
 */
MDArray.prototype.set = function(position, valueToSet) {
	var pos = position[0];
	if(position.length == 1) {
		this[pos] = valueToSet;
	} else {
		if(!this[pos]) this[pos] = new this.constructor();
		return this[pos].set(position.slice(1), valueToSet);
	}
};

/**
 * Deletes a value
 * @param Array Containing the position of the value to remove
 */
MDArray.prototype.delete = function(position) {
	var pos = position[0];
	if(position.length == 1) {
		delete this[pos];
	} else {
		if(this[pos]) this[pos].delete(position.slice(1));
		
		// If the MDArray is empty, we have to delete it
		var len = 0;
		for(var i in this[pos]) {
			if(this[pos].hasOwnProperty(i)) {
				len++;
			}
		}
		if(len == 0) delete this[pos];
	}
};

/**
 * Loops on every value of the MDArray
 * @param Callback Function which will be applied to each value.
 *                 Unlike Array.map, it doesn't changes the values.
 *                 Parameters passed to the callback are : 
 *                 - Array  : Position of the value
 *                 - Object : The value of the item
 */
MDArray.prototype.loop = function(callback) {
	// Hidden second parameter to pass the position
	var position = arguments.length == 2 ? arguments[1] : [];
	
	for(var i in this) {
		if(this.hasOwnProperty(i)) {
			var positionClone = position.slice(0);
			positionClone.push(i);
			if(this[i] instanceof this.constructor) {
				this[i].loop(callback, positionClone);
			} else {
				callback(positionClone, this[i]);
			}
		}
	}
};

/**
 * Converts the object to a printable string (for debug)
 * @return String The string representation of the object
 */
MDArray.prototype.toString = function() {
	// Hidden parameter to determine the indentation
	var indentSize = arguments.length == 1 ? arguments[0] : 0;
	
	var r = "";
	var indentString = (new Array(indentSize + 1)).join("    ");
	for(var i in this) {
		if(this.hasOwnProperty(i)) {
			if(this[i] instanceof this.constructor) {
				r += indentString + i + " = (\n" 
						 + this[i].toString(indentSize + 1) 
				   + indentString + ")\n";
			} else {
				r += indentString + i + " = " + JSON.stringify(this[i]) + "\n";
			}
		}
	}
	r += "";
	
	return r;
};