'use strict';

const Got = require('got');
const Moment = require('moment');
const GotCache = new Map();

module.exports = class Buienradar {

	constructor({ lat, lng } = {}) {
		this.lat = parseFloat(lat).toFixed(2);
		this.lng = parseFloat(lng).toFixed(2);
		this.forecast = { fetched: null, parsed: null };
	}

	async update() {
		// Check if we still have data
		var getNewForecast = false;
		var now = new Date();
		if (this.forecast.fetched == null) {
			getNewForecast = true;
		} else {
			// Data is only updated once every 5 minutes, doesn't make sense to retrieve it before it changes.
			var rounded = new Date(Math.ceil(this.forecast.fetched.getTime() / 300000) * 300000);
			getNewForecast = (now >= rounded);
		}

		if (!getNewForecast) {
			//Helper.Debug('getForecasts()::Used cached data');
			return this.forecast.parsed;
		}

		// Fetch new data
		var url = `https://gpsgadget.buienradar.nl/data/raintext?lat=${this.lat}&lon=${this.lng}`;
		//Helper.Debug('getForecasts()::Got new data - ' + url);
		let res = await Got(url, { cache: GotCache, maxTtl: 300000 });

		// Parse the forecasts
		let parsedForecasts = res.body.split('\n')
			.filter(item => {
				return typeof item === 'string' && item.length;
			})
			.map(item => {
				let [mmh, time] = item.trim().split('|');

				// calculate time including timezone
				let date = new Date(Moment(time, 'HH:mm') - (new Date()).getTimezoneOffset() * 60 * 1000);
				time = Moment(date).format('HH:mm');

				// calculate value in mm/h
				mmh = parseFloat(mmh);
				mmh = (mmh > 0) ? Math.pow(10, (mmh - 109) / 32) : 0;

				// Compile result
				return {
					time,
					date,
					mmh,
				}
			});

		// Update the cache
		this.forecast = {
			fetched: now,
			parsed: parsedForecasts
		}
		return this.forecast.parsed;
	}

	async getForecast({ after = new Date() } = {}) {
		try {
			const forecasts = await this.update();
			for (let i = 0; i < forecasts.length; i++) {
				let forecast = forecasts[i];
				if (forecast.date < after) continue;
				return forecast;
			}
		} catch (e) {
			throw e;
		}

		throw new Error('Unknown error while getting forecasts.');
	}
}