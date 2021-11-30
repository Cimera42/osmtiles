# osmtiles

This repository is for all the neat OpenStreetMaps tile server ideas I come up with.

|Name|
|-|
|Tile provider|
|Tile merger|

# Tile provider

This project is intended to be a wrapper for tile servers that require periodic changes to the URL, such as a weather map that needs updating the timestamp once a day.

The current sources provided:
- OpenStreetMaps standard tiles
- DCS NSW Australia satellite imagery
- Strava heatmap
- Bureau of Meteorology Australia rain radar


# Tile merger

This project merges two sources from the above tile provider into a single image, allowing overlays in the iD editor.
