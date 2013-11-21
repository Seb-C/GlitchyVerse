/**
 * Creates a data-url with a given image definition, without using canvas (works in a webworker).
 * Based on Canvas2image : http://www.nihilogic.dk/labs/canvas2image/
 * @param int Width of the image
 * @param int Height of the image
 * @param Array List of pixels of the image, starting from the top left ([r, g, b, r, g, b, ...]).
 */
function pixelArrayToDataURL(width, height, pixels) {
	var aHeader = [];
	
	aHeader.push(0x42); // magic 1
	aHeader.push(0x4D); 
	
	var iFileSize = width*height*3 + 54; // total header size = 54 bytes
	aHeader.push(iFileSize % 256); iFileSize = Math.floor(iFileSize / 256);
	aHeader.push(iFileSize % 256); iFileSize = Math.floor(iFileSize / 256);
	aHeader.push(iFileSize % 256); iFileSize = Math.floor(iFileSize / 256);
	aHeader.push(iFileSize % 256);
	
	aHeader.push(0); // reserved
	aHeader.push(0);
	aHeader.push(0); // reserved
	aHeader.push(0);
	
	aHeader.push(54); // dataoffset
	aHeader.push(0);
	aHeader.push(0);
	aHeader.push(0);
	
	var aInfoHeader = [];
	aInfoHeader.push(40); // info header size
	aInfoHeader.push(0);
	aInfoHeader.push(0);
	aInfoHeader.push(0);
	
	var iImageWidth = width;
	aInfoHeader.push(iImageWidth % 256); iImageWidth = Math.floor(iImageWidth / 256);
	aInfoHeader.push(iImageWidth % 256); iImageWidth = Math.floor(iImageWidth / 256);
	aInfoHeader.push(iImageWidth % 256); iImageWidth = Math.floor(iImageWidth / 256);
	aInfoHeader.push(iImageWidth % 256);
	
	var iImageHeight = height;
	aInfoHeader.push(iImageHeight % 256); iImageHeight = Math.floor(iImageHeight / 256);
	aInfoHeader.push(iImageHeight % 256); iImageHeight = Math.floor(iImageHeight / 256);
	aInfoHeader.push(iImageHeight % 256); iImageHeight = Math.floor(iImageHeight / 256);
	aInfoHeader.push(iImageHeight % 256);
	
	aInfoHeader.push(1); // num of planes
	aInfoHeader.push(0);
	
	aInfoHeader.push(24); // num of bits per pixel
	aInfoHeader.push(0);
	
	aInfoHeader.push(0); // compression = none
	aInfoHeader.push(0);
	aInfoHeader.push(0);
	aInfoHeader.push(0);
	
	var iDataSize = width*height*3; 
	aInfoHeader.push(iDataSize % 256); iDataSize = Math.floor(iDataSize / 256);
	aInfoHeader.push(iDataSize % 256); iDataSize = Math.floor(iDataSize / 256);
	aInfoHeader.push(iDataSize % 256); iDataSize = Math.floor(iDataSize / 256);
	aInfoHeader.push(iDataSize % 256); 
	
	for (var i=0;i<16;i++) {
		aInfoHeader.push(0);	// these bytes not used
	}
	
	var iPadding = (4 - ((width * 3) % 4)) % 4;
	
	var strPixelData = "";
	var y = height;
	do {
		var iOffsetY = width*(y-1)*3;
		var strPixelRow = "";
		for (var x=0;x<width;x++) {
			var iOffsetX = 3*x;

			strPixelRow += String.fromCharCode(pixels[iOffsetY+iOffsetX+2]);
			strPixelRow += String.fromCharCode(pixels[iOffsetY+iOffsetX+1]);
			strPixelRow += String.fromCharCode(pixels[iOffsetY+iOffsetX]);
		}
		for (var c=0;c<iPadding;c++) {
			strPixelRow += String.fromCharCode(0);
		}
		strPixelData += strPixelRow;
	} while (--y);
	
	var headerEncoded = "";
	var aData = aHeader.concat(aInfoHeader);
	for (var i=0;i<aData.length;i++) {
		headerEncoded += String.fromCharCode(aData[i]);
	}
	
	return "data:image/bmp;base64," + btoa(headerEncoded) + btoa(strPixelData);
}