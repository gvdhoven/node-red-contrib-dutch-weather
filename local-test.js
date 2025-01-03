"use strict"

const Util = require("util")

// Variable to be used in the exitHandler
var Weather

/**
 * exit handler function
 */
function exitHandler(options, err) {
  if (options.cleanup) {
    // Perform cleanup tasks
  }

  if (err) {
    console.log(err.stack)
  }

  if (options.exit) {
    process.exit()
  }
}

// process handlers
process.on("exit", exitHandler.bind(null, { cleanup: true }))
process.on("SIGINT", exitHandler.bind(null, { exit: true }))
process.on("SIGUSR1", exitHandler.bind(null, { exit: true })) // catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR2", exitHandler.bind(null, { exit: true })) // catches "kill pid" (for example: nodemon restart)
process.on("uncaughtException", exitHandler.bind(null, { exit: true }))
process.on("unhandledRejection", (reason, p) => {
  console.log("Unhandled Rejection at: Promise", p)
  console.log("Reason:", reason)
})

// Start script
console.log("---------------------------------------------")
console.log(" node-red-contrib-dutch-weather local test")
console.log("---------------------------------------------")

// Check Node version
console.log("* verifying installed Node runtime ...")
if (Number(process.version.match(/^v(\d+\.\d+)/)[1]) < 6.0) {
  throw new Error(
    "This software only runs on node >= 6.0. Your current node version is " +
      process.versions.node +
      "."
  )
} else {
  console.log("  - OK: ", process.versions.node)
}

// Load modules
console.log("* loading modules ...")
const WeatherLogic = require("./lib/WeatherLogic")
console.log("  - OK")

// Start script
console.log("* Watchting the weather ...")
var Weather = new WeatherLogic(51.42408, 5.442794)

Weather.on("rain-state", function (prediction) {
  console.log("* Rain state update:")
  console.log("  - " + JSON.stringify(prediction, null, "\t"))
  setTimeout(function () {
    Weather.checkRain()
  }, 30000)
})

Weather.on("meteoplaza", function (meteoplaza) {
  console.log("* Meteoplaza update:")
  console.log("  - " + JSON.stringify(meteoplaza, null, "\t"))
  setTimeout(function () {
    Weather.updateMeteoplaza()
  }, 30000)
})

Weather.checkRain()
Weather.updateMeteoplaza()

setInterval(() => {}, 1 << 30)
