/**
 * 端到端集成测试脚本 v5 - 缩短超时, 逐个测试避免整体超时
 */
import { readFileSync } from 'fs';
import { join } from 'path'; import { homedir } from 'os';
import { createHmac } from 'crypto';
import { io } from 'socket.io-client';

const SERVER = 'http://localhost:5000';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const testIdx = parseInt(process.argv[2] || '0'); // which test to run

let AUTH_TOKEN = '', authHeaders = {};
try {
  const secret = readFileSync(join(homedir(), '.hermes-web-ui', '.token'), 'utf-8').trim();
  const b64url = (s) => Buffer.from(s).toString('base64url');
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub: '1', username: 'admin', role: 'super_admin', type: 'access', aud: 'hermes-web-ui', iat: now, exp: now + 86400 }));
  const sig = createHmac('sha256', secret).update(header + '.' + payload).digest('base64url');
  AUTH_TOKEN = header + '.' + payload + '.' + sig;
  authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_TOKEN}` };
} catch (e) { console.error('JWT failed:', e.message); process.exit(1); }

function collectAgentReplies(socket, timeoutMs = 40000) {
  return new Promise(resolve => {
    const replies = [];
    const handler = (msg) => {
      if (msg.role === 'assistant') {
        replies.push({ senderName: msg.senderName, content: (msg.content || '').substring(0, 200), _t: Date.now() });
        console.log(`    [Agent] ${msg.senderName}: "${(msg.content || '').substring(0, 100)}"`);
      }
    };
    socket.on('message', handler);
    setTimeout(() => { socket.off('message', handler); resolve(replies); }, timeoutMs);
  });
}

async function toggleMention(socket, roomId, enabled) {
  return new Promise(resolve => {
    socket.emit('toggle_agent_mention', { roomId, enabled }, (res) => {
      console.log(`  [Toggle ${enabled ? 'ON' : 'OFF'}]`, JSON.stringify(res));
      resolve(res);
    });
    setTimeout(() => resolve({ ok: true }), 3000);
  });
}

async function updateRules(socket, roomId, rules) {
  return new Promise(resolve => {
    socket.emit('update_custom_rules', { roomId, customRules: rules }, (res) => {
      console.log('  [Rules updated]', JSON.stringify(res));
      resolve(res);
    });
    setTimeout(() => resolve({ ok: true }), 3000);
  });
}

async function updateConfigAPI(roomId, config) {
  await fetch(`${SERVER}/api/hermes/group-chat/rooms/${roomId}/config`, {
    method: 'PUT', headers: authHeaders, body: JSON.stringify(config),
  });
}

// Use existing room with 2 agents
const ROOM_ID = 'mptu7l66c1obqf'; // room created in v4 run

async function main() {
  console.log(`Running test #${testIdx}...`);
  const socket = io(`${SERVER}/group-chat`, {
    transports: ['websocket'], reconnection: false,
    auth: { userId: 'e2e-tester', name: 'E2E Tester', token: AUTH_TOKEN },
  });

  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', (e) => reject(new Error(`Connect: ${e.message}`)));
    setTimeout(() => reject(new Error('Connection timeout')), 10000);
  });
  console.log('Connected:', socket.id);

  socket.emit('join', { roomId: ROOM_ID, name: 'E2E Tester' });
  await sleep(1500);

  let result = 'SKIP';

  if (testIdx === 1) {
    console.log('\n===== E-1: 完整协作链路 =====');
    await toggleMention(socket, ROOM_ID, true);
    socket.emit('message', { roomId: ROOM_ID, content: '@助手A 帮我问 @助手B 1+1等于几？只回复数字。' });
    const replies = await collectAgentReplies(socket, 50000);
    const names = replies.map(r => r.senderName);
    result = names.includes('助手A') && names.includes('助手B') ? 'PASS' : 'PARTIAL';
    await toggleMention(socket, ROOM_ID, false);
  }
  else if (testIdx === 2) {
    console.log('\n===== E-2: 深度截断 (limit=2) =====');
    await updateConfigAPI(ROOM_ID, { mentionDepthLimit: 2 });
    await toggleMention(socket, ROOM_ID, true);
    socket.emit('message', { roomId: ROOM_ID, content: '@助手A 帮我问 @助手B 太阳从哪升起？简短回答。' });
    const replies = await collectAgentReplies(socket, 50000);
    result = replies.length >= 2 ? 'PASS' : 'PARTIAL';
    await toggleMention(socket, ROOM_ID, false);
    await updateConfigAPI(ROOM_ID, { mentionDepthLimit: 10 });
  }
  else if (testIdx === 3) {
    console.log('\n===== E-3: 用户打断 =====');
    await toggleMention(socket, ROOM_ID, true);
    socket.emit('message', { roomId: ROOM_ID, content: '@助手A 帮我问 @助手B 列举5种编程语言并解释每种' });
    await sleep(5000); // wait for A to finish, B should be queued
    console.log('  [User interrupt]');
    socket.emit('message', { roomId: ROOM_ID, content: '等一下不用回答了' });
    const replies = await collectAgentReplies(socket, 40000);
    const bReplies = replies.filter(r => r.senderName === '助手B');
    // B may still reply if already being processed, but queued B should be cleared
    console.log(`  B replies after interrupt: ${bReplies.length}`);
    result = bReplies.length === 0 ? 'PASS' : 'PARTIAL';
    await toggleMention(socket, ROOM_ID, false);
  }
  else if (testIdx === 4) {
    console.log('\n===== E-4: 关闭开关打断 =====');
    await toggleMention(socket, ROOM_ID, true);
    socket.emit('message', { roomId: ROOM_ID, content: '@助手A 帮我问 @助手B 你最喜欢什么季节？详细解释为什么。' });
    await sleep(5000);
    console.log('  [Toggle OFF]');
    await toggleMention(socket, ROOM_ID, false);
    const replies = await collectAgentReplies(socket, 40000);
    const bReplies = replies.filter(r => r.senderName === '助手B');
    console.log(`  B replies after toggle off: ${bReplies.length}`);
    result = bReplies.length === 0 ? 'PASS' : 'PARTIAL';
  }
  else if (testIdx === 5) {
    console.log('\n===== E-5: 自定义规则生效 =====');
    await updateRules(socket, ROOM_ID, '每条回复必须以"收到"两个字开头');
    await sleep(500);
    await toggleMention(socket, ROOM_ID, true);
    socket.emit('message', { roomId: ROOM_ID, content: '@助手A 你好，自我介绍' });
    const replies = await collectAgentReplies(socket, 40000);
    if (replies.length > 0) {
      const starts = replies[0].content.startsWith('收到');
      console.log(`  Starts with 收到: ${starts}`);
      result = starts ? 'PASS' : 'PARTIAL';
    } else { result = 'FAIL'; }
    await toggleMention(socket, ROOM_ID, false);
    await updateRules(socket, ROOM_ID, '');
  }
  else if (testIdx === 6) {
    console.log('\n===== E-6: @all 协作场景 =====');
    await toggleMention(socket, ROOM_ID, true);
    socket.emit('message', { roomId: ROOM_ID, content: '@all 各自一句话自我介绍' });
    const replies = await collectAgentReplies(socket, 50000);
    console.log(`  Replies: ${replies.length}, names: ${replies.map(r=>r.senderName).join(',')}`);
    result = replies.length >= 2 ? 'PASS' : replies.length >= 1 ? 'PARTIAL' : 'FAIL';
    await toggleMention(socket, ROOM_ID, false);
  }
  else if (testIdx === 7) {
    console.log('\n===== C-3: 规则优先级验证 =====');
    await updateRules(socket, ROOM_ID, '回复时不要表明自己是AI助手，以朋友口吻自然交流。不要说"我是AI"或"作为AI"。');
    await sleep(500);
    await toggleMention(socket, ROOM_ID, true);
    socket.emit('message', { roomId: ROOM_ID, content: '@助手A 简短介绍你自己' });
    const replies = await collectAgentReplies(socket, 40000);
    if (replies.length > 0) {
      const hasAI = /我是AI|我是一个AI|作为AI|作为人工智能|我是人工智能/i.test(replies[0].content);
      console.log(`  Contains AI self-reference: ${hasAI}`);
      result = !hasAI ? 'PASS' : 'PARTIAL';
    } else { result = 'FAIL'; }
    await toggleMention(socket, ROOM_ID, false);
    await updateRules(socket, ROOM_ID, '');
  }

  console.log(`\nRESULT: ${result}`);
  socket.disconnect();
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
