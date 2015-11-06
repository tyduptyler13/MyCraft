
var API = {};
var Textures = {
	shinyRock: {
		diffuse: 'images/shinyRock-diffuse.jpg',
		specular: 'images/shinyRock-spec.jpg',
		normal: 'images/shinyRock-normal.jpg'
	},
	rockFrac: {
		diffuse: 'images/rockFrac-diffuse.jpg',
		normal: 'images/rockFrac-normal.jpg'
	},
	sky: 'images/sky.jpg'
};

var MyCraft = function(){
	var win = $(window);
	var width = win.width();
	var height = win.height();

	this.scene = new THREE.Scene();

	this.tasks = []; //These functions will be run during update.

	var sun = new THREE.AmbientLight(0x404040);
	this.scene.add(sun);

	var renderer = this.renderer = new THREE.WebGLRenderer();
	this.renderer.setSize(width, height);

	var camera = this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000, width, height);

	win.resize(function(){
		width = win.width();
		height = win.height();
		
		camera.aspect = width / height;
		camera.updateProjectionMatrix();

		renderer.setSize(width, height);
	});

	API.setFOV = function(fov){
		camera.fov = fov;
		camera.updateProjectionMatrix();
	};

	$('#game').append(this.renderer.domElement);

	this.setupPlayer();

	var light = new THREE.PointLight();
	light.position.y = 7;
	light.position.z = 5;
	this.scene.add(light);
	
	var ground = new THREE.PlaneGeometry( 2000, 2000, 100, 100 );
	ground.rotateX( - Math.PI / 2 );

	var groundMat = new THREE.MeshPhongMaterial({
		map: MyCraft.makeRepeatTexture(Textures.shinyRock.diffuse),
		specularMap: MyCraft.makeRepeatTexture(Textures.shinyRock.specular),
		normalMap: MyCraft.makeRepeatTexture(Textures.shinyRock.normal)
	})
	var groundMesh = new THREE.MeshBasicMaterial({color:"red", wireframe: true});
	//var ground2 = ground.clone();
	//ground2.rotateX( - Math.PI / 2 );

	this.scene.add(new THREE.Mesh(ground, groundMat));
	//this.scene.add(new THREE.Mesh(ground2, groundMesh));

	var sky = new THREE.Mesh(
		new THREE.BoxGeometry(1000, 1000, 1000, 1, 1, 1),
		new THREE.ShaderMaterial({
			uniforms: {
				texture: { type: 't', value: THREE.ImageUtils.loadTexture(Textures.sky) }
			},
			vertexShader: $('#sky-vertex').text(),
			fragmentShader: $('#sky-fragment').text()
		})
	);
	sky.scale.set(-1, 1, 1);
	//sky.rotateZ( - Math.PI / 2 );
	this.scene.add(sky);

	this.timer = new THREE.Clock(true);

	this.stats = new Stats();

	$(this.stats.domElement).css({
		position: 'absolute',
		left: '0',
		top: '0'
	});

	$('body').append(this.stats.domElement);

	this.render();

}
MyCraft.prototype.render = function(){
	var delta = this.timer.getDelta();
	//mainPlayer.rotation.x += delta * Math.PI / 2;
	//mainPlayer.rotation.y += delta * Math.PI / 2;
	this.stats.begin();
	this.update(delta);
	this.renderer.render(this.scene, this.camera);
	this.stats.end();
	var scope = this;
	requestAnimationFrame(function(){scope.render()});
};
MyCraft.prototype.setupPlayer = function(){
	/**
	 * A player is just a 3DObject where the body mesh is all based above the zero. Allowing simple movement and physics.
	 */
	this.player = new THREE.Object3D();
	this.player.add(this.camera);
	this.player.position.y = 5;
	this.camera.position.y = 1.7; //Average height of eyes in meters.
	this.scene.add(this.player);

	var controlsEnabled = false;

	$('#game > canvas').click(function(){
		controlsEnabled = true;
		this.requestPointerLock();
	});

	$(document).on('pointerlockerror', function(){
		throw new Error("Failed to aquire the pointer. Game will not work.");
	}).on('pointerlockchange', function(){
		console.log("Disabled pointer lock.");
		if (document.pointerLockElement === null){
			controlsEnabled = false;
		}
	});

	var movement = {
		up: false,
		left: false,
		right: false,
		back: false,
		jump: false
	};

	$(document).keydown(function(e){
		switch(e.which){
			case 38: // up
			case 87: // w
				movement.up = false;
				break;

			case 37: // left
			case 65: // a
				movement.left = false;
				break;

			case 40: // down
			case 83: // s
				movement.back = false;
				break;

			case 39: // right
			case 68: // d
				movement.right = false;
				break;

			case 32: // space
				movement.jump = false;
				break;
		}
	});

	$(document).keyup(function(e){
		switch(e.which) {
			case 27: controlsEnabled = false;
				break;

			case 38: // up
			case 87: // w
				movement.up = true;
				break;

			case 37: // left
			case 65: // a
				movement.left = true;
				break;

			case 40: // down
			case 83: // s
				movement.back = true;
				break;

			case 39: // right
			case 68: // d
				movement.right = true;
				break;

			case 32: // space
				movement.jump = true;
				break;
		}
	});

	this.tasks.push(function(delta){
		
		if (controlsEnabled) {
			
		}

	});

};
MyCraft.prototype.update = function(delta){
	var scope = this;
	$.each(this.tasks, function(index, task){
		task.call(scope, delta);
	});
};
MyCraft.makeRepeatTexture = function(url, repeat) {
	if (repeat === undefined || repeat === null) repeat = 500;
	var tex = THREE.ImageUtils.loadTexture(url);
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(repeat, repeat);
	return tex;
}

$(function(){

	game = new MyCraft();

});
