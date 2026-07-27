const { copyFileSync, mkdirSync } = require('node:fs');
const { dirname, join } = require('node:path');

const rootDir = join(__dirname, '..');

const assets = [
	['api/index.json', 'dist/api/index.json'],
	['nodes/Dokaai/dokaai.light.svg', 'dist/nodes/Dokaai/dokaai.light.svg'],
	['nodes/Dokaai/dokaai.dark.svg', 'dist/nodes/Dokaai/dokaai.dark.svg'],
];

for (const [source, target] of assets) {
	const targetPath = join(rootDir, target);
	mkdirSync(dirname(targetPath), { recursive: true });
	copyFileSync(join(rootDir, source), targetPath);
}
