/**
 * Keyboard and mouse controls
 */
var Controls = {
	_currentButton: null,
	_dragging: false,
	_lastPosition: null,
	_current2DPosition: vec2.fromValues(0, 0),
	_keys: {},
	_rotationRate: vec3.create(),
	hasFocus: true, // Setting to false stops the controls capture
	
	// TODO fullscreen with F11 (does default browser fullscreen handles css :fullscreen pseudo-class ?)
	// TODO config to enable fullscreen on loading page (is it possible ? security restrictions ?)
	// TODO only use keyboard to enable fullscreen and remove button ?
	// TODO pointer lock with fullscreen
	
	/**
	 * Initializing control callbacks
	 * @param DOMElement The element where to bind the controls
	 */
	init: function(canvas) {
		var self = this;
		
		// TODO remove hasFocus as soon as tthe login window is standardized
		
		// Mouse
		canvas.addEventListener("mousedown", function(event) {
			if(self.hasFocus && event.target.tagName != "INPUT") {
				self._dragging = true;
				self._currentButton = event.button;
				event.preventDefault(); // Avoid scrolling
			}
		});
		window.addEventListener("mouseup", function(event) {
			if(self.hasFocus && event.target.tagName != "INPUT") {
				self._dragging = false;
				self._rotationRate = vec3.set(self._rotationRate, 0, 0, 0);
				self._currentButton = null;
				rotationAxis = vec3.fromValues(0, 0, 0);
				event.preventDefault(); // Avoid scrolling
			}
		});
		canvas.addEventListener("mousemove", function(event) {
			if(self.hasFocus && event.target.tagName != "INPUT") {
				// Inversing X and Y : 2D X axis is bound to 3D Y rotation
				self._current2DPosition = vec2.fromValues(event.clientX, event.clientY);
				var currentPosition = vec3.fromValues(event.clientY, event.clientX, event.clientX);

				if(self._dragging && self._lastPosition) {
					// Determining axis to move
					if(self._currentButton == 1) { // 1 = Middle click
						var rotationAxis = vec3.fromValues(0, 0, 1);
					} else if(self._currentButton == 2) { // 2 = Right click
						var rotationAxis = vec3.fromValues(1, 1, 0);
					} else {
						var rotationAxis = vec3.fromValues(0, 0, 0);
					}

					var distance = vec3.create();
					vec3.subtract(distance, currentPosition, self._lastPosition);

					// TODO move in camera
					vec3.multiply(distance, distance, rotationAxis);
					vec3.multiply(distance, distance, vec3.fromValues(0.0005, 0.0005, 0.0005));
					vec3.subtract(self._rotationRate, self._rotationRate, distance);
				}
				self._lastPosition = currentPosition;
				event.preventDefault(); // Avoid scrolling
			}
		});
		
		// Avoid context menu when using right click
		window.addEventListener("contextmenu", function(event) {
			if(event.target.tagName != "INPUT") event.preventDefault();
		});
		
		// Keyboard
		window.addEventListener("keydown", function(event) { print(Math.random());
			if(self.hasFocus && event.target.tagName != "INPUT") {
				var key = event.keyCode || event.which;
				self._keys[key] = true;
				if(key != 116) event.preventDefault(); // Avoid scrolling, 116 = F5 for debugging
			}
		});
		window.addEventListener("keyup", function(event) {
			if(self.hasFocus && event.target.tagName != "INPUT") {
				var key = event.keyCode || event.which;
				self._keys[key] = false;
				event.preventDefault(); // Avoid scrolling, 116 = F5 for debugging
			}
		});
	},
	
	/**
	 * Returns the current rotation
	 * @return vec3 The current rotation
	 */
	getRotation: function() {
		return this._rotationRate;
	},
	
	/**
	 * Returns the current movement
	 * @return vec3 Current moves for each axis (1, 0 or -1)
	 */
	getMovement: function() {
		var moves = vec3.create();
		
		// X Moves
		if(this._keys[Configuration.getKeyboard("right")]) { // Right
			moves[0] = 1;
		} else if(this._keys[Configuration.getKeyboard("left")]) { // Left
			moves[0] = -1;
		} else {
			moves[0] = 0;
		}
		
		// Y Moves
		if(this._keys[Configuration.getKeyboard("pgUp")]) { // Page Up
			moves[1] = 1;
		} else if(this._keys[Configuration.getKeyboard("pgDown")]) { // Page Down
			moves[1] = -1;
		} else {
			moves[1] = 0;
		}
		
		// Z moves
		if(this._keys[Configuration.getKeyboard("up")]) { // Up
			moves[2] = -1;
		} else if(this._keys[Configuration.getKeyboard("down")]) { // Down
			moves[2] = 1;
		} else {
			moves[2] = 0;
		}
		
		return moves;
	},
	
	/**
	 * Returns the current picking state
	 * @return vec2 Mouse 2D position if picking, null else
	 */
	getPicking: function() {
		if(this._dragging && this._currentButton == 0) { // 0 = Left click
			return this._current2DPosition;
		} else {
			return null;
		}
	}
};
