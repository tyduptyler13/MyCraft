
(function(){
	"use strict";
	var Block = function(material){
		this.material = material;
		this.geometry = baseGeometry.clone();
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	}
	Block.baseGeometry = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);

	window.Block = Block;
})();


