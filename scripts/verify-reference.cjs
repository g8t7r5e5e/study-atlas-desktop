'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'SOURCE_MANIFEST.json'),'utf8'));let failed=false;
for(const f of manifest.referenceFiles){const file=path.resolve(root,f.path);if(!file.startsWith(root+path.sep))throw Error('Unsafe manifest path');if(!fs.existsSync(file)){console.error('MISSING '+f.path);failed=true;continue}const bytes=fs.readFileSync(file),hash=crypto.createHash('sha256').update(bytes).digest('hex');if(hash!==f.sha256||bytes.length!==f.bytes){console.error('MISMATCH '+f.path);failed=true}else console.log('OK '+f.path);}
if(failed)process.exitCode=1;else console.log('Reference bytes match the approved source manifest.');
