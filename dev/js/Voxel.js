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
				console.log("Skipping empty texture.");
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
				value.anisotropy(anisotropy);
			}
		}
	}

})();

class BaseBlock {

	constructor(type){
		this.type = type || 0;
	}

	copy(block){
		this.type = block.type;
	}

	get solid(){
		return BlockData[this.type]["solid"] || true;
	}

	get movement(){
		return BlockData[this.type]["movement"] || 1;
	}

	get name(){
		return BlockData[this.type]["name"];
	}

	get hazard(){
		return BlockData[this.type]["hazard"] || 0;
	}

}

const BlockGeometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);

class Block extends BaseBlock {
	constructor(type, material){
		super(type);
		this.material = material;
		this.geometry = BlockGeometry.clone();
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	}

	copy(block){
		super.copy(block);
		this.material = block.material;
		this.geometry.copy(BlockGeometry);
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	}

	clone() {
		return new Block(this.type, this.material);
	}

	get position(){
		return this.mesh.position;
	}

}

class BlockCache {
	constructor(){
		this.cache = {};
	}

	add(block){
		var type = block.type;
		if (!this.cache[type]){
			this.cache[type] = new Array();
		}
		this.cache[type].push(block);
	}

	remove(block){
		var type = block.type;
		if (!this.cache[type]) return;
		for (var i = 0; i < this.cache[type].length; ++i){
			if (this.cache[type][i] === block){
				this.cache[type].splice(i, 1);
			}
		}
	}

	optimize(key, callback){
		var meld = new THREE.Geometry();
		var cache = this.cache;
		var mat = API.getMaterial(key, function(mat){
			cache[key].forEach(function(value){
				value.mesh.updateMatrix();
				meld.merge(value.geometry, value.mesh.matrix);
			});

			meld.mergeVertices();

			//TODO Remove internal faces.

			callback(new THREE.Mesh(meld, mat));
		});
		
	}

	getOptimized(){
		var o = [];

		for (var key in this.cache){
			this.optimize(key, function(block){
				o.push(block);
			});
		}

		return o;
	}

}

class Chunk {

	constructor(block){
		if (!block){
			block = new BaseBlock(1);
		}
		this.blocks = new Array(8 * 8 * 8);
		this.realBlocks = new BlockCache();
		this.space = new THREE.Object3D();
		this.superBlock = null; //This is reserved for the optimized merged block.
		this.fill(block);
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

	setIndex(index, block) {
		if (this.blocks[index] instanceof Block){
			this.realBlocks.remove(block);
		}
		this.blocks[index] = block;
		if (block instanceof Block){
			this.realBlocks.add(block);
			this.dirty = true;
		}
	}

	set(x, y, z, block) {
		var index = x + y*8 + z*8*8;
		if (index < 0 || index > 511){
			throw new Error("Out of bounds.");
		}
		block.position.set(x, y, z);
		this.setIndex(index, block);
	}

	fill(block) {
		var count = 0;
		for (var x = 0; x < 8; ++x){
			for (var y = 0; y < 8; ++y){
				for (var z = 0; z < 8; ++z){
					var b;
					if (block instanceof Block){
						b = block.clone();
						b.position.set(x, y, z);
					}
					this.setIndex(count, b);
					count++;
				}
			}
		}
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
		if (this.dirty){
			this.space.remove.apply(this.space, this.space.children);
			this.space.add.apply(this.space, this.realBlocks.getOptimized());
			this.dirty = false;
		}
	}

	get position() {
		return this.space.position;
	}

	set position(pos) {
		this.space.position.copy(pos);
	}

}
