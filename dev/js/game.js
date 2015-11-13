
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
	moon: 'images/moon512.png'
};

var MyCraft = function(){
	var win = $(window);
	var width = win.width();
	var height = win.height();

	this.scene = new THREE.Scene();

	this.tasks = []; //These functions will be run during update.

	var sun = new THREE.AmbientLight(0x404040);
	this.scene.add(sun);

	var renderer = this.renderer = new THREE.WebGLRenderer({antialias: true});
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

	this.scene.add(new THREE.Mesh(ground, groundMat));

	this.setupSky(5000, this.player);

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

	this.stats.begin();
	this.update(delta);
	this.renderer.render(this.scene, this.camera);
	this.stats.end();
	var scope = this;
	requestAnimationFrame(function(){scope.render()});
	//setTimeout(function(){scope.render()}, 1);
};
MyCraft.prototype.setupPlayer = function(){
	/**
	 * A player is just a 3DObject where the body mesh is all based above the zero. Allowing simple movement and physics.
	 */
	this.player = new THREE.Object3D();
	var head = new THREE.Object3D();
	head.add(this.camera);
	this.player.add(head);
	this.player.position.y = 5;
	head.position.y = 1.7; //Average height of eyes in meters.
	this.scene.add(this.player);

	var controlsEnabled = false;

	$('#game > canvas').click(function(){
		controlsEnabled = true;
		this.requestPointerLock();
	});

	$(document).on('pointerlockerror', function(){
		throw new Error("Failed to aquire the pointer. Game will not work.");
	}).on('pointerlockchange', function(){
		if (document.pointerLockElement === null){
			console.log("Disabled pointer lock.");
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

	var scope = this;
	var PI_2 = Math.PI / 2;

	$(document).mousemove(function(e){

		if (controlsEnabled === true){
			var movementX = e.originalEvent.movementX;
			var movementY = e.originalEvent.movementY;

			scope.player.rotation.y -= movementX * 0.002;
			head.rotation.x -= movementY * 0.002;
			head.rotation.x = Math.max( - PI_2, Math.min( PI_2, head.rotation.x ) );
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
MyCraft.prototype.setupSky = function(distance, parent){

	var skyParams = {
		turbidity: 10,
		reileigh: 2,
		mieCoefficient: 0.005,
		mieDirectionalG: 0.8,
		luminance: 1,
		inclination: 0.49, // elevation / inclination
		azimuth: 0.25, // Facing front,
	};

	//Sync time to current time.
	var date = new Date();
	skyParams.inclination = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

	var sunSphere = new THREE.Mesh(
		new THREE.SphereBufferGeometry( 20000, 16, 8 ),
		new THREE.MeshBasicMaterial( { color: 0xffffff } )
	);
	sunSphere.visible = false;
	sunSphere.fog = false;
	parent.add( sunSphere );

	var sky = new THREE.Sky(distance);
	parent.add(sky.mesh);
	sky.mesh.fog = false;

	this.scene.fog = new THREE.FogExp2(0x000000, 0.0025);

	var nightSky = new THREE.Object3D();
	//Moon is disabled because the texture looks goofy and doesn't update location.
	//var moonTexture = THREE.ImageUtils.loadTexture(Textures.moon);
	//var moonGeo = new THREE.Geometry();
	//var moonLoc = new THREE.Vector3();
	//moonGeo.vertices.push(moonLoc);
	//var moon = new THREE.Points(moonGeo, new THREE.PointsMaterial({map: moonTexture, fog: false, size: 200, sizeAttenuation: false, blending: THREE.AdditiveBlending, depthTest: false, transparent: true}))
	//parent.add(moon);

	var starGeo = new THREE.Geometry();

	var starDist = distance * 0.9;

	for (var i = 0; i < 10000; ++i){

		var loc = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
		loc.normalize().multiplyScalar(starDist);
		starGeo.vertices.push(loc);
	}

	var starMat = new THREE.PointsMaterial({size: 1, blending: THREE.AdditiveBlending, sizeAttenuation: false, color: 0x999999, fog: false});

	var stars = new THREE.Points(starGeo, starMat);
	nightSky.add(stars);
	nightSky.location = parent.location;
	this.scene.add(nightSky);
	
	var uniforms = sky.uniforms;
	uniforms.distance.value = distance;
	var updateUniforms = function(skyParams){
		uniforms.turbidity.value = skyParams.turbidity;
		uniforms.reileigh.value = skyParams.reileigh;
		uniforms.luminance.value = skyParams.luminance;
		uniforms.mieCoefficient.value = skyParams.mieCoefficient;
		uniforms.mieDirectionalG.value = skyParams.mieDirectionalG;

		var theta = Math.PI * ( skyParams.inclination - 0.5 );
		var phi = 2 * Math.PI * ( skyParams.azimuth - 0.5 );

		sunSphere.position.x = distance * Math.cos( phi );
		sunSphere.position.y = distance * Math.sin( phi ) * Math.sin( theta );
		sunSphere.position.z = distance * Math.sin( phi ) * Math.cos( theta );

		//moonLoc.multiplyVectors(sunSphere.position, {x: -0.9, y: -0.9, z: -0.9});

		sky.uniforms.sunPosition.value.copy( sunSphere.position );
	}

	updateUniforms(skyParams);

	API.sky = {
		getParams : function(){return skyParams;},
		setParams : function(value){skyParams=value; updateUniforms(skyParams);}
	};

	this.tasks.push(function(delta){
		skyParams.inclination += (2 / 3600) * delta;
		updateUniforms(skyParams);
		nightSky.lookAt(sunSphere.position);
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