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
		setTimeout(function() { node.conf.weatherLogic.updateSun(true); }, 500);

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
		this.conf.weatherLogic.on('rain', function (isRaining, inMinutes) {
			/*if (isRaining == true) {
				if (inMinutes == 0) {
					Helper.Debug('  - It is raining.');
				} else {
					Helper.Debug('  - It will start raining in ' + inMinutes + ' minutes.');
				}
			} else {
				if (inMinutes == 0) {
					Helper.Debug('  - It is dry.');
				} else {
					Helper.Debug('  - It will be dry in ' + inMinutes + ' minutes.');
				}
			}*/

			var msg = {
				'topic': 'rain-events',
				'payload': {
					'isRaining': ((isRaining == true) && (inMinutes == 0)),
					'willChange': (inMinutes > 0),
					'inMinutes': inMinutes
				}
			};
			node.send(msg);
		});
		setTimeout(function() { node.conf.weatherLogic.emit('rain', node.conf.weatherLogic.rainState, 0) }, 500);
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
		setTimeout(function() { node.conf.weatherLogic.updateMeteoplaza(true); }, 500);

	}
	RED.nodes.registerType("meteoplaza", dutchWeatherMeteoplaza);
}
