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

	API.getBlockMaterial = function(){
		//TODO create/get MultiMaterial.
	}

})();

var chunkPool = new ThreadPool('js/ChunkOptimizer.js');

class Chunk {

	constructor(type){
		this.blocks = new Int8Array(8 * 8 * 8);
		this.space = new THREE.Object3D();
		var geometry = new THREE.BufferGeometry();
		this._attributes = {
			position: new THREE.BufferAttribute(new Float32Array(), 3),
			indices: new THREE.BufferAttribute(new Uint16Array(), 1),
			uvs: new THREE.BufferAttribute(new Float32Array(), 2),
			normals: new THREE.BufferAttribute(new Float32Array(), 3)
		}; //Reserved for master block.
		geometry.addAttribute('position', this._attributes.position);
		geometry.addAttribute('uvs', this._attributes.uvs);
		geometry.addAttribute('normals', this._attributes.normals);
		geometry.setIndex(this._attributes.indices);
		this.space.add(new THREE.Mesh(geometry));
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
		for (var z = 0; z < 8; ++z){
			for (var y = 0; y < 8; ++y){
				for (var x = 0; x < 8; ++x){
					func(this.blocks[count], x, y, z);
					count++;
				}
			}
		}
	}

	update() {

		var scope = this;

		chunkPool.run(this.blocks.slice(0), function(e){

			var data = e.data;

			scope._attributes['position'].array = new Float32Array(data.position);
			scope._attributes['position'].needsUpdate = true;
			scope._attributes['normals'].array = new Float32Array(data.normals);
			scope._attributes['normals'].needsUpdate = true;
			scope._attributes['uvs'].array = new Float32Array(data.uvs);
			scope._attributes['uvs'].needsUpdate = true;
			scope._attributes['indices'].array = new Uint16Array(data.indices);
			scope._attributes['indices'].needsUpdate = true;

			var materials = new Uint8Array(data.materialIndex);

			scope._data.clearGroups();

			for (var i = 0; i < materials.length; ++i){
				scope._data.addGroup(24 * i, 24, materials[i]);
			}

			console.log("Chunk optimized:", e.data);
		});
	}

	get position() {
		return this.space.position;
	}

	set position(pos) {
		this.space.position.copy(pos);
	}

	static get material() {
		API.getBlockMaterial();
	}

}
