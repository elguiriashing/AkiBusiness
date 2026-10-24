import assert from 'node:assert/strict';

export const productionProject = 'akibusiness-selfowned-staging';

export function verifyProductionTarget(project, stamp, expectedCommit) {
  assert.equal(project.name, productionProject, 'Unexpected AkiBusiness Pages project');
  assert.ok(project.domains?.includes('akibusiness.com'), 'Production domain is not attached');
  assert.equal(project.production_branch, 'main', 'Unexpected production branch');
  assert.equal(project.source?.type, 'github', 'Unexpected production source type');
  assert.equal(project.source?.config?.owner, 'elguiriashing', 'Unexpected source owner');
  assert.equal(project.source?.config?.repo_name, 'AkiBusiness', 'Unexpected source repository');
  assert.equal(project.source?.config?.production_branch, 'main', 'Unexpected source branch');
  assert.ok(expectedCommit, 'Missing expected source commit');
  assert.equal(stamp.sourceCommit, expectedCommit, 'Release source differs from checked commit');
  assert.equal(stamp.sourceTreeDirty, false, 'Release has uncommitted changes');
  assert.equal(stamp.product, 'AkiBusiness', 'Unexpected release product');
  assert.equal(stamp.roleSwap, true, 'Paid operations release is required');
  assert.equal(stamp.canonicalOrigin, 'https://akibusiness.com', 'Unexpected canonical origin');
}
