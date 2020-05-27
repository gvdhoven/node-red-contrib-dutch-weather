'use strict';

/**
 * Module dependencies.
 */
const EventEmitter = require('events');

const Buienalarm = require('./Buienalarm');
const Buienradar = require('./Buienradar');
const Meteoplaza = require('./Meteoplaza');
const Sun = require('./Sun');

const RAIN_LIGHT = 0.2;
const RAIN_MODERATE = 1;
const RAIN_HEAVY = 2.5;
const MINUTE = 60000;
const FIVE_MINUTES = 300000;

/**
 * Main class
 */
class WeatherLogic extends EventEmitter {
	constructor(lat, lng) {
		super();

		this.sunTimer = null;
		this.rainTimer = null;
		this.lastRainPrediction = null;
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

	startMonitor() {
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
	updateSun(force) {
		force = force || false;

		// Calculate sun position
		this.emit('sun-position', this.Sun.getPosition());

		// Calculate events of the day
		var events = this.Sun.getEvents();
		if (force || !events.fromCache) {
			this.emit('sun-events', events.calculatedEvents);
		}
	}

	iso8601dateTime(dt) {
		var current_date = dt.getDate(),
			current_month = dt.getMonth() + 1,
			current_year = dt.getFullYear(),
			current_hrs = dt.getHours(),
			current_mins = dt.getMinutes(),
			current_secs = dt.getSeconds(),
			current_millis = dt.getMilliseconds(),
			current_datetime,
			timezone_offset_min = new Date().getTimezoneOffset(),
			offset_hrs = parseInt(Math.abs(timezone_offset_min / 60)),
			offset_min = Math.abs(timezone_offset_min % 60),
			timezone_standard;

		// Add 0 before date, month, hrs, mins or secs if they are less than 0
		current_date = current_date < 10 ? '0' + current_date : current_date;
		current_month = current_month < 10 ? '0' + current_month : current_month;
		current_hrs = current_hrs < 10 ? '0' + current_hrs : current_hrs;
		current_mins = current_mins < 10 ? '0' + current_mins : current_mins;
		current_secs = current_secs < 10 ? '0' + current_secs : current_secs;
		if (current_millis == 0)
			current_millis = '000';
		else if ((current_millis > 0) && (current_millis < 10))
			current_millis = '00' + current_millis;
		else
			current_millis = '0' + current_millis;

		offset_hrs = (offset_hrs < 10) ? '0' + offset_hrs : offset_hrs;
		offset_min = (offset_min < 10) ? '0' + offset_min : offset_min;

		// Add an opposite sign to the offset
		// If offset is 0, it means timezone is UTC
		if (timezone_offset_min < 0)
			timezone_standard = '+' + offset_hrs + ':' + offset_min;
		else if (timezone_offset_min > 0)
			timezone_standard = '-' + offset_hrs + ':' + offset_min;
		else if (timezone_offset_min == 0)
			timezone_standard = 'Z';

		// Current datetime (e.g. 2016-07-16T19:20:30)
		return current_year + '-' + current_month + '-' + current_date + 'T' + current_hrs + ':' + current_mins +  ':' + current_secs + '.' + current_millis + timezone_standard;
	}

	rainPredictionPayload(atTime, inMinutes, buienRadar, buienAlarm) {
		var isRaining = false;
		var probability = 100;

		if ((buienRadar >= RAIN_LIGHT) || (buienAlarm >= RAIN_LIGHT)) {
			isRaining = true;
			probability = (((buienRadar + buienAlarm) / 2) > RAIN_LIGHT) ? 100 : 50;
		} else {
			if ((buienRadar < RAIN_LIGHT) || (buienAlarm < RAIN_LIGHT)) {
				isRaining = false;
				probability = (((buienRadar + buienAlarm) / 2) < RAIN_LIGHT) ? 100 : 50;
			}
		}
		var prediction = (isRaining == true) ? 'raining' : 'dry';

		// debug
		var msg = (probability == 100) ? 'It ' : 'There is a ' + probability + '% chance that it ';
		msg+= ((inMinutes > 0) ? 'will be' : 'is') + ' ' + prediction;
		if (inMinutes > 0) {
			msg+= ' in ' + inMinutes + ' minutes from now, on ' + atTime.toLocaleDateString() + ' at ' + atTime.toLocaleTimeString();
		}
		msg+= '.';

		this.emit('rain-debug', msg);

		return {
				'atTimeIso8601': this.iso8601dateTime(atTime),
				'inMinutes': inMinutes,
				'prediction': prediction,
				'probability': probability,
				'precipitation': {
					'buienRadar': buienRadar,
					'buienAlarm': buienAlarm
				}
			};
	}

	/**
	 * Only emit a rain prediction update if something changes
	 */
	rainPredictionUpdate(rainPrediction) {
		var emitRainPrediction = (this.lastRainPrediction === null)
									? true
									: (
										(rainPrediction.prediction !== this.lastRainPrediction.prediction) ||
										(rainPrediction.inMinutes !== this.lastRainPrediction.inMinutes) ||
										(rainPrediction.probability !== this.lastRainPrediction.probability)
									);
		if (emitRainPrediction === true) {
			this.lastRainPrediction = rainPrediction;
			this.emit('rain-prediction', rainPrediction);
		}
	}

	/**
	 * Combines buienradar & buienalarm to give a better accuracy for rainfall
	 */
	async checkRain(after) {
		// Round to LAST 5 minutes of that block to compare to Buienradar more easily
		after = new Date(Math.floor((after || new Date()) / FIVE_MINUTES) * FIVE_MINUTES);

		// Loop over possibilities for rain starting or stopping in the next 120 minutes
		for (let i = 0; i < 23; i++) {
			// Calculate minutes
			let inMinutes = i * 5;
			var atTime = new Date(after.getTime() + (inMinutes * MINUTE));

			// Get forecasts for both providers
			try {
				var buienradarPrecipitation = await this.Buienradar.getForecast(atTime);
				var buienalarmPrecipitation = await this.Buienalarm.getForecast(atTime);

				// if it is currently not raining, and there is no 'rain start trigger' set to go off in the future
				if (this.rainStartTriggered === false) {
					// And it will be raining according to Buienradar OR Buienalarm
					if ((buienradarPrecipitation.mmh >= RAIN_LIGHT) || (buienalarmPrecipitation.mmh >= RAIN_LIGHT)) {
						// Then we make sure we notify
						this.rainPredictionUpdate(this.rainPredictionPayload(atTime, inMinutes.toString(), buienradarPrecipitation.mmh, buienalarmPrecipitation.mmh))
						this.rainStartTriggered = true;
						setTimeout(() => {
							this.rainStartTriggered = false;
						}, inMinutes * MINUTE);
					}
				}

				// if it is currently raining, and there is no 'rain stop trigger' set to go off in the future
				if (this.rainStopTriggered === false) {
					// And it will be dry according to both Buienradar AND Buienalarm
					if ((buienradarPrecipitation.mmh < RAIN_LIGHT) && (buienalarmPrecipitation.mmh < RAIN_LIGHT)) {
						// Then we make sure we notify
						this.rainPredictionUpdate(this.rainPredictionPayload(atTime, inMinutes.toString(), buienradarPrecipitation.mmh, buienalarmPrecipitation.mmh))
						this.rainStopTriggered = true;
						setTimeout(() => {
							this.rainStopTriggered = false;
						}, inMinutes * MINUTE);
					}
				}
			} catch(e) {

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