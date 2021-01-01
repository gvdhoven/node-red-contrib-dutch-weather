'use strict';

const Fetch = require('node-fetch');
const Moment = require('moment');

module.exports = class Buienradar {

	constructor(lat, lng) {
		this.lat = parseFloat(lat).toFixed(2);
		this.lng = parseFloat(lng).toFixed(2);
		this.forecasts = { fetched: null, parsed: null };
	}

	async update() {
		// Check if we still have data
		var now = new Date();
		var getNewForecast = true;

		// Data is only updated once every 5 minutes, doesn't make sense to retrieve it before it changes.
		if (this.forecasts.fetched != null) {
			getNewForecast = (((now.getTime() - this.forecasts.fetched.getTime()) / 1000) >= 300);
		}

		if (this.forecasts.parsed == null) {
			getNewForecast = true;
		}

		//Helper.Debug('getForecasts()::Used cached data');
		if (!getNewForecast) {
			return this.forecasts.parsed;
		}

		try {
			// Fetch new data
			var url = `https://gpsgadget.buienradar.nl/data/raintext?lat=${this.lat}&lon=${this.lng}`;
			//Helper.Debug('getForecasts()::Got new data - ' + url);
			const response = await Fetch(url);
			const body = await response.text();

			// Parse the forecasts
			let parsedForecasts = body.split('\n')
				.filter(item => {
					return typeof item === 'string' && item.length;
				})
				.map(item => {
					let [mmh, time] = item.trim().split('|');

					// calculate time including timezone
					let date = new Date(Moment(time, 'HH:mm'));

					// calculate value in mm/h
					mmh = parseFloat(mmh);
					mmh = ((mmh > 0) ? Math.pow(10, (mmh - 109) / 32) : 0);

					// Compile result
					return {
						"date": date,
						"time": time,
						"mmh": mmh
					}
				});

			// Update the cache
			this.forecasts = {
				fetched: now,
				parsed: parsedForecasts
			}
		} catch(e) {
			console.log(e);
		}
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