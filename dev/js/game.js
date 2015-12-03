"use strict";
var MyCraft = function(){
	var win = $(window);
	var width = win.width();
	var height = win.height();

	this.chunks = [];

	this.scene = new THREE.Scene();

	this.tasks = []; //These functions will be run during update.

	this.ambientLight = new THREE.AmbientLight(0x404040);
	this.scene.add(this.ambientLight);

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

	this.player = new Player(this);
	this.scene.add(this.player.mesh);

	this.setupChunks();
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
	var player = new Player(this);
	this.scene.add(player.mesh);

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
	skyParams.inclination = Date.now() / (1800000) % 2;

	var sunSphere = new THREE.Mesh(
		new THREE.SphereBufferGeometry( 20000, 16, 8 ),
		new THREE.MeshBasicMaterial( { color: 0xffffff } )
	);
	sunSphere.visible = false;
	sunSphere.fog = false;

	var sun = new THREE.DirectionalLight(0xffffff, 1);
	sun.position.copy(sunSphere.position);
	sun.position.normalize();
	this.scene.add(sun);

	var sky = new THREE.Sky(distance);
	sky.mesh.frustumCulled = false;

	sky.mesh.add(sunSphere);

	sky.mesh.position.copy(parent.position);
	this.scene.add(sky.mesh);
	sky.mesh.fog = false;

	this.scene.fog = new THREE.FogExp2(0x000000, 0.0025);

	var nightSky = new THREE.Object3D();

	var starGeo = new THREE.Geometry();

	var starDist = distance * 0.9;

	for (var i = 0; i < 10000; ++i){

		var loc = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
		loc.normalize().multiplyScalar(starDist);
		starGeo.vertices.push(loc);
	}

	var starMat = new THREE.PointsMaterial({size: 1, blending: THREE.AdditiveBlending, sizeAttenuation: false, color: 0xffffff, fog: false, transparent: true});

	var stars = new THREE.Points(starGeo, starMat);
	stars.frustumCulled = false;
	nightSky.add(stars);
	nightSky.position.copy(parent.position);
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

	var night = new THREE.Color(0x001848).multiplyScalar(.5);
	var day = new THREE.Color(0xFFFFFF).multiplyScalar(.2);

	this.tasks.push(function(){
		skyParams.inclination = Date.now() / (1800000) % 2;
		//skyParams.inclination = 0;

		starMat.opacity = Math.pow(1 - Math.abs(1 - skyParams.inclination), 2);
		sun.intensity = THREE.Math.clamp(sunSphere.position.y + 1, 0, 1);

		if (sunSphere.position.y > 0){ //Day.
			this.ambientLight.color.copy(night.clone().lerp(day, sunSphere.position.y / 10000 + .5));
		} else { //Night.
			this.ambientLight.color.copy(day.clone().lerp(night, -sunSphere.position.y / 10000 + .5));
		}

		updateUniforms(skyParams);

		sun.position.copy(sunSphere.position);
		sun.position.normalize();

		nightSky.position.copy(parent.position);
		nightSky.lookAt(sunSphere.position);

		sky.mesh.position.copy(parent.position);
	});

};
MyCraft.prototype.setupChunks = function(){

	var scope = this;

	for (var x=0; x<4; ++x){
		for (var y=0; y<4; ++y){
			for (var z=0; z<4; ++z){
				var chunk = new Chunk(1);
				chunk.position.set((x - 2) * 8, (y - 4) * 8, (z - 2) * 8);
				scope.scene.add(chunk.space);
				scope.chunks.push(chunk);
				chunk.update();
			}
		}
	}

};

$(function(){

	window.game = new MyCraft();

});