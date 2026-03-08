CREATE DATABASE IF NOT EXISTS `anime_avatar_expo` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `anime_avatar_expo`;

CREATE TABLE IF NOT EXISTS `avatars` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `source_platform` VARCHAR(32) NOT NULL DEFAULT 'upload',
  `source_url` VARCHAR(1000) NULL,
  `storage_path` VARCHAR(1000) NOT NULL,
  `original_image_url` VARCHAR(1000) NULL,
  `hash_sha256` CHAR(64) NOT NULL,
  `tags_json` JSON NULL,
  `width` INT NULL,
  `height` INT NULL,
  `file_size` BIGINT NULL,
  `click_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hash_sha256` (`hash_sha256`),
  KEY `idx_source_platform` (`source_platform`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
