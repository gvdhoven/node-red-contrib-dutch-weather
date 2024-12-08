function checkInterval(iv, df) {
  if (Math.sign(iv) === NaN) {
    return df
  } else if (Math.sign(iv) === -1) {
    return -1
  }
  return parseInt(iv)
}

module.exports = function (RED) {
  "use strict"

  const WeatherLogic = require("./lib/WeatherLogic")

  /**
   * Configuration node which holds only latitude and longitude.
   */
  function dutchWeatherConf(n) {
    RED.nodes.createNode(this, n)

    // Properties
    this.lat = n.lat
    this.lng = n.lng

    // Methods
    var node = this

    // Create object
    this.weatherLogic = null
    this.weatherLogic = new WeatherLogic(this.lat, this.lng)
  }
  RED.nodes.registerType("dutch-weather-conf", dutchWeatherConf)

  /**
   * Rain events node
   */
  function dutchWeatherRainState(n) {
    RED.nodes.createNode(this, n)
    this.conf = RED.nodes.getNode(n.conf)

    if (!this.conf) {
      return null
    }

    var node = this
    this.conf.weatherLogic.on("rain-error", function (msg) {
      node.debug(msg)
    })

    this.conf.weatherLogic.on("rain-state", function (rainState) {
      node.send({ topic: "rain-state", payload: rainState })
    })

    node.on("input", function (msg) {
      if (msg && msg.hasOwnProperty("payload") && msg.payload.trigger == true) {
        node.conf.weatherLogic.checkRain()
      }
    })
  }
  RED.nodes.registerType("dutch-weather-rain-state", dutchWeatherRainState)

  /**
   * Meteo events node
   */
  function dutchWeatherMeteoplaza(n) {
    RED.nodes.createNode(this, n)
    this.conf = RED.nodes.getNode(n.conf)

    if (!this.conf) {
      return null
    }

    var node = this
    this.conf.weatherLogic.on("meteoplaza", function (meteoplaza) {
      node.send({ topic: "meteoplaza", payload: meteoplaza })
    })

    node.on("input", function (msg) {
      if (msg && msg.hasOwnProperty("payload") && msg.payload.trigger == true) {
        node.conf.weatherLogic.updateMeteoplaza(true)
      }
    })
  }
  RED.nodes.registerType("dutch-weather-meteoplaza", dutchWeatherMeteoplaza)
}
