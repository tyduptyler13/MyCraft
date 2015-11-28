"use strict";

var marchY = function(planeRanges){

	//{Array<{type, x, z, y, lenx, lenz, lenY}>} {type, x, z, lenx, lenz}
	var ranges = [];

	var last = null;
	for (var y = 0; y < 8; ++y){

		if (y !== 0){

			var min = 0;

			for (var a = 0; a < planeRanges[y].length; ++a){
				var ele = planeRanges[y][a];
				for (var i = min; i < last.length; ++i){
					var ele2 = last[i];
					if (ele.x < ele2.x && ele.z < ele2.z){
						//No match will be found. However, we cannot just throw away the range, it is still valid.
						ele.y = y;
						ele.yLen = 1;
						ranges.push(ele);
						break;
					} else if (ele.x > ele2.x && ele.z > ele2.z){
						min = i;
					} else if (ele.x === ele2.x && ele.xLen === ele2.xLen && ele.z === ele2.z && ele.zLen === ele2.zLen) {
						if (ele2.y !== null){ //match on an existing match.
							ele2.yLen++;
						} else {
							ele2.y = y - 1; //We matched the previous row.
							ele2.yLen = 2; //The length starts at 2, always.
							ranges.push(ele2);
						}
						planeRanges[y][a] = ele2;
					}
				}
			};

		}

		last = planeRanges[y];

	}

	return ranges;

};

var marchZ = function(linearRanges){

	//{Array<Array<type, x, z, lenx, lenz>>} [y]{type, x, z, lenx, lenz}
	var ranges = [];
	var range = [];

	var last = null;
	for (var count = 0; count < 64; ++count){



		var z = count % 8;

		if (z !== 0){

			var min = 0;

			for (var a = 0; a < linearRanges[count].length; ++a){
				var ele = linearRanges[count][a];
				for (var i = min; i < last.length; ++i){
					var ele2 = last[i];
					if (ele.x < ele2.x){
						//No match will be found. However, we cannot just throw away the range, it is still valid.
						ele.z = z;
						ele.zLen = 1;
						range.push(ele);
						break;
					} else if (ele.x > ele2.x){
						min = i;
					} else if (ele.x === ele2.x && ele.xLen === ele2.xLen) {
						if (ele2.z !== null){ //match on an existing match.
							ele2.zLen++;
						} else {
							ele2.z = z - 1; //We matched the previous row
							ele2.zLen = 2; //The length starts at 2, always.
							range.push(ele2);
						}
						linearRanges[count][a] = ele2;
					}
				}
			};

		}

		if (z === 7){
			last = null;
			ranges.push(range);
			range = [];
		} else {
			last = linearRanges[count];
		}

	}

	return ranges;

};

var marchX = function(typeArray) {

	var ranges = [];

	var range = [];
	var cur = null;
	var first = 0;

	for (var count = 0; count < 512; ++count){

		var x = count % 8;

		if (typeArray[count] !== cur){
			if (x !== 0){ //not first element.
				range.push({type: cur, x: first, y: null, z: null, xLen: x - first, yLen: null, zLen: null});
			}

			first = x;
			cur = typeArray[count];
		}

		if (x === 7){ //Last element
			range.push({type: cur, x: first, y: null, z: null, xLen: x - first + 1, yLen: null, zLen: null});
			ranges.push(range);
			range = [];
			cur = null;
			first = 0;
		}

	}

	return ranges;

};

var generate = function(ranges) {

	var verticies = [];
	var materialIndex = [];
	var indicies = [];
	var normals = [];

	ranges.forEach(function(range){
		var px = range.xLen + range.x,
			py = range.yLen + range.y,
			pz = range.zLen + range.z,
			nx = range.x,
			ny = range.y,
			nz = range.z;

		var offset = vertices.length;

		vertices.push(nx, ny, nz,
					  px, ny, nz,
					  nx, ny, pz,
					  px, ny, pz,
					  nx, py, nz,
					  px, py, nz,
					  nx, py, pz,
					  px, py, pz);

		indicies.concat([
			 0, 2, 3,
			 3, 1, 0,
			 1, 5, 4,
			 4, 0, 1,
			 3, 7, 5,
			 5, 1, 3,
			 2, 6, 7,
			 7, 3, 2,
			 0, 4, 6,
			 6, 2, 0,
			 5, 7, 6,
			 6, 4, 5
		 ].map(function(val, index, array){ //Offset all the values.
			array[index] = val + offset;
		 }));

		 materialIndex.concat(new Array(12).fill(range.type));

	});

	//TODO

	return ranges;
}

self.addEventListener('message',function(e){

	var data = generate(marchY(marchZ(marchX(new Int8Array(e.data)))));

	self.postMessage(data);

});
