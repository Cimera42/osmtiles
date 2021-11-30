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
): Promise<Buffer> {
    try {
        const request = await axios({
            method: 'get',
            url: `https://osm.timporritt.com/source/${name}/${sw}/${zoom}/${x}/${y}`,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'NodeJS',
            },
        });
        return request.data;
    } catch (e) {
        // throw new NotFoundError(e);
        logger.error(
            `${name}: (${sw}, ${zoom}, ${x}, ${y}) - ${e?.response?.status}: ${e?.response?.statusText}`
        );
        return createBlank();
    }
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

            const aImage = sharp(A);
            const bImage = sharp(B);
            const aImageMeta = await aImage.metadata();
            const bImageMeta = await bImage.metadata();

            const width = Math.max(aImageMeta.width ?? 0, bImageMeta.width ?? 0, 256);
            const height = Math.max(aImageMeta.height ?? 0, bImageMeta.height ?? 0, 256);

            const combined = await aImage
                .resize(width, height)
                .composite([{input: await bImage.resize(width, height).toBuffer()}])
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
