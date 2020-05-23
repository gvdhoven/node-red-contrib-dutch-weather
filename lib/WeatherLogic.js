'use strict';

/**
 * Module dependencies.
 */
const EventEmitter = require('events');

const Buienalarm = require('./Buienalarm');
const Buienradar = require('./Buienradar');
const Meteoplaza = require('./Meteoplaza');
const Sun = require('./Sun');

const RAIN_LIGHT = 0.25;
const RAIN_MODERATE = 1;
const RAIN_HEAVY = 2.5;
const MINUTE = 60000;

/**
 * Main class
 */
class WeatherLogic extends EventEmitter {
	constructor(lat, lng) {
		super();

		this.sunTimer = null;
		this.rainTimer = null;
		this.rainState = null;
		this.averagePrecipitation = null;
		this.rainStopTriggered = false;
		this.rainStartTriggered = false;
		this.meteoplaza = null;
		this.meteoplazaTimer = null;

		// Initialize providers
		this.Sun = new Sun(lat, lng);
		this.Buienalarm = new Buienalarm(lat, lng);
		this.Buienradar = new Buienradar(lat, lng);
		this.Meteoplaza = new Meteoplaza(lat, lng);
	}

	async startMonitor() {
		// Clear timers
		clearInterval(this.sunTimer);
		clearInterval(this.rainTimer);
		clearInterval(this.meteoplazaTimer);

		// Update sun statistics
		this.sunTimer = setInterval(this.updateSun.bind(this), MINUTE);

		// Update rain statistics
		this.rainTimer = setInterval(this.checkRain.bind(this), 5 * MINUTE);

		// Update Meteoplaza statistics
		this.meteoplazaTimer = setInterval(this.updateMeteoplaza.bind(this), 10 * MINUTE);
	}

	/**
	 * Emits the new solar position and, in case needed, the solar events.
	 */
	async updateSun(force) {
		force = force || false;

		// Calculate sun position
		this.emit('sun-position', this.Sun.getPosition());

		// Calculate events of the day
		var events = this.Sun.getEvents();
		if (force || !events.fromCache) {
			this.emit('sun-events', events.calculatedEvents);
		}
	}

	async rainStatePayload(isRaining, buienRadar, buienAlarm) {
		return {
				'currentState': (isRaining == true) ? 'raining' : 'dry',
				'precipitation': {
					'buienRadar': buienRadar || 0,
					'buienAlarm': buienAlarm || 0
				}
			};
	}

	async rainPredictionPayload(isRaining, inMinutes, buienRadar, buienAlarm) {
		return {
				'predictedState': (isRaining == true) ? 'raining' : 'dry',
				'inMinutes': inMinutes,
				'precipitation': {
					'buienRadar': buienRadar || 0,
					'buienAlarm': buienAlarm || 0
				}
			};
	}

	/**
	 * Combines buienradar & buienalarm to give a better accuracy for rainfall
	 */
	async checkRain(after) {
		after = after || new Date();

		// Calculate average precipitation
		let buienradarPrecipitation = await this.Buienradar.getForecast(after);
		let buienalarmPrecipitation = await this.Buienalarm.getForecast(after);
		this.averagePrecipitation = parseFloat((buienradarPrecipitation.mmh + buienalarmPrecipitation.mmh) / 2).toFixed(2);
		if (this.rainState === null) {
			this.rainState = (this.averagePrecipitation >= RAIN_LIGHT);
		}

		// Update rainstate if needed
		if (this.averagePrecipitation >= RAIN_LIGHT) {
			if (this.rainState === false) {
				this.emit('debug', 'It was not raining, but it is now. Triggering rain start.');
				this.rainState = true;
			}
		} else {
			if (this.rainState === true) {
				this.emit('debug', 'It was raining, but it is dry now. Triggering rain stop.');
				this.rainState = false;
			}
		}

		// On first boot, we forcibly notify the state
		this.emit('rain-state', this.rainStatePayload(this.rainState, buienradarPrecipitation.mmh, buienalarmPrecipitation.mmh));

		// Loop over possibilities for rain starting or stopping in the next 120 minutes
		for (let i = 0; i < 8; i++) {
			// Calculate minutes
			let inMinutes = 0;
			switch (i) {
				case 0: inMinutes = 5; break;
				case 1: inMinutes = 10; break;
				case 2: inMinutes = 15; break;
				case 3: inMinutes = 30; break;
				case 4: inMinutes = 45; break;
				case 5: inMinutes = 60; break;
				case 6: inMinutes = 90; break;
				case 7: inMinutes = 110; break;
			}
			let atTime = new Date(after.getTime() + (inMinutes * MINUTE));

			// Get forecasts for both providers
			buienradarPrecipitation = await this.Buienradar.getForecast(atTime);
			buienalarmPrecipitation = await this.Buienalarm.getForecast(atTime);
			let averagePrecipitation = parseFloat((buienradarPrecipitation.mmh + buienalarmPrecipitation.mmh) / 2).toFixed(2);

			// if it is currently not raining, and there is no 'rain start trigger' set to go off in the future
			if (this.rainState === false && this.rainStartTriggered === false) {
				// And it will be raining according to Buienradar OR Buienalarm
				if (averagePrecipitation >= RAIN_LIGHT) {
					// Then we make sure we notify
					this.emit('rain-debug', `It will start raining at ${atTime}`);
					this.emit('rain-prediction', this.rainPredictionPayload(true, inMinutes.toString(), buienradarPrecipitation.mmh, buienalarmPrecipitation.mmh));
					this.rainStartTriggered = true;
					setTimeout(() => {
						this.rainStartTriggered = false;
					}, inMinutes * MINUTE);
				}
			}

			// if it is currently raining, and there is no 'rain stop trigger' set to go off in the future
			if (this.rainState === true && this.rainStopTriggered === false) {
				// And it will be dry according to both Buienradar AND Buienalarm
				if (averagePrecipitation < RAIN_LIGHT) {
					// Then we make sure we notify
					this.emit('rain-debug', `It will stop raining at ${atTime}`);
					this.emit('rain-prediction', this.rainPredictionPayload(false, inMinutes.toString(), buienradarPrecipitation.mmh, buienalarmPrecipitation.mmh));
					this.rainStopTriggered = true;
					setTimeout(() => {
						this.rainStopTriggered = false;
					}, inMinutes * MINUTE);
				}
			}
		}
	}

	/**
	 * Retreives new information from Meteoplaza
	 */
	async updateMeteoplaza(force) {
		force = force || false;
		let lastUpdated = null;
		if (this.meteoplaza !== null)
			lastUpdated = this.meteoplaza.updated;
		this.meteoplaza = await this.Meteoplaza.update();

		// Notify in case we have a new update
		if (force || (lastUpdated == null) || (this.meteoplaza.updated > lastUpdated)) {
			this.emit('meteoplaza', this.meteoplaza);
		}
	}
}

module.exports = WeatherLogic;