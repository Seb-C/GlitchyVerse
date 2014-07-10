(function(win, doc, el) {
	var vendors = ['ms', 'moz', 'webkit', 'o'];

	if(typeof(el.prototype.requestPointerLock) == "undefined") {
		for(var i = 0 ; i < vendors.length ; i++) {
			if(el.prototype[vendors[i] + "RequestPointerLock"]) {
				el.prototype.requestPointerLock = el.prototype[vendors[i] + "RequestPointerLock"];
				break;
			}
		}
	}

	if(typeof(doc.exitPointerLock) == "undefined") {
		for(var i = 0 ; i < vendors.length ; i++) {
			if(doc[vendors[i] + "ExitPointerLock"]) {
				doc.exitPointerLock = doc[vendors[i] + "ExitPointerLock"];
				break;
			}
		}
	}

	win.setPointerLockChangeEvent = function(element, callBack) {
		for(var i = 0 ; i < vendors.length ; i++) {
			element.addEventListener(vendors[i] + "pointerlockchange", function(event) {
				callBack(event);
			});
		}
	}

	win.readPointerLockMovement = function(event) {
		if(event.movementX) return [event.movementX, event.movementY];
		
		for(var i = 0 ; i < vendors.length ; i++) {
			var v = vendors[i];
			if(event[v + "MovementX"]) {
				return [event[v + "MovementX"], event[v + "MovementY"]];
			}
		}
		
		return [0, 0];
	}
})(window, document, Element);
