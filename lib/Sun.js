'use strict';

/**
 * Module dependencies.
 */
const SunCalc = require('suncalc2');

/**
 * Main class
 */
module.exports = class Sun {
	/**
	 * Constructor
	 * 
	 * @param {object} latitude_longitude 
	 */
	constructor(lat, lng) {
		this.lat = parseFloat(lat).toFixed(8);
		this.lng = parseFloat(lng).toFixed(8);
		this.calculatedEvents = null;
		this.calculatedEventsFor = null;
	}

	/**
	 * Calculates the sun position (azimuth & elevation) based on the following Github page <https://github.com/KiboOst/php-sunPos>
	 * 
	 * References:
	 * - Michalsky, J.J. 1988. The Astronomical Almanac's algorithm for approximate solar position (1950-2050). Solar Energy. 40(3):227-235.
	 * - Michalsky, J.J. 1989. Errata. Solar Energy. 43(5):323.
	 * - Spencer, J.W. 1989. Comments on "The Astronomical Almanac's Algorithm for Approximate Solar Position (1950-2050)". Solar Energy. 42(4):353.
	 * - Walraven, R. 1978. Calculating the position of the sun. Solar Energy. 20:393-397.
	 * 
	 * Accurate for my location and verified with: https://www.timeanddate.com/sun/netherlands/eindhoven (gives thesame results)
	 *
	 * @param {int} time 
	 * @return {object} azimuth & elevation of the sun
	 */
	getPosition(dateTime = new Date()) {
		// Correct for timezone difference
		dateTime.setTime(dateTime.getTime() + (dateTime.getTimezoneOffset() * 60000));

		let deg2rad = Math.PI / 180;

		// Get Julian date for date at noon
		let gregorianDate = new Date(Date.UTC(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate(), 12, 0, 0));
		let julianDate = gregorianDate.valueOf() / 86400000 + 2440587.5;

		// Correct for half-day offset
		let dayfrac = dateTime.getHours() / 24 - .5;

		// Now set the fraction of a day
		let frac = dayfrac + dateTime.getMinutes() / 60 / 24;
		julianDate += frac;

		// The input to the Atronomer's almanach is the difference between
		// the Julian date and JD 2451545.0 (noon, 1 January 2000)
		let time = (julianDate - 2451545);

		// Ecliptic coordinates
		// Mean longitude
		let mnlong = (280.460 + 0.9856474 * time);
		mnlong = mnlong % 360;
		if (mnlong < 0)
			mnlong = (mnlong + 360);

		// Mean anomaly
		let mnanom = (357.528 + 0.9856003 * time);
		mnanom = mnanom % 360;
		if (mnanom < 0)
			mnanom = (mnanom + 360);
		mnanom *= deg2rad;

		// Ecliptic longitude and obliquity of ecliptic
		let eclong = (mnlong + 1.915 * Math.sin(mnanom) + 0.020 * Math.sin(2 * mnanom));
		eclong = eclong % 360;
		if (eclong < 0)
			eclong = (eclong + 360);
		eclong *= deg2rad;

		let oblqec = (23.439 - 0.0000004 * time);
		oblqec *= deg2rad;

		// Celestial coordinates
		// Right ascension and declination
		let num = (Math.cos(oblqec) * Math.sin(eclong));
		let den = (Math.cos(eclong));
		let ra = (Math.atan(num / den));
		if (den < 0)
			ra = (ra + Math.PI);
		if (den >= 0 && num < 0)
			ra = (ra + 2 * Math.PI);
		let dec = (Math.asin(Math.sin(oblqec) * Math.sin(eclong)));

		// Local coordinates
		// Greenwich mean sidereal time
		let h = dateTime.getHours() + (dateTime.getMinutes() / 60) + (dateTime.getSeconds() / 3600);
		let gmst = (6.697375 + .0657098242 * time + h);
		gmst = gmst % 24;
		if (gmst < 0)
			gmst = (gmst + 24);

		// Local mean sidereal time
		let lmst = gmst + (this.lng / 15);
		lmst = lmst % 24;
		if (lmst < 0)
			lmst += 24;
		lmst = deg2rad * (lmst * 15);

		// Hour angle
		let ha = (lmst - ra);
		if (ha < Math.PI)
			ha += (2 * Math.PI);
		if (ha > Math.PI)
			ha -= (2 * Math.PI);

		// Latitude to radians
		let lat = deg2rad * this.lat;

		// Azimuth and elevation
		let el = (Math.asin(Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha)));
		let az = (Math.asin(-Math.cos(dec) * Math.sin(ha) / Math.cos(el)));

		// For logic and names, see Spencer, J.W. 1989. Solar Energy. 42(4):353
		if ((Math.sin(dec) - Math.sin(el) * Math.sin(lat)) > 0) {
			if (Math.sin(az) < 0)
				az += 2 * Math.PI;
		} else {
			az -= Math.PI;
		}

		// Convert to degrees
		az = (az / Math.PI * 180);
		if (az < 0)
			az *= -1;
		el = el / Math.PI * 180;
		return { azimuth: az.toFixed(2), elevation: el.toFixed(2), date: dateTime };
	}

	/**
	 * Adds the timezone offset to the date/time provided
	 * 
	 * @param {object} dateTime 
	 */
	addTzOffset(dateTime = new Date()) {
		return new Date(dateTime.getTime() - (dateTime.getTimezoneOffset() * 60000));
	}

	/**
	 * Calculates certain information about the events of the day
	 * @param {object} dateTime 
	 */
	getEvents(dateTime = new Date()) {
		let newDate = dateTime.getUTCFullYear() + '-' + ('0' + (dateTime.getMonth() + 1)).slice(-2) + '-' + ('0' + dateTime.getDate()).slice(-2);
		let useCache = ((this.calculatedEvents !== null) && (this.calculatedEventsFor === newDate));
		if (!useCache) {
			var events = SunCalc.getTimes(dateTime, this.lat, this.lng);
			this.calculatedEvents = {
				sunrise: this.addTzOffset(events.sunrise),
				solarNoon: this.addTzOffset(events.solarNoon),
				sunset: this.addTzOffset(events.sunset),
				goldenHourEnd: this.addTzOffset(events.goldenHourEnd),
				goldenHourStart: this.addTzOffset(events.goldenHour)
			};
			this.calculatedEventsFor = newDate;
		}
		return { calculatedEvents: this.calculatedEvents, fromCache: useCache, calculatedFor: this.calculatedEventsFor };
	}
}