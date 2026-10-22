-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)
--
-- Host: localhost    Database: mini
-- ------------------------------------------------------
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;

--
-- Table structure for table `yo_posts`
--

DROP TABLE IF EXISTS `yo_posts`;
CREATE TABLE `yo_posts` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `post_title` text COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `post_content` longtext COLLATE utf8mb4_unicode_520_ci NOT NULL,
  `post_type` varchar(20) COLLATE utf8mb4_unicode_520_ci NOT NULL DEFAULT 'post',
  `post_status` varchar(20) COLLATE utf8mb4_unicode_520_ci DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `type_status_date` (`post_type`,`post_status`,`ID`),
  UNIQUE KEY `uniq_title` (`post_title`(100))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

--
-- Dumping data for table `yo_posts`
--

LOCK TABLES `yo_posts` WRITE;
/*!40000 ALTER TABLE `yo_posts` DISABLE KEYS */;
INSERT INTO `yo_posts` VALUES (1,'It\'s','Plain, text (with parens) and a ''doubled'' quote','post','publish'),(2,'Two','line1\nline2','page','draft'),(3,'Three ; semi','Привіт, світ — ünïcode','post',NULL);
/*!40000 ALTER TABLE `yo_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `yo_options`
--

DROP TABLE IF EXISTS `yo_options`;
CREATE TABLE `yo_options` (
  `option_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `option_name` varchar(191) NOT NULL DEFAULT '',
  `ratio` double DEFAULT NULL,
  `offset` decimal(10,2) DEFAULT NULL,
  `code` varchar(10) NOT NULL,
  PRIMARY KEY (`option_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `yo_options` WRITE;
INSERT INTO `yo_options` VALUES (1,'siteurl',1.5,-2.25,'007'),(2,'blogname',-3,1e3,'');
INSERT INTO `yo_options` VALUES (3,'second insert line',NULL,0.5,'x');
UNLOCK TABLES;

DROP TABLE IF EXISTS `yo_escapes`;
CREATE TABLE `yo_escapes` (
  `id` int NOT NULL,
  `body` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `yo_escapes` WRITE;
INSERT INTO `yo_escapes` VALUES (1,'line1\nline2\r\n\ttab \\ backslash \"dq\" nul\0 z\Z end');
UNLOCK TABLES;
