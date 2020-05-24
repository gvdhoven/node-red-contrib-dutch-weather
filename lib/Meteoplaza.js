/*
https://api.meteoplaza.com/v2/meteo/completelocation/5144.548?lang=nl
*/
'use strict';

const Got = require('got');
const Moment = require('moment');

module.exports = class Meteoplaza {

	constructor(lat, lng) {
		this.lat = parseFloat(lat).toFixed(2) * 100;
		this.lng = parseFloat(lng).toFixed(2) * 100;
		this.forecast = { updated: null, parsed: null };
	}

	getHourlyData(json) {
		return {
			"icon": json.WXCO_EXTENDED,
			"temp": json.TTTT,
			"tempFeelsLike": json.FEELS_LIKE,
			"sunProbability": parseFloat(json.SSSP),
			"precipitation": json.RRRR * ((json.TTTT < 0) ? 10 : 1),
			"pressure": json.PPPP,
			"humidity": json.RHRH,
			"cloudCoverage": parseFloat(json.NNNN),
			"wind": {
				"direction": json.DDDD,
				"speed": json.FFFF,
				"speedMs": json.FFFF_MS,
				"speedKmh": json.FFFF_KMH
			}
		};
	}

	async update() {
		// Check if we still have data
		var now = new Date();
		var getNewForecast = true;

		// Data is only updated once every 10 minutes, doesn't make sense to retrieve it before it changes, so we take 245 seconds (4 minutes and 5 seconds)
		if (this.forecast.updated != null) {
			var rounded = new Date(Math.ceil(this.forecast.updated.getTime() / 604800) * 604800);
			getNewForecast = (now >= rounded);
		}

		if (this.forecast.parsed == null) {
			getNewForecast = true;
		}

		if (!getNewForecast) {
			//Helper.Debug('getForecasts()::Used cached data');
			return this.forecast.parsed;
		}

		// Fetch new data
		var url = `https://api.meteoplaza.com/v2/meteo/completelocation/${this.lat}.${this.lng}?lang=nl`;
		let res = await Got(url);
		let json = JSON.parse(res.body);
		let today = now.getUTCFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);

		// Don't use cache if the first result is on the next day
		if ((this.forecast.parsed == null) ||
			(json.Hourly[0].ValidDt.substring(0, 10) !== today)) {
			res.isFromCache = false;
		}

		// Parse if needed
		var newData = this.forecast.parsed;
		if (newData == null) {
			newData = {
				"now": {
					"temp": null,
					"tempFeelsLike": null,
					"pressure": null,
					"humidity": null,
					"wind": {
						"direction": '',
						"speed": null,
						"speedMs": null,
						"speedKmh": null
					}
				},
				"today": {
					"tempMin": null,
					"tempMax": null,
					"astro": {
						"currentTime": null,
						"sunRise": null,
						"sunSet": null,
						"dayLength": null,
						"dayLengthDiff": null,
						"moonPhase":{
							 "newMoon": null,
							 "fullMoon": null,
							 "firstQuarter": null,
							 "lastQuarter": null
						}
					},
					"dataPerHour": new Map()
				}
			};
		}

		// Astro events
		newData.today.astro ={
			"currentTime": json.Astro.CurrentTime_ISO,
			"sunRise": json.Astro.SunRise_ISO,
			"sunSet": json.Astro.SunSet_ISO,
			"dayLengthHrs": json.Astro.DayLength,
			"moonPhase":{
				"newMoon": json.Astro.MoonPhase.NM,
				"fullMoon": json.Astro.MoonPhase.VM,
				"firstQuarter": json.Astro.MoonPhase.EK,
				"lastQuarter": json.Astro.MoonPhase.LK
			}
		};

		// Update hourly temperatures in case something changes
		json.Hourly.forEach((hour) => {
			if (hour.ValidDt.substring(0, 10) == today) {
				var key = hour.ValidDt.substring(11, 13);
				newData.today.dataPerHour[key] = this.getHourlyData(hour);

				// Calculate min/max temps
				newData.today.tempMin = (newData.today.tempMin == null) ? newData.today.dataPerHour[key].temp : Math.min(newData.today.tempMin, newData.today.dataPerHour[key].temp);
				newData.today.tempMax = (newData.today.tempMax == null) ? newData.today.dataPerHour[key].temp : Math.max(newData.today.tempMax, newData.today.dataPerHour[key].temp);
			}
		});

		// Get current data
		var currentHr = json.Astro.CurrentTime.substr(0,2);
		newData.now = newData.today.dataPerHour[currentHr];

		// Set new data
		this.forecast.parsed = newData;
		this.forecast.updated = Moment(res.headers.Date).toDate();

		// Save & parse forcecast
		return this.forecast.parsed;
	}
}