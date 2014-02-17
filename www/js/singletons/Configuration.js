/**
 * Configuration (and configurator) of the player (keys, volume ...)
 */
var Configuration = {
	/**
	 * Loads all the elements and images
	 */
	load: function() {
		if(localStorage.getItem("initialized") == null) {
			this._musicVolume = 1;
			this._soundVolume = 1;
			this._keyboard    = {
				"left"     : 37, // 37 = Left arrow
				"right"    : 39, // 39 = Right arrow
				"up"       : 38, // 38 = Up arrow
				"down"     : 40, // 40 = Down arrow
				"pgUp"     : 33, // 33 = Page up
				"pgDown"   : 34, // 34 = Page down
				"inventory": 73  // 73 = I
			}; // TODO add a new key without removing local storage ?!?
			this._save();
		} else {
			this._musicVolume = parseFloat(localStorage.getItem("musicVolume"));
			this._soundVolume = parseFloat(localStorage.getItem("soundVolume"));
			this._keyboard    = JSON.parse(localStorage.getItem("keyboard"   ));
		}
		
		// Key labels to show
		this._keyLabels = {
			"left"     : "Strafe left",
			"right"    : "Strafe right",
			"up"       : "Move frontward",
			"down"     : "Move backward",
			"pgUp"     : "Move upward",
			"pgDown"   : "Move downward",
			"inventory": "Inventory"
		};
		
		// Creating configuration button
		this._DOMShowButton = null;
		this._DOMContainer  = null;
		
		this._keyNames = null;
		this._loadKeyNames();
		
		this._createConfigurationButton();
		
		this._currentKeyToChange   = null;
		this._currentKeyController = null;
	},
	
	/**
	 * Finishes the initialisation by adding elements to body
	 */
	init: function() {
		document.body.appendChild(this._DOMShowButton);
		//document.body.appendChild(this._DOMContainer );
	},
	
	getMusicVolume: function()    { return this._musicVolume;   },
	getSoundVolume: function()    { return this._soundVolume;   },
	getKeyboard   : function(key) { return this._keyboard[key]; },
	
	setMusicVolume: function(volume) {
		// TODO change volume without reloading page
		this._musicVolume = volume;
		this._save();
	},
	setSoundVolume: function(volume) {
		this._soundVolume = volume;
		this._save();
	},
	setKeyboard: function(key, keyCode) {
		this._keyboard[key] = keyCode;
		this._save();
	},
	
	/**
	 * Saves all configuration to local storage
	 */
	_save: function() {
		localStorage.setItem("musicVolume", this._musicVolume);
		localStorage.setItem("soundVolume", this._soundVolume);
		localStorage.setItem("keyboard",    JSON.stringify(this._keyboard));
		localStorage.setItem("initialized", true);
	},
	
	/**
	 * Creates the configuration button
	 */
	_createConfigurationButton: function() {
		var self = this;
		
		// Creating button
		this._DOMShowButton = document.createElement("div");
		this._DOMShowButton.setAttribute("id", "configurationButton");
		this._DOMShowButton.setAttribute("class", "hudButton");
		this._DOMShowButton.appendChild(document.createTextNode("Configuration"));
		this._DOMShowButton.addEventListener("click", function() {
			if(self._DOMContainer) {
				self._DOMContainer.showWindow();
			} else {
				self._createConfigurationPanel();
			}
		});
	},
	
	/**
	 * Creates the configuration controls
	 */
	_createConfigurationPanel: function() {
		var self = this;
		
		// TODO unselectable window text
		this._DOMContainer = createWindow(400, 335, "Configuration", false/* TODO , closeCallBack */);
		this._DOMContainer.id = "configurationDiv";
		
		// Title
		var title = document.createElement("h2");
		title.appendChild(document.createTextNode("Sound configuration"));
		this._DOMContainer.appendChild(title);
		
		// Music volume controller
		div = document.createElement("div");
		div.appendChild(document.createTextNode("Music volume : "));
		var musicControl = document.createElement("input");
		musicControl.setAttribute("type", "range");
		musicControl.setAttribute("value", this._musicVolume);
		musicControl.setAttribute("min",   0);
		musicControl.setAttribute("max",   1);
		musicControl.setAttribute("step",  0.05);
		musicControl.addEventListener("change", function() {
			self.setMusicVolume(parseFloat(this.value));
		});
		div.appendChild(musicControl);
		this._DOMContainer.appendChild(div);
		
		// Sound volume controller
		div = document.createElement("div");
		div.appendChild(document.createTextNode("Sound volume : "));
		var soundControl = document.createElement("input");
		soundControl.setAttribute("type",  "range");
		soundControl.setAttribute("value", this._soundVolume);
		soundControl.setAttribute("min",   0);
		soundControl.setAttribute("max",   1);
		soundControl.setAttribute("step",  0.05);
		soundControl.addEventListener("change", function() {
			self.setSoundVolume(parseFloat(this.value));
		});
		div.appendChild(soundControl);
		this._DOMContainer.appendChild(div);
		
		title = document.createElement("h2");
		title.appendChild(document.createTextNode("Keyboard configuration"));
		this._DOMContainer.appendChild(title);
		
		// TODO remove event listener after closing window
		
		// Keys change
		window.addEventListener('keyup', function(e) {
			var event = e || window.event;
			if(self._currentKeyToChange !== null) {
				var key = event.keyCode || event.which;
				self.setKeyboard(self._currentKeyToChange, key);
				self._currentKeyToChange = null;
				var keyName = self._keyNames[key] ? self._keyNames[key] : "KEY_" + key;
				self._currentKeyController.value = keyName;
				self._currentKeyController = null;
				event.stopPropagation();
			}
			event.preventDefault();
		});
		
		for(var keyDescription in this._keyboard) {
			var key = this._keyboard[keyDescription];
			var keyName = this._keyNames[key] ? this._keyNames[key] : "KEY_" + key;
			
			div = document.createElement("div");
			div.appendChild(document.createTextNode(this._keyLabels[keyDescription] + " : "));
			var keyControl = document.createElement("input");
			keyControl.setAttribute("type",         "button"      );
			keyControl.setAttribute("value",        keyName       );
			keyControl.setAttribute("data-keyName", keyDescription);
			keyControl.addEventListener("click", function() {
				self._currentKeyController = this;
				self._currentKeyToChange = this.getAttribute("data-keyName");
				this.value = "...";
			});
			div.appendChild(keyControl);
			this._DOMContainer.appendChild(div);
		}
		
		// TODO don't allow double assignation for one key
		// TODO gamepads
	},
	
	// TODO standard method to get the name of a key (+ same for getting keyup/keydown codes)
	_loadKeyNames: function() {
		if(window.KeyEvent) {
			this._keyNames = Array();
			for(var a in window.KeyEvent) {
				if(a.indexOf("DOM_VK_") == 0) {
					this._keyNames[window.KeyEvent[a]] = a.substring(7);
				}
			}
		} else {
			this._keyNames = {
				3: "CANCEL",
				6: "HELP",
				8: "BACK_SPACE",
				9: "TAB",
				12: "CLEAR",
				13: "RETURN",
				14: "ENTER",
				16: "SHIFT",
				17: "CONTROL",
				18: "ALT",
				19: "PAUSE",
				20: "CAPS_LOCK",
				21: "KANA",
				21: "HANGUL",
				22: "EISU",
				23: "JUNJA",
				24: "FINAL",
				25: "HANJA",
				25: "KANJI",
				27: "ESCAPE",
				28: "CONVERT",
				29: "NONCONVERT",
				30: "ACCEPT",
				31: "MODECHANGE",
				32: "SPACE",
				33: "PAGE_UP",
				34: "PAGE_DOWN",
				35: "END",
				36: "HOME",
				37: "LEFT",
				38: "UP",
				39: "RIGHT",
				40: "DOWN",
				41: "SELECT",
				42: "PRINT",
				43: "EXECUTE",
				44: "PRINTSCREEN",
				45: "INSERT",
				46: "DELETE",
				48: "0",
				49: "1",
				50: "2",
				51: "3",
				52: "4",
				53: "5",
				54: "6",
				55: "7",
				56: "8",
				57: "9",
				58: "COLON",
				59: "SEMICOLON",
				60: "LESS_THAN",
				61: "EQUALS",
				62: "GREATER_THAN",
				63: "QUESTION_MARK",
				64: "AT",
				65: "A",
				66: "B",
				67: "C",
				68: "D",
				69: "E",
				70: "F",
				71: "G",
				72: "H",
				73: "I",
				74: "J",
				75: "K",
				76: "L",
				77: "M",
				78: "N",
				79: "O",
				80: "P",
				81: "Q",
				82: "R",
				83: "S",
				84: "T",
				85: "U",
				86: "V",
				87: "W",
				88: "X",
				89: "Y",
				90: "Z",
				91: "WIN",
				93: "CONTEXT_MENU",
				95: "SLEEP",
				96: "NUMPAD0",
				97: "NUMPAD1",
				98: "NUMPAD2",
				99: "NUMPAD3",
				100: "NUMPAD4",
				101: "NUMPAD5",
				102: "NUMPAD6",
				103: "NUMPAD7",
				104: "NUMPAD8",
				105: "NUMPAD9",
				106: "MULTIPLY",
				107: "ADD",
				108: "SEPARATOR",
				109: "SUBTRACT",
				110: "DECIMAL",
				111: "DIVIDE",
				112: "F1",
				113: "F2",
				114: "F3",
				115: "F4",
				116: "F5",
				117: "F6",
				118: "F7",
				119: "F8",
				120: "F9",
				121: "F10",
				122: "F11",
				123: "F12",
				124: "F13",
				125: "F14",
				126: "F15",
				127: "F16",
				128: "F17",
				129: "F18",
				130: "F19",
				131: "F20",
				132: "F21",
				133: "F22",
				134: "F23",
				135: "F24",
				144: "NUM_LOCK",
				145: "SCROLL_LOCK",
				160: "CIRCUMFLEX",
				161: "EXCLAMATION",
				162: "DOUBLE_QUOTE",
				163: "HASH",
				164: "DOLLAR",
				165: "PERCENT",
				166: "AMPERSAND",
				167: "UNDERSCORE",
				168: "OPEN_PAREN",
				169: "CLOSE_PAREN",
				170: "ASTERISK",
				171: "PLUS",
				172: "PIPE",
				173: "HYPHEN_MINUS",
				174: "OPEN_CURLY_BRACKET",
				175: "CLOSE_CURLY_BRACKET",
				176: "TILDE",
				188: "COMMA",
				190: "PERIOD",
				191: "SLASH",
				192: "BACK_QUOTE",
				219: "OPEN_BRACKET",
				220: "BACK_SLASH",
				221: "CLOSE_BRACKET",
				222: "QUOTE",
				224: "META",
				225: "ALTGR"
			};
		}
	}
};
