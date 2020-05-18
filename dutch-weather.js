module.exports = function(RED) {
	"use strict";

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
	RED.nodes.registerType("dutch-weather-conf", dutchWeatherConf);


	/**
	 * Sun events node
	 */
	const Sun = require('./lib/Sun');
	function dutchWeatherSolarEvents(n) {
		RED.nodes.createNode(this, n);
		this.conf = RED.nodes.getNode(n.conf);

		if (!this.conf || !this.conf.isValid()) {
			node.error('Invalid configuration. Please check the latitude and longitude settings.');
			return null;
		}

		// Initialize sun library
		this.Sun = new Sun({ lat: this.conf.lat, lng: this.conf.lng });

		var node = this;

		this.getSolarPositionAndEvents = function() {
			let solarEvents = node.Sun.getEvents();
			return {
				'payload': {
					'date': solarEvents.calculatedEventsFor,
					'position': node.Sun.getPosition(),
					'events': solarEvents.calculatedEvents
				}
			};
		}

		this.sendSolarPositionAndEvents = function() {
			node.send(node.getSolarPositionAndEvents());
		}

		// Set interval
		setInterval(this.sendSolarPositionAndEvents.bind(this), MINUTE);
		this.sendSolarPositionAndEvents();
	}
	RED.nodes.registerType("solar-events", dutchWeatherSolarEvents);
}
