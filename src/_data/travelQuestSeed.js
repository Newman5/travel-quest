import fs from 'node:fs';
import YAML from 'yaml';

const source = fs.readFileSync(new URL('./travelQuestSeed.yaml', import.meta.url), 'utf8');

export default YAML.parse(source);
