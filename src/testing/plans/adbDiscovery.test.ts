import { spawnSync } from 'node:child_process';
import * as path from 'node:path';

describe('Production ADB discovery', () => {
  function run(body: string): void {
    const r = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import {getOnlineAdbDevices} from './scripts/run-case.mjs';
      ${body}
    `,
      ],
      { cwd: path.resolve(__dirname, '../../..'), encoding: 'utf8' },
    );
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  }
  it('retries discovery timeout and validates the returned serial explicitly', () => {
    run(`
      const calls=[];
      const outputs=[{status:null,error:{code:'ETIMEDOUT',message:'spawn timeout'},stdout:'',stderr:''},{status:0,stdout:'List of devices attached\\nemulator-5554\\tdevice\\n',stderr:''},{status:0,stdout:'device\\n',stderr:''}];
      const actual=getOnlineAdbDevices({exists:()=>true,wait:()=>{},serial:'emulator-5554',spawn:(bin,args)=>{calls.push(args);return outputs.shift();}});
      if(actual.error || JSON.stringify(actual.devices)!==JSON.stringify(['emulator-5554']))throw Error(JSON.stringify(actual));
      if(JSON.stringify(calls)!==JSON.stringify([['devices'],['devices'],['-s','emulator-5554','get-state']]))throw Error(JSON.stringify(calls));
      if(actual.diagnostics[0].errorCode!=='ETIMEDOUT')throw Error('lost diagnostic');
    `);
  });
  it('fails closed with raw diagnostics after bounded discovery failures', () => {
    run(`
      let calls=0;
      const actual=getOnlineAdbDevices({exists:()=>true,wait:()=>{},spawn:()=>{calls++;return {status:1,signal:null,stdout:'raw output',stderr:'transport error'};}});
      if(calls!==3 || actual.devices.length || !actual.error.includes('transport error') || actual.diagnostics[2].stdout!=='raw output')throw Error(JSON.stringify(actual));
    `);
  });
  it('rejects an unlisted requested serial and an offline get-state result', () => {
    run(`
      const list={status:0,stdout:'List of devices attached\\nemulator-5554\\tdevice\\n',stderr:''};
      const missing=getOnlineAdbDevices({exists:()=>true,wait:()=>{},serial:'other',spawn:()=>list});
      if(missing.devices.length || !missing.error)throw Error('unlisted serial accepted');
      const offline=getOnlineAdbDevices({exists:()=>true,wait:()=>{},serial:'emulator-5554',spawn:(bin,args)=>args[0]==='devices'?list:{status:0,stdout:'offline',stderr:''}});
      if(offline.devices.length || !offline.error)throw Error('offline serial accepted');
    `);
  });
});
