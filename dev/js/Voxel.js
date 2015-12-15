"use strict";

(function(){
	const matCache = {};
	const texCache = {};
	const loader = new THREE.TextureLoader();
	var BlockData = {};
	const BlockMaterial = new THREE.MultiMaterial();
	BlockMaterial.visible = false;
	var ready = false;
	const onReady = [];

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
				texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
				callback();
			}, function(){}, function(){
				callback(new Error("Texture failed to load."));
			})
		}, function(err){
			if (err){
				throw err;
			}

			const material = new THREE.MeshPhongMaterial({
				map: texCache[type]['diffuseMap'],
				specularMap: texCache[type]['specularMap'],
				normalMap: texCache[type]['normalMap'],
				name: BlockData[type].name
			});

			matCache[type] = material;

			callback(material);
		})

	};

	$.ajax({
		url: 'blocks.json',
		success: function(data){
			BlockData = data;
			var materials = [];
			async.forEachOf(data, function(data, key, callback){
				if (key >= 0){
					API.getMaterial(key, function(material){
						callback();
						materials[key] = material;
					})
				} else {
					callback();
				}
			}, function(err){
				if (err){
					console.error("Unable to prefetch the required textures.");
				}
				BlockMaterial.materials = materials;
				BlockMaterial.visible = true;
				ready = true;
				onReady.forEach(function(callback){
					try{
						callback();
					} catch (e){
						console.warn("Failed to call callback!", e);
					}
				});
			});
		},
		error: function(jqXHR, textStatus, errorThrown){
			console.log(jqXHR, textStatus, errorThrown);
		}
	});

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
		return BlockMaterial;
	}

	API.onBlocksReady = function(callback){
		if (ready){
			callback();
		} else {
			onReady.push(callback);
		}
	}

})();

const chunkPool = new ThreadPool('js/ChunkOptimizer.js');

class Chunk {

	constructor(type){
		this.blocks = new Int8Array(8 * 8 * 8);
		this.space = new THREE.Object3D();
		this.added = false;
		var geometry = this.geometry = new THREE.BufferGeometry();
		geometry.frustumCulled = false;
		this.attributes = {
			position: new THREE.BufferAttribute(new Float32Array(), 3),
			uv: new THREE.BufferAttribute(new Float32Array(), 2),
			normal: new THREE.BufferAttribute(new Float32Array(), 3)
		}; //Reserved for master block.
		geometry.addAttribute('position', this.attributes.position);
		geometry.addAttribute('uv', this.attributes.uv);
		geometry.addAttribute('normal', this.attributes.normal);
		this.mesh = new THREE.Mesh(geometry, API.getBlockMaterial());
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

		//console.log("Updating chunk");

		chunkPool.run(this.blocks.slice(0), function(e){

			var data = e.data;

			scope.attributes['position'].array = new Float32Array(data.position);
			scope.attributes['position'].needsUpdate = true;
			scope.attributes['normal'].array = new Float32Array(data.normals);
			scope.attributes['normal'].needsUpdate = true;
			scope.attributes['uv'].array = new Float32Array(data.uvs);
			scope.attributes['uv'].needsUpdate = true;

			var materials = new Uint8Array(data.materialIndex);

			scope.geometry.clearGroups();

			for (var i = 0; i < materials.length; ++i){
				scope.geometry.addGroup(108 * i, 108, materials[i]);
			}

			if (!scope.added){
				API.onBlocksReady(function(){
					scope.space.add(scope.mesh);
				});
				scope.added = true;
			}

			//console.log("Chunk optimized:");
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
