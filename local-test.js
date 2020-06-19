'use strict';

const Util = require('util');

// Variable to be used in the exitHandler
var Weather;

/**
 * exit handler function
 */
function exitHandler(options, err) {
	if (options.cleanup) {
		// Perform cleanup tasks
	}

	if (err) {
		console.log(err.stack);
	}

	if (options.exit) {
		process.exit();
	}
}

// process handlers
process.on('exit', exitHandler.bind(null, { cleanup: true }));
process.on('SIGINT', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR1', exitHandler.bind(null, { exit: true })); // catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR2', exitHandler.bind(null, { exit: true })); // catches "kill pid" (for example: nodemon restart)
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at: Promise', p);
	console.log('Reason:', reason);
});

// Start script
console.log('---------------------------------------------');
console.log(' node-red-contrib-dutch-weather local test');
console.log('---------------------------------------------');

// Check Node version
console.log('* verifying installed Node runtime ...');
if (Number(process.version.match(/^v(\d+\.\d+)/)[1]) < 6.0) {
	throw new Error('This software only runs on node >= 6.0. Your current node version is ' + process.versions.node + '.');
} else {
	console.log('  - OK: ', process.versions.node);
}

// Load modules
console.log('* loading modules ...');
const WeatherLogic = require('./lib/WeatherLogic');
console.log('  - OK');

// Start script
console.log('* Watchting the weather ...');
var Weather = new WeatherLogic(51.42408, 5.442794);

Weather.on('sun-position', function (position) {
	console.log('* Sun position update:');
	console.log('  - ' + Util.inspect(position));
});

Weather.on('solar-events', function (events) {
	console.log('* Solar events update:');
	console.log('  - ' + Util.inspect(events));
});

Weather.on('rain-state', function (prediction) {
	console.log('* Rain state update:');
	console.log('  - ' + Util.inspect(prediction));
});

Weather.on('meteoplaza', function (meteoplaza) {
	console.log('* Meteoplaza update:');
	console.log('  - ' + Util.inspect(meteoplaza));
});

Weather.startMonitor();
setTimeout(function() { Weather.checkRain(); }, 1000);
setTimeout(function() { Weather.updateSunPosition(); }, 1000);
setTimeout(function() { Weather.updateSolarEvents(); }, 1000);
setTimeout(function() { Weather.updateMeteoplaza(); }, 1000);
