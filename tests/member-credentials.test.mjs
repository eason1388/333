import assert from 'node:assert/strict';
import test from 'node:test';
import {portalConfigs,expectedPassword,validateCredentials} from '../member-credentials.mjs';

test('each portal accepts only its own password namespace',()=>{
  const memberNumber=92575;
  const credentials=Object.fromEntries(Object.entries(portalConfigs).map(([portal,config])=>[
    portal,
    expectedPassword(config,memberNumber)
  ]));

  for(const [portal,password] of Object.entries(credentials)){
    assert.equal(validateCredentials(portal,String(memberNumber),password),memberNumber);
    for(const [otherPortal,otherPassword] of Object.entries(credentials)){
      if(otherPortal!==portal)assert.equal(validateCredentials(portal,String(memberNumber),otherPassword),null);
    }
  }
});

test('a password belongs to one member number only',()=>{
  for(const [portal,config] of Object.entries(portalConfigs)){
    const firstPassword=expectedPassword(config,config.memberStart);
    assert.equal(validateCredentials(portal,String(config.memberStart),firstPassword),config.memberStart);
    assert.equal(validateCredentials(portal,String(config.memberStart+1),firstPassword),null);
  }
});

test('out-of-range and malformed member numbers are rejected',()=>{
  for(const [portal,config] of Object.entries(portalConfigs)){
    assert.equal(validateCredentials(portal,String(config.memberStart-1),'anything'),null);
    assert.equal(validateCredentials(portal,'92575x',expectedPassword(config,config.memberStart)),null);
  }
});
