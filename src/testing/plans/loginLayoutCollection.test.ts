import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import * as path from 'node:path';
describe('Production native Login layout collection', () => {
  function run(body: string): SpawnSyncReturns<string> {
    return spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import {collectLayoutElements,evaluateLayoutFixture,captureLayoutHierarchy,buildLayoutSwipe,isLoginProfileReady,remainingProfileBudget} from './scripts/check-layout.mjs';
      import {parseUiAutomatorXml} from './scripts/native-device-utils.mjs';
      import fs from 'node:fs';
      ${body}`,
      ],
      { cwd: path.resolve(__dirname, '../../..'), encoding: 'utf8' },
    );
  }
  it('collects actual canonical nodes and reports the newly required remember group absent from the old dump', () => {
    const res = run(`
      const nodes=parseUiAutomatorXml(fs.readFileSync('artifacts/FIGMA-64-634/uiautomator-dump.xml','utf8'));
      const geometry=JSON.parse(fs.readFileSync('artifacts/FIGMA-64-634/geometry.json','utf8'));
      const result=collectLayoutElements('FIGMA-64-634',nodes,geometry);
      if(result.elements.length!==15 || JSON.stringify(result.missingIds)!==JSON.stringify(['auth.login.rememberGroup'])) throw Error(JSON.stringify(result));
      const evaluated=evaluateLayoutFixture({profiles:[{name:'actual',viewportWidth:390,viewportHeight:844,scrollable:true,...result}]});
      if(evaluated.verdict!=='FAIL' || !evaluated.findings.some(f=>f.code==='missing-profile-elements')) throw Error(JSON.stringify(evaluated));
    `);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });
  it('fails missing required nodes instead of accepting partial hierarchy', () => {
    const res = run(`
      const result=collectLayoutElements('FIGMA-64-634',[{id:'auth.login.form',x:16,y:20,width:358,height:804}],{anchors:[{id:'auth.login.form'},{id:'auth.login.title'},{id:'auth.login.submit'}]});
      if(JSON.stringify(result.missingIds)!==JSON.stringify(['auth.login.title','auth.login.submit','auth.login.rememberGroup','auth.login.forgotPassword'])) throw Error('wrong missing IDs');
      const evaluated=evaluateLayoutFixture({profiles:[{name:'partial',viewportWidth:390,viewportHeight:844,...result}]});
      if(!evaluated.findings.some(f=>f.code==='missing-profile-elements')) throw Error('partial hierarchy accepted');
    `);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });
  it('checks overlap in each scrolled viewport without comparing different scroll positions', () => {
    const res = run(`
      const box=(id,x,y)=>({id,x,y,width:80,height:30});
      const profile={name:'scroll',viewportWidth:390,viewportHeight:844,scrollable:true,elements:[box('title',10,20)],
        scrollSnapshots:[{name:'scroll1',elements:[box('submit',10,20),box('guest',10,80)]}]};
      if(evaluateLayoutFixture({profiles:[profile]}).verdict!=='PASS') throw Error('cross-snapshot false overlap');
      profile.scrollSnapshots[0].elements[1].y=25;
      if(!evaluateLayoutFixture({profiles:[profile]}).findings.some(f=>f.code==='sibling-overlap')) throw Error('missed scrolled overlap');
    `);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });
  it('retries a transient hierarchy timeout but fails closed after three attempts', () => {
    const res = run(`
      let attempts=0,recoveries=0;
      const value=captureLayoutHierarchy(()=>{if(++attempts<3)throw Error('timeout');return {nodes:[{id:'actual'}]};},()=>recoveries++);
      if(attempts!==3 || recoveries!==2 || value.nodes[0].id!=='actual') throw Error('retry failed');
      attempts=0;let failed=false;
      try{captureLayoutHierarchy(()=>{attempts++;throw Error('timeout');},()=>{});}catch{failed=true;}
      if(!failed || attempts!==3) throw Error('timeout suppressed or unbounded');
    `);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });
  it('starts and ends swipes inside the visible app ScrollView, away from system edges', () => {
    const res = run(`
      const swipe=buildLayoutSwipe([{className:'android.widget.ScrollView',packageName:'vn.blue.mobile',x:0,y:49,width:360,height:771}],{density:160,logicalCanvas:{width:360,height:844},contentInsets:{top:49,bottom:24,left:0,right:0}});
      if(JSON.stringify(swipe)!==JSON.stringify(['shell','input','swipe','180','627','180','242','400'])) throw Error(JSON.stringify(swipe));
      let failed=false;try{buildLayoutSwipe([],{density:160,logicalCanvas:{width:360,height:844},contentInsets:{top:0,bottom:0,left:0,right:0}});}catch{failed=true;}
      if(!failed)throw Error('missing app scrollview accepted');
    `);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });
  it('rejects stale font/bars/scroll telemetry before profile capture', () => {
    const res = run(`
      const spec={width:412,fontScale:'1.0',hideBars:true};
      const node=id=>[{id}];
      if(isLoginProfileReady(node('auth.login.profile.w412.f1.3.bars0.top0'),spec,{top:0}))throw Error('stale font accepted');
      if(!isLoginProfileReady(node('auth.login.profile.w412.f1.bars0.top0'),spec,{top:0}))throw Error('current profile rejected');
      const bars={width:390,fontScale:'1.0',hideBars:false};
      if(isLoginProfileReady(node('auth.login.profile.w390.f1.bars0.top0'),bars,{top:49}))throw Error('stale bars accepted');
      if(isLoginProfileReady(node('auth.login.profile.w390.f1.bars1.top0'),bars,{top:49}))throw Error('stale safearea accepted');
      if(!isLoginProfileReady(node('auth.login.profile.w390.f1.bars1.top49'),bars,{top:49}))throw Error('settled bars rejected');
    `);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });
  it('caps each blocking read to the shared profile deadline', () => {
    const res = run(`
      if(remainingProfileBudget(35000,()=>30000)!==5000)throw Error('budget not capped');
      if(remainingProfileBudget(35000,()=>0)!==8000)throw Error('read timeout not capped');
      let failed=false;try{remainingProfileBudget(35000,()=>35000);}catch{failed=true;}
      if(!failed)throw Error('expired deadline accepted');
    `);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });
  it('does not count a three-pixel clipped footer as reached; requires a full scroll snapshot', () => {
    const res = run(`
      const geometry={anchors:[{id:'auth.login.termsFooter',height:32}]};
      const clipped=[{id:'auth.login.termsFooter',x:40,y:817,width:310,height:3}];
      const partial=collectLayoutElements('FIGMA-64-634',clipped,geometry);
      if(!partial.missingIds.includes('auth.login.termsFooter'))throw Error('clipped footer counted as reached');
      const full=collectLayoutElements('FIGMA-64-634',[{...clipped[0],y:700,height:32}],geometry);
      if(full.missingIds.includes('auth.login.termsFooter'))throw Error('full footer rejected');
      const edge=collectLayoutElements('FIGMA-64-634',[{...clipped[0],y:780,height:40}],geometry,{top:49,bottom:820});
      if(!edge.missingIds.includes('auth.login.termsFooter'))throw Error('font-scaled clipped footer accepted at viewport edge');
      const evaluated=evaluateLayoutFixture({profiles:[{name:'clipped',viewportWidth:390,viewportHeight:844,elements:partial.elements,missingIds:partial.missingIds}]});
      if(evaluated.verdict!=='FAIL')throw Error('clipped footer passed gate');
    `);
    expect(res.stderr).toBe('');
    expect(res.status).toBe(0);
  });
});
