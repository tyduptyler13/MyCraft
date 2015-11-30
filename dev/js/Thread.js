"use strict";
/**
 * Creates a set of webworkers and delegates work to them.
 *
 * Fairly specialized case for only passing transferable objects.
 *
 * @param task {String} Url of script that handles the data.
 * @param threads {number} (Optional) Number of threads to create (Default: Number of cpu cores)
 */
class ThreadPool {

	constructor(task, threads){
		this.readyThreads = [];
		this.work = [];
		this.threads = [];
		this.valid = true;

		threads = threads || navigator.hardwareConcurrency;

		var scope = this;

		var onFinish = function(index){ //Nifty function generator.
			return function(){
				scope.readyThreads.push(index);
				if (scope.work.length !== 0){
					var work = scope.work.shift();
					scope.run(work.data, work.callback);
				}
			}
		}

		for (var i = 0; i < threads; ++i){
			var thread = new Worker(task);
			$(thread).on('message', onFinish(i));
			$(thread).on('error', function(e){
				console.error("An error has occured on a thread!", e);
				//TODO Restart it?
			});
			this.threads.push(thread);
			this.readyThreads.push(i);
		}

	}

	destroy(){
		this.threads.forEach(function(thread){
			thread.terminate();
		});
		this.valid = false;
	}

	run(work, callback){

		if (!this.valid) {
			throw new Error("Invalid state. This pool was destroyed. No workers available.");
		}

		var scope = this;

		if (this.readyThreads.length > 0){
			var index = this.readyThreads.pop();
			$(this.threads[index]).one('message', function(e){
				callback(e.originalEvent);
			});
			this.threads[index].postMessage(work.buffer, [work.buffer]);
		} else {
			this.work.push({data:work, callback:callback});
		}
	}

}
