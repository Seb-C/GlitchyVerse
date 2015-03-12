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
 * A point light in the world
 * @param Array(3), position of the light in the world (absolute). Must not be a vec3.
 * @param Array(3) RGB components of the light's color
 * @param Float The maximum distance  where the lightcan glow a vertice
 * @param Boolean True if the light must be attenuated with the distance
 * @param float (optional) The max light power (it's the power at the middle point)
 */
var Light = function(position, color, maxDistance, isAttenuation, maxLightning) {
	this.position      = position;
	this.color         = color;
	this.maxDistance   = maxDistance;
	this.isAttenuation = isAttenuation;
	this.maxLightning  = maxLightning || 1;
	
	// Used by LightManager to sort lights
	// The min nearIndex is the most visible
	this.nearIndex     = 0;
};
