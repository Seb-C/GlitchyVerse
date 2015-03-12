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
 * The spaceship control screen
 */
var ControlScreen = function(world, spaceShip) {
	this.world     = world;
	this.spaceShip = spaceShip;
	
	this.canvas        = document.createElement("canvas");
	this.context       = this.canvas.getContext("2d");
	this.canvasTexture = null;
	
	// Visible size is different than real size because 
	// webgl textures has to be power of two. 
	this.screenWidth  = 800;
	this.screenHeight = 500;
	this.canvasWidth  = 1024;
	this.canvasHeight = 1024;
	this.widthRatio   = this.screenWidth  / this.canvasWidth;
	this.heightRatio  = this.screenHeight / this.canvasHeight;
	
	this.canvas.width  = this.canvasWidth;
	this.canvas.height = this.canvasHeight;
	
	this.leftMenuWidth      = 130;
	this.leftMenuItemHeight = 100;
	this.screenList         = Object.keys(Screens);
	this.mainScreenBorders  = 15;
	
	this.selectedScreen   = null;
	this.selectedContent  = null;
	this.clickableContent = Array();
	
	// Screen doesn't needs to be drawn at each frame
	var self = this;
	this.drawTimer = new Timer(function() {
		self.draw();
	}, 1000, false);
	// Must be drawn here and synchronously
	this.draw();
};

/**
 * Action when player clicks on the screen
 * @param int X position of the click
 * @param int Y position of the click
 */
ControlScreen.prototype.click = function(x, y) {
	if(x < this.leftMenuWidth) {
		this.selectedScreen = this.screenList[Math.floor(y / this.leftMenuItemHeight)];
	} else if(this.selectedScreen) {
		for(var i = 0 ; i < this.clickableContent.length ; i++) {
			var item = this.clickableContent[i];
			if(item.isClicked(x, y)) {
				item.callback();
				break;
			}
		}
	}
	
	// After each click, refreshing the screen
	this.draw();
};

ControlScreen.prototype.draw = function() {
	this.context.fillStyle = "black";
	this.context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
	this.context.lineWidth = 2;
	
	// Separation between menu and content
	this.context.strokeStyle = "white";
	this.context.beginPath();
	this.context.moveTo(this.leftMenuWidth, 0);
	this.context.lineTo(this.leftMenuWidth, this.screenHeight);
	this.context.stroke();
	
	// Drawing menu icons
	for(var i = 0 ; i < this.screenList.length ; i++) {
		var yPosition = i * this.leftMenuItemHeight;
		
		if(this.selectedScreen == this.screenList[i]) {
			// Highlighting selected icon (white background)
			this.context.fillStyle = "white";
			this.context.fillRect(
				0, 
				yPosition, 
				this.leftMenuWidth, 
				this.leftMenuItemHeight
			);
			
			this.context.fillStyle   = "black";
			this.context.strokeStyle = "black";
		} else {
			this.context.fillStyle   = "white";
			this.context.strokeStyle = "white";
		}
		
		// Drawing icon
		this.context.save();
		Screens[this.screenList[i]].drawIcon(
			this, 
			0, 
			yPosition, 
			this.leftMenuWidth, 
			this.leftMenuItemHeight
		);
		this.context.restore();
		
		// Drawing line under item
		this.context.beginPath();
		this.context.moveTo(0,                  yPosition + this.leftMenuItemHeight);
		this.context.lineTo(this.leftMenuWidth, yPosition + this.leftMenuItemHeight);
		this.context.stroke();
	}
	
	// Drawing main screen
	if(this.selectedScreen) {
		this.clickableContent = Screens[this.selectedScreen].drawScreen(
			this,
			this.leftMenuWidth + this.mainScreenBorders,
			this.mainScreenBorders,
			this.screenWidth - this.leftMenuWidth - 2 * this.mainScreenBorders, 
			this.screenHeight - 2 * this.mainScreenBorders
		);
	}
	
	// Converting canvas to texture
	this.canvasTexture = Materials.setCanvasAsTexture(this.world.gl, this.canvas, this.canvasTexture);
};
