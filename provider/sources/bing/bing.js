function xyzToQuadkey(x, y, z) {
  let quadkey = "";

  for (let i = z; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i - 1);

    if ((x & mask) != 0) {
      digit += 1;
    }
    if ((y & mask) != 0) {
      digit += 2;
    }

    quadkey += digit.toString();
  }

  return quadkey;
}

const subdomainMap = {
  a: "0",
  b: "1",
  c: "2",
};
const maxZoom = 20;

function getBingUrl(req) {
  const uri = req.uri;
  const match = new RegExp(
    "^/source/bing/(?<sw>[abc])/(?<z>\\d+)/(?<x>\\d+)/(?<y>\\d+)$"
  ).exec(uri);
  if (match) {
    const subdomain = subdomainMap[match.groups["sw"]];
    const x = match.groups["x"];
    const y = match.groups["y"];
    const z = match.groups["z"];
    if (parseInt(z) > maxZoom) {
      throw new Error("Zoom level exceeded");
    }
    return `https://ecn.t${subdomain}.tiles.virtualearth.net/tiles/a${xyzToQuadkey(
      x,
      y,
      z
    )}.jpeg?g=587&n=z`;
  } else {
    throw new Error("Tile URL format mismatch");
  }
}

function setBingResponse(req) {
  try {
    req.headersOut["Location"] = getBingUrl(req);
    req.status = 301;
    req.sendHeader();
  } catch (e) {
    req.status = 404;
    req.headersOut["Content-Type"] = "text/plain";
    req.sendHeader();
    req.send(`Not found: ${e}`);
  }
  req.finish();
}

export default { setBingResponse };
