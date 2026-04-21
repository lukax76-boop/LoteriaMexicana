import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../config/theme';
import LoteriaCard from '../../components/LoteriaCard';
import { loteriaCards } from '../../config/cards';
import * as Speech from 'expo-speech';

export default function AdminGameScreen({ navigation }) {
  const games = useAppStore(state => state.games);
  const game = games.slice().reverse().find(g => g.type === 'universal');
  const startGame = useAppStore(state => state.startGame);
  const drawCard = useAppStore(state => state.drawCard);
  const userBoards = useAppStore(state => state.userBoards);

  const [isAudioEnabled, setIsAudioEnabled] = React.useState(false);

  React.useEffect(() => {
    if (isAudioEnabled && game?.drawnCards?.length > 0) {
      const lastCardId = game.drawnCards[game.drawnCards.length - 1];
      const cardInfo = loteriaCards.find(c => c.id === lastCardId);
      
      if (cardInfo) {
        Speech.stop();
        setTimeout(() => {
          Speech.speak(cardInfo.name, {
            language: 'es',
            rate: 0.95,
            pitch: 1.1
          });
        }, 50);
      }
    }
  }, [game?.drawnCards?.length, isAudioEnabled]);

  if (!game) {
    return (
      <View style={styles.container}>
        <Text>No hay juego activo.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDrawCard = () => {
    drawCard(game.id);
  };

  const handleStartGame = () => {
    startGame(game.id);
  };

  const potWinner = game.pot * ((100 - game.prizePercentageAdmin) / 100);
  const potAdmin = game.pot * (game.prizePercentageAdmin / 100);

  const boardsForCurrentGame = userBoards.filter(b => b.gameId === game.id);
  const playerCount = new Set(boardsForCurrentGame.map(b => b.userId)).size;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sala de Control</Text>
          <Text style={styles.status}>Estado: {game.status.toUpperCase()}</Text>
        </View>
        <TouchableOpacity 
          style={{ 
            backgroundColor: isAudioEnabled ? theme.colors.success : 'rgba(255,255,255,0.3)', 
            paddingHorizontal: 12, 
            paddingVertical: 5, 
            borderRadius: 15,
            borderWidth: 1,
            borderColor: isAudioEnabled ? '#FFF' : 'transparent',
            alignSelf: 'center'
          }}
          onPress={() => {
            const newState = !isAudioEnabled;
            setIsAudioEnabled(newState);
            if (newState) {
              Speech.speak('', { language: 'es' });
            }
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>
            {isAudioEnabled ? '🔊 Narrador: ON' : '🔇 Narrador: OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.statText}>Pozo Total: ${game.pot}</Text>
        <Text style={styles.statText}>Para Ganador(20%): ${potWinner}</Text>
        <Text style={styles.statText}>Para Admin(80%): ${potAdmin}</Text>
        <View style={{ height: 1, backgroundColor: '#CCC', marginVertical: 8 }} />
        <Text style={[styles.statText, { fontWeight: 'bold', color: theme.colors.primary }]}>
          Jugadores en sala: {playerCount} (Tablas compradas: {boardsForCurrentGame.length})
        </Text>
      </View>

      <View style={styles.mainActionContainer}>
        {game.status === 'pending' && (
          playerCount > 0 ? (
            <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
              <Text style={styles.startButtonText}>INICIAR JUEGO</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ alignItems: 'center', padding: 20 }}>
              <Text style={{ fontSize: 18, color: theme.colors.primary, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                Esperando jugadores...
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.textLight, textAlign: 'center' }}>
                El juego no puede iniciar hasta que al menos 1 jugador compre una tabla.
              </Text>
            </View>
          )
        )}

        {game.status === 'active' && (
          <View style={{ alignItems: 'center', width: '100%' }}>
            {game.drawnCards.length > 0 && (
              <View style={styles.lastCardDisplay}>
                <Text style={styles.lastCardLabel}>Acaba de salir:</Text>
                <LoteriaCard 
                  id={game.drawnCards[game.drawnCards.length - 1]} 
                  style={styles.hugeCard}
                  emojiSize={100}
                  nameSize={24}
                  numSize={24}
                />
              </View>
            )}
            <TouchableOpacity 
              style={[styles.drawButton, game.drawnCards.length > 0 ? styles.drawButtonSmall : null]} 
              onPress={handleDrawCard}
            >
              <Text style={[styles.drawButtonText, game.drawnCards.length > 0 ? { fontSize: 20 } : null]}>
                {game.drawnCards.length > 0 ? 'SACAR SIGUIENTE' : 'SACAR PRIMERA CARTA'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {game.status === 'finished' && (
          <View style={styles.winnerCard}>
            <Text style={styles.winnerText}>¡JUEGO TERMINADO!</Text>
            <Text style={styles.winnerSubText}>Ganador(es):</Text>
            {game.winners.map(w => (
              <Text key={w.id} style={styles.winnerName}>• {w.alias}</Text>
            ))}
            {game.winners.length === 0 && (
              <Text style={styles.winnerName}>Nadie (Se agotó la baraja)</Text>
            )}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('AdminDashboard')}>
              <Text style={styles.backButtonText}>Volver al Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Cartas Cantadas ({game.drawnCards.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[...game.drawnCards].reverse().map((card, index) => (
            <View key={index} style={styles.cardItem}>
              <LoteriaCard id={card} style={styles.cardImage} emojiSize={35} nameSize={8} numSize={10} />
            </View>
          ))}
        </ScrollView>
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
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  status: {
    color: '#FFF',
    opacity: 0.8,
  },
  statsCard: {
    margin: theme.spacing.m,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    elevation: 2,
  },
  statText: {
    fontSize: 16,
    marginBottom: 4,
  },
  mainActionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.m,
  },
  startButton: {
    backgroundColor: theme.colors.success,
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  drawButton: {
    backgroundColor: theme.colors.secondary,
    width: 250,
    height: 350,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    borderWidth: 4,
    borderColor: '#FFF',
  },
  drawButtonText: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  lastCardDisplay: {
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  lastCardLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: theme.spacing.s,
  },
  hugeCard: {
    width: 220,
    height: 330,
    borderRadius: 15,
  },
  drawButtonSmall: {
    width: 250,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
  },
  winnerCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.l,
    alignItems: 'center',
  },
  winnerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: theme.spacing.s,
  },
  winnerSubText: {
    fontSize: 18,
  },
  winnerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: theme.spacing.s,
  },
  backButton: {
    marginTop: theme.spacing.l,
    padding: theme.spacing.m,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.m,
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  historyContainer: {
    padding: theme.spacing.m,
    backgroundColor: '#FFF',
    borderTopLeftRadius: theme.borderRadius.l,
    borderTopRightRadius: theme.borderRadius.l,
    elevation: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: theme.spacing.s,
  },
  cardItem: {
    width: 60,
    height: 90,
    backgroundColor: theme.colors.primary,
    marginRight: 8,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCC',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  }
});
