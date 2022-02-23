import Logger from './lib/log';
import express, {NextFunction, Request, Response} from 'express';
import axios from 'axios';
import sharp from 'sharp';
import {BaseError} from './lib/error';

const logger = new Logger('Server');

const logRequest = (req: Request, res: Response, next: NextFunction) => {
    logger.info(req.originalUrl);
    next();
};

type SourceName = 'dcsnsw' | 'strava' | 'bom';

class NotFoundError extends BaseError {}

function getParent(x: string, y: string, zoom: string) {
    const halfX = parseInt(x, 10) / 2;
    const halfY = parseInt(y, 10) / 2;
    return {
        z: (parseInt(zoom, 10) - 1).toString(),
        x: Math.floor(halfX).toString(),
        y: Math.floor(halfY).toString(),
        xOffset: halfX % 1,
        yOffset: halfY % 1,
        xSize: 1 - (halfX % 1),
        ySize: 1 - (halfY % 1),
    };
}

function createBlank() {
    return sharp({
        create: {
            width: 256,
            height: 256,
            channels: 4,
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0,
            },
        },
    })
        .png()
        .toBuffer();
}

async function getSource(
    name: string,
    sw: string,
    x: string,
    y: string,
    zoom: string
): Promise<[Buffer, string]> {
    try {
        logger.info(zoom);
        const request = await axios({
            method: 'get',
            url: `https://osm.timporritt.com/source/${name}/${sw}/${zoom}/${x}/${y}`,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'NodeJS',
            },
        });
        return [request.data, zoom];
    } catch (e) {
        if (zoom != '0') {
            const parentTile = getParent(x, y, zoom);
            logger.info(`Parent tile is ${parentTile.z},${parentTile.x},${parentTile.y}`);
            const p = await getSource(name, sw, parentTile.x, parentTile.y, parentTile.z);
            logger.warn(`Missing ${zoom},${x},${y} - got ${p[1]}`);
            return p;
        }
        logger.error(
            `${name}: (${sw}, ${zoom}, ${x}, ${y}) - ${e?.response?.status}: ${e?.response?.statusText}`
        );
        throw new NotFoundError(e);
        // return createBlank();
    }
}

function getPartOfParent(desiredZoom: string, actualZoom: string, x: string, y: string) {
    const diff = parseInt(desiredZoom) - parseInt(actualZoom);
    logger.info(`d: ${diff}`);
    let z = desiredZoom;
    let n = 0;
    let partialX = 0;
    let partialY = 0;
    let size = 1;
    let newX = x;
    let newY = y;
    while (z != actualZoom) {
        const parent = getParent(newX, newY, z);
        logger.info(
            `n: ${n}, ${newX}, ${newY}, ${z}, ${parent.xOffset}, ${parent.xOffset}, ${parent.xSize}`
        );
        partialX += parent.xOffset * Math.pow(0.5, diff - (n + 1));
        partialY += parent.yOffset * Math.pow(0.5, diff - (n + 1));
        logger.info(`${partialX}, ${partialY}, ${size}`);
        size *= 0.5;
        z = parent.z;
        newX = parent.x;
        newY = parent.y;
        n++;
    }
    return {partialX, partialY, size};
}

export async function runServer(): Promise<void> {
    const port = process.env.PORT || 3000;

    const app = express();
    app.use(logRequest);

    app.get('/:sourceA/:sourceB/:sw/:zoom/:x/:y', async (req, res) => {
        try {
            const {sw, x, y, zoom, sourceA, sourceB} = req.params;
            const [A, B] = await Promise.all([
                getSource(sourceA, sw, x, y, zoom),
                getSource(sourceB, sw, x, y, zoom),
            ]);

            const aImage = sharp(A[0]);
            const aPos = getPartOfParent(zoom, A[1], x, y);
            const bImage = sharp(B[0]);
            const bPos = getPartOfParent(zoom, B[1], x, y);
            logger.info(`${bPos.partialX} ${bPos.partialY} ${bPos.size}`);
            const aImageMeta = await aImage.metadata();
            const bImageMeta = await bImage.metadata();

            // const width = Math.max(aImageMeta.width ?? 0, bImageMeta.width ?? 0, 256);
            // const height = Math.max(aImageMeta.height ?? 0, bImageMeta.height ?? 0, 256);
            const width = 256;
            const height = 256;

            const combined = await aImage
                .extract({
                    left: aPos.partialX * aImageMeta.width,
                    top: aPos.partialY * aImageMeta.height,
                    width: aPos.size * aImageMeta.width,
                    height: aPos.size * aImageMeta.height,
                })
                .resize(width, height)
                .composite([
                    {
                        input: await bImage
                            .extract({
                                left: bPos.partialX * bImageMeta.width,
                                top: bPos.partialY * bImageMeta.height,
                                width: bPos.size * bImageMeta.width,
                                height: bPos.size * bImageMeta.height,
                            })
                            .resize(width, height)
                            .toBuffer(),
                    },
                ])
                .png()
                .toBuffer();

            res.contentType('image/png');
            res.send(combined);
        } catch (e) {
            if (e instanceof NotFoundError) {
                res.status(404).send('Imagery not found');
            } else {
                res.status(500).send('Something went wrong');
            }
            logger.exception(e);
        }
    });

    app.listen(port, () => {
        console.log(`server started on port ${port}`);
    });
}
