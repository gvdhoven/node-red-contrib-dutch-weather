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
	constructor(latitude, longitude) {
		super();

		this.sunTimer = null;
		this.rainTimer = null;
		this.rainState = null;
		this.rainStateNotified = false;
		this.rainStopTriggered = false;
		this.rainStartTriggered = false;
		this.meteoplaza = null;
		this.meteoplazaTimer = null;

		// Initialize providers
		this.Sun = new Sun({ lat: latitude, lng: longitude });
		this.Buienalarm = new Buienalarm({ lat: latitude, lng: longitude });
		this.Buienradar = new Buienradar({ lat: latitude, lng: longitude });
		this.Meteoplaza = new Meteoplaza({ lat: latitude, lng: longitude });
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

	/**
	 * Checks to see if it is raining according to BuienRadar
	 * @param {date} time
	 * @returns boolean
	 */
	async checkBuienradarAtTime(time = new Date()) {
		try {
			let result = await this.Buienradar.getForecast({ after: time });
			return (result.mmh > RAIN_LIGHT);
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Checks to see if it is raining according to Buienalarm
	 * @param {date} time
	 * @returns boolean
	 */
	async checkBuienalarmAtTime(time = new Date()) {
		try {
			let result = await this.Buienalarm.getForecast({ after: time });
			return (result.mmh > RAIN_LIGHT);
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Combines buienradar & buienalarm to give a better accuracy for rainfall
	 */
	async checkRain() {
		let now = new Date();
		let isRainingAccordingToBuienradar = await this.checkBuienradarAtTime(now);
		let isRainingAccordingToBuienalarm = await this.checkBuienalarmAtTime(now);
		if (this.rainState === null) {
			this.rainState = isRainingAccordingToBuienradar || isRainingAccordingToBuienalarm;
		}

		// Update rainstate if needed
		if (this.rainState === false) {
			// According to Buienradar OR Buienalarm it is raining.
			if (isRainingAccordingToBuienradar || isRainingAccordingToBuienalarm) {
				this.emit('debug', 'It was not raining, but it is now. Triggering rain start.');
				this.rainState = true;
				this.emit('rain', true, 0);
			}
		} else {
			// According to both providers it should be dry.
			if (!isRainingAccordingToBuienradar && !isRainingAccordingToBuienalarm) {
				this.emit('debug', 'It was raining, but it is dry now. Triggering rain stop.');
				this.rainState = false;
				this.emit('rain', false, 0);
			}
		}

		// On first boot, we forcibly notify the state
		if (this.rainStateNotified === false) {
			this.emit('rain', this.rainState, 0);
			this.rainStateNotified = true;
		}

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
			let atTime = new Date(now.getTime() + inMinutes * 60000)

			// Get forecasts for both providers
			let isRainingAccordingToBuienradar = await this.checkBuienradarAtTime(atTime);
			let isRainingAccordingToBuienalarm = await this.checkBuienalarmAtTime(atTime);

			// if it is currently not raining, and there is no 'rain start trigger' set to go off in the future
			if (this.rainState === false && this.rainStartTriggered === false) {
				// And it will be raining according to Buienradar OR Buienalarm
				if (isRainingAccordingToBuienradar || isRainingAccordingToBuienalarm) {
					// Then we make sure we notify
					this.emit('debug', `It will start raining at ${atTime}`);
					this.emit('rain', true, inMinutes.toString());
					this.rainStartTriggered = true;
					setTimeout(() => {
						this.rainStartTriggered = false;
					}, inMinutes * MINUTE);
				}
			}

			// if it is currently raining, and there is no 'rain stop trigger' set to go off in the future
			if (this.rainState === true && this.rainStopTriggered === false) {
				// And it will be dry according to both Buienradar AND Buienalarm
				if (!isRainingAccordingToBuienradar && !isRainingAccordingToBuienalarm) {
					// Then we make sure we notify
					this.emit('debug', `It will stop raining at ${atTime}`);
					this.emit('rain', false, inMinutes.toString());
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