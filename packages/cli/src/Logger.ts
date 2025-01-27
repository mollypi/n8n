import { config } from '@config';
import * as winston from 'winston';

import {
	IDataObject,
	ILogger,
	LogTypes,
} from 'n8n-workflow';

import * as callsites from 'callsites';
import { basename } from 'path';

class Logger implements ILogger {
	private logger: winston.Logger;

	constructor() {
		const level = config.get('logs.level');
		const output = (config.get('logs.output') as string).split(',').map(output => output.trim());

		this.logger = winston.createLogger({
			level,
		});

		if (output.includes('console')) {
			let format: winston.Logform.Format;
			if (['debug', 'verbose'].includes(level)) {
				format = winston.format.combine(
					winston.format.metadata(),
					winston.format.timestamp(),
					winston.format.colorize({ all: true }),
					winston.format.printf(({ level, message, timestamp, metadata }) => {
						return `${timestamp} | ${level.padEnd(18)} | ${message}` + (Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '');
					}) as winston.Logform.Format
				);
			} else {
				format = winston.format.printf(({ message }) => message) as winston.Logform.Format;
			}

			this.logger.add(
				new winston.transports.Console({
					format,
				})
			);
		}

		if (output.includes('file')) {
			const fileLogFormat = winston.format.combine(
				winston.format.timestamp(),
				winston.format.metadata(),
				winston.format.json()
			);
			this.logger.add(
				new winston.transports.File({
					filename: config.get('logs.file.location'),
					format: fileLogFormat,
					maxsize: config.get('logs.file.fileSizeMax') as number * 1048576, // config * 1mb
					maxFiles: config.get('logs.file.fileCountMax'),
				})
			);
		}
	}

	log(type: LogTypes, message: string, meta: object = {}) {
		const callsite = callsites();
		// We are using the third array element as the structure is as follows:
		// [0]: this file
		// [1]: Should be LoggerProxy
		// [2]: Should point to the caller.
		// Note: getting line number is useless because at this point
		// We are in runtime, so it means we are looking at compiled js files
		const logDetails = {} as IDataObject;
		if (callsite[2] !== undefined) {
			logDetails.file = basename(callsite[2].getFileName() || '');
			const functionName = callsite[2].getFunctionName();
			if (functionName) {
				logDetails.function = functionName;
			}
		}
		this.logger.log(type, message, {...meta, ...logDetails});
	}

	// Convenience methods below

	debug(message: string, meta: object = {}) {
		this.log('debug', message, meta);
	}

	info(message: string, meta: object = {}) {
		this.log('info', message, meta);
	}

	error(message: string, meta: object = {}) {
		this.log('error', message, meta);
	}

	verbose(message: string, meta: object = {}) {
		this.log('verbose', message, meta);
	}

	warn(message: string, meta: object = {}) {
		this.log('warn', message, meta);
	}

}

let activeLoggerInstance: Logger | undefined;

export function getLogger() {
	if (activeLoggerInstance === undefined) {
		activeLoggerInstance = new Logger();
	}

	return activeLoggerInstance;
}
