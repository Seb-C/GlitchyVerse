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
 * Manages the animation of entities
 * Animations are defined in objects/animations xml files.
 */
var Animator = function() {
	this.animatedModels = {};
	this.lastUpdateTime = TimerManager.lastUpdateTimeStamp;
	this.animations = [];
};

/**
 * Animates an entity, with the given animation name
 * @param Entity The entity to animate
 * @param String The name of the animation to use
 * @param Function (optional) Function to call when the animation has ended.
 */
Animator.prototype.animate = function(entity, animationName, onEnded) {
	if(entity.modelName == null) {
		throw new Error("An entity must have a valid model attribute to be animated.");
	} else {
		if(!this.animatedModels[entity.modelName]) {
			this._loadObjectAnimationFile(entity.modelName);
		}
		var modelAnimations = this.animatedModels[entity.modelName];
		
		if(modelAnimations[animationName]) {
			var anim = modelAnimations[animationName];
			this.animations.push({
				entity: entity,
				animation: anim,
				startTime: TimerManager.lastUpdateTimeStamp,
				onEnded: onEnded || null
			});
			
			// Initializing meshes backup of initial vertices
			for(var i = 0 ; i < anim.length ; i++) {
				var meshes = entity.model.meshGroups[anim[i].group];
				if(meshes) {
					for(var j = 0 ; j < meshes.length ; j++) {
						var mesh = meshes[j];
						if(!mesh.animator_initialVertices) {
							mesh.animator_initialVertices = mesh.vertices.slice(0);
						}
					}
				}
			}
		} else {
			throw new Error("Cannot find animation " + animationName + " for model " + entity.modelName);
		}
	}
};

/**
 * Loads a XML animation file
 * @param String The model name which the animation is associated with.
 */
Animator.prototype._loadObjectAnimationFile = function(modelName) {
	var object = this.animatedModels[modelName] = {};
	
	var domAttributeToVec3 = function(s) {
		var s2 = s.replace(/\s/g, "");
		if(s2.match(/^-?[0-9]+(\.[0-9]+)?\,-?[0-9]+(\.[0-9]+)?\,-?[0-9]+(\.[0-9]+)?$/)) {
			var sSplitted = s2.split(",");
			return vec3.fromValues(
				parseFloat(sSplitted[0]),
				parseFloat(sSplitted[1]),
				parseFloat(sSplitted[2])
			);
		} else {
			throw new Error("Error : " + s + " is not a valid vec3 in " + modelName + " animation file.");
		}
	};
	
	var domDocument = FILES.getXML("www/objects/animations/" + modelName + ".xml").documentElement;
	
	if(domDocument.getAttribute("object") != modelName) {
		throw new Error("Error loading animation file for " + modelName + " : object attribute doesn't match.");
	}
	
	var domAnimations = domDocument.getElementsByTagName("animation");
	for(var i = 0 ; i < domAnimations.length ; i++) {
		var domAnimation = domAnimations[i];
		var animation = object[domAnimation.getAttribute("id")] = [];
		
		var domActions = domAnimation.childNodes;
		for(var j = 0 ; j < domActions.length ; j++) {
			var domAction = domActions[j];
			if(!(domAction instanceof Text)) {
				var o = {
					group: domAction.getAttribute("group"),
					start: parseInt(domAction.getAttribute("start")),
					end: parseInt(domAction.getAttribute("end")),
					from: domAttributeToVec3(domAction.getAttribute("from")),
					to: domAttributeToVec3(domAction.getAttribute("to"))
				};
				switch(domAction.tagName) {
					case "translate": 
						o.isTranslation = true;
						break;
					case "rotate": 
						o.isTranslation = false;
						o.origin        = domAttributeToVec3(domAction.getAttribute("origin"));
						o.from[0] = degToRad(o.from[0]);
						o.from[1] = degToRad(o.from[1]);
						o.from[2] = degToRad(o.from[2]);
						o.to[0] = degToRad(o.to[0]);
						o.to[1] = degToRad(o.to[1]);
						o.to[2] = degToRad(o.to[2]);
						break;
					default: 
						throw new Error("Unknown action " + domAction.tagName + " in " + modelName + " animation file.");
				}
				animation.push(o);
			}
		}
	}
};

// TODO be able to reverse an animation ?

/**
 * Runs all the animations
 */
Animator.prototype.update = function() {
	var currentTime = TimerManager.lastUpdateTimeStamp;
	var tempVec3a = vec3.create();
	var tempVec3b = vec3.create();
	
	for(var i = 0 ; i < this.animations.length ; i++) {
		var entity = this.animations[i].entity;
		var animation = this.animations[i].animation;
		var startTime = this.animations[i].startTime;
		
		var timePassed = currentTime - startTime;
		if(timePassed > 0) {
			// Reinitializing meshes vertices before animating it
			for(var j = 0 ; j < animation.length ; j++) {
				var g = animation[j].group;
				var meshes = entity.model.meshGroups[g];
				if(meshes) {
					for(var k = 0 ; k < meshes.length ; k++) {
						var mesh = meshes[k];
						// copying mesh.animator_initialVertices values to mesh.vertices
						for(var l = 0 ; l < mesh.vertices.length ; l++) {
							mesh.vertices[l] = mesh.animator_initialVertices[l];
						}
					}
				}
			}
			
			// Applying each action of the animation
			var maxEndTime = 0;
			for(var j = 0 ; j < animation.length ; j++) {
				var action = animation[j];
				var meshes = entity.model.meshGroups[action.group];
				
				if(meshes) {
					// To determine when the animation is finished
					if(action.end > maxEndTime) {
						maxEndTime = action.end;
					}
					
					var actionTimeRate = 0;
					if(action.end < timePassed) {
						actionTimeRate = 1;
					} else if(action.start < timePassed) {
						actionTimeRate = (timePassed - action.start) / (action.end - action.start);
					}
					
					// Applying action
					if(actionTimeRate > 0) {
						vec3.subtract(tempVec3a, action.to, action.from);
						vec3.scale(tempVec3a, tempVec3a, actionTimeRate);
						vec3.add(tempVec3a, tempVec3a, action.from);
						
						for(var k = 0 ; k < meshes.length ; k++) {
							var mesh = meshes[k];
							for(var l = 0 ; l < mesh.vertices.length ; l += 3) {
								if(action.isTranslation) {
									mesh.vertices[l    ] += tempVec3a[0];
									mesh.vertices[l + 1] += tempVec3a[1];
									mesh.vertices[l + 2] += tempVec3a[2];
								} else {
									tempVec3b[0] = mesh.vertices[l    ];
									tempVec3b[1] = mesh.vertices[l + 1];
									tempVec3b[2] = mesh.vertices[l + 2];
									vec3.subtract(tempVec3b, tempVec3b, action.origin);
									rotatePoint(tempVec3b, tempVec3a);
									vec3.add(tempVec3b, tempVec3b, action.origin);
									mesh.vertices[l    ] = tempVec3b[0];
									mesh.vertices[l + 1] = tempVec3b[1];
									mesh.vertices[l + 2] = tempVec3b[2];
								}
							}
						}
					}
				}
			}
			
			entity.model.regenerateCache();
			
			// Animation finished --> removing it
			if(timePassed > maxEndTime) {
				if(this.animations[i].onEnded != null) {
					this.animations[i].onEnded();
				}
				this.animations.splice(i, 1);
				i--;
			}
		}
	}
	
	this.lastUpdateTime = currentTime;
};
