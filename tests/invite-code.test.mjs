import test from 'node:test';
import assert from 'node:assert/strict';
import {makeInviteCode,readInviteCode} from '../src/invite-code.js';

test('one invite code carries both the server address and room code',()=>{
 const code=makeInviteCode({server:'https://bright-room.trycloudflare.com',room:'A1B2C3'});
 assert(code.startsWith('AFI2.'));assert.deepEqual(readInviteCode(code),{server:'https://bright-room.trycloudflare.com',room:'A1B2C3'});
 const lan=makeInviteCode({server:'http://192.168.0.8:8787',room:'00FFAA'});
 assert.deepEqual(readInviteCode(lan),{server:'http://192.168.0.8:8787',room:'00FFAA'});
});
test('invite code rejects malformed, unsafe and oversized values before networking',()=>{
 for(const value of ['', 'AFI2.not-json', 'https://example.com', 'AFI2.'+'A'.repeat(5000)])assert.throws(()=>readInviteCode(value));
 assert.throws(()=>makeInviteCode({server:'http://example.com',room:'A1B2C3'}));
 assert.throws(()=>makeInviteCode({server:'https://room.example',room:'wrong'}));
});
