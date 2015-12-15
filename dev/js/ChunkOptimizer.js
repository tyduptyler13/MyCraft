"use strict";

const marchY = function(planeRanges){

	//{Array<{type, x, z, y, lenx, lenz, lenY}>} {type, x, z, lenx, lenz}
	var ranges = [];

	var last = null;
	for (var y = 0; y < 8; ++y){

		if (y !== 0){

			var min = 0;

			for (var a = 0, length = planeRanges[y].length; a < length; ++a){
				const ele = planeRanges[y][a];

				if (last.length === 0){
					ele.y = y;
					ele.yLen = 1;
					ranges.push(ele);
				} else {
					for (var i = min, llength = last.length; i < llength; ++i){
						const ele2 = last[i];
						if (ele.x < ele2.x && ele.z < ele2.z){
							//No match will be found. However, we cannot just throw away the range, it is still valid.
							ele.y = y;
							ele.yLen = 1;
							ranges.push(ele);
							break;
						} else if (ele.x > ele2.x && ele.z > ele2.z){
							min = i;
						} else if (ele.x === ele2.x && ele.xLen === ele2.xLen && ele.z === ele2.z && ele.zLen === ele2.zLen && ele.type === ele2.type) {
							if (ele2.y !== null){ //match on an existing match.
								ele2.yLen++;
							} else {
								ele2.y = y - 1; //We matched the previous row.
								ele2.yLen = 2; //The length starts at 2, always.
								ranges.push(ele2);
							}
							planeRanges[y][a] = ele2;
							break;
						}
					}
				}
			}

		} else if (planeRanges[y + 1].length === 0) { //Special case where strips of single blocks are forgotten.
			ranges = ranges.concat(planeRanges[y].map(function(val){
				val.y = 0;
				val.yLen = 1;
				return val;
			}));
		}

		last = planeRanges[y];

	}

	return ranges;

};

const marchZ = function(linearRanges){

	//{Array<Array<type, x, z, lenx, lenz>>} [y]{type, x, z, lenx, lenz}
	var ranges = [];
	var range = [];

	var last = null;
	for (var count = 0; count < 64; ++count){



		var z = count % 8;

		if (z !== 0){

			var min = 0;

			for (var a = 0, l = linearRanges[count].length; a < l; ++a){
				const ele = linearRanges[count][a];

				if (last.length === 0){ //Special case.
					ele.z = z;
					ele.zLen = 1;
					range.push(ele);
				} else {
					for (var i = min, l2 = last.length; i < l2; ++i){
						const ele2 = last[i];
						if (ele.x < ele2.x){
							//No match will be found. However, we cannot just throw away the range, it is still valid.
							ele.z = z;
							ele.zLen = 1;
							range.push(ele);
							break;
						} else if (ele.x > ele2.x){
							min = i;
						} else if (ele.x === ele2.x && ele.xLen === ele2.xLen && ele.type === ele2.type) {
							if (ele2.z !== null){ //match on an existing match.
								ele2.zLen++;
							} else {
								ele2.z = z - 1; //We matched the previous row
								ele2.zLen = 2; //The length starts at 2, always.
								range.push(ele2);
							}
							linearRanges[count][a] = ele2;
							break; //Skip the rest of this loop. We need a new element.
						}
					}
				}

			}

		} else if (linearRanges[z + 1].length === 0) { //Special case where strips of single blocks are forgotten.
			ranges = ranges.concat(linearRanges[z].map(function(val){
				val.z = 0;
				val.zLen = 1;
				return val;
			}));
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

const marchX = function(typeArray) {

	const ranges = [];

	var range = [];
	var cur = null;
	var first = 0;

	for (var count = 0; count < 512; ++count){

		var x = count % 8;

		if (typeArray[count] !== cur){

			if (cur !== null){ //not first element.
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

	ranges.forEach(function(range, index, array){
		array[index] = range.filter(function(element){
			if (element.type < 0) return false;
			return true;
		});
	});

	return ranges;

};

const generate = function(ranges) {

	const vertices = new Float32Array(ranges.length * 108);
	const materialIndex = [];
	const normals = new Float32Array(ranges.length * 108);
	const uvs = new Float32Array(ranges.length * 72);

	const indices = [
			0, 2, 1,
			2, 3, 1,
			4, 6, 5,
			6, 7, 5,
			4, 5, 1,
			5, 0, 1,
			7, 6, 2,
			6, 3, 2,
			5, 7, 0,
			7, 2, 0,
			1, 3, 4,
			3, 6, 4
	];

	const norms = [ //Precalculated norms
		[1, 0, 0],
		[-1, 0, 0],
		[0, 1, 0],
		[0, -1, 0],
		[0, 0, 1],
		[0, 0, -1]
	].reduce(function (previous, next){
		return previous.concat(next, next, next, next, next, next); //Expand 6 times for each corner of 2 triangles.
	}, []);

	for (var r = 0, l = ranges.length; r < l; ++r){

		const range = ranges[r];

		const px = range.xLen + range.x,
			py = range.yLen + range.y,
			pz = range.zLen + range.z,
			nx = range.x,
			ny = range.y,
			nz = range.z;

		const verts = [
			[px, py, pz],
			[px, py, nz],
			[px, ny, pz],
			[px, ny, nz],
			[nx, py, nz],
			[nx, py, pz],
			[nx, ny, nz],
			[nx, ny, pz]
		];

		for (var t = 0, l2 = indices.length; t < l2; ++t){
			vertices[t * 3 + r * 108] = verts[indices[t]][0];
			vertices[t * 3 + r * 108 + 1] = verts[indices[t]][1];
			vertices[t * 3 + r * 108 + 2] = verts[indices[t]][2];
		}

		normals.set(norms, r * 108); //Push another precalculcated norms onto the result.

		const x = range.xLen;
		const y = range.yLen;
		const z = range.zLen;

		uvs.set([
			0, y, 0, 0, z, y,
			0, 0, z, 0, z, y,
			0, y, 0, 0, z, y,
			0, 0, z, 0, z, y,
			0, z, 0, 0, x, z,
			0, 0, x, 0, x, z,
			0, z, 0, 0, x, z,
			0, 0, x, 0, x, z,
			0, y, 0, 0, x, y,
			0, 0, x, 0, x, y,
			0, y, 0, 0, x, y,
			0, 0, x, 0, x, y
		], r * 72);

		materialIndex.push(range.type);

	}

	const data = {
		position: vertices.buffer,
		materialIndex: Uint8Array.from(materialIndex).buffer,
		normals: normals.buffer,
		uvs: uvs.buffer
	}

	self.postMessage(data, [data.position, data.materialIndex, data.normals, data.uvs]);

}

self.addEventListener('message',function(e){

	const data = new Int8Array(e.data);

	var visible = false;
	for (var i = 0; i < 512; ++i){
		if (data[i]>=0){
			visible = true;
			break;
		}
	}

	if (visible){
		generate(marchY(marchZ(marchX(data))));
	} else {
		generate([]);
	}

});
