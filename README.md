# node-red-contrib-dutch-weather
================================
Combination of a solar position calculation (angle & elevation) and (Dutch) rain providers in order to, for example, automate the blinds and screens based on sun position and if it is raining or dry.
In addition it pulls an API from Meteoplaza to give you humidity, barometic pressue, min/max temp for the day, hourly temp statistics, wind direction and speed in Beaufort, m/s and km/h.

[![NPM](https://nodei.co/npm/node-red-contrib-dutch-weather.png)](https://nodei.co/npm/node-red-contrib-dutch-weather/)

Install
-------

Run the following command in your Node-RED user directory - typically `~/.node-red`

```bash
$ npm install node-red-contrib-dutch-weather
```

Usage
-----

Provides several nodes for receiving (Dutch) events like: solar-events, solar-position, rain-status, rain-prediction and weather forecasts.

Configure
---------

For all nodes, you'll need to create at least one configuration. Drag one of the exposed nodes to your flow and set it up just like all other config nodes. After that, you can use the event emitters in your own code.