# osm-background-combiner

A server for combining multiple map tile backgrounds into one image.

## Installation

1. Install [Node.js](https://nodejs.org)
2. Install [yarn](https://classic.yarnpkg.com/en/docs/install)
3. Run `yarn install` in this project
4. Copy `settings.template.json` and name it `settings.json`
5. Add your Strava cookie data, as per https://wiki.openstreetmap.org/wiki/Strava#Global_Heatmap_in_High_Resolution

## Usage

### Run

Run the server

```bash
yarn start
```

## Theory of operation

1. Fetch source tile images for give tile coordinates
2. Resize all to the size of the smallest
3. Overlay the images
4. Respond to request with new combined image

## Attribution

#### DCS NSW imagery tiles

#### Strava Heatmap tiles

