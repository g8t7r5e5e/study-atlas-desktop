CREATE TABLE IF NOT EXISTS firstaid_workbook_rows(
 item_id TEXT NOT NULL, catalog_id TEXT NOT NULL, sequence INTEGER NOT NULL,
 fields_json TEXT NOT NULL, sources_json TEXT NOT NULL,
 PRIMARY KEY(item_id,catalog_id),
 FOREIGN KEY(item_id,catalog_id) REFERENCES resource_item_versions(item_id,catalog_id)
);
