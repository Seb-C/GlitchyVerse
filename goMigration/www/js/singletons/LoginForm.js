var LoginForm = {
	
	/**
	 * Shows the login form
	 * @param callback A function to call when the user tries to login. 
	 *                 This callback has two parameters : login and password.
	 */
	open: function(world, callback) {
		this.world = world;
		var div = this._getDOMForm();
		var nameInput     = div.getElementsByClassName("nameInput"    )[0];
		var passwordInput = div.getElementsByClassName("passwordInput")[0];
		var submitButton  = div.getElementsByClassName("submitButton" )[0];
		
		var self = this;
		submitButton.onclick = function() {
			var name = nameInput.value;
			var password = passwordInput.value;
			
			if(name == "" || password == "") {
				self.setMessage("Name and password fields cannot be empty !", false);
			} else {
				callback(name, password);
				self.setMessage("Please wait ...", true);
			}
		};
		
		div.setAttribute("data-isVisible", true);
		this.world.camera.controls.hasFocus = false;
	},
	
	/**
	 * Hides the login form
	 */
	close: function() {
		var div = this._getDOMForm();
		div.setAttribute("data-isVisible", false);
		this.world.camera.controls.hasFocus = true;
	},
	
	/**
	 * Sets the message to show at the bottom of the login form
	 * @param String The message to show
	 * @param boolean True if valid (normal color), false else (red color)
	 */
	setMessage: function(message, isValid) {
		var div = this._getDOMForm();
		var infoArea = div.getElementsByClassName("informationArea")[0];
		infoArea.setAttribute("data-isValid", isValid);
		infoArea.innerHTML = message;
	},
	
	/**
	 * @return DOMElement The form DOMElement
	 */
	_getDOMForm: function() {
		return document.getElementById("authenticationDiv");
	}
};
