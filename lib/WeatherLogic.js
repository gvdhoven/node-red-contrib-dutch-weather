'use strict';

/**
 * Module dependencies.
 */
const EventEmitter = require('events');
const isEqual = require('lodash.isequal');

const Buienalarm = require('./Buienalarm');
const Buienradar = require('./Buienradar');
const Meteoplaza = require('./Meteoplaza');

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

		this.rainTimer = null;
		this.rainState = null;
		this.meteoplaza = null;
		this.meteoplazaTimer = null;

		// Initialize providers
		this.Buienalarm = new Buienalarm(lat, lng);
		this.Buienradar = new Buienradar(lat, lng);
		this.Meteoplaza = new Meteoplaza(lat, lng);
	}

	/**
	 * Creates a valid date/time in iso8601 format.
	 *
	 * @param date/time input date/time to format
	 * @return string
	 */
	iso8601dateTime(dt) {
		let current_date = dt.getDate(),
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
		let factor = 0;
		let rainfall = 0;
		let state = 'dry';

		let isRainingBuienRadar = null;
		if (buienRadar !== -1) {
			factor+= 1;
			rainfall+= buienRadar;
			isRainingBuienRadar =(buienRadar >= RAIN_LIGHT);
		}

		let isRainingBuienAlarm = null;
		if (buienAlarm !== -1) {
			factor+= 1;
			rainfall+= buienAlarm;
			isRainingBuienAlarm =(buienAlarm >= RAIN_LIGHT);
		}

		rainfall = (rainfall / factor);
		if (rainfall >= RAIN_LIGHT) {
			state = 'light rain';
		}

		if (rainfall >= RAIN_MODERATE) {
			state = 'moderate rain';
		}

		if (rainfall >= RAIN_HEAVY) {
			state = 'heavy rain';
		}

		let probability = 0;
		if ((isRainingBuienRadar === null) || (isRainingBuienAlarm === null)) {
			probability = 100;
		} else if (!isRainingBuienRadar && !isRainingBuienAlarm) {
			probability = 100;
		} else if (isRainingBuienRadar && isRainingBuienAlarm) {
			probability = 100;
		} else {
			probability = 50;
		}

		// Create message
		let dt = this.iso8601dateTime(atTime);
		let msg = (probability == 100) ? '' : 'There is a ' + probability + '% chance that ';
		if (state === 'dry') {
			msg+= ((inMinutes > 0) ? 'it will be' : 'it is') + ' dry';
		} else {
			msg+= ((inMinutes > 0) ? 'there will be' : 'there is') + ' ' + state;
		}
		if (inMinutes > 0) {
			msg+= ' in ' + inMinutes + ' minutes from now, on ' + dt.substring(0, 10) + ' at ' + dt.substring(11, 19);
		}
		msg+= '.';

		return {
				'atTimeIso8601': this.iso8601dateTime(atTime),
				'inMinutes': inMinutes,
				'state': state,
				'probability': probability,
				'message': (msg.charAt(0).toUpperCase() + msg.slice(1).toLowerCase()),
				'precipitation': {
					'buienAlarm': buienAlarm,
					'buienRadar': buienRadar
				}
			};
	}

	/**
	 * Only emit a rain state update if something changes
	 *
	 * @param object State to send if it is different from last state change
	 */
	rainStateUpdate(rainState, force) {
		let emitRainState = force || (isEqual(this.rainState, rainState) ? false : true);
		if (emitRainState === true) {
			this.rainState = rainState;

			// Include Buienalarm and Buienradar parsed forecasts
			rainState["sources"] = { "buienalarm": { }, "buienradar": { } };
			if (this.Buienalarm.forecasts.hasOwnProperty('parsed')) {
				rainState["sources"]["buienalarm"] = this.Buienalarm.forecasts;
			}
			if (this.Buienradar.forecasts.hasOwnProperty('parsed')) {
				rainState["sources"]["buienradar"] = this.Buienradar.forecasts;
			}

			// Emit event
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
		let after = new Date(Math.floor(new Date() / FIVE_MINUTES) * FIVE_MINUTES);

		// Get rainstate object
		let tempState = { lastUpdate: after };

		// Loop over possibilities for rain starting or stopping in the next 120 minutes
		let stateAtTime;
		for (let i = 0; i < 23; i++) {
			// Calculate minutes
			let inMinutes = i * 5;
			var atTime = new Date(after.getTime() + (inMinutes * MINUTE));

			// Get forecasts for both providers
			let buienradarPrecipitation = -1;
			try {
				buienradarPrecipitation = await this.Buienradar.getForecast(atTime);
				buienradarPrecipitation = buienradarPrecipitation.mmh;
			} catch(e) {
				// In case this fails, we log it and use '-1' as value
				this.emit('rain-error', 'Failed getting prediction for Buienradar for time ' + atTime.toISOString() + ': ' + JSON.stringify(e));
				buienradarPrecipitation = -1;
			}

			let buienalarmPrecipitation = -1;
			try {
				buienalarmPrecipitation = await this.Buienalarm.getForecast(atTime);
				buienalarmPrecipitation = buienalarmPrecipitation.mmh;
			} catch(e) {
				// In case this fails, we log it and use '-1' as value
				this.emit('rain-error', 'Failed getting prediction for Buienalarm for time ' + atTime.toISOString() + ': ' + JSON.stringify(e));
				buienalarmPrecipitation = -1;
			}

			// In case we don't have a valid result at all, don't compare values
			if ((buienradarPrecipitation === -1) && (buienalarmPrecipitation === -1)) {
				continue;
			}

			// First loop we set the 'current' state
			stateAtTime = this.rainStatePayload(atTime, inMinutes, buienradarPrecipitation, buienalarmPrecipitation);
			if (!tempState.hasOwnProperty('now')) {
				tempState.now = stateAtTime;
			}

			// Subsequent checks we set the prediction if the state changes
			if (!tempState.hasOwnProperty('prediction') && (tempState.now.state !== stateAtTime.state)) {
			 	tempState.prediction = stateAtTime;
			 	break;
			}
		}

		// Only emit in case we have data
		if (tempState.hasOwnProperty('now')) {
			// If we still don't have a 'prediction' then that means that, according to our data, nothing will change.
			if (!tempState.hasOwnProperty('prediction')) {
				tempState.prediction = stateAtTime;
			}

			// Fix the prediction message
			let dt = this.iso8601dateTime(atTime);
			let msg = (tempState.prediction.probability == 100) ? '' : 'There is a ' + tempState.prediction.probability + '% chance that ';
			if (tempState.prediction.state === 'dry') {
				msg+= ((tempState.prediction.inMinutes > 0) ? 'it will be' : 'it is') + ' dry';
			} else {
				msg+= ((tempState.prediction.inMinutes > 0) ? 'there will be' : 'there is') + ' ' + tempState.prediction.state;
			}

			if (tempState.prediction.inMinutes > 0) {
				msg+= (tempState.now.state === tempState.prediction.state) ? ' for at least ' : ' in ';
				msg+= tempState.prediction.inMinutes + ' minutes from now, ';
				msg+= ((tempState.now.state === tempState.prediction.state) ? 'untill' : 'at') + ' ';
				msg+= dt.substring(0, 10) + ' at ' + dt.substring(11, 19);
			}
			msg+= '.';
			tempState.prediction.message = msg;

			// Send updates
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
		let oldMeteoplaza = (this.meteoplaza !== null) ? this.meteoplaza : null;
		let newMeteoplaza = await this.Meteoplaza.update();

		// In case we don't have an update and we don't have old data, we cannot emit anything (yet).
		if ((newMeteoplaza === null) && (oldMeteoplaza === null)) {
			return;
		}

		// Otherwise check if we haven an update
		let haveUpdate = false;
		if (newMeteoplaza !== null) {
			haveUpdate = ((oldMeteoplaza === null) || ((oldMeteoplaza !== null) && (newMeteoplaza.lastFetched > oldMeteoplaza.lastFetched)));
			this.meteoplaza = newMeteoplaza;
		}

		// ... or in case we have to force emit it, then do so.
		if (force || haveUpdate) {
			this.emit('meteoplaza', this.meteoplaza);
		}
	}
}

module.exports = WeatherLogic;
