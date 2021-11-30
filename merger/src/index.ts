import chalk from 'chalk';
import arg from 'arg';
import Logger from './lib/log';
import packageJson from '../package.json';
import {alignToSides} from './lib/utils';
import {runServer} from './server';

const logger = new Logger('Index');

const helpMessage = [
    '',
    'Usage: osm-background-combiner',
    '',
    'Host a OSM tile server that combines multiple sources',
    '',
    'Options:',
    alignToSides('  -v, --version   Show version', `[optional]`),
    '',
].join('\n');

function showHelp() {
    console.log(helpMessage);
}

async function main() {
    const [args, argErrors] = arg(
        {
            '--help': Boolean,
            '--version': Boolean,

            '-h': '--help',
        },
        {
            argv: process.argv.slice(2),
            onlyThrowDevExceptions: true,
        }
    );

    if (args['--version']) {
        console.log(packageJson.version);
        return;
    }

    if (args['--help']) {
        showHelp();
        return;
    }

    const errors = [
        // Add errors from arg validation
        ...Object.values(argErrors).map(
            (e) => `${e.message.slice(0, 1).toUpperCase()}${e.message.slice(1)}`
        ),
    ];

    if (errors.length) {
        errors.forEach((e) => {
            console.error(chalk.red(e));
        });
        showHelp();
        return;
    }

    await runServer();
}
main();
