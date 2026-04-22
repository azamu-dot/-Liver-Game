const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// 状態管理
const rooms = {};

const createCard = (val) => ({
  id: Math.random().toString(36).substr(2, 9) + Date.now(),
  value: val
});

const INITIAL_POINTS = 50;
const INITIAL_HAND_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0]; // 0 is Joker

const PHASE_WAITING = 'waiting';
const PHASE_DISCUSSION = 'discussion';
const PHASE_SUBMISSION = 'submission';
const PHASE_REVEAL = 'reveal';
const PHASE_ENDED = 'ended';

const TIME_DISCUSSION = 180; // 3 minutes
const TIME_SUBMISSION = 60;  // 1 minute
const TIME_REVEAL = 5;       // 5 seconds

function initRoom(roomId) {
  rooms[roomId] = {
    id: roomId,
    players: [], // [ { id, name, points, hand: [], selectedCard: null, connected: true } ]
    phase: PHASE_WAITING,
    turn: 1,
    timer: 0,
    intervalId: null
  };
}

function broadcastRoomState(roomId) {
  if (!rooms[roomId]) return;
  const room = rooms[roomId];
  io.to(roomId).emit('roomState', {
    ...room,
    intervalId: undefined // Don't send internal timer ID
  });
}

function startTimer(roomId, duration, nextPhaseFunc) {
  const room = rooms[roomId];
  if (!room) return;
  clearInterval(room.intervalId);
  room.timer = duration;
  broadcastRoomState(roomId);

  room.intervalId = setInterval(() => {
    room.timer--;
    io.to(roomId).emit('timerUpdate', room.timer);
    
    if (room.timer <= 0) {
      clearInterval(room.intervalId);
      nextPhaseFunc();
    }
  }, 1000);
}

function startGame(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  room.players.forEach(p => {
    p.points = INITIAL_POINTS;
    p.hand = INITIAL_HAND_VALUES.map(v => createCard(v));
    p.usedCards = [];
    p.selectedCard = null;
  });
  room.turn = 1;
  startDiscussionPhase(roomId);
}

function startDiscussionPhase(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  room.phase = PHASE_DISCUSSION;
  startTimer(roomId, TIME_DISCUSSION, () => {
    startSubmissionPhase(roomId);
  });
}

function startSubmissionPhase(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  
  room.phase = PHASE_SUBMISSION;
  startTimer(roomId, TIME_SUBMISSION, () => {
    // 時間切れの場合はランダムにカードを選ぶか、あるいは出さなかったペナルティ（ここでは手札の一番左を選ぶ）
    room.players.forEach(p => {
      if (p.selectedCard === null && p.hand.length > 0) {
        p.selectedCard = p.hand[0];
      }
    });
    resolveTurn(roomId);
  });
}

function resolveTurn(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  clearInterval(room.intervalId);
  room.phase = PHASE_REVEAL;

  const p1 = room.players[0];
  const p2 = room.players[1];

  const v1 = c1 ? c1.value : null;
  const v2 = c2 ? c2.value : null;

  // 手札から削除 (IDで正確に削除)
  const removeCard = (player, cardToRemove) => {
    if (!cardToRemove) return;
    player.hand = player.hand.filter(c => c.id !== cardToRemove.id);
  };
  removeCard(p1, c1);
  removeCard(p2, c2);

  let p1Damage = 0;
  let p2Damage = 0;
  let p1Heal = 0;
  let p2Heal = 0;
  let winner = 0; // 0: draw, 1: p1, 2: p2

  // カードの強さ
  // 0 is Joker
  if (v1 === v2) {
    // Draw
    winner = 0;
    p1.usedCards.push(v1);
    p2.usedCards.push(v2);
  } else if (v1 === 0) {
    // p1 Joker wins
    winner = 1;
    p2Damage = 0;
    p1.hand.push(c2); // steal (オブジェクトごと追加)
    p1.usedCards.push(v1);
  } else if (v2 === 0) {
    // p2 Joker wins
    winner = 2;
    p1Damage = 0;
    p2.hand.push(c1); // steal
    p2.usedCards.push(v2);
  } else if (v1 === 1 && [11, 12, 13].includes(v2)) {
    // p1 1 wins against 11, 12, 13
    winner = 1;
    p2Damage = 50;
    p1.usedCards.push(v1);
    p2.usedCards.push(v2);
  } else if (v2 === 1 && [11, 12, 13].includes(v1)) {
    // p2 1 wins against 11, 12, 13
    winner = 2;
    p1Damage = 50;
    p1.usedCards.push(v1);
    p2.usedCards.push(v2);
  } else if (v1 > v2) {
    winner = 1;
    p2Damage = v2;
    if ([11, 12, 13].includes(v1)) {
      p1Heal = v2;
    }
    p1.usedCards.push(v1);
    p2.usedCards.push(v2);
  } else if (v2 > v1) {
    winner = 2;
    p1Damage = v1;
    if ([11, 12, 13].includes(v2)) {
      p2Heal = v1;
    }
    p1.usedCards.push(v1);
    p2.usedCards.push(v2);
  }

  p1.points -= p1Damage;
  p1.points += p1Heal;
  p2.points -= p2Damage;
  p2.points += p2Heal;

  // Store result for animation
  room.lastResult = { c1, c2, p1Damage, p2Damage, p1Heal, p2Heal, winner };

  broadcastRoomState(roomId);

  startTimer(roomId, TIME_REVEAL, () => {
    p1.selectedCard = null;
    p2.selectedCard = null;

    // Check game end
    if (p1.points <= 0 || p2.points <= 0 || p1.hand.length === 0 || p2.hand.length === 0) {
      room.phase = PHASE_ENDED;
      broadcastRoomState(roomId);
    } else {
      room.turn++;
      startDiscussionPhase(roomId);
    }
  });
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', ({ roomId, playerName, peerId }) => {
    if (!rooms[roomId]) {
      initRoom(roomId);
    }
    const room = rooms[roomId];

    // 名前が一致する既存プレイヤーがいるか確認（テイクオーバー/復帰）
    let player = room.players.find(p => p.name === playerName);
    if (player) {
      // 既存の切断タイマーがあればクリア
      if (player.disconnectTimeoutId) {
        clearTimeout(player.disconnectTimeoutId);
        player.disconnectTimeoutId = null;
      }
      
      player.id = socket.id;
      player.connected = true;
      player.peerId = peerId;
      socket.join(roomId);
      socket.roomId = roomId;
      broadcastRoomState(roomId);
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error', 'Room is full');
      return;
    }

    player = {
      id: socket.id,
      name: playerName || `Player ${room.players.length + 1}`,
      points: INITIAL_POINTS,
      hand: [],
      usedCards: [],
      selectedCard: null,
      connected: true,
      peerId: peerId
    };

    room.players.push(player);
    socket.join(roomId);
    socket.roomId = roomId;

    if (room.players.length === 2 && room.phase === PHASE_WAITING) {
      startGame(roomId);
    } else {
      broadcastRoomState(roomId);
    }
  });

  socket.on('submitCard', (card) => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];

    if (room.phase !== PHASE_SUBMISSION) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || player.selectedCard !== null) return;
    
    // Check if card is in hand (check by ID)
    const cardInHand = player.hand.find(c => c.id === card.id);
    if (!cardInHand) return;

    player.selectedCard = cardInHand;
    broadcastRoomState(roomId); // Broadcast to show "submitted" status

    // If both submitted, resolve early
    if (room.players.every(p => p.selectedCard !== null)) {
      resolveTurn(roomId);
    }
  });

  socket.on('skipDiscussion', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    const room = rooms[roomId];

    if (room.phase !== PHASE_DISCUSSION) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.skipDiscussion = true;
    }

    if (room.players.every(p => p.skipDiscussion)) {
      room.players.forEach(p => p.skipDiscussion = false);
      startSubmissionPhase(roomId);
    } else {
       broadcastRoomState(roomId);
    }
  });

  socket.on('restartGame', () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      startGame(roomId);
    }
  });

  socket.on('resetGame', () => {
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      room.phase = PHASE_WAITING;
      if (room.players.length === 2) {
        startGame(roomId);
      } else {
        broadcastRoomState(roomId);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    const roomId = socket.roomId;
    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.connected = false;
        
        // 待機中または終了後なら即削除
        if (room.phase === PHASE_WAITING || room.phase === PHASE_ENDED) {
          room.players = room.players.filter(p => p.id !== socket.id);
          if (room.players.length === 0) {
            delete rooms[roomId];
            return;
          }
        } else {
          // ゲーム中の場合は30秒待機
          console.log(`Starting 30s grace period for ${player.name}`);
          player.disconnectTimeoutId = setTimeout(() => {
            if (!player.connected) {
              console.log(`Grace period expired for ${player.name}. Ending game.`);
              room.phase = PHASE_ENDED;
              room.players = room.players.filter(p => p.id !== player.id); // 退出扱い
              broadcastRoomState(roomId);
            }
          }, 30000);
        }
      }
      broadcastRoomState(roomId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
