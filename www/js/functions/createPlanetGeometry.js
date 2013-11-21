/**
 * Generates the meshes (vertices, normals and texture part) of a planet
 * @param float The radius of the planet
 * @param int The number of lines meshes (the number of columns is the double of that number).
 * @return Array(Array). Each sub-array with indexes : 0 = vertices ; 1 = normals ; 2 = texture part
 */
function createPlanetGeometry(radius, lines) {
	var linesY = lines;
	var linesX = lines * 2;
	var defaultNormals = [0, 1, 0];
	var tempNormals1, tempNormals2, tempNormals3, tempNormals4;
	var rotationY = quat.create();
	var rotationX = quat.create();
	var rotationNextY = quat.create();
	var rotationNextX = quat.create();
	
	var verticesArray    = new Float32Array(12 * linesX * linesY);
	var normalsArray     = new Float32Array(12 * linesX * linesY);
	var texturePartArray = new Float32Array(8  * linesX * linesY);
	
	for(var i = 0 ; i < linesY ; i++) {
		var angleY     = Math.PI * (i       / linesY);
		var nextAngleY = Math.PI * ((i + 1) / linesY);
		
		for(var j = 0 ; j < linesX ; j++) {
			tempNormals1 = defaultNormals.slice(0);
			tempNormals2 = defaultNormals.slice(0);
			tempNormals3 = defaultNormals.slice(0);
			tempNormals4 = defaultNormals.slice(0);
			var angleX     = Math.PI * 2 * (j       / linesX);
			var nextAngleX = Math.PI * 2 * ((j + 1) / linesX);
			
			// Determining rotation of each point
			quat.set(rotationY, 0, 0, 0, 1);
			quat.set(rotationX, 0, 0, 0, 1);
			quat.set(rotationNextY, 0, 0, 0, 1);
			quat.set(rotationNextX, 0, 0, 0, 1);
			quat.rotateY(rotationY, rotationY, angleX);
			quat.rotateX(rotationX, rotationX, angleY);
			quat.rotateY(rotationNextY, rotationNextY, nextAngleX);
			quat.rotateX(rotationNextX, rotationNextX, nextAngleY);
			
			// Rotating normals for each point
			vec3.transformQuat(tempNormals1, tempNormals1, rotationX);
			vec3.transformQuat(tempNormals1, tempNormals1, rotationY);
			
			vec3.transformQuat(tempNormals2, tempNormals2, rotationX);
			vec3.transformQuat(tempNormals2, tempNormals2, rotationNextY);
			
			vec3.transformQuat(tempNormals3, tempNormals3, rotationNextX);
			vec3.transformQuat(tempNormals3, tempNormals3, rotationNextY);
			
			vec3.transformQuat(tempNormals4, tempNormals4, rotationNextX);
			vec3.transformQuat(tempNormals4, tempNormals4, rotationY);
			
			var sinY = Math.sin(angleY);
			var sinX = Math.sin(angleX);
			var cosY = Math.cos(angleY);
			var cosX = Math.cos(angleX);
			var sinNextY = Math.sin(nextAngleY);
			var sinNextX = Math.sin(nextAngleX);
			var cosNextY = Math.cos(nextAngleY);
			var cosNextX = Math.cos(nextAngleX);
			
			var texX1 = (j    ) / linesX;
			var texX2 = (j + 1) / linesX;
			var texY1 = (i    ) / linesY;
			var texY2 = (i + 1) / linesY;
			
			var currentIndex = i * linesX + j;
			
			verticesArray.set([
				sinY     * cosX     * radius, cosY     * radius, sinY     * sinX     * radius,
				sinY     * cosNextX * radius, cosY     * radius, sinY     * sinNextX * radius,
				sinNextY * cosNextX * radius, cosNextY * radius, sinNextY * sinNextX * radius,
				sinNextY * cosX     * radius, cosNextY * radius, sinNextY * sinX     * radius
			], 12 * currentIndex);
			normalsArray.set(tempNormals1.concat(tempNormals2).concat(tempNormals3).concat(tempNormals4), 12 * currentIndex);
			texturePartArray.set([
				// Texture part
				texX1, texY1,
				texX2, texY1,
				texX2, texY2,
				texX1, texY2
			], 8 * currentIndex);
		}
	}
	
	return {
		vertices   : verticesArray,
		normals    : normalsArray,
		texturePart: texturePartArray
	};
}