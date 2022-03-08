import Logger, {LogSeverity} from './lib/log';
import express, {NextFunction, Request, Response} from 'express';
import axios from 'axios';
import sharp from 'sharp';
import {BaseError} from './lib/error';

const logger = new Logger('Server', LogSeverity.INFO);
const TILE_WIDTH = 256;
const TILE_HEIGHT = 256;

const logRequest = (req: Request, res: Response, next: NextFunction) => {
    logger.info(req.originalUrl);
    next();
};

interface ParentPart {
    partialX: number;
    partialY: number;
    size: number;
}
type TileImage = [data: Buffer, zoom: string];
interface TileParams {
    sw: string;
    x: string;
    y: string;
    zoom: string;
}

class NotFoundError extends BaseError {}

function createBlank(width: number, height: number) {
    return sharp({
        create: {
            width,
            height,
            channels: 4,
            background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0,
            },
        },
    });
}
/**
 * Extract sub-tile from parent image
 * @param desiredWidth Final width of extracted image
 * @param desiredHeight Final height of extracted image
 * @param image Image to extract from
 * @param part Coordinates to extract
 * @returns Image
 */
const extractPartFromParentTile = (
    desiredWidth: number,
    desiredHeight: number,
    image: sharp.Sharp,
    part: ParentPart
) => {
    const newWidth = desiredWidth / part.size;
    const newHeight = desiredHeight / part.size;
    return image.resize(newWidth, newHeight).extract({
        left: part.partialX * newWidth,
        top: part.partialY * newHeight,
        width: desiredWidth,
        height: desiredHeight,
    });
};

/**
 * Get x, y, and zoom of parent tile
 * @param params Tile params of sub-tile
 * @returns Parent tile params
 */
function getParentTileParams(params: TileParams): TileParams {
    const {x, y, zoom, ...otherParams} = params;
    return {
        ...otherParams,
        x: (parseInt(x, 10) >> 1).toString(),
        y: (parseInt(y, 10) >> 1).toString(),
        zoom: (parseInt(zoom, 10) - 1).toString(),
    };
}

/**
 * Get coordinates of sub-tile in parent with specific zoom
 * @param parentZoom Zoom of parent tile
 * @param params Sub-tile params
 * @returns Sub-tile coordinates from 0 -> 1
 */
function getCoordinatesInParentTile(
    parentZoom: string,
    params: Omit<TileParams, 'sw'>
): ParentPart {
    const {x, y, zoom} = params;
    const diff = parseInt(zoom) - parseInt(parentZoom);

    const partialX = (parseInt(x, 10) / Math.pow(2, diff)) % 1;
    const partialY = (parseInt(y, 10) / Math.pow(2, diff)) % 1;
    const size = 1 / Math.pow(2, diff);

    return {partialX, partialY, size};
}

/**
 * Load a tile image
 * - Throws NotFoundError if unable to load a valid tile
 * @param name Tile source
 * @param params Tile params
 * @returns Fetched tile
 * @throws NotFoundError
 */
async function getTileImage(name: string, params: TileParams): Promise<Buffer> {
    const {sw, x, y, zoom} = params;
    try {
        const request = await axios.request<Buffer>({
            method: 'get',
            url: `http://localhost/source/${name}/${sw}/${zoom}/${x}/${y}`,
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'NodeJS',
            },
        });
        if (request.data.length === 0) {
            throw new NotFoundError('Empty response');
        }
        return request.data;
    } catch (e) {
        logger.debug(
            `Failed to get ${name} tile: (${sw}, ${zoom}, ${x}, ${y}) - ${
                e?.response ? `${e.response?.status}: ${e.response?.statusText}` : e
            }`
        );
        throw new NotFoundError(e);
    }
}

/**
 * Try to fetch specific zoom level, and recursively fall back to parent tile until one a valid tile is found
 * - Throws NotFoundError if unable to load a valid tile
 * @param name Tile source
 * @param params Tile params
 * @returns Fetched tile and zoom level
 * @throws NotFoundError
 */
async function getZoomOrParentTileImage(name: string, params: TileParams): Promise<TileImage> {
    const {zoom} = params;
    try {
        return [await getTileImage(name, params), params.zoom];
    } catch (e) {
        if (zoom != '0') {
            const parentTileParams = getParentTileParams(params);
            logger.debug(
                `${name} - Parent tile is (${parentTileParams.zoom}, ${parentTileParams.x}, ${parentTileParams.y})`
            );
            return await getZoomOrParentTileImage(name, parentTileParams);
        }
        throw e;
    }
}

/**
 * Load list of tile sources with the same params, falling back to parent tiles if available
 * - Throws NotFoundError if no base zoom level tiles found
 * @param sources List of tile sources
 * @param params Tile params
 * @returns Array of tile images and their zoom levels
 */
async function getTileImages(sources: string[], params: TileParams): Promise<TileImage[]> {
    const baseZoomLevelResults = await Promise.allSettled(
        sources.map((name) => getTileImage(name, params))
    );
    logger.debug(baseZoomLevelResults.map((r, i) => `${sources[i]}: ${r.status}`).join('; '));

    // Throw 404 if neither tile found, to make viewer handle it
    if (baseZoomLevelResults.every((r) => r.status === 'rejected')) {
        throw new NotFoundError('Not found');
    }

    // Use found tile, or get parent
    const parentTileParams = getParentTileParams(params);
    return await Promise.all(
        baseZoomLevelResults.map(
            (r, i): Promise<TileImage> =>
                r.status === 'rejected'
                    ? getZoomOrParentTileImage(sources[i], parentTileParams)
                    : Promise.resolve([r.value, params.zoom])
        )
    );
}

export async function runServer(): Promise<void> {
    const port = process.env.PORT || 3000;

    const app = express();
    app.use(logRequest);

    app.get('/:sourceA/:sourceB/:sw/:zoom/:x/:y', async (req, res) => {
        try {
            const {sw, x, y, zoom, sourceA, sourceB} = req.params;
            const sources = [sourceA, sourceB];

            const params: TileParams = {sw, x, y, zoom};
            const tileImagesData = await getTileImages(sources, params);

            const tileImageAndCoordinates = tileImagesData.map(
                ([imgData, tileZoom]): [sharp.Sharp, ParentPart] => [
                    sharp(imgData),
                    getCoordinatesInParentTile(tileZoom, params),
                ]
            );

            const combined = await createBlank(TILE_WIDTH, TILE_HEIGHT)
                .composite(
                    await Promise.all(
                        tileImageAndCoordinates.map(async ([img, coords]) => ({
                            input: await extractPartFromParentTile(
                                TILE_WIDTH,
                                TILE_HEIGHT,
                                img,
                                coords
                            ).toBuffer(),
                        }))
                    )
                )
                .png()
                .toBuffer();

            res.contentType('image/png');
            res.send(combined);
        } catch (e) {
            if (e instanceof NotFoundError) {
                res.status(404).send('Imagery not found');
                return;
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
