const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const tsconfigPath = path.join(root, 'tsconfig.json');
const tsconfig = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(
	tsconfig.config,
	ts.sys,
	root,
	{
		module: ts.ModuleKind.CommonJS,
		sourceMap: false,
		inlineSourceMap: true,
	},
	tsconfigPath,
);

const previousLoader = Module._extensions['.ts'];

Module._extensions['.ts'] = (module, filename) => {
	if (!filename.startsWith(root)) {
		return previousLoader(module, filename);
	}

	const source = fs.readFileSync(filename, 'utf8');
	const output = ts.transpileModule(source, {
		fileName: filename,
		compilerOptions: parsed.options,
		reportDiagnostics: false,
	});

	module._compile(output.outputText, filename);
};
