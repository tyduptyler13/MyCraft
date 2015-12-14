"use strict";
var MyCraft = function(){
	const win = $(window);
	var width = win.width();
	var height = win.height();

	this.chunks = {};

	this.scene = new THREE.Scene();

	this.tasks = []; //These functions will be run during update.

	this.ambientLight = new THREE.AmbientLight(0x404040);
	this.scene.add(this.ambientLight);

	const renderer = this.renderer = new THREE.WebGLRenderer({antialias: true});
	this.renderer.setSize(width, height);

	const camera = this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000, width, height);

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

	this.setupUI();

	this.render();

}
MyCraft.prototype.render = (function(){

	var vsync = true;

	API.setVsync = function(val){
		vsync = val;
		$('#vsync').val(val);
	};

	$(function(){
		$('#vsync').change(function(){
			API.setVsync($(this).is(':checked'));
		});
	});

	return function(){
		const delta = this.timer.getDelta();

		this.stats.begin();
		this.update(delta);
		this.renderer.render(this.scene, this.camera);
		this.stats.end();
		const render = this.render.bind(this);
		if (vsync){
			requestAnimationFrame(render);
		} else {
			async.nextTick(render);
		}
	};
})();
MyCraft.prototype.setupPlayer = function(){
	/**
	 * A player is just a 3DObject where the body mesh is all based above the zero. Allowing simple movement and physics.
	 */
	this.player = new Player(this);
	this.scene.add(this.player.mesh);

};
MyCraft.prototype.update = function(delta){
	const scope = this;
	async.each(this.tasks, function(task, callback){
		task.call(scope, delta);
		callback();
	});
};
MyCraft.prototype.setupSky = function(distance, parent){

	const skyParams = {
		turbidity: 10,
		reileigh: 2,
		mieCoefficient: 0.005,
		mieDirectionalG: 0.8,
		luminance: 1,
		inclination: 0.49, // elevation / inclination
		azimuth: 0.3, // Facing front,
	};

	//Sync time to current time.
	skyParams.inclination = Date.now() / (1800000) % 2;

	const sunSphere = new THREE.Mesh(
		new THREE.SphereBufferGeometry( 20000, 16, 8 ),
		new THREE.MeshBasicMaterial( { color: 0xffffff } )
	);
	sunSphere.visible = false;
	sunSphere.fog = false;

	const sun = new THREE.DirectionalLight(0xffffff, 1);
	sun.position.copy(sunSphere.position);
	sun.position.normalize();
	this.scene.add(sun);

	const sky = new THREE.Sky(distance);
	sky.mesh.frustumCulled = false;

	sky.mesh.add(sunSphere);

	sky.mesh.position.copy(parent.position);
	this.scene.add(sky.mesh);
	sky.mesh.fog = false;

	this.scene.fog = new THREE.FogExp2(0x000000, 0.0025);

	const nightSky = new THREE.Object3D();

	const starGeo = new THREE.Geometry();

	const starDist = distance * 0.9;

	for (var i = 0; i < 10000; ++i){

		const loc = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
		loc.normalize().multiplyScalar(starDist);
		starGeo.vertices.push(loc);
	}

	const starMat = new THREE.PointsMaterial({size: 1, blending: THREE.AdditiveBlending, sizeAttenuation: false, color: 0xffffff, fog: false, transparent: true});

	const stars = new THREE.Points(starGeo, starMat);
	stars.frustumCulled = false;
	nightSky.add(stars);
	nightSky.position.copy(parent.position);
	this.scene.add(nightSky);

	const uniforms = sky.uniforms;
	uniforms.distance.value = distance;
	const updateUniforms = function(skyParams){
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

	const night = new THREE.Color(0x001848);
	const day = new THREE.Color(0xFFFFFF).multiplyScalar(.7);

	this.tasks.push(function(){
		//skyParams.inclination = Date.now() / (1800000) % 2;
		skyParams.inclination = 0;

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

	const scope = this;


	const chunk = new Chunk(3);
	for (var x2 = 0; x2 < 8; ++x2){
		for(var z2 = 0; z2 < 8; ++z2){
			chunk.set(x2, 3, z2, -1);
		}
	}
	for (var y2 = 0; y2 < 8; ++y2){
		for(var z2 = 0; z2 < 8; ++z2){
			chunk.set(2, y2, z2, -1);
		}
	}
	for (var y2 = 0; y2 < 8; ++y2){
		for(var x2 = 0; x2 < 8; ++x2){
			chunk.set(x2, y2, 1, -1);
		}
	}
	chunk.position.set(0, -8, 0);
	scope.scene.add(chunk.space);
	scope.chunks[chunk.position.toArray().join(',')] = chunk;
	chunk.update();

	const chunk2 = new Chunk(1);
	chunk2.position.set(9, -8, 0);
	scope.scene.add(chunk2.space);
	scope.chunks[chunk2.position.toArray().join(',')] = chunk2;
	chunk2.update();

};
MyCraft.prototype.setupUI = function(){
	$('#settingsButton').click(function(){
		const settings = $('#settings');
		if (settings.is(':visible')){
			settings.slideUp();
			$('#overlay').css({
				'pointer-events': 'none',
				'background-color': 'transparent'
			});
		} else {
			settings.slideDown();
			$('#overlay').css({
				'pointer-events': 'all',
				'background-color': 'rgba(0,0,0,.7)'
			});
		}
	});
	$(document).keydown(function(e){
		if (e.keyCode == 27){
			$('#settings').slideUp();
			$('#overlay').css({
				'pointer-events': 'none',
				'background-color': 'transparent'
			});
		}
	});

	const max = this.renderer.getMaxAnisotropy();
	const anisotropy = $('#anisotropy');

	for (var i = 2; i <= max; i *= 2){
		anisotropy.append('<option value="' + i + '">' + i + '</option>');
	}

	anisotropy.prop('disabled', false);

	anisotropy.change(function(){
		const val = anisotropy.find(':selected').val();
		API.setAnisotropy(Number(val));
	});
};

$(function(){

	window.game = new MyCraft();

});
