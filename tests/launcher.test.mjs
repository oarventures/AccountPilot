import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canUpdate } from '../scripts/local.mjs';
test('updater refuses dirty working folders instead of discarding local work',()=>assert.match(canUpdate(' M app/page.tsx','main','origin/main'),/left untouched/));
test('updater requires a named branch and a tracking branch',()=>{assert.match(canUpdate('','HEAD','origin/main'),/Select a branch/);assert.match(canUpdate('','main',''),/no GitHub tracking branch/);});
test('clean tracked branch can be updated by fast-forward only',()=>assert.equal(canUpdate('','accountpilot-context-workspace','origin/accountpilot-context-workspace'),''));
