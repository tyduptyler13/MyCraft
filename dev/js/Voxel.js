"use strict";

var BlockData;
$.getJSON('blocks.json', function(data){
	BlockData = data;
});

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

class Block extends BaseBlock {
	constructor(type, material){
		super(type);
		this.material = material;
		this.geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	}

	copy(block){
		this.material = block.material;
		this.geometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	}

	clone() {
		var ret = new Block(this.type, this.material);
	}

}

class Chunk {

	constructor(){
		this.blocks = new Array(8 * 8 * 8);
		for (var i = 0; i < 512; ++i){
			this.blocks[i] = new BaseBlock(1);
		}

		this.space = new THREE.Object3D();
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

	set(x, y, z, block) {
		var index = x + y*8 + z*8*8;
		if (index < 0 || index > 511){
			throw new Error("Out of bounds.");
		}
		this.blocks[index] = block;
		block.position.set(x, y, z);
	}

	fill(block) {
		var count = 0;
		for (var x = 0; x < 8; ++x){
			for (var y = 0; y < 8; ++y){
				for (var z = 0; z < 8; ++z){
					var b = block.clone();
					b.position.set(x, y, z);
					this.blocks[count] = b;
					count++;
				}
			}
		}
	}

	/**
	 * This function calls a callback at the index of every block in the chunk.
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

}
