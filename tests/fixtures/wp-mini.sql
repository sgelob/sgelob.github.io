-- Minimal WordPress dump for scripts/lib/wp.ts (separate from dump-mini.sql, whose yo_posts shape is pinned by the parser tests).

DROP TABLE IF EXISTS `yo_posts`;
CREATE TABLE `yo_posts` (
  `ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `post_date` datetime NOT NULL,
  `post_content` longtext NOT NULL,
  `post_title` text NOT NULL,
  `post_excerpt` text NOT NULL,
  `post_status` varchar(20) NOT NULL,
  `post_name` varchar(200) NOT NULL,
  `post_parent` bigint unsigned NOT NULL DEFAULT '0',
  `guid` varchar(255) NOT NULL,
  `menu_order` int NOT NULL DEFAULT '0',
  `post_type` varchar(20) NOT NULL,
  `post_mime_type` varchar(100) NOT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `yo_posts` WRITE;
INSERT INTO `yo_posts` VALUES (1,'2013-05-01 10:00:00','Body of the older gallery','Older gallery','Excerpt','publish','older-gallery',0,'https://olegs.be/?post_type=galleries&p=1',0,'galleries','');
INSERT INTO `yo_posts` VALUES (2,'2015-09-12 08:30:00','Body of the newer gallery','Newer gallery','','publish','newer-gallery',0,'https://olegs.be/?post_type=galleries&p=2',3,'galleries','');
INSERT INTO `yo_posts` VALUES (3,'2016-01-01 00:00:00','Not ready','Draft gallery','','draft','draft-gallery',0,'https://olegs.be/?post_type=galleries&p=3',0,'galleries','');
INSERT INTO `yo_posts` VALUES (4,'2014-02-02 12:00:00','','a','','inherit','a',1,'https://olegs.be/wp-content/uploads/2012/08/a.jpg',0,'attachment','image/jpeg');
INSERT INTO `yo_posts` VALUES (5,'2014-02-02 12:01:00','','b','','inherit','b',1,'https://olegs.be/wp-content/uploads/2012/08/b.jpg',0,'attachment','image/jpeg');
INSERT INTO `yo_posts` VALUES (6,'2014-02-02 12:02:00','','external','','inherit','external',1,'https://elsewhere.example/img/c.jpg',0,'attachment','image/jpeg');
INSERT INTO `yo_posts` VALUES (7,'2012-03-03 09:00:00','A quote','Quote','','publish','a-quote',0,'https://olegs.be/?post_type=quotes&p=7',0,'quotes','');
UNLOCK TABLES;

DROP TABLE IF EXISTS `yo_postmeta`;
CREATE TABLE `yo_postmeta` (
  `meta_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `post_id` bigint unsigned NOT NULL DEFAULT '0',
  `meta_key` varchar(255) DEFAULT NULL,
  `meta_value` longtext,
  PRIMARY KEY (`meta_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `yo_postmeta` WRITE;
INSERT INTO `yo_postmeta` VALUES (1,1,'home_short_title','Short'),(2,2,'home_short_title','Other'),(3,1,'empty_value',''),(4,2,'null_value',NULL);
INSERT INTO `yo_postmeta` VALUES (5,4,'_wp_attachment_metadata','a:5:{s:5:"width";i:1620;s:6:"height";i:1080;s:4:"file";s:28:"2012/08/a.jpg";s:5:"sizes";a:1:{s:9:"thumbnail";a:4:{s:4:"file";s:14:"a-150x150.jpg";s:5:"width";i:150;s:6:"height";i:150;s:9:"mime-type";s:10:"image/jpeg";}}}');
UNLOCK TABLES;

DROP TABLE IF EXISTS `yo_terms`;
CREATE TABLE `yo_terms` (
  `term_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `slug` varchar(200) NOT NULL,
  `term_group` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`term_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `yo_terms` WRITE;
INSERT INTO `yo_terms` VALUES (10,'Abandoned places','abandoned-places',0),(11,'Cities','cities',0),(12,'Zeno','zeno',0),(13,'Aristotle','aristotle',0);
UNLOCK TABLES;

DROP TABLE IF EXISTS `yo_term_taxonomy`;
CREATE TABLE `yo_term_taxonomy` (
  `term_taxonomy_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `term_id` bigint unsigned NOT NULL DEFAULT '0',
  `taxonomy` varchar(32) NOT NULL DEFAULT '',
  `description` longtext NOT NULL,
  `parent` bigint unsigned NOT NULL DEFAULT '0',
  `count` bigint NOT NULL DEFAULT '0',
  PRIMARY KEY (`term_taxonomy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `yo_term_taxonomy` WRITE;
INSERT INTO `yo_term_taxonomy` VALUES (20,10,'genre','Decay and nature',0,1),(21,11,'genre','',0,1),(22,12,'quote-author','',0,1),(23,13,'quote-author','',0,0);
UNLOCK TABLES;

DROP TABLE IF EXISTS `yo_term_relationships`;
CREATE TABLE `yo_term_relationships` (
  `object_id` bigint unsigned NOT NULL DEFAULT '0',
  `term_taxonomy_id` bigint unsigned NOT NULL DEFAULT '0',
  `term_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`object_id`,`term_taxonomy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `yo_term_relationships` WRITE;
INSERT INTO `yo_term_relationships` VALUES (1,21,0),(1,20,0),(1,22,0),(7,22,0);
UNLOCK TABLES;

DROP TABLE IF EXISTS `yo_options`;
CREATE TABLE `yo_options` (
  `option_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `option_name` varchar(191) NOT NULL DEFAULT '',
  `option_value` longtext NOT NULL,
  `autoload` varchar(20) NOT NULL DEFAULT 'yes',
  PRIMARY KEY (`option_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `yo_options` WRITE;
INSERT INTO `yo_options` VALUES (1,'siteurl','https://olegs.be','yes'),(2,'blogname','Olegs','yes');
UNLOCK TABLES;
