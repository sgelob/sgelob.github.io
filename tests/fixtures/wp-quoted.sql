-- Same tables as wp-mini.sql, but every integer is quoted (a dump that declares all columns as text).
CREATE TABLE `yo_posts` (
  `ID` text,
  `post_date` text,
  `post_content` text,
  `post_title` text,
  `post_excerpt` text,
  `post_status` text,
  `post_name` text,
  `post_parent` text,
  `guid` text,
  `menu_order` text,
  `post_type` text,
  `post_mime_type` text
) ENGINE=InnoDB;
INSERT INTO `yo_posts` VALUES ('5','2014-02-02 12:00:00','c','t','','publish','n','2','g','7','post','');
CREATE TABLE `yo_postmeta` (
  `meta_id` text,
  `post_id` text,
  `meta_key` text,
  `meta_value` text
) ENGINE=InnoDB;
INSERT INTO `yo_postmeta` VALUES ('1','5','k','v');
CREATE TABLE `yo_terms` (
  `term_id` text,
  `name` text,
  `slug` text,
  `term_group` text
) ENGINE=InnoDB;
INSERT INTO `yo_terms` VALUES ('9','G','g','0');
CREATE TABLE `yo_term_taxonomy` (
  `term_taxonomy_id` text,
  `term_id` text,
  `taxonomy` text,
  `description` text,
  `parent` text,
  `count` text
) ENGINE=InnoDB;
INSERT INTO `yo_term_taxonomy` VALUES ('30','9','genre','','0','4');
CREATE TABLE `yo_term_relationships` (
  `object_id` text,
  `term_taxonomy_id` text,
  `term_order` text
) ENGINE=InnoDB;
INSERT INTO `yo_term_relationships` VALUES ('5','30','0');
CREATE TABLE `yo_options` (
  `option_id` text,
  `option_name` text,
  `option_value` text,
  `autoload` text
) ENGINE=InnoDB;
