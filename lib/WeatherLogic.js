'use strict';

/**
 * Module dependencies.
 */
const EventEmitter = require('events');
const isEqual = require('lodash.isequal');

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

		this.sunPositionTimer = null;
		this.rainTimer = null;
		this.rainState = null;
		this.meteoplaza = null;
		this.meteoplazaTimer = null;

		// Initialize providers
		this.Sun = new Sun(lat, lng);
		this.Buienalarm = new Buienalarm(lat, lng);
		this.Buienradar = new Buienradar(lat, lng);
		this.Meteoplaza = new Meteoplaza(lat, lng);
	}

	startMonitor(spti, rti, mpti) {
		// Clear timers
		clearInterval(this.sunPositionTimer);
		clearInterval(this.rainTimer);
		clearInterval(this.meteoplazaTimer);

		// Update sun position
		if (spti >= 1) {
			this.sunPositionTimer = setInterval(this.updateSunPosition.bind(this), spti * MINUTE);
		}

		// Update rain statistics
		if (rti >= 1) {
			this.rainTimer = setInterval(this.checkRain.bind(this), rti * MINUTE);
		}

		// Update Meteoplaza statistics
		if (mpti >= 1) {
			this.meteoplazaTimer = setInterval(this.updateMeteoplaza.bind(this), mpti * MINUTE);
		}
	}

	/**
	 * Emits the new solar position
	 */
	updateSunPosition() {
		this.emit('sun-position', this.Sun.getPosition());
	}

	/**
	 * Emits the solar events.
	 */
	updateSolarEvents() {
		// Calculate events of the day
		var events = this.Sun.getEvents();
		this.emit('solar-events', events.calculatedEvents);

		// Next update 1 hour after midnight
		var now = new Date();
		var tommorow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 1);
		setTimeout(this.updateSolarEvents.bind(this), (tommorow - now));
	}

	/**
	 * Creates a valid date/time in iso8601 format.
	 *
	 * @param date/time input date/time to format
	 * @return string
	 */
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

	/**
	 * Creates a rainstate object
	 *
	 * @param date/time
	 * @param number Minutes from atTime
	 * @param object Precipitation according to Buienradar
	 * @param object Precipitation according to Buienalarm
	 * @return object Combined object to return
	 */
	rainStatePayload(atTime, inMinutes, buienRadar, buienAlarm) {
		var isRaining, probability, state;

		if ((buienRadar >= RAIN_LIGHT) || (buienAlarm >= RAIN_LIGHT)) {
			isRaining = true;
			probability = (((buienRadar + buienAlarm) / 2) > RAIN_LIGHT) ? 100 : 50;
		} else {
			if ((buienRadar < RAIN_LIGHT) || (buienAlarm < RAIN_LIGHT)) {
				isRaining = false;
				probability = (((buienRadar + buienAlarm) / 2) < RAIN_LIGHT) ? 100 : 50;
			}
		}
		state = (isRaining == true) ? 'raining' : 'dry';

		// debug
		var dt = this.iso8601dateTime(atTime);
		var msg = (probability == 100) ? 'It ' : 'There is a ' + probability + '% chance that it ';
		msg+= ((inMinutes > 0) ? 'will be' : 'is') + ' ' + state;
		if (inMinutes > 0) {
			msg+= ' in ' + inMinutes + ' minutes from now, on ' + dt.substring(0, 10) + ' at ' + dt.substring(11, 19);
		}
		msg+= '.';

		return {
				'atTimeIso8601': this.iso8601dateTime(atTime),
				'inMinutes': inMinutes,
				'state': state,
				'probability': probability,
				'precipitation': {
					'buienRadar': buienRadar,
					'buienAlarm': buienAlarm
				},
				'message': msg
			};
	}

	/**
	 * Only emit a rain state update if something changes
	 *
	 * @param object State to send if it is different from last state change
	 */
	rainStateUpdate(rainState) {
		var emitRainState = (isEqual(this.rainState, rainState) ? false : true);
		if (emitRainState === true) {
			this.rainState = rainState;
			this.emit('rain-state', rainState);
		}
	}

	/**
	 * Combines buienradar & buienalarm to give a better accuracy for rainfall
	 *
	 * @param date/time For when to check?
	 */
	async checkRain(force) {
		// Round to LAST 5 minutes of that block to compare to Buienradar more easily
		var after = new Date(Math.floor(new Date() / FIVE_MINUTES) * FIVE_MINUTES);

		// Get rainstate object
		var tempState = { };

		// Loop over possibilities for rain starting or stopping in the next 120 minutes
		for (let i = 0; i < 23; i++) {
			// Calculate minutes
			let inMinutes = i * 5;
			var atTime = new Date(after.getTime() + (inMinutes * MINUTE));

			// Get forecasts for both providers
			try {
				var buienalarmPrecipitation = await this.Buienalarm.getForecast(atTime);
				var buienradarPrecipitation = await this.Buienradar.getForecast(atTime);
				if ((buienradarPrecipitation != null) && (buienalarmPrecipitation != null)) {
					var stateAtTime = this.rainStatePayload(atTime, inMinutes, buienradarPrecipitation.mmh, buienalarmPrecipitation.mmh);
					
					if (!tempState.hasOwnProperty('now')) {
						tempState.now = stateAtTime;
					} else {
						if (!tempState.hasOwnProperty('prediction') && (tempState.now.state !== stateAtTime.state) && (stateAtTime.probability == 100)) {
						 	tempState.prediction = stateAtTime;
						 	break;
						}
					}
				}
			} catch(e) {
				console.log(e);
			}
		}

		// Only emit in case we have data
		if (tempState.hasOwnProperty('now')) {
			this.rainStateUpdate(tempState, force || false);
		}
	}

	/**
	 * Retreives new information from Meteoplaza
	 *
	 * @param boolean Force update?
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
