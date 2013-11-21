/**
 * Creates a popup containing some informations, and two buttons : Confirm and Cancel
 * @param DOMElement The element where to put the popup
 * @param String The title of the popup (building name for example)
 * @param callBack Function that will be called when the user clicks on the cancel button.
 *                 Must return a boolean indicating if the popup must be closed.
 * @param callBack Function that will be called when the user clicks on the confirm button.
 *                 Must return a boolean indicating if the popup must be closed.
 */
function confirmPopup(domContainer, title, cancelCallBack, confirmCallBack) {
	var domBackground = document.createElement("div");
	domBackground.setAttribute("class", "confirmPopup");
	domContainer.appendChild(domBackground);
	
	var domContent = document.createElement("div");
	domContent.setAttribute("class", "confirmPopupContent");
	domContent.close = function() {
		domContainer.removeChild(domBackground);
	};
	domBackground.appendChild(domContent);
	
	var domTitle = document.createElement("h3");
	domTitle.appendChild(document.createTextNode(title));
	domContent.appendChild(domTitle); 
	
	var buttonsLine = document.createElement("div");
	buttonsLine.setAttribute("class", "buttonsLine");
	domBackground.appendChild(buttonsLine);
	
	var confirmButton = document.createElement("input");
	confirmButton.setAttribute("type", "button");
	confirmButton.setAttribute("class", "confirmButton");
	confirmButton.setAttribute("value", "Confirm");
	confirmButton.addEventListener("click", function(event) {
		if(confirmCallBack == null || confirmCallBack()) {
			domContent.close();
		}
	});
	buttonsLine.appendChild(confirmButton);
	
	var cancelButton = document.createElement("input");
	cancelButton.setAttribute("type", "button");
	cancelButton.setAttribute("class", "cancelButton");
	cancelButton.setAttribute("value", "Cancel");
	cancelButton.addEventListener("click", function(event) {
		if(cancelCallBack == null || cancelCallBack()) {
			domContent.close();
		}
	});
	buttonsLine.appendChild(cancelButton);
	
	var messageSpan = document.createElement("span");
	messageSpan.setAttribute("class", "message");
	buttonsLine.appendChild(messageSpan);
	
	domContent.disableButtons = function(state) {
		confirmButton.disabled = state;
		cancelButton .disabled = state;
	};
	domContent.disableConfirmButton = function(state) {
		confirmButton.disabled = state;
	};
	domContent.setMessage = function(message) {
		messageSpan.innerHTML = message;
	};
	
	return domContent;
}