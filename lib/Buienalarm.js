'use strict';

const FetchWithRetry = require('./_fetch-retry.js');
const Moment = require('moment');

const MAX_AGE = 245;

module.exports = class Buienalarm {

	constructor(lat, lng) {
		this.lat = parseFloat(lat);
		this.lng = parseFloat(lng);
		this.forecasts = { lastFetched: null, parsed: null };
	}

	async update() {
		// Check if we still have data
		let now = new Date();
		let getNewForecast = true;

		// Data is only updated once every 4 minutes, doesn't make sense to retrieve it before it changes, so we take 245 seconds (4 minutes and 5 seconds)
		if (this.forecasts.lastFetched != null) {
			getNewForecast = (((now.getTime() - this.forecasts.lastFetched.getTime()) / 1000) >= MAX_AGE);
		}

		if (this.forecasts.parsed == null) {
			getNewForecast = true;
		}

		//Helper.Debug('getForecasts()::Used cached data');
		if (!getNewForecast) {
			return this.forecasts;
		}

		let ageInSeconds = MAX_AGE;
		let json = {};
		let retry = 0;
		while (true) {
			try {
				// Fetch new data
				let url = `https://cdn-secure.buienalarm.nl/api/3.4/forecast.php?lat=${this.lat}&lon=${this.lng}&region=nl&unit=mm/u&rnd=${(new Date()).getTime()}`;
				let response = await FetchWithRetry(url);
				json = await response.json();

				// In case we have a valid result from Buienalarm
				let ageHeader = response.headers.get('age');
				if ((json != null) && (json.hasOwnProperty('precip')  && (ageHeader !== null))) {
					ageInSeconds = parseInt(ageHeader);
					break;
				}
			} catch (e) {
				// Eat errors
			}

			// Delay for a second and try again
			await new Promise(resolve => setTimeout(resolve, 1000));
			retry++;
			if (retry >= 3) {
				return null;
			}
		}

		// Parse the forecasts
		let startTime = new Date(Moment(json.start_human, 'HH:mm'));
		let parsedForecasts = json.precip
						  		.map((mmh, idx) => {
									// calculate time including timezone
									let date = startTime.getTime() + (idx * 300000);
									date = new Date(date);
									let time = Moment(date).format('HH:mm');

									// Compile result
									return (date < now) ? null : {
										"date": date,
										"time": time,
										"mmh": mmh
									}
								});

		// Update the cache
		this.forecasts = {
			lastFetched: (new Date(now - (ageInSeconds * 1000))),
			parsed: parsedForecasts.filter((el) => { return (el != null); })
		}
		return this.forecasts;
	}

	async getForecast(after) {
		after = after || new Date();
		let forecasts = await this.update();
		if ((forecasts === null) || (!forecasts.hasOwnProperty('parsed'))) {
			return null;
		}
		for (let i = 0; i < forecasts.parsed.length; i++) {
			let forecast = forecasts.parsed[i];
			if (forecast.date < after)
				continue;
			return forecast;
		}
		return null;
	}
}