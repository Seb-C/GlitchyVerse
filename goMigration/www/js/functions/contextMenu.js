/**
 * Creates and shows a context menu
 * @param DOMElement The element where to put the menu
 * @param Object List of options of the context menu. Keys are the label of the options,
 * and values are callBack to execute when the option is activated. callBacks can also use the event parameter.
 * @param boolean (optional) To set the initial visibility of the menu. Default is true (visible).
 * @param int (optional) The X position of the menu (coordinate of the top left corner)
 * @param int (optional) The Y position of the menu (coordinate of the top left corner)
 * @return DOMElement The menu element. It has an HTML attribute called "data-isVisible"
 *                    to edit in order to hide or show the menu. It also has a method
 *                    called "setPosition" to move it safely.
 */
function contextMenu(domContainer, options, isVisible, mouseX, mouseY) {
	var menu = document.createElement("ul");
	menu.setAttribute("class", "contextMenu");
	menu.setAttribute("data-isVisible", typeof(isVisible) == "undefined" ? true : isVisible);
	
	for(var k in options) {
		var element = document.createElement("li");
		element.innerHTML = k;
		element.addEventListener("click", options[k]);
		element.addEventListener("click", function(event) {
			menu.setAttribute("data-isVisible", false);
		});
		menu.appendChild(element);
	}
	
	domContainer.appendChild(menu);
	
	menu.setPosition = function(x, y) {
		this.style.left = x + "px";
		this.style.top  = y + "px";
		if(this.offsetRight  < 0) this.style.right = "0px";
		if(this.offsetBottom < 0) this.style.bottom = "0px";
	};
	if(mouseX && mouseY) menu.setPosition(mouseX, mouseY);
	
	return menu;
}