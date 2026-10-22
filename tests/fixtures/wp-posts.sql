-- WordPress dump with posts and pages for scripts/migrate/posts.ts and pages.ts (same schema as wp-mini.sql).

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
INSERT INTO `yo_posts` VALUES (101,'2019-03-04 10:11:12','Primo paragrafo con un <a href="https://olegs.be/wp-content/uploads/2020/05/doc.pdf">PDF</a>.\n\n<img class="alignnone" src="https://olegs.be/wp-content/uploads/2020/05/pic-300x200.jpg" alt="Pic" width="300" height="200" />\n\n<iframe src="https://www.youtube.com/embed/abc" width="560" height="315"></iframe>\n\nSecondo paragrafo.','Post con media','','publish','post-con-media',0,'https://olegs.be/?p=101',0,'post',''),(102,'2018-01-02 03:04:05','Corpo del post.','Post con estratto','Estratto scritto a mano.','publish','post-con-estratto',0,'https://olegs.be/?p=102',0,'post',''),(103,'2017-06-07 08:09:10','<iframe src="https://www.youtube.com/embed/xyz"></iframe>\n\n<img src="https://olegs.be/wp-content/uploads/2020/05/pic.jpg" alt="Only" />\n\n<strong>Un</strong> <a href="https://example.com/x">paragrafo</a> <em>molto</em> lungo che continua parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola parola fine.\n\nSecondo.','Post lungo &#x1f4a9; &amp; co','','publish','post-lungo',0,'https://olegs.be/?p=103',0,'post',''),(104,'2017-01-01 00:00:00','Bozza','Bozza','','draft','bozza',0,'https://olegs.be/?p=104',0,'post',''),(9,'2020-01-01 00:00:00','Hi, I am Oleg.\n<div class="excerpt"></div>\n<h2 id="events">Events</h2>\n<h3>2026</h3>\n<ul>\n <li>A conference</li>\n</ul>\n<h2 id="books">Books</h2>\n<h3>Favourite Books</h3>\n<ol>\n <li>A book</li>\n</ol>\n<h2>How May I Help You?</h2>\nWrite to me.','About','','publish','agile-scrum-product-owner-manager-turin-italy',0,'https://olegs.be/?page_id=9',0,'page',''),(11,'2020-01-02 00:00:00','Photos page','Photos','','publish','photos',0,'https://olegs.be/?page_id=11',0,'page',''),(13,'2020-01-03 00:00:00','','Blog','','publish','blog',0,'https://olegs.be/?page_id=13',0,'page',''),(634,'2020-01-04 00:00:00','Questo sito usa <a href="https://olegs.be/wp-content/uploads/2020/05/doc.pdf">cookie</a>.','Cookie policy','','publish','cookie-policy',0,'https://olegs.be/?page_id=634',0,'page',''),(743,'2020-01-05 00:00:00','Quotes page','Quotes','','publish','my-favourite-inspirational-quotes-life-design',0,'https://olegs.be/?page_id=743',0,'page',''),(3727,'2020-01-06 00:00:00','Informativa sulla privacy','Privacy policy','','publish','privacy-policy',0,'https://olegs.be/?page_id=3727',0,'page',''),(110,'2019-03-04 09:00:00','','cover','','inherit','cover',101,'https://olegs.be/wp-content/uploads/2019/03/cover-1024x683.jpg',0,'attachment','image/jpeg');
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
INSERT INTO `yo_postmeta` VALUES (1,101,'_thumbnail_id','110'),(2,101,'_yoast_wpseo_title','Titolo SEO'),(3,101,'_yoast_wpseo_metadesc','Descrizione SEO.'),(4,101,'_wp_old_slug','vecchio-slug'),(5,101,'_wp_old_slug',''),(6,101,'_wp_old_slug','vecchio-slug'),(7,101,'_wp_old_slug','altro-vecchio'),(8,102,'_yoast_wpseo_title',''),(9,634,'_yoast_wpseo_title','Cookie SEO'),(10,103,'_yoast_wpseo_title','%%title%% | Olegs');
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
INSERT INTO `yo_terms` VALUES (50,'Viaggi','viaggi',0),(51,'Tech','tech',0),(52,'Tag','a-tag',0);
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
INSERT INTO `yo_term_taxonomy` VALUES (60,50,'category','',0,1),(61,51,'category','',0,1),(62,52,'post_tag','',0,1);
UNLOCK TABLES;

DROP TABLE IF EXISTS `yo_term_relationships`;
CREATE TABLE `yo_term_relationships` (
  `object_id` bigint unsigned NOT NULL DEFAULT '0',
  `term_taxonomy_id` bigint unsigned NOT NULL DEFAULT '0',
  `term_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`object_id`,`term_taxonomy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

LOCK TABLES `yo_term_relationships` WRITE;
INSERT INTO `yo_term_relationships` VALUES (101,60,0),(101,61,0),(101,62,0);
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
