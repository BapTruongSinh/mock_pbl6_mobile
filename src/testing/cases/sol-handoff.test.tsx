import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Text } from 'react-native';
import { fireEvent, render, act } from '@testing-library/react-native';
import { FoundationBootstrapView } from '../../app/FoundationBootstrapView';
import { handleHarnessDeepLink } from '../nativeHarness';
import { ensureFoundationSmokeScenarioRegistered } from '../scenarios/FOUNDATION-SMOKE';

const root = path.resolve(__dirname, '../../..');

test('native dev faults change rendered anchor, overlap and missing label and reset on clean launch', async () => {
  ensureFoundationSmokeScenarioRegistered();
  const view = render(<FoundationBootstrapView />);
  await act(async () => {
    await handleHarnessDeepLink(
      'bluemobile://debug/case/FOUNDATION-SMOKE?nativeFault=anchor-offset',
      { isProduction: false },
    );
  });
  expect(view.getByTestId('foundation.anchor')).toHaveStyle({ marginLeft: 28 });
  await act(async () => {
    await handleHarnessDeepLink('bluemobile://debug/case/FOUNDATION-SMOKE?nativeFault=overlap', {
      isProduction: false,
    });
  });
  expect(view.getByTestId('foundation.toggle')).toHaveStyle({ position: 'absolute', top: 0 });
  await act(async () => {
    await handleHarnessDeepLink(
      'bluemobile://debug/case/FOUNDATION-SMOKE?nativeFault=missing-label',
      { isProduction: false },
    );
  });
  expect(view.getByTestId('foundation.toggle').props.accessibilityLabel).toBe('');
  expect(view.getByTestId('foundation.toggle').findAllByType(Text)[0]?.props.children).toBe('');
  await act(async () => {
    await handleHarnessDeepLink('bluemobile://debug/case/FOUNDATION-SMOKE');
  });
  expect(view.getByTestId('foundation.anchor')).toHaveStyle({ marginLeft: 20 });
  expect(view.getByTestId('foundation.toggle').props.accessibilityLabel).toBe('Kiểm tra');
  fireEvent.press(view.getByTestId('foundation.toggle'));
  expect(view.getByTestId('foundation.status').props.children).toBe('Đã chạm');
  await act(async () => {
    await handleHarnessDeepLink(
      'bluemobile://debug/case/FOUNDATION-SMOKE?nativeFault=anchor-offset',
      { isProduction: true },
    );
  });
  expect(view.getByTestId('foundation.anchor')).toHaveStyle({ marginLeft: 20 });
});

test('cold storage proof fails closed for missing, false or unchanged evidence', () => {
  const code = `import {evaluateColdStorageProof} from './scripts/android-smoke.mjs';
    const a={coldLaunchCount:1, snapshotPersisted:true, snapshotBytes:100, firstLaunchAt:1};
    const b={...a,coldLaunchCount:2};
    for (const pair of [[null,b],[a,null],[a,{...b,snapshotPersisted:false}],[a,a]]) {
      if(evaluateColdStorageProof(...pair).ok) process.exit(10);
    }
    if(!evaluateColdStorageProof(a,b).ok) process.exit(11);`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8',
  });
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
});

test('device restoration verifies nullable settings and retains recovery manifest on failure', () => {
  const code = `import childProcess from 'node:child_process';
    import {syncBuiltinESMExports} from 'node:module';
    import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
    const settings=new Map([['system/font_scale','null'],['global/policy_control','null'],['secure/immersive_mode_confirmations','null'],['global/window_animation_scale','1'],['global/transition_animation_scale','1'],['global/animator_duration_scale','1']]);
    let rejectPolicy=false; let omitSize=false;
    childProcess.spawnSync=(bin,args)=>{
      const a=args.slice(3); let out='';
      if(a[0]==='wm') out=a[1]==='size'?(omitSize?'':'Physical size: 1080x2340'):'Physical density: 440';
      if(a[0]==='settings') {const key=a[2]+'/'+a[3];
        if(a[1]==='get') out=settings.get(key)??'null';
        else if(!(rejectPolicy && key==='global/policy_control')) settings.set(key,a[1]==='delete'?'null':a[4]);
      }
      return {status:0,stdout:out,stderr:''};
    };
    syncBuiltinESMExports();
    const {saveDeviceRecoveryState,restoreAndVerifyDeviceState}=await import('./scripts/native-device-utils.mjs');
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'blue-recovery-')); const file=path.join(dir,'state.json');
    saveDeviceRecoveryState('adb','test',file);
    settings.set('global/policy_control','immersive.full=*'); rejectPolicy=true;
    const failed=restoreAndVerifyDeviceState('adb','test',file);
    if(failed.verified || !fs.existsSync(file)) process.exit(10);
    rejectPolicy=false; const fixed=restoreAndVerifyDeviceState('adb','test',file);
    if(!fixed.verified || fs.existsSync(file) || settings.get('system/font_scale')!=='null') process.exit(11);
    omitSize=true; let blocked=false; try {saveDeviceRecoveryState('adb','test',file);} catch {blocked=true;}
    if(!blocked || fs.existsSync(file)) process.exit(12);
    fs.rmSync(dir,{recursive:true});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8',
  });
  expect(result.stderr).toBe('');
  expect(result.status).toBe(0);
});

test('remote Android shell receives one quoted deep link including both query parameters', () => {
  const code = `import {buildHarnessCaseUriArg} from './scripts/native-device-utils.mjs';
    const uri=buildHarnessCaseUriArg('FOUNDATION-SMOKE',true,'anchor-offset');
    if(uri !== "'bluemobile://debug/case/FOUNDATION-SMOKE?hideBars=1&nativeFault=anchor-offset'") process.exit(10);`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
});

test('native WindowMetrics evidence must exist and match the active device profile', () => {
  const code = `import {validateNativeWindowTelemetry,requireNativeWindowTelemetry} from './scripts/native-device-utils.mjs';
 const expected={width:390,height:844,density:160,fontScale:1};
 for(const input of [null,{}, {source:'heuristic'}, {source:'WindowManager.currentWindowMetrics+decorView.rootWindowInsets',windowBoundsPx:{width:1,height:1}}]) {
   if(validateNativeWindowTelemetry(input,expected)) process.exit(10);
 }
 const valid={source:'WindowManager.currentWindowMetrics+decorView.rootWindowInsets',windowBoundsPx:{width:390,height:844},density:160,fontScale:1,systemBarsInsetsPx:{left:0,top:0,right:0,bottom:0},statusBarVisible:false,navigationBarVisible:false};
 if(!validateNativeWindowTelemetry(valid,expected)) process.exit(11);
 try {requireNativeWindowTelemetry({nativeWindowMetrics:valid},false); process.exit(12);} catch {}`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
});

test('visible native system-bar insets must reject obstructed content', () => {
  const code = `import {evaluateLayoutFixture} from './scripts/check-layout.mjs';
 const profile={name:'systembars',viewportWidth:390,viewportHeight:844,systemBarsVisible:true,contentInsets:{left:0,top:49,right:0,bottom:24},elements:[{id:'foundation.anchor',x:20,y:20,width:100,height:50}]};
 if(evaluateLayoutFixture({profiles:[profile]}).verdict !== 'FAIL') process.exit(10);
 profile.elements[0].y=69;
 if(evaluateLayoutFixture({profiles:[profile]}).verdict !== 'PASS') process.exit(11);`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
});

test('canonical hides safe-area edges but visible bars restore native safe-area edges', async () => {
  ensureFoundationSmokeScenarioRegistered();
  const view = render(<FoundationBootstrapView />);
  await act(async () => {
    await handleHarnessDeepLink('bluemobile://debug/case/FOUNDATION-SMOKE?hideBars=1');
  });
  expect(view.getByTestId('screen.FOUNDATION-SMOKE').props.edges).toEqual({
    top: 'off',
    right: 'off',
    bottom: 'off',
    left: 'off',
  });
  await act(async () => {
    await handleHarnessDeepLink('bluemobile://debug/case/FOUNDATION-SMOKE?hideBars=0');
  });
  expect(view.getByTestId('screen.FOUNDATION-SMOKE').props.edges).toEqual({
    top: 'additive',
    right: 'additive',
    bottom: 'additive',
    left: 'additive',
  });
});

test('scenario relaunch remounts native text subtree after font/density changes', async () => {
  ensureFoundationSmokeScenarioRegistered();
  const view = render(<FoundationBootstrapView />);
  const before = view.getByTestId('foundation.toggle');
  await act(async () => {
    await handleHarnessDeepLink('bluemobile://debug/case/FOUNDATION-SMOKE');
  });
  expect(view.getByTestId('foundation.toggle')).not.toBe(before);
});
test('canonical label ink rejects the observed truncated white fragments', () => {
  const code = `import fs from 'node:fs';import {decodePngRgba,evaluateFoundationToggleInk} from './scripts/native-device-utils.mjs';
 const bounds={x:20,y:121,width:120,height:48};
 const bad=decodePngRgba(fs.readFileSync('artifacts/agy/plan01/task02/sol-handoff/clipped-canonical-before.png'));
 if(evaluateFoundationToggleInk(bad,bounds).valid)process.exit(10);
 const good=decodePngRgba(fs.readFileSync('artifacts/FOUNDATION-SMOKE/implementation.png'));
 if(!evaluateFoundationToggleInk(good,bounds).valid)process.exit(11);`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: root,
    encoding: 'utf8',
  });
  expect(result.status).toBe(0);
});
