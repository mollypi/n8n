import {
	MigrationInterface,
	QueryRunner,
} from 'typeorm';

import { config } from '@config';

export class WebhookModel1592445003908 implements MigrationInterface {
	name = 'WebhookModel1592445003908';

	async up(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');

		await queryRunner.query(`CREATE TABLE IF NOT EXISTS ${tablePrefix}webhook_entity ("workflowId" integer NOT NULL, "webhookPath" varchar NOT NULL, "method" varchar NOT NULL, "node" varchar NOT NULL, PRIMARY KEY ("webhookPath", "method"))`);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		const tablePrefix = config.get('database.tablePrefix');
		await queryRunner.query(`DROP TABLE ${tablePrefix}webhook_entity`);
	}
}
