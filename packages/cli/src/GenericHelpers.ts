import { config } from '@config';
import * as express from 'express';
import { join as pathJoin } from 'path';
import { readFile as fsReadFile } from 'fs/promises';
import { readFileSync as fsReadFileSync } from 'fs';
import { IDataObject } from 'n8n-workflow';

import { IPackageVersions } from './';

let versionCache: IPackageVersions | undefined;

/**
 * Returns the base URL n8n is reachable from
 *
 * @export
 * @returns {string}
 */
export function getBaseUrl(): string {
	const protocol = config.get('protocol') as string;
	const host = config.get('host') as string;
	const port = config.get('port') as number;
	const path = config.get('path') as string;

	if (protocol === 'http' && port === 80 || protocol === 'https' && port === 443) {
		return `${protocol}://${host}${path}`;
	}
	return `${protocol}://${host}:${port}${path}`;
}


/**
 * Returns the session id if one is set
 *
 * @export
 * @param {express.Request} req
 * @returns {(string | undefined)}
 */
export function getSessionId(req: express.Request): string | undefined {
	return req.headers.sessionid as string | undefined;
}


/**
 * Returns information which version of the packages are installed
 *
 * @export
 * @returns {Promise<IPackageVersions>}
 */
export async function getVersions(): Promise<IPackageVersions> {
	if (versionCache !== undefined) {
		return versionCache;
	}

	const packageFile = await fsReadFile(pathJoin(__dirname, '../../package.json'), 'utf8') as string;
	const packageData = JSON.parse(packageFile);

	versionCache = {
		cli: packageData.version,
	};

	return versionCache;
}

/**
 * Extracts configuration schema for key
 *
 * @param {string} configKey
 * @param {IDataObject} configSchema
 * @returns {IDataObject} schema of the configKey
 */
function extractSchemaForKey(configKey: string, configSchema: IDataObject): IDataObject {
	const configKeyParts = configKey.split('.');

	for (const key of configKeyParts) {
		if (configSchema[key] === undefined) {
			throw new Error(`Key "${key}" of ConfigKey "${configKey}" does not exist`);
		} else if ((configSchema[key]! as IDataObject)._cvtProperties === undefined) {
			configSchema = configSchema[key] as IDataObject;
		} else {
			configSchema = (configSchema[key] as IDataObject)._cvtProperties as IDataObject;
		}
	}
	return configSchema;
}

/**
 * Gets value from config with support for "_FILE" environment variables
 *
 * @export
 * @param {string} configKey The key of the config data to get
 * @returns {(Promise<string | boolean | number | undefined>)}
 */
export async function getConfigValue(configKey: string): Promise<string | boolean | number | undefined> {
	// Get the environment variable
	const configSchema = config.getSchema();
	// @ts-ignore
	const currentSchema = extractSchemaForKey(configKey, configSchema._cvtProperties as IDataObject);
	// Check if environment variable is defined for config key
	if (currentSchema.env === undefined) {
		// No environment variable defined, so return value from config
		return config.get(configKey);
	}

	// Check if special file enviroment variable exists
	const fileEnvironmentVariable = process.env[currentSchema.env + '_FILE'];
	if (fileEnvironmentVariable === undefined) {
		// Does not exist, so return value from config
		return config.get(configKey);
	}

	let data;
	try {
		data = await fsReadFile(fileEnvironmentVariable, 'utf8') as string;
	} catch (error) {
		if (error.code === 'ENOENT') {
			throw new Error(`The file "${fileEnvironmentVariable}" could not be found.`);
		}

		throw error;
	}

	return data;
}

/**
 * Gets value from config with support for "_FILE" environment variables synchronously
 *
 * @export
 * @param {string} configKey The key of the config data to get
 * @returns {(string | boolean | number | undefined)}
 */
export function getConfigValueSync(configKey: string): string | boolean | number | undefined {
	// Get the environment variable
	const configSchema = config.getSchema();
	// @ts-ignore
	const currentSchema = extractSchemaForKey(configKey, configSchema._cvtProperties as IDataObject);
	// Check if environment variable is defined for config key
	if (currentSchema.env === undefined) {
		// No environment variable defined, so return value from config
		return config.get(configKey);
	}

	// Check if special file enviroment variable exists
	const fileEnvironmentVariable = process.env[currentSchema.env + '_FILE'];
	if (fileEnvironmentVariable === undefined) {
		// Does not exist, so return value from config
		return config.get(configKey);
	}

	let data;
	try {
		data = fsReadFileSync(fileEnvironmentVariable, 'utf8') as string;
	} catch (error) {
		if (error.code === 'ENOENT') {
			throw new Error(`The file "${fileEnvironmentVariable}" could not be found.`);
		}

		throw error;
	}

	return data;
}
