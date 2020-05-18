'use strict';

const Got = require('got');
const Moment = require('moment');
const GotCache = new Map();

module.exports = class Buienalarm {

	constructor({ lat, lng } = {}) {
		this.lat = parseFloat(lat).toFixed(2);
		this.lng = parseFloat(lng).toFixed(2);
		this.forecast = { updated: null, parsed: null };
	}

	async update() {
		// Check if we still have data
		var getNewForecast = false;
		var now = new Date();
		if (this.forecast.updated == null) {
			getNewForecast = true;
		} else {
			// Data is only updated once every 4 minutes, doesn't make sense to retrieve it before it changes, so we take 245 seconds (4 minutes and 5 seconds)
			var rounded = new Date(Math.ceil(this.forecast.updated.getTime() / 245000) * 245000);
			getNewForecast = (now >= rounded);
		}

		if (!getNewForecast) {
			//Helper.Debug('getForecasts()::Used cached data');
			return this.forecast.parsed;
		}

		// Fetch new data
		var url = `https://cdn-secure.buienalarm.nl/api/3.4/forecast.php?lat=${this.lat}&lon=${this.lng}&region=nl&unit=mm/u`;
		let res = await Got(url, { cache: GotCache, maxTtl: 240000 });

		// Parse if needed
		if (!res.isFromCache) {
			//Helper.Debug('getForecasts()::Got new data - ' + url);

			// Parse the forecasts
			let json = JSON.parse(res.body);
			let startTime = (json.start * 1000) - (new Date()).getTimezoneOffset() * 60 * 1000;
			let parsedForecasts = json.precip.map((mmh, idx) => {
				// calculate time including timezone
				var date = new Date(startTime + (idx * 300000));
				var time = Moment(date).format('HH:mm');

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
				updated: (new Date(now - (res.headers.age * 1000))),
				parsed: parsedForecasts
			}
		} else {
			//Helper.Debug('getForecasts()::Used cached data');
		}

		// Save & parse forcecast
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