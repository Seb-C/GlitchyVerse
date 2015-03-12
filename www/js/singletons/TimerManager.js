/**
 * The MIT License (MIT)
 * 
 * Copyright (c) 2015 Sébastien CAPARROS (GlitchyVerse)
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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
