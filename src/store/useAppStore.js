import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import io from 'socket.io-client';
import { SERVER_URL } from '../config/network';

// Connect to the multiplayer server
const socket = io(SERVER_URL);

// Base initial state (Client side only tracks what it receives from server)
const initialState = {
  currentUser: null, // { id, email, alias, role: 'admin' | 'user', credits: 0 }
  users: [],
  joinedGameId: null,
  userBoards: [],
  groups: [],
  messages: [],
};

export const useAppStore = create(
  persist(
    (set, get) => {
      
      // Listen to server state syncs
      socket.on('syncState', (serverState) => {
        set((state) => {
          // Merge server state, but keep the current logged in user active locally 
          // (update its credits/info if the server has newer info)
          let updatedCurrentUser = state.currentUser;
          if (updatedCurrentUser) {
            const serverUser = serverState.users.find(u => u.id === updatedCurrentUser.id);
            if (serverUser) {
              updatedCurrentUser = serverUser;
            } else {
              // Si el servidor se reinició, la base de datos se borró. Forzamos cierre de sesión local.
              updatedCurrentUser = null;
            }
          }
          return { ...serverState, currentUser: updatedCurrentUser };
        });
      });

      return {
        ...initialState,

        // Auth Actions (Executed locally, but emit side-effects if needed)
        register: (email, alias, password, role = 'user') => {
          if (!socket.connected) {
            Alert.alert('Conectando...', 'El servidor en la nube se está despertando. Por favor espera unos segundos e intenta de nuevo.');
            return;
          }
          
          socket.emit('dispatch', { type: 'REGISTER', payload: { email, alias, password, role } });
          
          let attempts = 0;
          const checkUser = setInterval(() => {
            const user = get().users.find((u) => u.email === email);
            if (user) {
              set({ currentUser: user });
              clearInterval(checkUser);
            }
            attempts++;
            if (attempts > 30) { // Esperar hasta 15 segundos por si hay latencia
              clearInterval(checkUser);
              Alert.alert('Aviso', 'El registro fue enviado pero el servidor está tardando. Por favor intenta iniciar sesión manualmente.');
            }
          }, 500);
        },
        
        login: (email, password) => {
          if (!socket.connected && get().users.length === 0) {
            Alert.alert('Conectando...', 'El servidor en la nube se está despertando. Por favor espera unos segundos e intenta de nuevo.');
            return false;
          }
          
          const user = get().users.find((u) => u.email === email && u.password === password);
          if (user) {
            set({ currentUser: user });
            return true;
          }
          return false;
        },
        logout: () => set({ currentUser: null }),

        // Emit actions to server
        addCredits: (amount) => {
          const user = get().currentUser;
          if (user) {
            socket.emit('dispatch', { type: 'ADD_CREDITS', payload: { userId: user.id, amount } });
          }
        },

        createGame: (price = 50, prizePercentageAdmin = 80, scheduledDate = null, scheduledTime = null) => {
          socket.emit('dispatch', { type: 'CREATE_GAME', payload: { price, prizePercentageAdmin, type: 'universal', scheduledDate, scheduledTime } });
        },
        
        createPrivateGame: (price = 50) => {
          const user = get().currentUser;
          if (user) {
            const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
            socket.emit('dispatch', { type: 'CREATE_GAME', payload: { id: gameId, price, prizePercentageAdmin: 0, creatorId: user.id, type: 'private' } });
            set({ joinedGameId: gameId });
          }
        },

        joinPrivateGame: (gameId) => {
          set({ joinedGameId: gameId });
        },

        leavePrivateGame: () => {
          set({ joinedGameId: null });
        },
        
        startGame: (gameId) => {
          socket.emit('dispatch', { type: 'START_GAME', payload: { gameId } });
        },
        
        drawCard: (gameId) => {
          socket.emit('dispatch', { type: 'DRAW_CARD', payload: { gameId } });
        },

        buyBoard: (gameId, cards) => {
          const user = get().currentUser;
          if (user) {
            // Actualización optimista para que la UI reaccione al instante
            const tempBoard = { id: 'temp_' + Date.now(), userId: user.id, gameId, cards };
            set((state) => ({ userBoards: [...state.userBoards, tempBoard] }));
            
            socket.emit('dispatch', { type: 'BUY_BOARD', payload: { userId: user.id, gameId, cards } });
          }
        },

        createGroup: (name, aliases) => {
          const user = get().currentUser;
          if (user) {
            socket.emit('dispatch', { type: 'CREATE_GROUP', payload: { name, creatorId: user.id, aliases } });
          }
        },

        sendMessage: (groupId, text) => {
          const user = get().currentUser;
          if (user) {
            socket.emit('dispatch', { type: 'SEND_MESSAGE', payload: { groupId, senderId: user.id, text } });
          }
        },

        addGroupMembers: (groupId, aliases) => {
          const user = get().currentUser;
          if (user) {
            socket.emit('dispatch', { type: 'ADD_GROUP_MEMBER', payload: { groupId, requesterId: user.id, aliases } });
          }
        },

        removeGroupMember: (groupId, targetUserId) => {
          const user = get().currentUser;
          if (user) {
            socket.emit('dispatch', { type: 'REMOVE_GROUP_MEMBER', payload: { groupId, requesterId: user.id, targetUserId } });
          }
        },
      };
    },
    {
      name: 'loteria-auth', 
      storage: createJSONStorage(() => AsyncStorage),
      // We only want to persist the currentUser login session and joined game, everything else comes from the server
      partialize: (state) => ({ currentUser: state.currentUser, joinedGameId: state.joinedGameId }),
    }
  )
);
