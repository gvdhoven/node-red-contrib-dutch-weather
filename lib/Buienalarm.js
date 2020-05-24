'use strict';

const Got = require('got');
const Moment = require('moment');

module.exports = class Buienalarm {

	constructor(lat, lng) {
		this.lat = parseFloat(lat);
		this.lng = parseFloat(lng);
		this.forecasts = { updated: null, parsed: null };
	}

	async update() {
		// Check if we still have data
		var now = new Date();
		var getNewForecast = true;

		// Data is only updated once every 4 minutes, doesn't make sense to retrieve it before it changes, so we take 245 seconds (4 minutes and 5 seconds)
		if (this.forecasts.updated != null) {
			var rounded = new Date(Math.ceil(this.forecasts.updated.getTime() / 245000) * 245000);
			getNewForecast = (now >= rounded);
		}

		if (this.forecasts.parsed == null) {
			getNewForecast = true;
		}

		//Helper.Debug('getForecasts()::Used cached data');
		if (!getNewForecast) {
			return this.forecasts.parsed;
		}

		// Fetch new data
		var url = `https://cdn-secure.buienalarm.nl/api/3.4/forecast.php?lat=${this.lat}&lon=${this.lng}&region=nl&unit=mm/u`;
		let res = await Got(url);

		// Parse if needed
		//Helper.Debug('getForecasts()::Got new data - ' + url);

		// Parse the forecasts
		let json = JSON.parse(res.body);
		let startTime = new Date(Moment(json.start_human, 'HH:mm'));
		let parsedForecasts = json.precip.map((mmh, idx) => {
			// calculate time including timezone
			let date = startTime.getTime() + (idx * 300000);
			date = new Date(date);
			let time = Moment(date).format('HH:mm');

			// Compile result
			return {
				"date": date,
				"time": time,
				"mmh": mmh
			}
		});

		// Update the cache
		this.forecasts = {
			updated: (new Date(now - (res.headers.age * 1000))),
			parsed: parsedForecasts
		}

		// Save & parse forcecast
		return this.forecasts.parsed;
	}

	async getForecast(after) {
		after = after || new Date();
		const forecasts = await this.update();
		for (let i = 0; i < forecasts.length; i++) {
			let forecast = forecasts[i];
			if (forecast.date < after)
				continue;
			return forecast;
		}
		return null;
	}
}