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
  }
});

// Mock DB Initial State
let state = {
  users: [],
  games: [{
    id: 'universal_1',
    type: 'universal',
    creatorId: 'admin',
    status: 'pending',
    price: 50,
    prizePercentageAdmin: 80,
    pot: 0,
    currentCards: (() => {
      const deck = Array.from({ length: 54 }, (_, i) => i + 1);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      return deck;
    })(),
    drawnCards: [],
    winners: [],
  }],
  userBoards: [],
  groups: [],
  messages: [],
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Send the initial state to the connected user
  socket.emit('syncState', state);

  socket.on('dispatch', (action) => {
    const { type, payload } = action;
    console.log('Action received:', type);

    switch (type) {
      case 'REGISTER': {
        const { email, alias, password, role } = payload;
        const newUser = { id: Date.now().toString(), email, alias, password, role, credits: 100 };
        state.users.push(newUser);
        break;
      }
      
      case 'ADD_CREDITS': {
        const { userId, amount } = payload;
        const userIndex = state.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          state.users[userIndex].credits += amount;
        }
        break;
      }

      case 'CREATE_GAME': {
        const { id, price, prizePercentageAdmin, creatorId, type, scheduledDate, scheduledTime } = payload || {};
        const isUniversal = type !== 'private';
        const newGame = {
          id: id || (isUniversal ? 'univ_' + Date.now().toString() : Math.random().toString(36).substring(2, 8).toUpperCase()),
          type: isUniversal ? 'universal' : 'private',
          creatorId: creatorId || 'admin',
          status: 'pending',
          price: price || 50,
          prizePercentageAdmin: prizePercentageAdmin || 80,
          scheduledDate: isUniversal ? scheduledDate : null,
          scheduledTime: isUniversal ? scheduledTime : null,
          pot: 0,
          currentCards: (() => {
            const deck = Array.from({ length: 54 }, (_, i) => i + 1);
            for (let i = deck.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [deck[i], deck[j]] = [deck[j], deck[i]];
            }
            return deck;
          })(),
          drawnCards: [],
          winners: [],
        };
        state.games.push(newGame);
        break;
      }

      case 'START_GAME': {
        const { gameId } = payload;
        const game = state.games.find(g => g.id === gameId);
        if (game) {
          game.status = 'active';
        }
        break;
      }

      case 'DRAW_CARD': {
        const { gameId } = payload;
        const game = state.games.find(g => g.id === gameId);
        
        if (!game || game.status !== 'active') break;
        
        if (game.currentCards.length > 0) {
          const card = game.currentCards.shift();
          game.drawnCards.push(card);
        }
        
        // Check winners
        const boardsForGame = state.userBoards.filter(b => b.gameId === game.id);
        const winners = [];
        
        boardsForGame.forEach(board => {
          const hasWon = board.cards.every(c => game.drawnCards.includes(c));
          if (hasWon) {
            const user = state.users.find(u => u.id === board.userId);
            if (user) winners.push(user);
          }
        });

        // Terminar si hay ganadores o si ya no quedan cartas
        if (winners.length > 0 || game.currentCards.length === 0) {
          game.status = 'finished';
          game.winners = winners;
        }
        break;
      }

      case 'BUY_BOARD': {
        const { userId, gameId, cards } = payload;
        const userIndex = state.users.findIndex(u => u.id === userId);
        const game = state.games.find(g => g.id === gameId);
        
        if (userIndex !== -1 && game && state.users[userIndex].credits >= game.price) {
          state.users[userIndex].credits -= game.price;
          const newBoard = { id: Date.now().toString(), userId, gameId, cards };
          state.userBoards.push(newBoard);
          game.pot += game.price;
        }
        break;
      }

      case 'CREATE_GROUP': {
        const { name, creatorId, aliases } = payload;
        // Encontrar los IDs de los usuarios por su alias
        const members = state.users.filter(u => aliases.includes(u.alias) || u.id === creatorId).map(u => u.id);
        // Asegurar que el creador esté incluido
        if (!members.includes(creatorId)) members.push(creatorId);

        const newGroup = {
          id: 'grp_' + Date.now().toString(),
          name,
          creatorId,
          members: [...new Set(members)],
        };
        state.groups.push(newGroup);
        break;
      }

      case 'SEND_MESSAGE': {
        const { groupId, senderId, text } = payload;
        const group = state.groups.find(g => g.id === groupId);
        if (group && group.members.includes(senderId)) {
          const newMessage = {
            id: 'msg_' + Date.now().toString() + Math.random().toString(36).substring(2, 5),
            groupId,
            senderId,
            text,
            timestamp: new Date().toISOString(),
          };
          state.messages.push(newMessage);
        }
        break;
      }

      case 'ADD_GROUP_MEMBER': {
        const { groupId, requesterId, aliases } = payload;
        const group = state.groups.find(g => g.id === groupId);
        
        if (group && group.creatorId === requesterId) {
          const newMembers = state.users.filter(u => aliases.includes(u.alias)).map(u => u.id);
          const mergedMembers = [...new Set([...group.members, ...newMembers])];
          group.members = mergedMembers;
        }
        break;
      }

      case 'REMOVE_GROUP_MEMBER': {
        const { groupId, requesterId, targetUserId } = payload;
        const group = state.groups.find(g => g.id === groupId);
        
        if (group && group.creatorId === requesterId && targetUserId !== group.creatorId) {
          group.members = group.members.filter(mId => mId !== targetUserId);
        }
        break;
      }
    }

    // Broadcast the updated state to ALL connected clients
    io.emit('syncState', state);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO Multiplayer Server running on port ${PORT}`);
});
