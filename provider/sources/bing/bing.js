function xyzToQuadkey(x, y, z) {
  let quadkey = "";

  for (let i = z; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i - 1);

    if ((x & mask) != 0) {
      digit = digit + 1;
    }
    if ((y & mask) != 0) {
      digit = digit + 2;
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
    return `https://ecn.t${subdomain}.tiles.virtualearth.net/tiles/a${xyzToQuadkey(
      x,
      y,
      z
    )}.jpeg?g=587&n=z`;
  }
}

function setBingLocationHeader() {
  req.headersOut["Location"] = getBingUrl(req);
}

export default { setBingLocationHeader };
