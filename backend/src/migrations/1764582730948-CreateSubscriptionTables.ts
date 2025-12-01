import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSubscriptionTables1764582730948 implements MigrationInterface {
    name = 'CreateSubscriptionTables1764582730948'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."subscription_plans_plantype_enum" AS ENUM('LITE', 'PRO', 'ENTERPRISE')`);
        await queryRunner.query(`CREATE TABLE "subscription_plans" ("id" SERIAL NOT NULL, "planType" "public"."subscription_plans_plantype_enum" NOT NULL, "name" character varying NOT NULL, "price" numeric(10,2) NOT NULL, "audio_hours_limit" integer, "notes_limit" integer, "features" jsonb, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), CONSTRAINT "UQ_b2cb644011fe0a96dce1f17ce0f" UNIQUE ("planType"), CONSTRAINT "PK_9ab8fe6918451ab3d0a4fb6bb0c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."user_subscriptions_status_enum" AS ENUM('ACTIVE', 'CANCELLED', 'PAST_DUE', 'TRIALING')`);
        await queryRunner.query(`CREATE TABLE "user_subscriptions" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "plan_id" integer NOT NULL, "status" "public"."user_subscriptions_status_enum" NOT NULL DEFAULT 'ACTIVE', "current_period_start" TIMESTAMP WITH TIME ZONE NOT NULL, "current_period_end" TIMESTAMP WITH TIME ZONE NOT NULL, "stripe_subscription_id" character varying, "stripe_customer_id" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), CONSTRAINT "UQ_fa0893fd6af691f2085ff7fdfc8" UNIQUE ("stripe_subscription_id"), CONSTRAINT "PK_9e928b0954e51705ab44988812c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "usage_tracking" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "period_start" TIMESTAMP WITH TIME ZONE NOT NULL, "period_end" TIMESTAMP WITH TIME ZONE NOT NULL, "audio_hours_used" numeric(10,2) NOT NULL DEFAULT '0', "notes_created" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(), CONSTRAINT "PK_2879a43395bb513204f88769aa6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e4aaf8e8178f1354e420a106e2" ON "usage_tracking" ("user_id", "period_start", "period_end") `);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_action_enum" AS ENUM('VIEW', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'REDACT', 'LOGIN', 'LOGOUT')`);
        await queryRunner.query(`CREATE TYPE "public"."audit_logs_resourcetype_enum" AS ENUM('PATIENT', 'TRANSCRIPT', 'SOAP_NOTE', 'CLINICAL_EXTRACTION', 'SESSION', 'USER', 'AUTH')`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" SERIAL NOT NULL, "user_id" integer, "user_email" character varying, "session_id" integer, "patient_id" integer, "action" "public"."audit_logs_action_enum" NOT NULL, "resourceType" "public"."audit_logs_resourcetype_enum" NOT NULL, "resource_id" integer, "metadata" jsonb, "ip_address" character varying, "user_agent" text, "request_path" character varying, "request_method" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON "audit_logs" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_49feea30bc5cf8a8646c17592d" ON "audit_logs" ("session_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_443749e7df59c57f65f736e904" ON "audit_logs" ("patient_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_fb731b6c9ec3271068b48a0786" ON "audit_logs" ("resourceType") `);
        await queryRunner.query(`CREATE INDEX "IDX_62408b952557958fd12867cfeb" ON "audit_logs" ("resource_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON "audit_logs" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_99fca4a3a4a93c26a756c5aca5" ON "audit_logs" ("action", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_c86cf1fe8b6019cc8607b7299b" ON "audit_logs" ("resourceType", "resource_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_83e8d7c988d7749b9db00d2f48" ON "audit_logs" ("session_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_3c162ee8326b442ad04bcc623b" ON "audit_logs" ("patient_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_2f68e345c05e8166ff9deea1ab" ON "audit_logs" ("user_id", "created_at") `);
        await queryRunner.query(`ALTER TABLE "users" ADD "stripe_customer_id" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "subscription_id" integer`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_b6bb02f6cd87c7ae80f1bbb9339" UNIQUE ("subscription_id")`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD CONSTRAINT "FK_0641da02314913e28f6131310eb" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" ADD CONSTRAINT "FK_fe0520c7b2c1c5792446086491f" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_b6bb02f6cd87c7ae80f1bbb9339" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usage_tracking" ADD CONSTRAINT "FK_97e15b4afbc1ebaad4f12080878" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usage_tracking" DROP CONSTRAINT "FK_97e15b4afbc1ebaad4f12080878"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_b6bb02f6cd87c7ae80f1bbb9339"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP CONSTRAINT "FK_fe0520c7b2c1c5792446086491f"`);
        await queryRunner.query(`ALTER TABLE "user_subscriptions" DROP CONSTRAINT "FK_0641da02314913e28f6131310eb"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_b6bb02f6cd87c7ae80f1bbb9339"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "subscription_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "stripe_customer_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2f68e345c05e8166ff9deea1ab"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3c162ee8326b442ad04bcc623b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_83e8d7c988d7749b9db00d2f48"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c86cf1fe8b6019cc8607b7299b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_99fca4a3a4a93c26a756c5aca5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2cd10fda8276bb995288acfbfb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_62408b952557958fd12867cfeb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fb731b6c9ec3271068b48a0786"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_443749e7df59c57f65f736e904"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_49feea30bc5cf8a8646c17592d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bd2726fd31b35443f2245b93ba"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_resourcetype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."audit_logs_action_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e4aaf8e8178f1354e420a106e2"`);
        await queryRunner.query(`DROP TABLE "usage_tracking"`);
        await queryRunner.query(`DROP TABLE "user_subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."user_subscriptions_status_enum"`);
        await queryRunner.query(`DROP TABLE "subscription_plans"`);
        await queryRunner.query(`DROP TYPE "public"."subscription_plans_plantype_enum"`);
    }

}
