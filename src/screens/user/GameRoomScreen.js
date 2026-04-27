import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../config/theme';
import LoteriaCard from '../../components/LoteriaCard';
import { loteriaCards } from '../../config/cards';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

let BannerAd, BannerAdSize, TestIds;
if (Platform.OS !== 'web') {
  const adMob = require('react-native-google-mobile-ads');
  BannerAd = adMob.BannerAd;
  BannerAdSize = adMob.BannerAdSize;
  TestIds = adMob.TestIds;
}

export default function GameRoomScreen({ navigation }) {
  const currentUser = useAppStore(state => state.currentUser);
  const games = useAppStore(state => state.games);
  const joinedGameId = useAppStore(state => state.joinedGameId);
  const currentGame = games.find(g => g.id === joinedGameId);
  const userBoards = useAppStore(state => state.userBoards);
  
  const startGame = useAppStore(state => state.startGame);
  const drawCard = useAppStore(state => state.drawCard);
  const setMarkMode = useAppStore(state => state.setMarkMode);
  const markCard = useAppStore(state => state.markCard);
  const unmarkCard = useAppStore(state => state.unmarkCard);
  const startNextRound = useAppStore(state => state.startNextRound);

  const [isAudioEnabled, setIsAudioEnabled] = React.useState(false);

  if (!currentUser) return null;

  // Efecto para narrar la carta sacada
  React.useEffect(() => {
    if (isAudioEnabled && currentGame?.drawnCards?.length > 0) {
      const lastCardId = currentGame.drawnCards[currentGame.drawnCards.length - 1];
      const cardInfo = loteriaCards.find(c => c.id === lastCardId);
      
      if (cardInfo) {
        Speech.stop(); // Detener audio anterior si vienen muy rápido
        
        setTimeout(() => {
          Speech.speak(cardInfo.name, {
            language: 'es',
            rate: 0.95,
            pitch: 1.1
          });
        }, 50);
      }
    }
  }, [currentGame?.drawnCards?.length, isAudioEnabled]);

  if (!currentGame) {
    return (
      <View style={styles.container}>
        <Text>No hay juego disponible.</Text>
      </View>
    );
  }

  const isOrganizer = currentGame.creatorId === currentUser.id;
  const myBoards = userBoards.filter(b => b.userId === currentUser.id && b.gameId === currentGame.id);
  const prize = currentGame.pot * ((100 - currentGame.prizePercentageAdmin) / 100);

  // Determine if a card on the board has been marked
  const isMarked = (board, card) => board.markedCards?.includes(card);

  // Determine user's current mark mode from their first board (all their boards share the mode)
  const currentMarkMode = myBoards.length > 0 ? (myBoards[0].markMode || 'auto') : 'auto';

  const toggleMarkMode = () => {
    const newMode = currentMarkMode === 'auto' ? 'manual' : 'auto';
    setMarkMode(currentGame.id, newMode);
  };

  const handleCardPress = (board, card) => {
    if (currentGame.status === 'finished') return;
    if (board.markMode === 'auto') return; // Ignore manual tap in auto mode
    if (!currentGame.drawnCards.includes(card)) return; // Only allow marking drawn cards

    if (isMarked(board, card)) {
      unmarkCard(board.id, card);
    } else {
      markCard(board.id, card);
    }
  };

  // Calculate statistics: who is closest to winning
  const boardsForGame = userBoards.filter(b => b.gameId === currentGame.id);
  
  // Extract unique users who bought a board
  const uniquePlayerIds = [...new Set(boardsForGame.map(b => b.userId))];
  const playerCount = uniquePlayerIds.length;
  const users = useAppStore(state => state.users);
  const playerAliases = uniquePlayerIds.map(id => {
    const u = users.find(user => user.id === id);
    return u ? u.alias : 'Desconocido';
  });
  
  const isPrivate = currentGame.type === 'private';
  const requiredPlayers = isPrivate ? 2 : 1;
  const canStart = playerCount >= requiredPlayers;

  let minMissing = 16;
  let playersAtMin = 0;

  boardsForGame.forEach(board => {
    let missing = 0;
    board.cards?.forEach(c => {
      if (!currentGame.drawnCards?.includes(c)) {
        missing++;
      }
    });

    if (missing < minMissing) {
      minMissing = missing;
      playersAtMin = 1;
    } else if (missing === minMissing) {
      playersAtMin++;
    }
  });

  const getWinModeText = () => {
    switch(currentGame.winMode) {
      case 'traditional': return '🏆 Gana: Tradicional';
      case 'center': return '🏆 Gana: Solo Centro';
      default: return '🏆 Gana: Carta Llena';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('UserDashboard')} style={{ paddingRight: 10 }}>
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>← Volver</Text>
        </TouchableOpacity>
        
        <View style={{ alignItems: 'center', marginHorizontal: 10 }}>
          {currentGame.isTournament && (
            <>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>Torneo</Text>
              <Text style={{ color: '#FFF', fontSize: 12 }}>Ronda {currentGame.currentRound} de {currentGame.totalRounds}</Text>
            </>
          )}
        </View>

        <View style={{ alignItems: 'flex-end', flex: 1 }}>
          <Text style={styles.potText}>Premio: ${prize}</Text>
          <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold', marginTop: 2, marginBottom: 2 }}>{getWinModeText()}</Text>
          <TouchableOpacity 
            style={{ 
              backgroundColor: isAudioEnabled ? theme.colors.success : 'rgba(255,255,255,0.3)', 
              paddingHorizontal: 12, 
              paddingVertical: 5, 
              borderRadius: 15, 
              marginTop: 5,
              borderWidth: 1,
              borderColor: isAudioEnabled ? '#FFF' : 'transparent'
            }}
            onPress={() => {
              const newState = !isAudioEnabled;
              setIsAudioEnabled(newState);
              if (newState) {
                // Desbloqueo silencioso para móviles
                Speech.speak('', { language: 'es' });
              }
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>
              {isAudioEnabled ? '🔊 Narrador: ON' : '🔇 Narrador: OFF'}
            </Text>
          </TouchableOpacity>
          
          {myBoards.length > 0 && (
            <TouchableOpacity 
              style={{ 
                backgroundColor: currentMarkMode === 'auto' ? theme.colors.primary : '#E65100', 
                paddingHorizontal: 12, 
                paddingVertical: 5, 
                borderRadius: 15, 
                marginTop: 5,
                borderWidth: 1,
                borderColor: '#FFF'
              }}
              onPress={toggleMarkMode}
            >
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>
                {currentMarkMode === 'auto' ? '⚙️ Marcado: AUTO' : '🖐️ Marcado: MANUAL'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* PANEL DE ORGANIZADOR */}
      {isOrganizer && (
        <View style={styles.organizerPanel}>
          <Text style={styles.organizerTitle}>Panel de Organizador</Text>
          <Text style={styles.organizerStats}>Jugadores en sala: {playerCount}</Text>
          
          {currentGame.status === 'pending' && (
             <View style={{ alignItems: 'center' }}>
               <TouchableOpacity 
                 style={[styles.orgButton, !canStart && { opacity: 0.5 }]} 
                 onPress={() => canStart && startGame(currentGame.id)}
                 disabled={!canStart}
               >
                 <Text style={styles.orgButtonText}>{canStart ? 'INICIAR JUEGO' : `ESPERANDO JUGADORES (${playerCount}/${requiredPlayers})`}</Text>
               </TouchableOpacity>
               {playerCount > 0 && (
                 <Text style={{ marginTop: 10, fontSize: 12, color: '#388E3C' }}>
                   Listos para jugar: {playerAliases.join(', ')}
                 </Text>
               )}
               {isPrivate && myBoards.length === 0 && (
                 <Text style={{ marginTop: 5, fontSize: 12, color: theme.colors.error, fontWeight: 'bold' }}>
                   ⚠️ Tú no cuentas como jugador hasta que compres tu propia tabla.
                 </Text>
               )}
             </View>
          )}

          {currentGame.status === 'active' && (
             <TouchableOpacity style={[styles.orgButton, { backgroundColor: theme.colors.secondary }]} onPress={() => drawCard(currentGame.id)}>
               <Text style={[styles.orgButtonText, { color: theme.colors.text }]}>
                 {currentGame.drawnCards.length > 0 ? 'SACAR SIGUIENTE' : 'SACAR PRIMERA CARTA'}
               </Text>
             </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.lastCardContainer}>
        <Text style={styles.lastCardTitle}>Última carta:</Text>
        {(currentGame.drawnCards?.length || 0) > 0 ? (
          <View style={styles.bigCard}>
            <LoteriaCard 
              id={currentGame.drawnCards[currentGame.drawnCards.length - 1]} 
              style={styles.bigCardImage}
              emojiSize={60}
              nameSize={16}
              numSize={18}
            />
          </View>
        ) : (
          <Text style={styles.waitingText}>Esperando que inicie la ronda...</Text>
        )}
      </View>

      {boardsForGame.length > 0 && minMissing > 0 && minMissing <= 5 && currentGame.status === 'active' && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            🔥 A {playersAtMin} jugador{playersAtMin !== 1 ? 'es' : ''} le faltan {minMissing} carta{minMissing !== 1 ? 's' : ''} para ganar
          </Text>
        </View>
      )}

      <ScrollView style={styles.boardWrapper} contentContainerStyle={{ paddingBottom: 20 }}>
        {myBoards.length === 0 && !isOrganizer && (
           <Text style={{ textAlign: 'center', marginTop: 20, color: theme.colors.textLight }}>No compraste tabla para esta ronda. Solo estás como espectador.</Text>
        )}
        {myBoards.length === 0 && isOrganizer && (
           <View style={{ alignItems: 'center', marginTop: 10 }}>
             <Text style={{ textAlign: 'center', color: theme.colors.textLight, marginBottom: 10 }}>Eres el organizador. Si también quieres jugar con tus propias tablas:</Text>
             <TouchableOpacity style={{ backgroundColor: theme.colors.primary, padding: 10, borderRadius: 8 }} onPress={() => navigation.navigate('BuyBoard')}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Comprar Mi Propia Tabla</Text>
             </TouchableOpacity>
           </View>
        )}

        {myBoards.length === 1 && currentGame.status === 'pending' && (
           <View style={{ alignItems: 'center', marginVertical: 10 }}>
             <TouchableOpacity style={{ backgroundColor: theme.colors.success, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, elevation: 2 }} onPress={() => navigation.navigate('BuyBoard')}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>+ Comprar Segunda Tabla</Text>
             </TouchableOpacity>
           </View>
        )}

        {myBoards.map((board, bIndex) => (
          <View key={board.id} style={{ marginBottom: 20 }}>
            {myBoards.length > 1 && (
              <Text style={styles.boardIndexTitle}>Tabla {bIndex + 1}</Text>
            )}
            <View style={styles.boardContainer}>
              {board.cards?.map((card, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.cardCell, isMarked(board, card) && styles.markedCell]}
                  onPress={() => handleCardPress(board, card)}
                  activeOpacity={0.7}
                >
                  <LoteriaCard id={card} style={styles.cardImage} emojiSize={35} nameSize={9} numSize={10} />
                  {isMarked(board, card) && <Image source={require('../../../assets/bean.jpg')} style={styles.bean} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {Platform.OS !== 'web' && BannerAd && (
        <View style={{ alignItems: 'center', backgroundColor: '#FFF' }}>
          <BannerAd
            unitId={__DEV__ ? TestIds.BANNER : 'ca-app-pub-8231944937056047/4291594252'}
            size={BannerAdSize.BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        </View>
      )}

      {/* Modal Fin de Ronda o Torneo */}
      {(currentGame.status === 'finished' || currentGame.status === 'round_finished') && (
        <View style={styles.winnerOverlay}>
          <View style={styles.winnerModal}>
            <Text style={styles.winnerText}>
              {currentGame.status === 'finished' ? '¡TORNEO TERMINADO!' : `¡FIN DE RONDA ${currentGame.currentRound}!`}
            </Text>
            
            {currentGame.status === 'round_finished' && (
              <>
                <Text style={styles.winnerSubText}>Ganador(es) de la ronda:</Text>
                {currentGame.winners?.map(w => (
                  <Text key={w.id} style={styles.winnerName}>{w.alias}</Text>
                ))}
                
                {isOrganizer && (
                  <TouchableOpacity 
                    style={[styles.orgButton, { backgroundColor: theme.colors.primary, marginTop: 20 }]} 
                    onPress={() => startNextRound(currentGame.id)}
                  >
                    <Text style={[styles.orgButtonText, { color: '#FFF' }]}>Comenzar Ronda {currentGame.currentRound + 1}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {currentGame.status === 'finished' && (
              <>
                <Text style={styles.winnerSubText}>Resumen de Ganancias:</Text>
                <ScrollView style={{ maxHeight: 200, width: '100%', marginVertical: 10 }}>
                  {(() => {
                    // Calculate total earnings per player
                    const earnings = {};
                    currentGame.roundWinners?.forEach(rw => {
                      rw.winners.forEach(w => {
                        earnings[w.alias] = (earnings[w.alias] || 0) + rw.prizePerWinner;
                      });
                    });
                    
                    const playersWithEarnings = Object.entries(earnings).sort((a, b) => b[1] - a[1]);
                    
                    if (playersWithEarnings.length === 0) {
                      return <Text style={{textAlign: 'center', marginTop: 10}}>Nadie ganó premios en este torneo.</Text>;
                    }

                    return playersWithEarnings.map(([alias, amount]) => (
                      <View key={alias} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
                        <Text style={{ fontWeight: 'bold' }}>{alias}</Text>
                        <Text style={{ color: theme.colors.success, fontWeight: 'bold' }}>+${amount.toFixed(2)}</Text>
                      </View>
                    ));
                  })()}
                </ScrollView>
              </>
            )}

            <TouchableOpacity 
              style={[styles.backButton, { marginTop: 15 }]} 
              onPress={() => navigation.navigate('UserDashboard')}
            >
              <Text style={styles.backButtonText}>{currentGame.status === 'finished' ? 'Salir' : 'Volver al Menú'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  potText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.secondary,
  },
  organizerPanel: {
    backgroundColor: '#E8F5E9',
    padding: theme.spacing.m,
    borderBottomWidth: 1,
    borderColor: '#A5D6A7',
    alignItems: 'center',
  },
  organizerTitle: {
    fontWeight: 'bold',
    color: '#2E7D32',
    fontSize: 16,
    marginBottom: 4,
  },
  organizerStats: {
    fontSize: 14,
    color: '#388E3C',
    marginBottom: 10,
  },
  orgButton: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
  },
  orgButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  lastCardContainer: {
    alignItems: 'center',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  lastCardTitle: {
    fontSize: 16,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.s,
  },
  bigCard: {
    width: 120,
    height: 160,
    backgroundColor: '#FFF',
    borderRadius: theme.borderRadius.m,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    overflow: 'hidden',
  },
  bigCardImage: {
    width: '100%',
    height: '100%',
  },
  waitingText: {
    fontStyle: 'italic',
    color: theme.colors.textLight,
  },
  statsContainer: {
    backgroundColor: '#FFF3E0',
    padding: theme.spacing.s,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#FFE0B2',
  },
  statsText: {
    color: '#E65100',
    fontWeight: 'bold',
    fontSize: 14,
  },
  boardIndexTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginLeft: theme.spacing.m,
    marginBottom: theme.spacing.s,
  },
  boardWrapper: {
    flex: 1,
    padding: theme.spacing.m,
  },
  boardContainer: {
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
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  markedCell: {
    opacity: 0.85,
  },
  bean: {
    position: 'absolute',
    width: 35,
    height: 35,
    resizeMode: 'contain',
    zIndex: 10,
  },
  winnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.l,
    elevation: 10,
  },
  winnerModal: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.l,
    width: '100%',
    alignItems: 'center',
  },
  winnerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: theme.spacing.m,
  },
  winnerSubText: {
    fontSize: 16,
    color: theme.colors.textLight,
  },
  winnerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: theme.spacing.s,
  },
  congratsText: {
    marginTop: theme.spacing.m,
    fontSize: 18,
    color: theme.colors.secondary,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    width: '100%',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
