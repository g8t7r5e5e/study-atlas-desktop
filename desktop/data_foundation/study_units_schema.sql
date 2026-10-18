CREATE TABLE IF NOT EXISTS study_unit_definitions(
 definition_id TEXT NOT NULL, unit_id TEXT NOT NULL, system TEXT NOT NULL,
 sequence INTEGER NOT NULL, title TEXT NOT NULL, rule_json TEXT NOT NULL,
 PRIMARY KEY(definition_id,unit_id)
);
CREATE TABLE IF NOT EXISTS study_unit_resource_candidates(
 definition_id TEXT NOT NULL, unit_id TEXT NOT NULL,
 item_id TEXT NOT NULL, catalog_id TEXT NOT NULL,
 matched_terms TEXT NOT NULL, page_refs TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'candidate' CHECK(status='candidate'),
 PRIMARY KEY(definition_id,unit_id,item_id,catalog_id),
 FOREIGN KEY(definition_id,unit_id) REFERENCES study_unit_definitions(definition_id,unit_id),
 FOREIGN KEY(item_id,catalog_id) REFERENCES resource_item_versions(item_id,catalog_id)
);
