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
	 * Sun events node
	 */
	function dutchWeatherSolarEvents(n) {
		RED.nodes.createNode(this, n);
		this.conf = RED.nodes.getNode(n.conf);

		if (!this.conf || !this.conf.isValid()) {
			return null;
		}

		var node = this;
		this.conf.weatherLogic.on('sun-position', function (position) {
			node.send({ 'topic': 'sun-position', 'payload': position });
		});
		this.conf.weatherLogic.on('sun-events', function (events) {
			node.send({ 'topic': 'sun-events', 'payload': events });
		});
		setTimeout(function() { node.conf.weatherLogic.updateSun(true); }, 1000);

	}
	RED.nodes.registerType("solar-events", dutchWeatherSolarEvents);



	/**
	 * Rain events node
	 */
	function dutchWeatherRainEvents(n) {
		RED.nodes.createNode(this, n);
		this.conf = RED.nodes.getNode(n.conf);

		if (!this.conf || !this.conf.isValid()) {
			return null;
		}

		var node = this;
		this.conf.weatherLogic.on('rain-state', function (state) {
			node.send({ 'topic': 'rain-events-rain-state', 'payload': state});
		});
		this.conf.weatherLogic.on('rain-prediction', function (prediction) {
			node.send({ 'topic': 'rain-events-rain-prediction', 'payload': prediction});
		});
		setTimeout(function() { node.conf.weatherLogic.checkRain(); }, 1000);
	}
	RED.nodes.registerType("rain-events", dutchWeatherRainEvents);



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
