"use strict";

class Player {
	constructor(game){
		this.player = new THREE.Object3D();
		var head = new THREE.Object3D();
		head.add(game.camera);
		this.player.add(head);
		head.position.y = 1.7; //Average height of eyes in meters.

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
				head.rotation.x -= movementY * 0.0015;
				head.rotation.x = Math.max( - PI_2, Math.min( PI_2, head.rotation.x ) );
			}

		});

		game.tasks.push(function(delta){

			if (controlsEnabled) {

			}

		});

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

