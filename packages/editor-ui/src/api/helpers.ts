import axios, { AxiosRequestConfig, Method } from 'axios';
import {
	IDataObject,
} from 'n8n-workflow';
import {
	IRestApiContext,
} from '../Interface';


class ResponseError extends Error {
	// The HTTP status code of response
	httpStatusCode?: number;

	// The error code in the response
	errorCode?: number;

	// The stack trace of the server
	serverStackTrace?: string;

	/**
	 * Creates an instance of ResponseError.
	 * @param {string} message The error message
	 * @param {number} [errorCode] The error code which can be used by frontend to identify the actual error
	 * @param {number} [httpStatusCode] The HTTP status code the response should have
	 * @param {string} [stack] The stack trace
	 * @memberof ResponseError
	 */
	constructor (message: string, options: {errorCode?: number, httpStatusCode?: number, stack?: string} = {}) {
		super(message);
		this.name = 'ResponseError';

		const { errorCode, httpStatusCode, stack } = options;
		if (errorCode) {
			this.errorCode = errorCode;
		}
		if (httpStatusCode) {
			this.httpStatusCode = httpStatusCode;
		}
		if (stack) {
			this.serverStackTrace = stack;
		}
	}
}

async function request(config: {method: Method, baseURL: string, endpoint: string, headers?: IDataObject, data?: IDataObject}) {
	const { method, baseURL, endpoint, headers, data } = config;
	const options: AxiosRequestConfig = {
		method,
		url: endpoint,
		baseURL,
		headers,
	};
	if (['PATCH', 'POST', 'PUT'].includes(method)) {
		options.data = data;
	} else {
		options.params = data;
	}

	try {
		const response = await axios.request(options);
		return response.data;
	} catch (error) {
		if (error.message === 'Network Error') {
			throw new ResponseError('API-Server can not be reached. It is probably down.');
		}

		if (error.response && error.response.data && error.response.data.message) {
			const errorData = error.response.data;
			const {message, code, statusCode, stack, name, status } = errorData;
			if (name === 'NodeApiError') {
				errorData.httpStatusCode = error.response.status;
				throw errorData;
			}
			throw new ResponseError(message, {errorCode: code, httpStatusCode: statusCode || status, stack});
		}

		throw error;
	}
}

export async function makeRestApiRequest(context: IRestApiContext, method: Method, endpoint: string, data?: IDataObject) {
	const response = await request({
		method,
		baseURL: context.baseUrl,
		endpoint,
		headers: {sessionid: context.sessionId},
		data,
	});

	// @ts-ignore all cli rest api endpoints return data wrapped in `data` key
	return response.data;
}

export async function get(baseURL: string, endpoint: string, params?: IDataObject) {
	return await request({method: 'GET', baseURL, endpoint, data: params});
}
