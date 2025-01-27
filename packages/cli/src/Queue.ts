import * as Bull from 'bull';
import { config } from '@config';
import { IBullJobData } from './Interfaces';

export class Queue {
	private jobQueue: Bull.Queue;

	constructor() {
		const prefix = config.get('queue.bull.prefix') as string;
		const redisOptions = config.get('queue.bull.redis') as object;
		// Disabling ready check is necessary as it allows worker to
		// quickly reconnect to Redis if Redis crashes or is unreachable
		// for some time. With it enabled, worker might take minutes to realize
		// redis is back up and resume working.
		// More here: https://github.com/OptimalBits/bull/issues/890
		// @ts-ignore
		this.jobQueue = new Bull('jobs', { prefix, redis: redisOptions, enableReadyCheck: false });
	}

	async add(jobData: IBullJobData, jobOptions: object): Promise<Bull.Job> {
		return await this.jobQueue.add(jobData,jobOptions);
	}

	async getJob(jobId: Bull.JobId): Promise<Bull.Job | null> {
		return await this.jobQueue.getJob(jobId);
	}

	async getJobs(jobTypes: Bull.JobStatus[]): Promise<Bull.Job[]> {
		return await this.jobQueue.getJobs(jobTypes);
	}

	getBullObjectInstance(): Bull.Queue {
		return this.jobQueue;
	}

	/**
	 *
	 * @param job A Bull.Job instance
	 * @returns boolean true if we were able to securely stop the job
	 */
	async stopJob(job: Bull.Job): Promise<boolean> {
		if (await job.isActive()) {
			// Job is already running so tell it to stop
			await job.progress(-1);
			return true;
		} else {
			// Job did not get started yet so remove from queue
			try {
				await job.remove();
				return true;
			} catch (e) {
				await job.progress(-1);
			}
		}
		return false;
	}
}

let activeQueueInstance: Queue | undefined;

export function getInstance(): Queue {
	if (activeQueueInstance === undefined) {
		activeQueueInstance = new Queue();
	}

	return activeQueueInstance;
}
