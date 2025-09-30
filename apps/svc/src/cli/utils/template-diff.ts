export interface ResourceDiff {
  resource: string;
  changePaths: string[];
}

export interface TemplateDiff {
  stackName: string;
  addedResources: string[];
  removedResources: string[];
  changedResources: ResourceDiff[];
  addedOutputs: string[];
  removedOutputs: string[];
  changedOutputs: ResourceDiff[];
  hasChanges: boolean;
}

const MAX_PATHS_PER_RESOURCE = 15;

const normalizeTemplate = (template: any | undefined | null): Record<string, any> => {
  if (!template || typeof template !== 'object') {
    return {};
  }
  return template as Record<string, any>;
};

const getResourceNames = (template: Record<string, any>): string[] => {
  const resources = template.Resources;
  if (!resources || typeof resources !== 'object') {
    return [];
  }
  return Object.keys(resources);
};

const getOutputs = (template: Record<string, any>): Record<string, any> => {
  const outputs = template.Outputs;
  if (!outputs || typeof outputs !== 'object') {
    return {};
  }
  return outputs;
};

const collectChanges = (
  currentValue: any,
  desiredValue: any,
  basePath: string,
  results: Set<string>,
  depth = 0
) => {
  if (depth > 5) {
    results.add(`${basePath} (nested differences)`);
    return;
  }

  if (currentValue === desiredValue) {
    return;
  }

  if (Array.isArray(currentValue) && Array.isArray(desiredValue)) {
    if (currentValue.length !== desiredValue.length) {
      results.add(`${basePath} length changed (${currentValue.length} → ${desiredValue.length})`);
      return;
    }
    for (let i = 0; i < currentValue.length; i++) {
      collectChanges(currentValue[i], desiredValue[i], `${basePath}[${i}]`, results, depth + 1);
      if (results.size >= MAX_PATHS_PER_RESOURCE) {
        break;
      }
    }
    return;
  }

  if (isPlain(currentValue) && isPlain(desiredValue)) {
    const keys = new Set([...Object.keys(currentValue), ...Object.keys(desiredValue)]);
    for (const key of keys) {
      collectChanges(currentValue[key], desiredValue[key], `${basePath}.${key}`, results, depth + 1);
      if (results.size >= MAX_PATHS_PER_RESOURCE) {
        break;
      }
    }
    return;
  }

  results.add(`${basePath} changed (${JSON.stringify(currentValue)} → ${JSON.stringify(desiredValue)})`);
};

const isPlain = (value: any): value is Record<string, any> => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
};

const describeResourceDiff = (
  resourceName: string,
  currentResource: any,
  desiredResource: any
): ResourceDiff | null => {
  const diffPaths = new Set<string>();
  collectChanges(currentResource, desiredResource, `${resourceName}`, diffPaths);

  if (diffPaths.size === 0) {
    return null;
  }

  const paths = Array.from(diffPaths).slice(0, MAX_PATHS_PER_RESOURCE);
  if (diffPaths.size > MAX_PATHS_PER_RESOURCE) {
    paths.push('... additional differences omitted ...');
  }

  return {
    resource: resourceName,
    changePaths: paths
  };
};

export const diffCloudFormationTemplates = (
  stackName: string,
  currentTemplateInput: any | undefined,
  desiredTemplateInput: any
): TemplateDiff => {
  const currentTemplate = normalizeTemplate(currentTemplateInput);
  const desiredTemplate = normalizeTemplate(desiredTemplateInput);

  const currentResources = currentTemplate.Resources ?? {};
  const desiredResources = desiredTemplate.Resources ?? {};

  const currentResourceNames = new Set(Object.keys(currentResources));
  const desiredResourceNames = new Set(Object.keys(desiredResources));

  const addedResources: string[] = [];
  const removedResources: string[] = [];
  const changedResources: ResourceDiff[] = [];

  for (const resource of desiredResourceNames) {
    if (!currentResourceNames.has(resource)) {
      addedResources.push(resource);
    }
  }

  for (const resource of currentResourceNames) {
    if (!desiredResourceNames.has(resource)) {
      removedResources.push(resource);
    }
  }

  for (const resource of desiredResourceNames) {
    if (!currentResourceNames.has(resource)) {
      continue;
    }
    const diff = describeResourceDiff(resource, currentResources[resource], desiredResources[resource]);
    if (diff) {
      changedResources.push(diff);
    }
  }

  const currentOutputs = getOutputs(currentTemplate);
  const desiredOutputs = getOutputs(desiredTemplate);
  const currentOutputNames = new Set(Object.keys(currentOutputs));
  const desiredOutputNames = new Set(Object.keys(desiredOutputs));

  const addedOutputs: string[] = [];
  const removedOutputs: string[] = [];
  const changedOutputs: ResourceDiff[] = [];

  for (const output of desiredOutputNames) {
    if (!currentOutputNames.has(output)) {
      addedOutputs.push(output);
    }
  }

  for (const output of currentOutputNames) {
    if (!desiredOutputNames.has(output)) {
      removedOutputs.push(output);
    }
  }

  for (const output of desiredOutputNames) {
    if (!currentOutputNames.has(output)) {
      continue;
    }
    const diff = describeResourceDiff(output, currentOutputs[output], desiredOutputs[output]);
    if (diff) {
      changedOutputs.push(diff);
    }
  }

  return {
    stackName,
    addedResources,
    removedResources,
    changedResources,
    addedOutputs,
    removedOutputs,
    changedOutputs,
    hasChanges:
      addedResources.length > 0 ||
      removedResources.length > 0 ||
      changedResources.length > 0 ||
      addedOutputs.length > 0 ||
      removedOutputs.length > 0 ||
      changedOutputs.length > 0
  };
};
