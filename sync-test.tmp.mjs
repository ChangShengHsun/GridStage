/* eslint-disable no-undef */
// Verify y-websocket 1.5.4 server with yjs13/y-websocket3 clients, including
// the LATE JOINER case (needs server-side doc history) that broke the v14 RC.
import * as Y from './apps/web/node_modules/yjs/src/index.js';
import { WebsocketProvider } from './apps/web/node_modules/y-websocket/src/y-websocket.js';

const room = `test-${Date.now()}`;
const docA = new Y.Doc();
const provA = new WebsocketProvider('ws://127.0.0.1:1234', room, docA, {
  WebSocketPolyfill: WebSocket,
});
provA.awareness.setLocalStateField('user', { name: 'A' });
docA.getMap('meta').set('title', 'written before B joined');
await new Promise((r) => setTimeout(r, 1500));

// B joins LATE — must receive history from the server's doc
const docB = new Y.Doc();
const provB = new WebsocketProvider('ws://127.0.0.1:1234', room, docB, {
  WebSocketPolyfill: WebSocket,
});
await new Promise((r) => setTimeout(r, 1500));

const titleAtB = docB.getMap('meta').get('title');
docB.getMap('meta').set('reply', 'from B');
await new Promise((r) => setTimeout(r, 1000));
const replyAtA = docA.getMap('meta').get('reply');
const awarenessAtB = [...provB.awareness.getStates().values()].some((s) => s.user?.name === 'A');

console.log('late-joining B got history:', titleAtB);
console.log('A got live update from B:', replyAtA);
console.log('B sees awareness of A:', awarenessAtB);
if (titleAtB === 'written before B joined' && replyAtA === 'from B' && awarenessAtB) {
  console.log('SYNC OK including late joiner');
} else {
  console.log('SYNC FAILED');
  process.exitCode = 1;
}
provA.destroy();
provB.destroy();
