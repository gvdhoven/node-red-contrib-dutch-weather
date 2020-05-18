module.exports = function(RED) {
	"use strict";
	const Sun = require('./lib/Sun');
	const MINUTE = 60000;

	/**
	 * Configuration node which holds only latitude and longitude.
	 */
	function dutchWeatherConf(n) {
		RED.nodes.createNode(this, n);
		this.lat = n.lat;
		this.lng = n.lng;
		
		this.isValid = function() {
			let isValidLat = isFinite(this.lat) && Math.abs(this.lat) <= 90;
			let isValidLng = isFinite(this.lng) && Math.abs(this.lng) <= 180;
			return isValidLat && isValidLng;
		}
		
	}
	RED.nodes.registerType("dutch-weather", dutchWeatherConf);


	/**
	 * Sun events node
	 */
	function dutchWeatherSunEvents(n) {
		RED.nodes.createNode(this, n);
		this.conf = RED.nodes.getNode(n.conf);

		if (this.conf.isValid()) {
			node.conf.register(node);
			this.Sun = new Sun({ lat: this.conf.lat, lng: this.conf.lng });
			//this.Sun.getPosition();
		} else {
			node.error('Invalid configuration. Please check the latitude and longitude settings.');
		}

		node.on('close', function(done){
			node.conf.unregister(node, done);
		});
	}	
	RED.nodes.registerType("dutch-weather-sun-events", dutchWeatherSunEvents());
}
