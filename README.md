# node-red-contrib-dutch-weather

A combination of a solar position calculation (angle & elevation) and (Dutch) rain providers in order to, for example, automate blinds and screens based on sun position (or) open them if it is going to raining all of a sudden.
In addition it pulls an API from Meteoplaza to give you humidity, barometic pressue, min/max temp for the day, hourly temp statistics, wind direction and speed in Beaufort, m/s and km/h.

## Last version

[![NPM](https://nodei.co/npm/node-red-contrib-dutch-weather.png)](https://nodei.co/npm/node-red-contrib-dutch-weather/)

> **NOTE: breaking changes since 1.2.1**
> The rain-events node will no longer emit a message of type `rain-events-rain-prediction` but instead will emit `rain-events-rain-state` which contains the current state in the key `now` and, if that state would change in the next 120 minutes, also a key with name `prediction`. This way you can more easily detect changes in rain, since you only have to parse one message in node-red instead of keeping track of all individual messages coming in and combining that yourself.

## Installation

Run the following command in your Node-RED user directory - typically `~/.node-red`

```bash
$ npm install node-red-contrib-dutch-weather
```

## Usage

Provides several nodes for receiving (Dutch) events like: solar-events, solar-position, rain-status, rain-prediction and weather forecasts.

## Configuration

For all nodes, you'll need to create at least one configuration. Drag one of the exposed nodes to your flow and set it up just like all other config nodes. After that, you can use the event emitters in your own code.
