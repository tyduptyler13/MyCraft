"use strict";

var BlockData;
var BlockDataReady = false;
$.ajax({
	url: 'blocks.json',
	success: function(data){
		console.log(data);
		BlockData = data;
		BlockDataReady = true;
		$(document).trigger('BlockDataReady');
	},
	error: function(jqXHR, textStatus, errorThrown){
		console.log(jqXHR, textStatus, errorThrown);
	}
});

(function(){
	var matCache = {};
	var texCache = {};
	var loader = new THREE.TextureLoader();
	API.getMaterial =  function(type, callback){

		if (matCache[type]){
			callback(matCache[type]);
			return;
		}

		async.each(['diffuseMap', 'normalMap', 'specularMap'], function(item, callback){
			if (!BlockData[type][item]){
				//console.log("Skipping empty texture.");
				callback();
				return;
			}
			loader.load(BlockData[type][item], function(texture){
				if (!texCache[type]){
					texCache[type] = {};
				}
				texCache[type][item] = texture;
				callback();
			}, function(){}, function(){
				callback(new Error("Texture failed to load."));
			})
		}, function(err){
			if (err){
				throw err;
			}

			var material = new THREE.MeshPhongMaterial({
				map: texCache[type]['diffuseMap'],
				specularMap: texCache[type]['specularMap'],
				normalMap: texCache[type]['normalMap']
			});

			matCache[type] = material;

			callback(material);
		})

	};

	API.getTexture = function(type, name){
		return texCache[type][name];
	}

	API.getTextures = function(){
		return texCache;
	}

	API.setAnisotropy = function(anisotropy) {
		for (var index in texCache){
			for (var key in texCache[index]){
				var value = texCache[index][key];
				value.anisotropy = anisotropy;
				value.needsUpdate = true;
			}
		}
	}

})();


class Chunk {

	constructor(type){
		this.blocks = new Int8Array(8 * 8 * 8);
		this.space = new THREE.Object3D();
		this._data = null; //This is reserved for the optimized merged block
		this._metaBlocks = []; //Reserved for future special blocks.
		if (type !== 0) this.fill(type);
	}

	at(x, y, z) {
		return this.blocks[x + y*8 + z*8*8];
	}

	static getPos(index) {
		var x = index & 0b111;
		var y = (index>>3) & 0b111;
		var z = (index>>6) & 0b111;
		return [x,y,z];
	}

	set(x, y, z, type) {
		var index = x + y*8 + z*8*8;
		if (index < 0 || index > 511){
			throw new Error("Out of bounds.");
		}
		this.blocks[index] = type;
	}

	fill(type) {
		var count = 0;
		this.blocks.fill(type); //Native fill operation.
	}

	/**
	 * This function calls a callback at the index of every block in the chunk.
	 *
	 * @param func {function(block, x, y, z)}
	 */
	walk(func){
		var count = 0;
		for (var x = 0; x < 8; ++x){
			for (var y = 0; y < 8; ++y){
				for (var z = 0; z < 8; ++z){
					func(this.blocks[count], x, y, z);
					count++;
				}
			}
		}
	}

	optimize() {
		console.log("No longer applicable. [Chunk.optimize]");
	}

	get position() {
		return this.space.position;
	}

	set position(pos) {
		this.space.position.copy(pos);
	}

}
