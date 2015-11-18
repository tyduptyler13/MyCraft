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

API.getMaterial = (function(){
	var matCache = [];
	var texCache = [];
	var loader = new THREE.TextureLoader();
	return function(type, callback){

		if (matCache[type]){
			callback(matCache[type]);
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
})();

class BaseBlock {

	constructor(type){
		this.type = type || 0;
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
		this.material = block.material;
		this.geometry = BlockGeometry.clone();
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	}

	clone() {
		return new Block(this.type, this.material);
	}

	get position(){
		return this.mesh.position;
	}

}

class Chunk {

	constructor(block){
		if (!block){
			block = new BaseBlock(1);
		}
		this.blocks = new Array(8 * 8 * 8);
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
			this.space.remove(block.mesh);
		}
		this.blocks[index] = block;
		if (block instanceof Block){
			this.space.add(block.mesh);
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
		var meld = new THREE.Geometry();
		var mats = [];
		var mat = this.space.children[0].material.clone();
 		mat.visible = true;
// 		for (var i = 0; i < 6; ++i){
// 			mats.push(mats[0]); //Fudging the materialOffset.
// 		}
		if (this.superBlock){
			this.space.remove(this.superBlock);
		}
		this.space.children.forEach(function(value, index){
			value.material.visible = false;
			meld.merge(value.geometry, value.matrix);
		});
		meld.mergeVertices();
		this.superBlock = new THREE.Mesh(meld, mat);// new THREE.MeshFaceMaterial(mats));
		this.space.add(this.superBlock);
	}

	get position() {
		return this.space.position;
	}

	set position(pos) {
		this.space.position.copy(pos);
	}

}
