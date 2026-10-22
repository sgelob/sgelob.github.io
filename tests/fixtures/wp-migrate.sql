-- Fixture for scripts/migrate/run.ts: galleries (incl. fixup path and drafts), posts, pages, quotes and taxonomies (same schema as wp-galleries.sql).

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
INSERT INTO `yo_posts` VALUES (10,'2012-08-11 09:00:31','<img class="alignnone" src="https://olegs.be/wp-content/uploads/2012/08/a-1024x683.jpg" alt="" width="1024" height="683" />\n<img class="alignnone" src="https://olegs.be/wp-content/uploads/2012/08/b.jpg" alt="" width="1024" height="683" />\n<img class="alignnone" src="https://olegs.be/wp-content/uploads/2007/01/snow-covered-road-sign-black-lake.jpg-768x512.jpg" alt="" width="1024" height="683" />','Venezia','','publish','venezia-italy',0,'https://olegs.be/?p=10',0,'galleries',''),(11,'2013-01-02 10:20:30','<img class="alignnone" src="https://olegs.be/wp-content/uploads/2012/08/a.jpg" alt="" width="1024" height="683" />','Abandoned','','publish','abandoned-one',0,'https://olegs.be/?p=11',0,'galleries',''),(13,'2014-05-05 00:00:00','','Draft, no genre','','draft','draft-no-genre',0,'https://olegs.be/?p=13',0,'galleries',''),(14,'2014-06-06 00:00:00','<img class="alignnone" src="https://olegs.be/wp-content/uploads/2012/08/b.jpg" alt="" width="1024" height="683" />','Draft gallery','','draft','draft-gallery',0,'https://olegs.be/?p=14',0,'galleries',''),(20,'2012-08-11 09:01:00','','a','','inherit','a',10,'https://olegs.be/wp-content/uploads/2012/08/a.jpg',0,'attachment','image/jpeg'),(21,'2012-08-11 09:02:00','','b','','inherit','b',10,'https://olegs.be/wp-content/uploads/2012/08/b.jpg',0,'attachment','image/jpeg'),(22,'2012-08-11 09:03:00','','snow','','inherit','snow',10,'https://olegs.be/wp-content/uploads/2007/01/snow-covered-road-sign-black-lake.jpg',0,'attachment','image/jpeg'),(101,'2019-03-04 10:11:12','Primo paragrafo.\n\nSecondo paragrafo.','Primo post','','publish','primo-post',0,'https://olegs.be/?p=101',0,'post',''),(102,'2020-05-06 07:08:09','Solo testo.','Secondo post','','publish','secondo-post',0,'https://olegs.be/?p=102',0,'post',''),(103,'2021-01-01 00:00:00','Bozza senza slug.','Bozza','','draft','',0,'https://olegs.be/?p=103',0,'post',''),(104,'2021-02-02 00:00:00','Bozza con slug.','Bozza due','','draft','bozza-due',0,'https://olegs.be/?p=104',0,'post',''),(9,'2020-01-01 00:00:00','Hi, I’m Oleg. I work in tech.\n\nSee my <a href="#events">events</a> and <a href="#books">books</a>.\n<div class="excerpt"></div>\n<h2 id="events">The Events</h2>\n<h3>2024</h3>\n<ul>\n 	<li>Conf A – <em>May 2024</em></li>\n</ul>\n<h3>2026</h3>\n<ul>\n 	<li>Conf B – <em>May 2026</em></li>\n</ul>\n<div class="excerpt"></div>\n<h2 id="books">The Books</h2>\n<h3>Favourite Books</h3>\n<ol reversed="">\n 	<li>Book One – <em>Author One</em></li>\n</ol>\n<h3>Mixed Books</h3>\n<ol reversed="">\n 	<li>Book Two – <em>Author Two</em></li>\n</ol>\n<div class="excerpt"></div>\n<h2>How May I Help You?</h2>\n<strong>Get in touch</strong>','About','','publish','agile-scrum-product-owner-manager-turin-italy',0,'https://olegs.be/?p=9',0,'page',''),(11,'2020-01-02 00:00:00','I am constantly updating these galleries.','Photos','','publish','photos',0,'https://olegs.be/?p=11',0,'page',''),(1013,'2020-01-03 00:00:00','','Blog','','publish','blog',0,'https://olegs.be/?p=1013',0,'page',''),(743,'2020-01-04 00:00:00','','Quotes','','publish','my-favourite-inspirational-quotes-life-design',0,'https://olegs.be/?p=743',0,'page',''),(634,'2020-01-05 00:00:00','Cookies <strong>here</strong>.','Cookie policy','','publish','cookie-policy',0,'https://olegs.be/?p=634',0,'page',''),(3727,'2020-01-06 00:00:00','Privacy text.','Privacy policy','','publish','privacy-policy',0,'https://olegs.be/?p=3727',0,'page',''),(700,'2020-01-07 00:00:00','Services.','Servizi','','draft','servizi',0,'https://olegs.be/?p=700',0,'page',''),(201,'2012-03-03 09:00:00','Be <em>kind</em> &amp; brave.  ','Q1','','publish','q-one',0,'https://olegs.be/?p=201',0,'quotes',''),(202,'2012-03-04 09:00:00','Zebra thought.','Q2','','publish','q-two',0,'https://olegs.be/?p=202',0,'quotes',''),(203,'2012-03-05 09:00:00','Alpha later.','Q3','','publish','q-three',0,'https://olegs.be/?p=203',0,'quotes',''),(204,'2012-03-06 09:00:00','Alpha first.','Q4','','publish','q-four',0,'https://olegs.be/?p=204',0,'quotes','');
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
INSERT INTO `yo_postmeta` VALUES (1,10,'_thumbnail_id','21'),(2,10,'home_short_title','Venice'),(3,10,'dark_header','true'),(4,10,'_yoast_wpseo_primary_genre','31'),(5,10,'_yoast_wpseo_title','Venezia, Italy | Olegs'),(6,10,'_yoast_wpseo_metadesc','Gondolas and fog.'),(7,10,'_wp_old_slug','lubitel-%d0%bb%d1%8e%d0%b1%d0%b8%d1%82%d0%b5%d0%bb%d1%8c'),(8,10,'_wp_old_slug','venice'),(9,10,'_wp_old_slug',''),(10,10,'_wp_old_slug','venice'),(11,20,'_wp_attachment_metadata','a:5:{s:5:"width";i:1620;s:6:"height";i:1080;s:4:"file";s:28:"2012/08/a.jpg";s:5:"sizes";a:0:{}}'),(12,21,'_wp_attachment_metadata','a:5:{s:5:"width";i:1080;s:6:"height";i:1620;s:4:"file";s:28:"2012/08/b.jpg";s:5:"sizes";a:0:{}}'),(13,22,'_wp_attachment_metadata','a:5:{s:5:"width";i:1600;s:6:"height";i:1067;s:4:"file";s:48:"2007/01/snow-covered-road-sign-black-lake.jpg";s:5:"sizes";a:0:{}}'),(14,101,'_yoast_wpseo_title','Titolo SEO'),(15,101,'_yoast_wpseo_metadesc','Descrizione SEO.'),(16,101,'_wp_old_slug','vecchio-slug'),(17,101,'_wp_old_slug',''),(18,101,'_wp_old_slug','vecchio-slug'),(19,101,'_wp_old_slug','altro-vecchio'),(20,104,'_wp_old_slug','non-pubblicato');
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
INSERT INTO `yo_terms` VALUES (30,'Abandoned places','abandoned-places',0),(31,'Cities','cities',0),(32,'Italy','italy',0),(33,'France','france',0),(50,'Viaggi','viaggi',0),(51,'Tech','tech',0),(70,'Zed Author','zed-author',0),(71,'Alpha Author','alpha-author',0);
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
INSERT INTO `yo_term_taxonomy` VALUES (40,30,'genre','<p>I find peace in <em>these</em> places.</p>',0,0),(41,31,'genre','',0,0),(42,32,'country','',0,0),(43,33,'country','',0,0),(60,50,'category','',0,0),(61,51,'category','',0,0),(80,70,'quote-author','',0,0),(81,71,'quote-author','',0,0);
UNLOCK TABLES;

DROP TABLE IF EXISTS `yo_term_relationships`;
CREATE TABLE `yo_term_relationships` (
  `object_id` bigint unsigned NOT NULL DEFAULT '0',
  `term_taxonomy_id` bigint unsigned NOT NULL DEFAULT '0',
  `term_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`object_id`,`term_taxonomy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


LOCK TABLES `yo_term_relationships` WRITE;
INSERT INTO `yo_term_relationships` VALUES (10,41,0),(10,40,0),(10,42,0),(11,40,0),(14,41,0),(101,60,0),(101,61,0),(201,80,0),(202,80,0),(203,81,0),(204,81,0);
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
