module.exports = function(RED) {
	"use strict";

	const WeatherLogic = require('./lib/WeatherLogic');



	/**
	 * Configuration node which holds only latitude and longitude.
	 */
	function dutchWeatherConf(n) {
		RED.nodes.createNode(this, n);

		// Properties
		this.lat = n.lat;
		this.lng = n.lng;

		// Methods
		var node = this;
		this.isValid = function() {
			let config_errors = '';

			if (!(isFinite(this.lat) && Math.abs(this.lat) <= 90)) {
				config_errors+= (config_errors !== '') ? '\n' : '';
				config_errors+= '- Invalid latitude.';
			}
			if (!(isFinite(this.lng) && Math.abs(this.lng) <= 180) ) {
				config_errors+= (config_errors !== '') ? '\n' : '';
				config_errors+= '- Invalid longitude.';
			}

			if (config_errors !== '') {
				node.error('Invalid configuration detected:\n' + config_errors);
				return false;
			}
			return true;
		}

		// Create object
		this.weatherLogic = null;
		if (this.isValid()) {
			this.weatherLogic = new WeatherLogic(this.lat, this.lng);
			this.weatherLogic.startMonitor();
		}
	}
	RED.nodes.registerType("dutch-weather-conf", dutchWeatherConf);



	/**
	 * Sun position node
	 */
	function dutchWeatherSunPosition(n) {
		RED.nodes.createNode(this, n);
		this.conf = RED.nodes.getNode(n.conf);

		if (!this.conf || !this.conf.isValid()) {
			return null;
		}

		var node = this;
		this.conf.weatherLogic.on('sun-position', function (position) {
			node.send({ 'topic': 'sun-position', 'payload': position });
		});
		setTimeout(function() { node.conf.weatherLogic.updateSunPosition(true); }, 1000);
	}
	RED.nodes.registerType("sun-position", dutchWeatherSunPosition);



	/**
	 * Sun events node
	 */
	function dutchWeatherSolarEvents(n) {
		RED.nodes.createNode(this, n);
		this.conf = RED.nodes.getNode(n.conf);

		if (!this.conf || !this.conf.isValid()) {
			return null;
		}

		var node = this;
		this.conf.weatherLogic.on('solar-events', function (events) {
			node.send({ 'topic': 'solar-events', 'payload': events });
		});
		setTimeout(function() { node.conf.weatherLogic.updateSolarEvents(true); }, 1000);
	}
	RED.nodes.registerType("solar-events", dutchWeatherSolarEvents);



	/**
	 * Rain events node
	 */
	function dutchWeatherRainState(n) {
		RED.nodes.createNode(this, n);
		this.conf = RED.nodes.getNode(n.conf);

		if (!this.conf || !this.conf.isValid()) {
			return null;
		}

		var node = this;
		this.conf.weatherLogic.on('rain-state', function (rainState) {
			node.send({ 'topic': 'rain-state', 'payload': rainState});
		});
		setTimeout(function() { node.conf.weatherLogic.checkRain(); }, 1000);
	}
	RED.nodes.registerType("rain-state", dutchWeatherRainState);



	/**
	 * Meteo events node
	 */
	function dutchWeatherMeteoplaza(n) {
		RED.nodes.createNode(this, n);
		this.conf = RED.nodes.getNode(n.conf);

		if (!this.conf || !this.conf.isValid()) {
			return null;
		}

		var node = this;
		this.conf.weatherLogic.on('meteoplaza', function (meteoplaza) {
			node.send({ 'topic': 'meteoplaza', 'payload': meteoplaza });
		});
		setTimeout(function() { node.conf.weatherLogic.updateMeteoplaza(true); }, 1000);

	}
	RED.nodes.registerType("meteoplaza", dutchWeatherMeteoplaza);
}
