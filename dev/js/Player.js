"use strict";

class Player {
	constructor(game){
		this.player = new THREE.Object3D();
		this.camera = game.camera;
		this.head = new THREE.Object3D();
		this.head.add(game.camera);
		this.player.add(this.head);
		this.head.position.y = 1.7; //Average height of eyes in meters.

		var controlsEnabled = false;

		$('#game > canvas').click(function(){
			controlsEnabled = true;
			//this = the game element.

			this.requestPointerLock = this.requestPointerLock ||
                            this.mozRequestPointerLock ||
                            this.webkitRequestPointerLock;

			this.requestPointerLock();
		});

		$(document).on('pointerlockerror', function(){
			throw new Error("Failed to aquire the pointer. Game will not work.");
		}).on('pointerlockchange', function(){
			if (document.pointerLockElement === null){
				controlsEnabled = false;
				console.log("Disabled pointer lock.");
			}
		});

		const movement = {
			up: false,
			left: false,
			right: false,
			back: false,
			jump: false,
			crouch: false
		};

		$(document).keydown(function(e){
			switch(e.which){
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
				case 16:
					movement.crouch = true;
					break;
			}
		});

		$(document).keyup(function(e){
			switch(e.which) {
				case 27: controlsEnabled = false;
					break;

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
				case 16:
					movement.crouch = false;
					break;
			}

		});

		const scope = this;
		const PI_2 = Math.PI / 2;

		$(document).mousemove(function(e){

			if (controlsEnabled === true){
				const movementX = e.originalEvent.movementX;
				const movementY = e.originalEvent.movementY;

				scope.player.rotation.y -= movementX * 0.002;
				scope.head.rotation.x -= movementY * 0.0015;
				scope.head.rotation.x = Math.max( - PI_2, Math.min( PI_2, scope.head.rotation.x ) );
			}

		});

		const setCursor = (function(){

			const boxCursor = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color:'white', fog: false, wireframe: true}));
			boxCursor.scale.multiplyScalar(1.01);
			game.scene.add(boxCursor);
			const raycaster = new THREE.Raycaster();
			raycaster.far = 10; //10 block distance limit (The first one is the only one that matters anyways)
			const v2 = new THREE.Vector2();
			const a = new THREE.Vector3();

			return function(){
				//Add/remove boxCursor;
				raycaster.setFromCamera(v2, game.camera);

				const intersects = raycaster.intersectObjects(game.scene.children, true);

				if (intersects.length === 0){
					boxCursor.visible = false;
				} else {
					for (var i = 0, l = intersects.length; i < l; ++i){
						if (!intersects[i].object.userData.chunk){ //Ignore non chunks.
							continue;
						} else {
							a.subVectors(intersects[i].point, intersects[i].face.normal);
							const b = intersects[i].face.normal;
							if (b.x + b.y + b.z > 0) { //Check which side we are looking at.
								boxCursor.position.copy(a.floor().addScalar(.5));
							} else {
								boxCursor.position.copy(a.ceil().subScalar(.5));
							}
							boxCursor.visible = true;
							return;
						}
					}
					boxCursor.visible = false;
				}
			}
		})();

		game.tasks.push(function(delta){

			if (controlsEnabled) {
				scope.move(movement, delta);
				setCursor();
			}

		});

	}

	move(movement, delta) {
		//Fly movement.
		const fb = movement.up ? -1 : movement.back ? 1 : 0;
		const lr = movement.left ? -1 : movement.right ? 1 : 0;
		const up = movement.jump ? 1 : movement.crouch ? -1 : 0;

		if (fb || lr || up){
			const dir = new THREE.Vector3(lr,0,fb); //Point relative to where we wanna go. -Z is forward.
			dir.applyEuler(this.head.getWorldRotation());
			dir.y = up ? up : dir.y;
			dir.normalize();
			dir.multiplyScalar(5 * delta); //Multiply the direction by distance per second and delta.
			this.position.add(dir); //Move there.
		}

		//TODO Check for collisions.

		//TODO Implement ground movement.

	}

	get mesh(){
		return this.player;
	}

	get position() {
		return this.player.position;
	}

	set position(pos) {
		this.player.position.copy(pos);
	}
}

