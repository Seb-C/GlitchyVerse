/**
 * Creates a new window in the interface. Must be called after document loading has ended.
 * @param int The initial width of the window
 * @param int The initial height of the window
 * @param String The window title
 * @param boolean (optional, default true) True if the window can be resized by the player
 * @param callBack (optional) Function to call when the window is closed
 * @return HTMLElement Where to put window content.
 *                     Window can be opened again after closing by
 *                     calling the "showWindow" method on this object.
 */
function createWindow(initialWidth, initialHeight, title, isResizable, closeCallBack) {
	if(!createWindow.nextZIndex) createWindow.nextZIndex = 0;
	
	var win = document.createElement("div");
	
	// Setting attributes
	win.setAttribute("class", "window");
	win.setAttribute("data-isResizable", typeof(isResizable) == "undefined" ? true : isResizable);
	
	// Setting size and putting it on the top of other windows
	win.style.width  = initialWidth  + "px";
	win.style.height = initialHeight + "px";
	win.style.left   = Math.round((window.innerWidth  - initialWidth ) / 2) + "px";
	win.style.top    = Math.round((window.innerHeight - initialHeight) / 2) + "px";
	win.style.zIndex = createWindow.nextZIndex++;
	
	var hideWindow = function() {
		win.style.display = "none";
		if(closeCallBack) closeCallBack();
	};
	
	// Close button
	var closeButton = document.createElement("div");
	closeButton.setAttribute("class", "closeButton");
	//closeButton.appendChild(document.createTextNode("+"));
	closeButton.innerHTML = "&times;";
	closeButton.addEventListener("click", hideWindow);
	win.appendChild(closeButton);
	
	// Adding title
	var titleNode = document.createElement("h1");
	titleNode.innerHTML = title;
	win.appendChild(titleNode);
	
	// Show the window at the top when clicking on it
	win.addEventListener("click", function(event) {
		win.style.zIndex = createWindow.nextZIndex++;
	});
	
	// Window moving handlers
	var mouseMoveCallBack = function(event) {
		if(win.initialMousePos != null) {
			var currentMousePos = [event.clientX, event.clientY];
			
			win.style.left = (win.offsetLeft + currentMousePos[0] - win.initialMousePos[0]) + "px";
			win.style.top  = (win.offsetTop  + currentMousePos[1] - win.initialMousePos[1]) + "px";
			
			win.initialMousePos = currentMousePos;
		}
	};
	var mouseUpCallBack = function(event) {
		win.initialMousePos = null;
		
		// Removing global listeners
		window.removeEventListener("mousemove", mouseMoveCallBack);
		window.removeEventListener("mouseup", mouseUpCallBack);
	};
	win.addEventListener("mousedown", function(event) {
		// Moving it only if click is not on 20 pixels bottom (resize)
		if((event.target == win || event.target == titleNode) && event.clientY - win.offsetTop < win.offsetHeight - 20) {
			win.initialMousePos = [event.clientX, event.clientY];
			
			// Adding global listeners for events
			window.addEventListener("mousemove", mouseMoveCallBack);
			window.addEventListener("mouseup", mouseUpCallBack);
		}
	});
	
	// Adding content zone
	var content = document.createElement("div");
	content.setAttribute("class", "content");
	win.appendChild(content);
	
	// To prevent window moving when clicking on content
	/*win.addEventListener("mousedown", function(event) {
		event.stopPropagation();
	}, true);*/
	
	// Window can be opened after closing by calling the "showWindow" method on content
	content.showWindow = function() {
		win.style.display = "block";
	};
	content.hideWindow = hideWindow;
	content.toggleWindow = function() {
		if(win.style.display == "block") {
			content.hideWindow();
		} else {
			content.showWindow();
		}
	};
	content.changeWindowTitle = function(title) {
		titleNode.innerHTML = title;
	};
	
	// Inserting window node in the document and returing content node
	document.body.appendChild(win);
	return content;
}
