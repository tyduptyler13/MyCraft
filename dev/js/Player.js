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
			jump: false
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

		game.tasks.push(function(delta){

			if (controlsEnabled) {
				scope.move(movement, delta);
			}

		});

	}

	move(movement, delta) {
		//Fly movement.
		const fb = movement.up ? -1 : movement.back ? 1 : 0;
		const lr = movement.left ? -1 : movement.right ? 1 : 0;
		const up = movement.jump ? 1 : 0;

		if (fb || lr || up){
			const dir = new THREE.Vector3(lr,0,fb); //Point relative to where we wanna go. -Z is forward.
			dir.normalize();
			dir.applyEuler(this.head.getWorldRotation());
			dir.y = up ? Math.max(dir.y, up) : dir.y;
			dir.multiplyScalar(3 * delta); //Multiply the direction by distance per second and delta.
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

