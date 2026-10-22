-- WordPress dump with galleries for scripts/migrate/galleries.ts (same schema as wp-mini.sql).

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
INSERT INTO `yo_posts` VALUES (10,'2012-08-11 09:00:31','<img class="alignnone size-large wp-image-12" src="https://olegs.be/wp-content/uploads/2012/08/a-1024x683.jpg" alt="" width="1024" height="683" />\n<div class="clearfix"></div>\n<img class="alignleft" src="http://olegs.be/wp-content/uploads/2012/08/b.jpg" alt="" width="1024" height="683" />','Venezia','','publish','venezia-italy',0,'https://olegs.be/?post_type=galleries&p=10',0,'galleries',''),(11,'2013-01-02 10:20:30','<p>Camera: Lubitel</p>\n<img class="alignnone" src="https://olegs.be/wp-content/uploads/2012/08/a.jpg" alt="" width="1024" height="683" /><img class="alignnone" src="https://olegs.be/wp-content/uploads/2012/08/missing.jpg" alt="" width="1024" height="683" /><img class="alignnone" src="https://olegs.be/wp-content/uploads/2012/08/nodims.jpg" alt="" width="1024" height="683" />','Lubitel','','publish','lubitel',0,'https://olegs.be/?post_type=galleries&p=11',0,'galleries',''),(12,'2014-03-04 05:06:07','<img class="alignnone" src="https://olegs.be/wp-content/uploads/2012/08/b-300x200.jpg" alt="" width="1024" height="683" />','No cover','','publish','no-cover',0,'https://olegs.be/?post_type=galleries&p=12',0,'galleries',''),(13,'2014-05-05 00:00:00','','Draft, no genre','','draft','draft-no-genre',0,'https://olegs.be/?post_type=galleries&p=13',0,'galleries',''),(14,'2014-06-06 00:00:00','<img class="alignnone" src="https://olegs.be/wp-content/uploads/2012/08/a.jpg" alt="" />','Cover outside','','publish','cover-outside',0,'https://olegs.be/?post_type=galleries&p=14',0,'galleries',''),(15,'2014-07-07 00:00:00','<img class="alignnone" src="https://olegs.be/wp-content/uploads/2012/08/a.jpg" alt="" />','Cover without size','','publish','cover-nodims',0,'https://olegs.be/?post_type=galleries&p=15',0,'galleries',''),(20,'2012-08-11 09:01:00','','a','','inherit','a',10,'https://olegs.be/wp-content/uploads/2012/08/a.jpg',0,'attachment','image/jpeg'),(21,'2012-08-11 09:02:00','','b','','inherit','b',10,'https://olegs.be/wp-content/uploads/2012/08/b.jpg',0,'attachment','image/jpeg'),(22,'2012-08-11 09:03:00','','nodims','','inherit','nodims',10,'https://olegs.be/wp-content/uploads/2012/08/nodims.jpg',0,'attachment','image/jpeg');
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
INSERT INTO `yo_postmeta` VALUES (1,10,'_thumbnail_id','21'),(2,10,'home_short_title','Venice'),(3,10,'dark_header','true'),(4,10,'_yoast_wpseo_primary_genre','31'),(5,10,'_yoast_wpseo_title','Venezia, Italy | Olegs'),(6,10,'_yoast_wpseo_metadesc','Gondolas and fog.'),(7,10,'_wp_old_slug','lubitel-%d0%bb%d1%8e%d0%b1%d0%b8%d1%82%d0%b5%d0%bb%d1%8c'),(8,10,'_wp_old_slug','venice'),(9,11,'_thumbnail_id','999'),(10,11,'dark_header','false'),(11,20,'_wp_attachment_metadata','a:5:{s:5:"width";i:1620;s:6:"height";i:1080;s:4:"file";s:28:"2012/08/a.jpg";s:5:"sizes";a:0:{}}'),(12,21,'_wp_attachment_metadata','a:5:{s:5:"width";i:1080;s:6:"height";i:1620;s:4:"file";s:28:"2012/08/b.jpg";s:5:"sizes";a:0:{}}'),(13,14,'_thumbnail_id','21'),(14,15,'_thumbnail_id','22');
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
INSERT INTO `yo_terms` VALUES (30,'Abandoned places','abandoned-places',0),(31,'Cities','cities',0),(32,'Italy','italy',0),(33,'France','france',0);
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
INSERT INTO `yo_term_taxonomy` VALUES (40,30,'genre','',0,1),(41,31,'genre','',0,1),(42,32,'country','',0,1),(43,33,'country','',0,0);
UNLOCK TABLES;

DROP TABLE IF EXISTS `yo_term_relationships`;
CREATE TABLE `yo_term_relationships` (
  `object_id` bigint unsigned NOT NULL DEFAULT '0',
  `term_taxonomy_id` bigint unsigned NOT NULL DEFAULT '0',
  `term_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`object_id`,`term_taxonomy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `yo_term_relationships` WRITE;
INSERT INTO `yo_term_relationships` VALUES (10,40,0),(10,41,0),(10,42,0),(11,40,0),(11,41,0),(12,41,0),(10,43,0),(14,41,0),(15,41,0);
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
INSERT INTO `yo_options` VALUES (1,'siteurl','https://olegs.be','yes');
UNLOCK TABLES;
