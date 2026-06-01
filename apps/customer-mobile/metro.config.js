const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

function resolvePackageDir(name) {
  return path.dirname(
    require.resolve(`${name}/package.json`, { paths: [projectRoot, monorepoRoot] })
  );
}

function getReactRoot() {
  const candidates = [
    path.join(projectRoot, 'node_modules', 'react'),
    path.join(monorepoRoot, 'node_modules', 'react'),
  ];
  for (const reactRoot of candidates) {
    const pkgPath = path.join(reactRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const version = require(pkgPath).version;
    if (version.startsWith('19.')) return reactRoot;
  }
  throw new Error(
    'React 19 not found for mobile. Run: npm install react@19.1.0 -w @getgas/customer-mobile'
  );
}

function resolveReactModule(subpath) {
  const reactRoot = getReactRoot();
  if (!subpath) {
    return path.join(reactRoot, 'index.js');
  }
  const direct = path.join(reactRoot, subpath);
  const candidates = [
    direct,
    `${direct}.js`,
    path.join(direct, 'index.js'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`Unable to resolve react/${subpath} from ${reactRoot}`);
}

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

const metroRuntimeRoot = resolvePackageDir('@expo/metro-runtime');
const metroRuntimeVersion = require(path.join(metroRuntimeRoot, 'package.json')).version;
if (!metroRuntimeVersion.startsWith('6.')) {
  throw new Error(
    `@expo/metro-runtime@${metroRuntimeVersion} resolved — need 6.x. Run: npm install @expo/metro-runtime@6.1.2 -w @getgas/customer-mobile`
  );
}

const reactRoot = getReactRoot();
const reactNativeRoot = resolvePackageDir('react-native');

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@expo/metro-runtime': metroRuntimeRoot,
  react: reactRoot,
  'react-native': reactNativeRoot,
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Always bundle React 19 from the app workspace (web uses React 18 at repo root).
  if (moduleName === 'react') {
    return { type: 'sourceFile', filePath: resolveReactModule('') };
  }
  if (moduleName.startsWith('react/')) {
    return {
      type: 'sourceFile',
      filePath: resolveReactModule(moduleName.slice('react/'.length)),
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
