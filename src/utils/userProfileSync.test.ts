import test from 'node:test';
import assert from 'node:assert/strict';
import {ensureProfileRecord} from './userProfileSync.ts';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Header} from '../components/Header.tsx';
import {journeyFixture} from '../../tests/gateAJourneyFixture.ts';

test('existing profile startup can read projects without a write, even when writes are quota-blocked',async()=>{
  let reads=0,writes=0;
  await ensureProfileRecord({read:async()=>{reads++;return {displayName:'TEST-ONLY'};},create:async()=>{writes++;throw new Error('quota');},update:async()=>{writes++;throw new Error('quota');},values:{displayName:'New test value'},readOnlyIfExists:true});
  assert.equal(reads,1);assert.equal(writes,0);
});
test('unchanged profile values do not generate redundant writes or overwrite an active project',async()=>{
  let writes=0;
  await ensureProfileRecord({read:async()=>({displayName:'TEST-ONLY',activeProjectId:'retained'}),create:async()=>{writes++;},update:async()=>{writes++;},values:{displayName:'TEST-ONLY'}});
  assert.equal(writes,0);
});
test('new profile creation and denied profile reads remain required security boundaries',async()=>{
  let created=0,updated=0;
  await assert.rejects(ensureProfileRecord({read:async()=>null,create:async()=>{created++;throw new Error('quota');},update:async()=>{updated++;},values:{displayName:'TEST-ONLY'},readOnlyIfExists:true}),/quota/);
  assert.equal(created,1);assert.equal(updated,0);
  await assert.rejects(ensureProfileRecord({read:async()=>{throw new Error('permission denied');},create:async()=>{},update:async()=>{},values:{},readOnlyIfExists:true}),/permission denied/);
});
test('an unhydrated workspace or a local draft is never labelled Cloud Synced',()=>{
  const props={project:journeyFixture(),onToggleNavigation:()=>{},navigationOpen:false,activeView:'dashboard' as const,setActiveView:()=>{},progressPercent:0,lang:'en' as const,setLang:()=>{}};
  const loading=renderToStaticMarkup(React.createElement(Header,{...props,workspaceReady:false,workspaceLoading:true,saveStatus:'saved'}));
  assert.match(loading,/Loading workspace/);assert.doesNotMatch(loading,/Cloud Synced/);
  const unloaded=renderToStaticMarkup(React.createElement(Header,{...props,workspaceReady:false,workspaceLoading:false}));
  assert.match(unloaded,/Workspace not loaded/);assert.doesNotMatch(unloaded,/Cloud Synced/);
  const local=renderToStaticMarkup(React.createElement(Header,{...props,saveStatus:'local'}));
  assert.match(local,/Local draft/);assert.doesNotMatch(local,/Cloud Synced/);
});
