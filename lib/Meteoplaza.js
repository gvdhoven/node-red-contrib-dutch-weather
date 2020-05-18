/*
https://api.meteoplaza.com/v2/meteo/completelocation/5144.548?lang=nl
*/
'use strict';

const Got = require('got');
const Moment = require('moment');
const GotCache = new Map();

module.exports = class Meteoplaza {

    constructor({ lat, lng } = {}) {
        this.lat = parseFloat(lat).toFixed(2) * 100;
        this.lng = parseFloat(lng).toFixed(2) * 100;
        this.forecast = { updated: null, parsed: null };
    }

    async update() {
        // Check if we still have data
        var getNewForecast = false;
        var now = new Date();
        if (this.forecast.updated == null) {
            getNewForecast = true;
        } else {
            // Data is only updated once every 10 minutes, doesn't make sense to retrieve it before it changes, so we take 245 seconds (4 minutes and 5 seconds)
            var rounded = new Date(Math.ceil(this.forecast.updated.getTime() / 604800) * 604800);
            getNewForecast = (now >= rounded);
        }

        if (!getNewForecast) {
            //Helper.Debug('getForecasts()::Used cached data');
            return this.forecast.parsed;
        }

        // Fetch new data
        var url = `https://api.meteoplaza.com/v2/meteo/completelocation/${this.lat}.${this.lng}?lang=nl`;
        let res = await Got(url, { cache: GotCache, maxTtl: 604800 });
        let json = JSON.parse(res.body);
        let today = now.getUTCFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2) + '-' + ('0' + now.getDate()).slice(-2);

        // Don't use cache if the first result is on the next day
        if (json.Hourly[0].ValidDt.substring(0, 10) !== today) {
            res.isFromCache = false;
        }

        // Parse if needed
        if (!res.isFromCache) {
            //Helper.Debug('getForecasts()::Got new data - ' + url);

            // In case we don't have any data or we changed days, we reset the data.
            if ((this.forecast.parsed === null)) {
                this.forecast.parsed = {
                    humidity: 0,
                    pressure: 0,
                    temp: {
                        min: 0,
                        max: 0,
                        perHour: new Map()
                    },
                    wind: {
                        direction: '',
                        speed: 0,
                        speedMs: 0,
                        speedKmh: 0
                    }
                };
            }

            // Update hourly temperatures in case something changes
            json.Hourly.forEach((hour) => {
                if (hour.ValidDt.substring(0, 10) === today) {
                    var key = hour.ValidDt.substring(11, 13);
                    this.forecast.parsed.temp.perHour.set(key, hour.TTTT);
                }
            });

            // Recalculate min/max temperatures
            this.forecast.parsed.temp.min = null;
            this.forecast.parsed.temp.max = null;
            this.forecast.parsed.temp.now = json.Hourly[0].TTTT;
            this.forecast.parsed.temp.perHour.forEach((temp) => {
                this.forecast.parsed.temp.min = (this.forecast.parsed.temp.min == null) ? temp : Math.min(this.forecast.parsed.temp.min, temp);
                this.forecast.parsed.temp.max = (this.forecast.parsed.temp.max == null) ? temp : Math.max(this.forecast.parsed.temp.max, temp);
            });
            
            // Get humidity and air pressure
            this.forecast.parsed.humidity = json.Hourly[0].RHRH;
            this.forecast.parsed.pressure = json.Hourly[0].PPPP;
            
            // Get wind information
            this.forecast.parsed.wind = {
                direction: json.Hourly[0].DDDD,
                speed: json.Hourly[0].FFFF,
                speedMs: json.Hourly[0].FFFF_MS,
                speedKmh: json.Hourly[0].FFFF_KMH
            }

            this.forecast.updated = Moment(res.headers.Date).toDate();
        }

        // Save & parse forcecast
        return this.forecast.parsed;
    }
}