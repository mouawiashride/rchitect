const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const reactStructures = require('../structures/react');
const nextjsStructures = require('../structures/nextjs');
const { getExtensions } = require('../utils/templates');

async function loadConfig(cwd) {
  const configPath = path.join(cwd, '.rchitect.json');
  if (!(await fs.pathExists(configPath))) {
    console.log(chalk.red('\n  Error: .rchitect.json not found. Run "rchitect init" first.\n'));
    process.exit(1);
  }
  return fs.readJson(configPath);
}

function getStructure(config) {
  const structures = config.framework === 'react' ? reactStructures : nextjsStructures;
  return structures[config.pattern];
}

function checkHook(name) {
  if (!/^use[A-Z]/.test(name)) return 'must start with "use" followed by an uppercase letter (e.g. useAuth)';
  return null;
}

function checkService(name) {
  if (!/^[a-z][a-zA-Z0-9]*Service$/.test(name)) return 'must match camelCaseService pattern (e.g. userService)';
  return null;
}

function checkContext(name) {
  if (!name.endsWith('Context')) return 'must end with "Context" (e.g. AuthContext)';
  return null;
}

function checkStore(name) {
  if (!/^use[A-Z][a-zA-Z0-9]*Store$/.test(name)) return 'must match use${Name}Store pattern (e.g. useCartStore)';
  return null;
}

function checkComponent(name) {
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) return 'must be PascalCase (e.g. UserCard)';
  return null;
}

function getComponentDirs(config, structure) {
  if (config.pattern === 'atomic-design') {
    const levels = ['atom', 'molecule', 'organism', 'template', 'page'];
    const seen = new Set();
    return levels
      .map(l => structure.componentPath(undefined, l))
      .filter(p => { if (seen.has(p)) return false; seen.add(p); return true; });
  }
  return [structure.componentPath()];
}

async function auditDir(absDir, checkFn, typeName, scriptExt, cwd) {
  const violations = [];
  if (!(await fs.pathExists(absDir))) return violations;

  const entries = await fs.readdir(absDir);
  const barrelPath = path.join(absDir, `index.${scriptExt}`);
  const barrelContent = (await fs.pathExists(barrelPath))
    ? await fs.readFile(barrelPath, 'utf-8')
    : null;

  for (const entry of entries) {
    const entryPath = path.join(absDir, entry);
    const stat = await fs.stat(entryPath);
    if (!stat.isDirectory()) continue;

    const namingError = checkFn(entry);
    if (namingError) {
      violations.push({
        kind: 'naming',
        type: typeName,
        dir: path.relative(cwd, absDir),
        name: entry,
        reason: namingError,
      });
    }

    if (barrelContent !== null && !barrelContent.includes(`from './${entry}'`)) {
      violations.push({
        kind: 'barrel',
        type: typeName,
        dir: path.relative(cwd, absDir),
        name: entry,
        reason: `not exported in barrel index.${scriptExt}`,
      });
    }
  }

  return violations;
}

async function auditCommand() {
  const cwd = process.cwd();
  const config = await loadConfig(cwd);
  const structure = getStructure(config);
  const { scriptExt } = getExtensions(config);

  const audits = [
    { dirs: [path.join(cwd, structure.hookPath())],    check: checkHook,      type: 'hook'      },
    { dirs: [path.join(cwd, structure.servicePath())], check: checkService,   type: 'service'   },
    { dirs: [path.join(cwd, structure.contextPath())], check: checkContext,   type: 'context'   },
    { dirs: [path.join(cwd, structure.storePath())],   check: checkStore,     type: 'store'     },
    {
      dirs: getComponentDirs(config, structure).map(p => path.join(cwd, p)),
      check: checkComponent,
      type: 'component',
    },
  ];

  const violations = [];
  for (const { dirs, check, type } of audits) {
    for (const absDir of dirs) {
      const found = await auditDir(absDir, check, type, scriptExt, cwd);
      violations.push(...found);
    }
  }

  if (violations.length === 0) {
    console.log(chalk.bold.green('\n  No violations found. Your architecture looks clean!\n'));
    return;
  }

  console.log(chalk.bold.red(`\n  ${violations.length} violation(s) found:\n`));
  for (const v of violations) {
    const loc = chalk.white(`${v.dir}/${v.name}`);
    const label = chalk.gray(`[${v.type}/${v.kind}]`);
    console.log(chalk.red('  ✗ ') + loc + '  ' + label);
    console.log(chalk.gray(`    ${v.reason}`));
  }
  console.log('');
}

module.exports = auditCommand;
module.exports.checkHook = checkHook;
module.exports.checkService = checkService;
module.exports.checkContext = checkContext;
module.exports.checkStore = checkStore;
module.exports.checkComponent = checkComponent;
