import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image, FlatList } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../config/theme';
import { loteriaCards } from '../../config/cards';
import LoteriaCard from '../../components/LoteriaCard';
import * as Crypto from 'expo-crypto';

export default function BuyBoardScreen({ navigation }) {
  const currentUser = useAppStore(state => state.currentUser);
  const games = useAppStore(state => state.games);
  const joinedGameId = useAppStore(state => state.joinedGameId);
  const currentGame = games.find(g => g.id === joinedGameId);
  const userBoards = useAppStore(state => state.userBoards);
  const buyBoard = useAppStore(state => state.buyBoard);

  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [currentBoard, setCurrentBoard] = useState([]);

  if (!currentUser) return null;

  // Generate a random valid board (16 non-repeating cards from 1-54) with Max Dispersion
  const generateRandomBoard = () => {
    // 1. Obtener tablas previas del usuario para minimizar empates
    const myPreviousBoards = currentGame && currentUser 
      ? userBoards.filter(b => b.gameId === currentGame.id && b.userId === currentUser.id)
      : [];

    let bestBoard = [];
    let bestScore = -1;

    // 2. Generar 10 opciones usando Criptografía y elegir la que menos repita cartas
    for (let attempt = 0; attempt < 10; attempt++) {
      const deck = Array.from({ length: 54 }, (_, i) => i + 1);
      for (let i = deck.length - 1; i > 0; i--) {
        // Entropía criptográfica perfecta en lugar de Math.random()
        const bytes = Crypto.getRandomBytes(4);
        const randNum = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
        const secureRandom = randNum / 4294967296;
        
        const j = Math.floor(secureRandom * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const candidate = deck.slice(0, 16);
      
      // Calcular cuántas cartas se repiten con tablas anteriores
      let intersectionCount = 0;
      myPreviousBoards.forEach(board => {
         candidate.forEach(card => {
           if (board.cards.includes(card)) intersectionCount++;
         });
      });

      // Queremos MINIMIZAR la intersección, es decir, MAXIMIZAR este score de "diferencia"
      const score = (16 * myPreviousBoards.length) - intersectionCount;
      if (score > bestScore) {
        bestScore = score;
        bestBoard = candidate;
      }
    }

    setCurrentBoard(bestBoard);
  };

  useEffect(() => {
    generateRandomBoard();
    
    if (currentGame && currentUser) {
      const myBoardsCount = userBoards.filter(b => b.gameId === currentGame.id && b.userId === currentUser.id).length;
      if (myBoardsCount >= 2) {
        Alert.alert('Límite Alcanzado', 'Ya has comprado el máximo de 2 tablas para este juego.');
        navigation.goBack();
      }
    }
  }, []);

  const handleBuy = () => {
    if (!currentGame) return;
    if (currentBoard.length < 16) {
      Alert.alert('Incompleta', 'Tu tabla debe tener exactamente 16 cartas.');
      return;
    }
    if (currentUser.credits < currentGame.price) {
      Alert.alert('Saldo Insuficiente', 'No tienes créditos suficientes.');
      return;
    }
    
    buyBoard(currentGame.id, currentBoard);
    
    const myBoardsCount = userBoards.filter(b => b.gameId === currentGame.id && b.userId === currentUser.id).length;
    
    if (myBoardsCount === 0) {
      Alert.alert(
        '¡Tabla Comprada!',
        'Has comprado tu primera tabla. Tienes derecho a jugar con máximo 2 tablas en esta sala. ¿Qué deseas hacer?',
        [
          { 
            text: 'Comprar Segunda Tabla', 
            onPress: () => {
              toggleMode('auto'); // Limpia y genera una nueva tabla
            }
          },
          { 
            text: 'Entrar a la Sala (1 Tabla)', 
            onPress: () => navigation.replace('GameRoom'),
            style: 'cancel'
          }
        ]
      );
    } else {
      Alert.alert('¡Listos!', 'Has comprado tu segunda y última tabla. ¡Mucha suerte!');
      navigation.replace('GameRoom');
    }
  };

  const toggleMode = (newMode) => {
    setMode(newMode);
    if (newMode === 'auto') {
      generateRandomBoard();
    } else {
      setCurrentBoard([]);
    }
  };

  const addManualCard = (id) => {
    if (currentBoard.includes(id)) {
      Alert.alert('Carta Repetida', 'Ya has seleccionado esta carta. No puede haber repetidas.');
      return;
    }
    if (currentBoard.length >= 16) {
      Alert.alert('Tabla Llena', 'Ya has seleccionado 16 cartas.');
      return;
    }
    setCurrentBoard([...currentBoard, id]);
  };

  const removeManualCard = (id) => {
    if (mode === 'manual') {
      setCurrentBoard(currentBoard.filter(c => c !== id));
    }
  };

  // Render grid cells (16 slots)
  const renderBoardGrid = () => {
    const slots = Array.from({ length: 16 }, (_, i) => currentBoard[i] || null);
    
    return (
      <View style={styles.boardContainer}>
        {slots.map((cardId, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.cardCell}
            onPress={() => cardId && removeManualCard(cardId)}
            disabled={mode === 'auto'}
          >
            {cardId ? (
              <LoteriaCard id={cardId} style={styles.cardImage} emojiSize={30} nameSize={8} numSize={10} />
            ) : (
              <Text style={styles.emptyText}>Vacío</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (!currentGame) {
    return (
      <View style={styles.container}>
        <Text>No hay juego disponible.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', left: 15, top: 55, zIndex: 10 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: 'bold' }}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Crear/Seleccionar Tabla</Text>
        <Text style={styles.subtitle}>Costo: ${currentGame.price}</Text>
      </View>

      <View style={styles.modeToggle}>
        <TouchableOpacity 
          style={[styles.toggleBtn, mode === 'auto' && styles.toggleBtnActive]}
          onPress={() => toggleMode('auto')}
        >
          <Text style={[styles.toggleText, mode === 'auto' && styles.toggleTextActive]}>Sugerida</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleBtn, mode === 'manual' && styles.toggleBtnActive]}
          onPress={() => toggleMode('manual')}
        >
          <Text style={[styles.toggleText, mode === 'manual' && styles.toggleTextActive]}>Manual</Text>
        </TouchableOpacity>
      </View>

      {renderBoardGrid()}

      {mode === 'manual' && (
        <View style={styles.manualSelectionContainer}>
          <Text style={styles.manualInstruction}>
            Toca las cartas abajo para agregarlas ({currentBoard.length}/16). Toca una carta en tu tabla para quitarla.
          </Text>
          <FlatList 
            horizontal
            data={loteriaCards}
            keyExtractor={item => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = currentBoard.includes(item.id);
              return (
                <TouchableOpacity 
                  style={[styles.deckCard, isSelected && styles.deckCardSelected]}
                  onPress={() => addManualCard(item.id)}
                >
                  <LoteriaCard id={item.id} style={styles.deckCardImage} emojiSize={35} nameSize={9} numSize={10} />
                  {isSelected && <View style={styles.overlay}><Text style={styles.overlayText}>✓</Text></View>}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      <View style={styles.actions}>
        {mode === 'auto' && (
          <TouchableOpacity style={styles.shuffleBtn} onPress={generateRandomBoard}>
            <Text style={styles.shuffleBtnText}>Sugerir Otra</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.buyBtn, currentBoard.length < 16 && styles.buyBtnDisabled]} 
          onPress={handleBuy}
          disabled={currentBoard.length < 16}
        >
          <Text style={styles.buyBtnText}>COMPRAR ESTA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.m,
    paddingTop: 50,
    backgroundColor: theme.colors.surface,
    elevation: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  modeToggle: {
    flexDirection: 'row',
    margin: theme.spacing.m,
    backgroundColor: '#E0E0E0',
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    padding: theme.spacing.s,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontWeight: 'bold',
    color: theme.colors.textLight,
  },
  toggleTextActive: {
    color: '#FFF',
  },
  boardContainer: {
    marginHorizontal: theme.spacing.m,
    backgroundColor: theme.colors.boardBackground,
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.m,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    elevation: 5,
  },
  cardCell: {
    width: '23%',
    aspectRatio: 0.65,
    backgroundColor: '#FFF',
    marginBottom: theme.spacing.s,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyText: {
    fontSize: 10,
    color: '#CCC',
  },
  manualSelectionContainer: {
    marginTop: theme.spacing.m,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderColor: '#DDD',
  },
  manualInstruction: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.s,
  },
  deckCard: {
    width: 60,
    height: 90,
    marginRight: theme.spacing.s,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CCC',
  },
  deckCardSelected: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    opacity: 0.7,
  },
  deckCardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  actions: {
    padding: theme.spacing.m,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    marginBottom: theme.spacing.l,
  },
  shuffleBtn: {
    backgroundColor: '#E0E0E0',
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    flex: 1,
    marginRight: theme.spacing.s,
    alignItems: 'center',
  },
  shuffleBtnText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  buyBtn: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    flex: 2,
    alignItems: 'center',
  },
  buyBtnDisabled: {
    backgroundColor: '#CCC',
  },
  buyBtnText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  }
});
