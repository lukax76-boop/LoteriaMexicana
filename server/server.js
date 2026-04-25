const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

const app = express();
app.use(cors());

// Ruta básica para que Render sepa que el servidor está vivo (Health Check)
app.get('/', (req, res) => {
  res.send('Lotería Server is running!');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));
} else {
  console.log('No MONGODB_URI provided. Running in memory only.');
}

const User = mongoose.model('User', new mongoose.Schema({
  id: String, email: String, alias: String, password: String, role: String, credits: Number
}, { collection: 'users' }));

const Game = mongoose.model('Game', new mongoose.Schema({
  id: String, type: String, creatorId: String, status: String, price: Number, 
  prizePercentageAdmin: Number, scheduledDate: String, scheduledTime: String, 
  pot: Number, currentCards: [Number], drawnCards: [Number], winners: mongoose.Schema.Types.Mixed
}, { collection: 'games' }));

const UserBoard = mongoose.model('UserBoard', new mongoose.Schema({
  id: String, userId: String, gameId: String, cards: [Number], markedCards: [Number], markMode: String
}, { collection: 'userBoards' }));

const Group = mongoose.model('Group', new mongoose.Schema({
  id: String, name: String, creatorId: String, members: [String]
}, { collection: 'groups' }));

const Message = mongoose.model('Message', new mongoose.Schema({
  id: String, groupId: String, senderId: String, text: String, timestamp: String
}, { collection: 'messages' }));

// In-Memory State
let state = {
  users: [],
  games: [],
  userBoards: [],
  groups: [],
  messages: [],
};

async function loadStateFromDB() {
  if (!MONGODB_URI) {
    // If no DB, insert a mock game for testing
    state.games.push({
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
    });
    return;
  }

  try {
    state.users = await User.find({}, '-_id -__v').lean();
    state.games = await Game.find({}, '-_id -__v').lean();
    state.userBoards = await UserBoard.find({}, '-_id -__v').lean();
    state.groups = await Group.find({}, '-_id -__v').lean();
    state.messages = await Message.find({}, '-_id -__v').lean();

    if (state.games.length === 0) {
      // Create an initial game if DB is empty
      const initialGame = {
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
      };
      await Game.create(initialGame);
      state.games.push(initialGame);
    }

    console.log('State loaded from DB successfully! Records found:');
    console.log(`Users: ${state.users.length}, Games: ${state.games.length}, Boards: ${state.userBoards.length}, Groups: ${state.groups.length}, Messages: ${state.messages.length}`);
  } catch (err) {
    console.error('Error loading state from DB:', err);
  }
}

loadStateFromDB();

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
        if (MONGODB_URI) User.create(newUser).catch(console.error);
        break;
      }
      
      case 'ADD_CREDITS': {
        const { userId, amount } = payload;
        const userIndex = state.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          state.users[userIndex].credits += amount;
          if (MONGODB_URI) User.findOneAndUpdate({ id: userId }, { credits: state.users[userIndex].credits }).catch(console.error);
        }
        break;
      }

      case 'CREATE_GAME': {
        const { id, price, prizePercentageAdmin, creatorId, type: gameType, scheduledDate, scheduledTime } = payload || {};
        const isUniversal = gameType !== 'private';
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
        if (MONGODB_URI) Game.create(newGame).catch(console.error);
        break;
      }

      case 'START_GAME': {
        const { gameId } = payload;
        const game = state.games.find(g => g.id === gameId);
        if (game) {
          game.status = 'active';
          // Initialize empty markedCards and default 'auto' mode if not present
          state.userBoards.filter(b => b.gameId === gameId).forEach(b => {
            if (!b.markedCards) b.markedCards = [];
            if (!b.markMode) b.markMode = 'auto';
          });
          if (MONGODB_URI) Game.findOneAndUpdate({ id: gameId }, { status: 'active' }).catch(console.error);
        }
        break;
      }

      case 'DRAW_CARD': {
        const { gameId } = payload;
        const game = state.games.find(g => g.id === gameId);
        
        if (!game || game.status !== 'active') break;
        
        let drawnCard = null;
        if (game.currentCards.length > 0) {
          drawnCard = game.currentCards.shift();
          game.drawnCards.push(drawnCard);
        }
        
        // Auto-mark and Check winners
        const boardsForGame = state.userBoards.filter(b => b.gameId === game.id);
        const winners = [];
        
        boardsForGame.forEach(board => {
          // Auto-mark if the board is in 'auto' mode and has the drawn card
          if (board.markMode === 'auto' && drawnCard && board.cards.includes(drawnCard)) {
            if (!board.markedCards) board.markedCards = [];
            if (!board.markedCards.includes(drawnCard)) {
              board.markedCards.push(drawnCard);
              if (MONGODB_URI) UserBoard.findOneAndUpdate({ id: board.id }, { markedCards: board.markedCards }).catch(console.error);
            }
          }

          // Verificamos si la tabla está llena Y completamente marcada con cartas que sí salieron
          const isFullAndMarked = board.cards.every(c => board.markedCards?.includes(c) && game.drawnCards.includes(c));
          
          if (isFullAndMarked) {
            const user = state.users.find(u => u.id === board.userId);
            if (user) winners.push(user);
          }
        });

        // Terminar si hay ganadores o si ya no quedan cartas
        if (winners.length > 0 || game.currentCards.length === 0) {
          game.status = 'finished';
          game.winners = winners;
        }
        if (MONGODB_URI) Game.findOneAndUpdate({ id: gameId }, { status: game.status, currentCards: game.currentCards, drawnCards: game.drawnCards, winners: game.winners }).catch(console.error);
        break;
      }

      case 'SET_MARK_MODE': {
        const { userId, gameId, mode } = payload;
        const userBoardsInGame = state.userBoards.filter(b => b.userId === userId && b.gameId === gameId);
        userBoardsInGame.forEach(board => {
          board.markMode = mode;
          if (MONGODB_URI) UserBoard.findOneAndUpdate({ id: board.id }, { markMode: mode }).catch(console.error);
        });
        break;
      }

      case 'MARK_CARD': {
        const { boardId, cardId, userId } = payload;
        const board = state.userBoards.find(b => b.id === boardId && b.userId === userId);
        const game = state.games.find(g => g.id === board?.gameId);
        
        if (board && game && game.status === 'active' && game.drawnCards.includes(cardId)) {
          if (!board.markedCards) board.markedCards = [];
          if (!board.markedCards.includes(cardId)) {
            board.markedCards.push(cardId);
            if (MONGODB_URI) UserBoard.findOneAndUpdate({ id: board.id }, { markedCards: board.markedCards }).catch(console.error);
            
            // Check win condition after marking
            const isFullAndMarked = board.cards.every(c => board.markedCards.includes(c) && game.drawnCards.includes(c));
            if (isFullAndMarked) {
              const user = state.users.find(u => u.id === board.userId);
              game.status = 'finished';
              game.winners = [user];
              if (MONGODB_URI) Game.findOneAndUpdate({ id: game.id }, { status: 'finished', winners: game.winners }).catch(console.error);
            }
          }
        }
        break;
      }

      case 'UNMARK_CARD': {
        const { boardId, cardId, userId } = payload;
        const board = state.userBoards.find(b => b.id === boardId && b.userId === userId);
        const game = state.games.find(g => g.id === board?.gameId);
        
        if (board && game && game.status === 'active') {
          if (!board.markedCards) board.markedCards = [];
          board.markedCards = board.markedCards.filter(c => c !== cardId);
          if (MONGODB_URI) UserBoard.findOneAndUpdate({ id: board.id }, { markedCards: board.markedCards }).catch(console.error);
        }
        break;
      }

      case 'BUY_BOARD': {
        const { userId, gameId, cards } = payload;
        const userIndex = state.users.findIndex(u => u.id === userId);
        const game = state.games.find(g => g.id === gameId);
        
        if (userIndex !== -1 && game && state.users[userIndex].credits >= game.price) {
          state.users[userIndex].credits -= game.price;
          const newBoard = { id: Date.now().toString(), userId, gameId, cards, markedCards: [], markMode: 'auto' };
          state.userBoards.push(newBoard);
          game.pot += game.price;
          
          if (MONGODB_URI) {
            User.findOneAndUpdate({ id: userId }, { credits: state.users[userIndex].credits }).catch(console.error);
            UserBoard.create(newBoard).catch(console.error);
            Game.findOneAndUpdate({ id: gameId }, { pot: game.pot }).catch(console.error);
          }
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
        if (MONGODB_URI) Group.create(newGroup).catch(console.error);
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
          if (MONGODB_URI) Message.create(newMessage).catch(console.error);
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
          if (MONGODB_URI) Group.findOneAndUpdate({ id: groupId }, { members: group.members }).catch(console.error);
        }
        break;
      }

      case 'REMOVE_GROUP_MEMBER': {
        const { groupId, requesterId, targetUserId } = payload;
        const group = state.groups.find(g => g.id === groupId);
        
        if (group && group.creatorId === requesterId && targetUserId !== group.creatorId) {
          group.members = group.members.filter(mId => mId !== targetUserId);
          if (MONGODB_URI) Group.findOneAndUpdate({ id: groupId }, { members: group.members }).catch(console.error);
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

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO Multiplayer Server running on port ${PORT}`);
});
