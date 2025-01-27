import {MigrationInterface, QueryRunner} from "typeorm";

import { config } from '@config';

export class MakeStoppedAtNullable1607431743768 implements MigrationInterface {
	name = 'MakeStoppedAtNullable1607431743768';

	async up(queryRunner: QueryRunner): Promise<void> {
		let tablePrefix = config.get('database.tablePrefix');
		const schema = config.get('database.postgresdb.schema');
		if (schema) {
			tablePrefix = schema + '.' + tablePrefix;
		}
		await queryRunner.query('ALTER TABLE ' + tablePrefix + 'execution_entity ALTER COLUMN "stoppedAt" DROP NOT NULL', undefined);
	}

	async down(queryRunner: QueryRunner): Promise<void> {
		// Cannot be undone as column might already have null values
	}

}
