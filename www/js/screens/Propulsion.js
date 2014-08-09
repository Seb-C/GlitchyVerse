Screens.Propulsion = {
	drawIcon: function(controlScreen, x, y, width, height) {
		controlScreen.context.beginPath();
		controlScreen.context.moveTo(x + width * 5/7, y + height    /7); // Right of top line
		controlScreen.context.lineTo(x + width    /6, y + height    /3); // Top line
		controlScreen.context.lineTo(x + width    /6, y + height * 2/3); // Left vertical line
		controlScreen.context.lineTo(x + width * 5/7, y + height * 6/7); // Bottom line
		controlScreen.context.stroke();
		
		// TODO replace with ellipse polyfill : http://stackoverflow.com/questions/12844255/resizable-ellipse-html5-canvas
		controlScreen.context.beginPath();
		controlScreen.context.scale(0.5, 1);
		controlScreen.context.arc(x + (width * 5/7) * 2, y + height/2, (height * 5/7) / 2, 0, Math.PI * 2);
		controlScreen.context.stroke();
	},
	
	// TODO screens should extend an abstract class ?
	
	// TODO propeller with !isEnabled ==> print as red (and which color for reverse thrust ?)
	
	// Right menu size
	rightMenuWidth:        140,
	rightMenuBorderMargin: 15,
	dashedLinesSequence:   [10],
	
	drawScreen: function(controlScreen, x, y, width, height) {
		var ship = controlScreen.spaceShip;
		
		var propellers = ship.getEntitiesWhichExertsThrust();
		var clickables = new Array();
		var self = this;
		
		// Right menu (TODO do it in separated function)
		var rightMenuWidth         = this.rightMenuWidth - this.rightMenuBorderMargin;
		var rightMenuX             = x + width - rightMenuWidth;
		var rightMenuButtonsHeight = height / 5;
		
		// Determining max and min positions of propellers and if selection still exists
		var minX = ship.entities[propellers[0].id].gridPosition[0], maxX = minX;
		var minY = ship.entities[propellers[0].id].gridPosition[1], maxY = minY;
		var selectedContentExists = controlScreen.selectedContent == propellers[0].id;
		var averageState = propellers[0].getPowerRate();
		var selectionState = controlScreen.selectedContent == propellers[0].id ? propellers[0].getPowerRate() : null;
		for(var i = 1 ; i < propellers.length ; i++) {
			var propeller = propellers[i];
			var propellerPosition = ship.entities[propeller.id].gridPosition;
			
			if(propellerPosition[0] > maxX) {
				maxX = propellerPosition[0];
			} else if(propellerPosition[0] < minX) {
				minX = propellerPosition[0];
			}
			if(propellerPosition[1] > maxY) {
				maxY = propellerPosition[1];
			} else if(propellerPosition[1] < minY) {
				minY = propellerPosition[1];
			}
			
			if(!selectedContentExists && controlScreen.selectedContent == propeller.id) {
				selectionState = propeller.getPowerRate();
				selectedContentExists = true;
			}
			
			averageState += propeller.getPowerRate();
		}
		averageState /= propellers.length;
		if(controlScreen.selectedContent == null) selectionState = averageState;
		if(!selectedContentExists) {
			controlScreen.selectedContent = null;
		}
		
		// Defining styles
		controlScreen.context.strokeStyle  = "white";
		controlScreen.context.fillStyle    = "white";
		controlScreen.context.font         = "40px Arial";
		controlScreen.context.textAlign    = "center";
		controlScreen.context.textBaseline = "middle";
		
		// Right menu separation
		controlScreen.context.beginPath();
		controlScreen.context.moveTo(rightMenuX, y);
		controlScreen.context.lineTo(rightMenuX, y + height);
		controlScreen.context.stroke();
		
		// ALL button
		controlScreen.context.fillText(
			"ALL", 
			rightMenuX + (rightMenuWidth + this.rightMenuBorderMargin)/2, 
			y + rightMenuButtonsHeight * 0.5
		);
		clickables.push(new Clickable(
			rightMenuX,
			y,
			rightMenuX + rightMenuWidth,
			y + rightMenuButtonsHeight,
			function() {
				controlScreen.selectedContent = null;
			}
		));
		
		// ALL button border if selected
		if(controlScreen.selectedContent == null) {
			// ALL button is enabled
			controlScreen.context.setLineDash(this.dashedLinesSequence);
			controlScreen.context.strokeRect(
				rightMenuX + this.rightMenuBorderMargin, 
				y          + this.rightMenuBorderMargin,
				this.rightMenuWidth    - (this.rightMenuBorderMargin * 2),
				rightMenuButtonsHeight - (this.rightMenuBorderMargin * 2)
			);
			controlScreen.context.setLineDash([]);
		}
		
		// Current speed
		controlScreen.context.fillText(
			Math.round(controlScreen.spaceShip.linearSpeed), 
			rightMenuX + (rightMenuWidth + this.rightMenuBorderMargin)/2, 
			y + rightMenuButtonsHeight * 1.5
		);
		
		// Percentage label (between PLUS and MINUS)
		controlScreen.context.fillText(
			Math.round(selectionState * 100) + " %", 
			rightMenuX + (rightMenuWidth + this.rightMenuBorderMargin)/2, 
			y + rightMenuButtonsHeight * 3.5
		);
		
		// PLUS button
		controlScreen.context.fillText(
			"+", 
			rightMenuX + (rightMenuWidth + this.rightMenuBorderMargin)/2, 
			y + rightMenuButtonsHeight * 2.5
		);
		clickables.push(new Clickable(
			rightMenuX,
			y + rightMenuButtonsHeight * 2,
			rightMenuX + rightMenuWidth,
			y + rightMenuButtonsHeight * 3,
			function() {
				self._changePowerLevel(controlScreen, propellers, averageState, +0.01);
			}
		));
		
		// MINUS button
		controlScreen.context.fillText(
			"-", 
			rightMenuX + (rightMenuWidth + this.rightMenuBorderMargin)/2, 
			y + rightMenuButtonsHeight * 4.5
		);
		clickables.push(new Clickable(
			rightMenuX,
			y + rightMenuButtonsHeight * 4,
			rightMenuX + rightMenuWidth,
			y + rightMenuButtonsHeight * 5,
			function() {
				self._changePowerLevel(controlScreen, propellers, averageState, -0.01);
			}
		));
		
		// TODO use setLineDash for circles selection
		
		// Drawing propellers to screen
		var propellerUnitRadius = 50; // TODO dynamic propeller radius, depending on quantity of propellers ?
		var propellerSelectorRadiusAddition = 8;
		var ratioX = (width  - this.rightMenuWidth - propellerUnitRadius * 2) / (maxX - minX);
		var ratioY = (height                       - propellerUnitRadius * 2) / (maxY - minY);
		propellers.map(function(propeller, i) {
			var entity = ship.entities[propeller.id];
			var propellerPosition = entity.gridPosition;
			var propellerSize     = entity.gridSize;
			
			var radiusX = propellerUnitRadius * propellerSize[0];
			var radiusY = propellerUnitRadius * propellerSize[1];
			
			var posX = x + (propellerPosition[0] - minX) * ratioX + radiusX;
			var posY = y + height - (propellerPosition[1] - minY) * ratioY - radiusY;
			
			controlScreen.context.fillStyle   = "white";
			controlScreen.context.strokeStyle = "white";
			controlScreen.context.lineWidth   = 2;
			
			// Changing scale for non-square propellers
			var scaleY = radiusY / radiusX;
			controlScreen.context.scale(1, scaleY);
			
			// Border
			controlScreen.context.beginPath();
			controlScreen.context.arc(posX, posY / scaleY, radiusX, 0, Math.PI * 2); 
			controlScreen.context.closePath();
			controlScreen.context.stroke();
			
			// Circle is filled depending on propeller's state
			if(propeller.getPowerRate() < 0) controlScreen.context.fillStyle = "red";
			controlScreen.context.beginPath();
			controlScreen.context.arc(posX, posY / scaleY, radiusX * Math.abs(propeller.getPowerRate()), 0, Math.PI * 2); 
			controlScreen.context.closePath();
			controlScreen.context.fill();
			
			if(propeller.id == controlScreen.selectedContent) {
				// Selected propeller has an additional dashed border
				var steps = 10;
				var stepAngle = Math.PI * 2 / steps;
				for(var j = 0 ; j < steps ; j++) {
					controlScreen.context.beginPath();
					controlScreen.context.arc(posX, posY / scaleY, radiusX + propellerSelectorRadiusAddition, j * stepAngle, (j + 0.75) * stepAngle);
					controlScreen.context.stroke();
				}
			} else {
				// Clickable
				clickables.push(new Clickable(
					posX - radiusX,
					posY - radiusY,
					posX + radiusX,
					posY + radiusY,
					function() {
						controlScreen.selectedContent = propeller.id;
					}
				));
			}
			
			// Back to 1:1 scale
			controlScreen.context.scale(1, 1 / scaleY);
		});
		
		return clickables;
	},
	
	_serverUpdateTimeout: null,
	_serverUpdateSelectedContent: null,
	
	_changePowerLevel: function(controlScreen, propellers, averageState, powerToAdd) {
		var newPower;
		if(controlScreen.selectedContent == null) {
			newPower = averageState + powerToAdd;
			for(var i = 0 ; i < propellers.length ; i++) {
				var propeller = propellers[i];
				propeller.setPowerRate(newPower);
				//newPower = propeller.getPowerRate();
			}
		} else {
			for(var i = 0 ; i < propellers.length ; i++) {
				var propeller = propellers[i];
				if(propeller.id == controlScreen.selectedContent) {
					propeller.setPowerRate(propeller.getPowerRate() + powerToAdd);
					newPower = propeller.getPowerRate();
				}
			}
		}
		
		// If a previous update is ready to be sent, cancelling it now
		if(this._serverUpdateTimeout != null && this._serverUpdateSelectedContent == controlScreen.selectedContent) {
			clearTimeout(this._serverUpdateTimeout);
			this._serverUpdateTimeout = null;
		}
		
		// Requesting server to update the propellers
		var self = this;
		this._serverUpdateSelectedContent = controlScreen.selectedContent;
		this._serverUpdateTimeout = setTimeout(function() {
			// Timeout to avoid sending an update at each percent change
			controlScreen.world.server.sendMessage("updatePropellers", {"id": controlScreen.selectedContent, "power": newPower});
			self._serverUpdateTimeout = null;
		}, 500);
	}
};