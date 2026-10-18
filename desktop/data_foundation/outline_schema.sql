CREATE TABLE IF NOT EXISTS resource_outline_versions(
 id TEXT PRIMARY KEY, resource_id TEXT NOT NULL REFERENCES resources(id),
 catalog_id TEXT NOT NULL REFERENCES resource_catalog_versions(id),
 algorithm_version TEXT NOT NULL, report_json TEXT NOT NULL,
 UNIQUE(catalog_id,algorithm_version)
);
CREATE TABLE IF NOT EXISTS resource_outline_nodes(
 id TEXT PRIMARY KEY, resource_id TEXT NOT NULL REFERENCES resources(id),
 parent_id TEXT REFERENCES resource_outline_nodes(id), title TEXT NOT NULL,
 level TEXT NOT NULL CHECK(level IN('topic','subtopic','review_group'))
);
CREATE TABLE IF NOT EXISTS resource_outline_entries(
 outline_id TEXT NOT NULL REFERENCES resource_outline_versions(id),
 node_id TEXT NOT NULL REFERENCES resource_outline_nodes(id),
 page_refs TEXT NOT NULL, locators_json TEXT NOT NULL,
 review_status TEXT NOT NULL CHECK(review_status IN('needs_review','reviewed')),
 PRIMARY KEY(outline_id,node_id)
);
CREATE TABLE IF NOT EXISTS resource_outline_item_links(
 outline_id TEXT NOT NULL, node_id TEXT NOT NULL,
 item_id TEXT NOT NULL REFERENCES resource_items(id),
 PRIMARY KEY(outline_id,node_id,item_id),
 FOREIGN KEY(outline_id,node_id) REFERENCES resource_outline_entries(outline_id,node_id)
);
