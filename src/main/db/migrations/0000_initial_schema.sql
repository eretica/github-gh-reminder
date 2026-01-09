-- Initial schema migration
CREATE TABLE `repositories` (
	`id` text PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pull_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`repository_id` text NOT NULL,
	`pr_number` integer NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`author` text NOT NULL,
	`created_at` text NOT NULL,
	`first_seen_at` text NOT NULL,
	`notified_at` text,
	`last_reminded_at` text,
	FOREIGN KEY (`repository_id`) REFERENCES `repositories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `notification_history` (
	`id` text PRIMARY KEY NOT NULL,
	`pr_id` text NOT NULL,
	`type` text NOT NULL,
	`notified_at` text NOT NULL,
	FOREIGN KEY (`pr_id`) REFERENCES `pull_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pr_repository` ON `pull_requests` (`repository_id`);--> statement-breakpoint
CREATE INDEX `idx_notification_pr` ON `notification_history` (`pr_id`);
