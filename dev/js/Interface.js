"use strict";
$(function(){
	API.addToolbarButton = (function(){
		const toolbar = $('#toolbar');
		return function(button){
			toolbar.append(button);
		};
	})();
});