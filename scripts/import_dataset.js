import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { datasetService } from '../libs/evaluation/src/dataset.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    const datasetPath = path.resolve(__dirname, '../data/golden_dataset.json');
    if (!fs.existsSync(datasetPath)) {
      console.error(`Dataset file not found at ${datasetPath}`);
      process.exit(1);
    }

    console.log(`Reading dataset from ${datasetPath}...`);
    const content = fs.readFileSync(datasetPath, 'utf8');
    const jsonData = JSON.parse(content);

    console.log('Importing dataset...');
    const result = await datasetService.importDataset(jsonData);

    console.log('Import successful!');
    console.log(`Dataset Name: ${result.dataset.name}`);
    console.log(`Test Cases Imported: ${result.testCases}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
