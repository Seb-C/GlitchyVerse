/**
 * Manages a list of actions to do at regular intervals.
 * This function is synchronized with frames, so it's better than setInterval
 */
var TimerManager = {
	lastUpdateTimeStamp: new Date().getTime(),
	_timerObjects: new Array(),
	
	/**
	 * Returns the current timestamp
	 * @return int The current timestamp
	 */
	getCurrentTimeStamp: function() {
		return new Date().getTime();
	},
	
	/**
	 * Function to call at each frame. Executes the Timer objects when necessary.
	 * Also updates the lastUpdateTimeStamp attribute to avoid creation of a Date object everytime.
	 */
	update: function() {
		this.lastUpdateTimeStamp = this.getCurrentTimeStamp();
		
		for(var i = 0 ; i < this._timerObjects.length ; i++) {
			this._timerObjects[i].update(this.lastUpdateTimeStamp);
		}
	},
	
	/**
	 * Adds a Timer object to the list
	 * @param Timer a timer object to add to the list
	 */
	registerTimerObject: function(timerObject) {
		this._timerObjects.push(timerObject);
	},
	
	/**
	 * Removes a Timer object from the list
	 * @param Timer a timer object to remove from the list
	 */
	unregisterTimerObject: function(timerObject) {
		var index = this._timerObjects.indexOf(timerObject);
		this._timerObjects.splice(index, 1);
	}
};