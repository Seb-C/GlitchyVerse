/**
 * Defines en object which needs to be executed at a regular time
 * This object is synchronized with frames, so it's better than setInterval
 * The constructor automatically registers with the TimerManager.
 * @param callBack Function to execute. One parameter will be passed, which is the time really passed
 * @param int Interval time between execution (as milliseconds). If 0, will be executed at each frame
 * @param boolean (optional, default false) True if the first execution is now, false if it's after the interval
 */
var Timer = function(callBack, interval, executeNow) {
	this.enabled = true;
	this.reset(callBack, interval, executeNow);
	TimerManager.registerTimerObject(this);
};

/**
 * Reinitializes the timer (replaces the callback, the interval and resets the time
 * @param callBack See constructor
 * @param int See constructor
 * @param boolean See constructor
 */
Timer.prototype.reset = function(callBack, interval, executeNow) {
	this.callBack = callBack;
	this.interval = interval;
	this.lastExecutionTimeStamp = executeNow ? 0 : TimerManager.lastUpdateTimeStamp;
};

/**
 * Executes the callback if necessary
 * @param int the current time
 */
Timer.prototype.update = function(currentTime) {
	if(this.enabled && currentTime >= this.lastExecutionTimeStamp + this.interval) {
		this.callBack(currentTime - this.lastExecutionTimeStamp);
		this.lastExecutionTimeStamp = currentTime;
	}
};

/**
 * Forces the execution now and updates the next update
 */
Timer.prototype.forceExecutionNow = function() {
	this.callBack(TimerManager.lastUpdateTimeStamp - this.lastExecutionTimeStamp);
	this.lastExecutionTimeStamp = TimerManager.lastUpdateTimeStamp;
};

/**
 * Unregisters the timer object, so it will be garbage collected
 */
Timer.prototype.unregister = function() {
	TimerManager.unregisterTimerObject(this);
};