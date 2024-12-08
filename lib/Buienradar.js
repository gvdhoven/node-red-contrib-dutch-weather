"use strict"

const FetchWithRetry = require("./_fetch-retry.js")
const Moment = require("moment")

module.exports = class Buienradar {
  constructor(lat, lng) {
    this.lat = parseFloat(lat).toFixed(2)
    this.lng = parseFloat(lng).toFixed(2)
    this.forecasts = { lastFetched: null, parsed: null }
  }

  async update() {
    // Check if we still have data
    let now = new Date()
    let getNewForecast = true

    // Data is only updated once every 5 minutes, doesn't make sense to retrieve it before it changes.
    if (this.forecasts.lastFetched != null) {
      getNewForecast =
        (now.getTime() - this.forecasts.lastFetched.getTime()) / 1000 >= 300
    }

    if (this.forecasts.parsed == null) {
      getNewForecast = true
    }

    //Helper.Debug('getForecasts()::Used cached data');
    if (!getNewForecast) {
      return this.forecasts
    }

    let body = ""
    let retry = 0
    while (true) {
      try {
        // Fetch new data
        let url = `https://gpsgadget.buienradar.nl/data/raintext?lat=${
          this.lat
        }&lon=${this.lng}&rnd=${new Date().getTime()}`
        let response = await FetchWithRetry(url)
        body = await response.text()
        break
      } catch (e) {
        // Eat errors
      }

      // Delay for a second and try again
      await new Promise((resolve) => setTimeout(resolve, 1000))
      retry++
      if (retry >= 3) {
        return null
      }
    }

    // Parse the forecasts
    let parsedForecasts = body
      .split("\n")
      .filter((item) => {
        return typeof item === "string" && item.length
      })
      .map((item) => {
        let [val, time] = item.trim().split("|")

        // calculate time including timezone
        let date = new Date(Moment(time, "HH:mm"))

        // calculate value in mm/h
        val = parseInt(val)
        let mmh = val > 0 ? Math.pow(10, (val - 109) / 32) : 0

        // Compile result
        return date < now
          ? null
          : {
              date: date,
              time: time,
              mmh: mmh,
              val: val,
            }
      })

    // Update the cache
    this.forecasts = {
      lastFetched: now,
      parsed: parsedForecasts.filter((el) => {
        return el != null
      }),
    }
    return this.forecasts
  }

  async getForecast(after) {
    after = after || new Date()
    let forecasts = await this.update()
    if (forecasts === null || !forecasts.hasOwnProperty("parsed")) {
      return null
    }
    for (let i = 0; i < forecasts.parsed.length; i++) {
      let forecast = forecasts.parsed[i]
      if (forecast.date < after) continue
      return forecast
    }
    return null
  }
}
