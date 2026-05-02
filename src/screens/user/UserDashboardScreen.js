import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, Modal } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../config/theme';
import LoteriaCard from '../../components/LoteriaCard';
import { BannerAd, BannerAdSize, TestIds } from '../../utils/AdMob';

export default function UserDashboardScreen({ navigation }) {
  const currentUser = useAppStore(state => state.currentUser);
  const games = useAppStore(state => state.games);
  const userBoards = useAppStore(state => state.userBoards);
  const logout = useAppStore(state => state.logout);
  const addCredits = useAppStore(state => state.addCredits);
  const createPrivateGame = useAppStore(state => state.createPrivateGame);
  const joinPrivateGame = useAppStore(state => state.joinPrivateGame);
  const sendMessage = useAppStore(state => state.sendMessage);
  const joinedGameId = useAppStore(state => state.joinedGameId);
  const groups = useAppStore(state => state.groups);

  if (!currentUser) return null;

  const [activeTab, setActiveTab] = useState('universal'); // 'universal' | 'private'
  const [joinCode, setJoinCode] = useState('');
  
  // State for sharing game modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [gameToShare, setGameToShare] = useState(null);

  // State for create game modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [totalRounds, setTotalRounds] = useState(1);
  const [isPublic, setIsPublic] = useState(false);
  const [, setTick] = useState(0);
  const [showAd, setShowAd] = useState(false);

  useEffect(() => {
    // Retrasar renderizado de anuncios para evitar crasheo en la nueva arquitectura
    const adTimer = setTimeout(() => setShowAd(true), 800);
    return () => clearTimeout(adTimer);
  }, []);

  useEffect(() => {
    if (activeTab === 'public') {
      const interval = setInterval(() => setTick(t => t + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);


  const onlinePlayers = useAppStore(state => state.onlinePlayers);
  const myGroups = groups.filter(g => g.members.includes(currentUser.id));

  const handleBuyCredits = () => {
    addCredits(100);
    Alert.alert('Éxito', 'Has recargado $100 créditos (Simulado)');
  };

  const handleCreatePrivate = () => {
    setShowCreateModal(true);
  };

  const confirmCreatePrivate = () => {
    createPrivateGame(50, totalRounds, isPublic);
    setShowCreateModal(false);
  };

  const handleJoinPrivate = () => {
    if (!joinCode.trim()) return;
    const game = games.find(g => g.id === joinCode.trim().toUpperCase());
    if (game && game.type === 'private') {
      joinPrivateGame(game.id);
      Alert.alert('Éxito', 'Te has unido a la sala privada.');
      setJoinCode('');
    } else {
      Alert.alert('Error', 'Código de sala no encontrado o no es privada.');
    }
  };

  const handleShareGame = (game) => {
    setGameToShare(game);
    setShowShareModal(true);
  };

  const sendShareToGroup = (groupId) => {
    if (gameToShare) {
      sendMessage(groupId, `¡Únanse a mi nueva jugada! Código: ${gameToShare.id}`);
      Alert.alert('Enviado', 'La invitación se ha enviado al chat del grupo.');
      setShowShareModal(false);
      setGameToShare(null);
    }
  };

  // Find games
  const universalGame = games.slice().reverse().find(g => g.type === 'universal');
  const privateGame = games.find(g => g.id === joinedGameId && g.type === 'private');
  
  const publicGames = games.filter(g => g.type === 'public_tournament' && g.status === 'pending' && (!g.expiresAt || g.expiresAt > Date.now()));
  const myPublicGame = games.find(g => g.id === joinedGameId && g.type === 'public_tournament');


  const renderGameCard = (gameToRender, isUniversal) => {
    if (!gameToRender) {
      return (
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Text style={styles.noGameText}>No hay juego disponible en este momento.</Text>
        </View>
      );
    }
    
    const myBoards = userBoards.filter(b => b.gameId === gameToRender.id && b.userId === currentUser.id);
    const hasBoardForCurrentGame = myBoards.length > 0;
    const canBuyMore = myBoards.length < 2;

    const handlePlay = () => {
      joinPrivateGame(gameToRender.id);
      if (myBoards.length > 0 || gameToRender.creatorId === currentUser.id) {
        navigation.navigate('GameRoom');
      } else {
        navigation.navigate('BuyBoard');
      }
    };

    return (
      <View style={styles.gameCard}>
        {!isUniversal && (
          <View style={styles.privateHeader}>
            <View>
              <Text style={styles.privateTitle}>Sala Privada</Text>
              <Text style={styles.privateCode}>Código: {gameToRender.id}</Text>
            </View>
            {gameToRender.creatorId === currentUser.id && (
              <TouchableOpacity style={styles.shareBtn} onPress={() => handleShareGame(gameToRender)}>
                <Text style={styles.shareBtnText}>📤 Compartir</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <Text style={styles.gameStatus}>
          Estado: {gameToRender.status === 'pending' ? 'Por iniciar' : gameToRender.status === 'active' ? 'En curso' : 'Terminado'}
        </Text>
        {isUniversal && gameToRender.status === 'pending' && (gameToRender.scheduledDate || gameToRender.scheduledTime) && (
          <View style={styles.scheduleBadge}>
            <Text style={styles.scheduleText}>
              📅 Programada: {gameToRender.scheduledDate} {gameToRender.scheduledTime}
            </Text>
          </View>
        )}
        <Text style={styles.gamePrice}>Costo de tabla: ${gameToRender.price}</Text>
        <Text style={styles.gamePot}>Premio Acumulado: ${gameToRender.pot * ( (100 - gameToRender.prizePercentageAdmin) / 100 )}</Text>
        
        {hasBoardForCurrentGame && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Tus Tablas para este juego ({myBoards.length}/2):</Text>
            {myBoards.map((board, bIndex) => (
              <View key={board.id} style={{ marginBottom: 10 }}>
                <Text style={styles.previewSubtitle}>Tabla {bIndex + 1}</Text>
                <View style={styles.previewGrid}>
                  {board.cards.slice(0, 4).map((cardId, index) => (
                    <LoteriaCard key={index} id={cardId} style={styles.previewCard} emojiSize={30} nameSize={8} numSize={10} />
                  ))}
                </View>
              </View>
            ))}
            <Text style={styles.previewHint}>(Mostrando primeras 4 cartas de cada tabla)</Text>
          </View>
        )}

        {gameToRender.status === 'finished' ? (
          <View>
            <View style={{ padding: 15, backgroundColor: '#E8F5E9', borderRadius: 8, marginBottom: 10, alignItems: 'center' }}>
              <Text style={{ color: '#2E7D32', fontWeight: 'bold', textAlign: 'center' }}>
                Juego finalizado. Esperando a que el organizador cree una nueva ronda...
              </Text>
            </View>
            <TouchableOpacity style={[styles.playBtn, { backgroundColor: theme.colors.primary }]} onPress={() => { joinPrivateGame(gameToRender.id); navigation.navigate('GameRoom'); }}>
              <Text style={styles.playBtnText}>VER RESULTADOS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {canBuyMore && myBoards.length === 1 && (
              <TouchableOpacity style={[styles.playBtn, { backgroundColor: theme.colors.success, marginBottom: 10 }]} onPress={() => { joinPrivateGame(gameToRender.id); navigation.navigate('BuyBoard'); }}>
                <Text style={styles.playBtnText}>COMPRAR SEGUNDA TABLA</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.playBtn} onPress={handlePlay}>
              <Text style={styles.playBtnText}>
                {hasBoardForCurrentGame 
                  ? `ENTRAR A LA SALA (${myBoards.length} ${myBoards.length === 1 ? 'Tabla' : 'Tablas'})` 
                  : (gameToRender.creatorId === currentUser.id ? 'ORGANIZAR SALA' : 'COMPRAR TABLA PARA JUGAR')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Lotería Mexicana</Text>
          <Text style={styles.subtitle}>{currentUser.alias}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeText}>🟢 {onlinePlayers} en línea</Text>
          </View>
          <TouchableOpacity style={[styles.groupsBtn, {marginTop: 8}]} onPress={() => navigation.navigate('Groups')}>
            <Text style={styles.groupsBtnText}>👥 Amigos</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>Tu Saldo</Text>
        <Text style={styles.walletAmount}>${currentUser.credits}</Text>
        <TouchableOpacity style={styles.buyCreditsBtn} onPress={handleBuyCredits}>
          <Text style={styles.buyCreditsText}>+ Recargar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'universal' && styles.tabActive]} 
          onPress={() => setActiveTab('universal')}
        >
          <Text style={[styles.tabText, activeTab === 'universal' && styles.tabTextActive]}>Universal</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'public' && styles.tabActive]} 
          onPress={() => setActiveTab('public')}
        >
          <Text style={[styles.tabText, activeTab === 'public' && styles.tabTextActive]}>Públicos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'private' && styles.tabActive]} 
          onPress={() => setActiveTab('private')}
        >
          <Text style={[styles.tabText, activeTab === 'private' && styles.tabTextActive]}>Personales</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.gameSection} contentContainerStyle={{ paddingBottom: 20 }}>
        {activeTab === 'universal' && renderGameCard(universalGame, true)}
        
        {activeTab === 'public' && (
          <View>
            <Text style={styles.sectionTitle}>Torneos Disponibles</Text>
            {publicGames.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={styles.noGameText}>No hay torneos públicos esperando jugadores.</Text>
              </View>
            ) : (
              publicGames.map(game => {
                const timeLeftMs = game.expiresAt - Date.now();
                const minutes = Math.floor(timeLeftMs / 60000);
                const seconds = Math.floor((timeLeftMs % 60000) / 1000);
                const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                return (
                  <View key={game.id} style={[styles.gameCard, { borderColor: theme.colors.secondary, borderWidth: 2 }]}>
                    <View style={styles.gameCardHeader}>
                      <Text style={styles.gameType}>🌐 TORNEO PÚBLICO ({game.totalRounds} Rondas)</Text>
                      <View style={{ backgroundColor: theme.colors.secondary, paddingHorizontal: 10, borderRadius: 10 }}>
                         <Text style={{ color: 'white', fontWeight: 'bold' }}>Cierra en {timeString}</Text>
                      </View>
                    </View>
                    <View style={styles.gameDetails}>
                      <Text style={styles.gameInfo}>Entrada: ${game.price}</Text>
                      <Text style={styles.gameInfo}>ID: {game.id}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.playBtn, { backgroundColor: theme.colors.secondary }]} 
                      onPress={() => {
                        joinPrivateGame(game.id);
                        navigation.navigate('BuyBoard');
                      }}
                    >
                      <Text style={styles.playBtnText}>¡Unirse al Torneo!</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {myPublicGame && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.sectionTitle}>Tu Torneo Público Seleccionado</Text>
                {renderGameCard(myPublicGame, false)}
              </View>
            )}
          </View>
        )}

        {activeTab === 'private' && (
          <View>
            <View style={styles.privateActions}>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreatePrivate}>
                <Text style={styles.createBtnText}>Crear Mi Propia Jugada</Text>
              </TouchableOpacity>
              
              <View style={styles.joinContainer}>
                <TextInput 
                  style={styles.joinInput}
                  placeholder="Código de Invitación"
                  value={joinCode}
                  onChangeText={setJoinCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity style={styles.joinBtn} onPress={handleJoinPrivate}>
                  <Text style={styles.joinBtnText}>Unirse</Text>
                </TouchableOpacity>
              </View>
            </View>

            {privateGame ? (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.sectionTitle}>Jugada Seleccionada</Text>
                {renderGameCard(privateGame, false)}
              </View>
            ) : (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={styles.noGameText}>Crea o únete a una jugada con el código de tu amigo.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 10, minHeight: 50 }}>
        {showAd && (
          <BannerAd
            unitId={__DEV__ ? TestIds.BANNER : 'ca-app-pub-8231944937056047/4291594252'}
            size={BannerAdSize.BANNER}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* Modal para Compartir */}
      <Modal visible={showShareModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Compartir con un Grupo</Text>
            
            {myGroups.length === 0 ? (
              <Text style={{ textAlign: 'center', marginVertical: 20 }}>No tienes grupos para compartir.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 250, width: '100%' }}>
                {myGroups.map(group => (
                  <TouchableOpacity 
                    key={group.id} 
                    style={styles.groupShareItem}
                    onPress={() => sendShareToGroup(group.id)}
                  >
                    <Text style={styles.groupShareName}>{group.name}</Text>
                    <Text style={styles.groupShareAction}>Enviar →</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowShareModal(false)}>
              <Text style={styles.closeModalText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para Crear Partida */}
      <Modal visible={showCreateModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Configurar Torneo</Text>
            
            <Text style={{ fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 10, marginTop: 10 }}>Cantidad de Rondas:</Text>
            <Text style={{ color: '#666', fontSize: 12, marginBottom: 15, textAlign: 'left' }}>
              Las rondas 1 hasta N-1 se jugarán en "Formas Tradicionales". La ronda final será "Solo Centro" y pagará el 50% de la bolsa acumulada.
            </Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
              {[1, 2, 3, 5, 7, 10].map(rounds => (
                <TouchableOpacity 
                  key={rounds}
                  style={[styles.winModeBtn, { width: '30%', marginHorizontal: '1%', padding: 10 }, totalRounds === rounds && styles.winModeBtnActive]}
                  onPress={() => setTotalRounds(rounds)}
                >
                  <Text style={[styles.winModeText, totalRounds === rounds && styles.winModeTextActive]}>
                    {rounds} {rounds === 1 ? 'Juego' : 'Juegos'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{ fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: 10, marginTop: 20 }}>Visibilidad del Torneo:</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 }}>
              <TouchableOpacity 
                style={[styles.winModeBtn, { width: '48%', padding: 10 }, !isPublic && styles.winModeBtnActive]}
                onPress={() => setIsPublic(false)}
              >
                <Text style={[styles.winModeText, !isPublic && styles.winModeTextActive]}>🔒 Privado</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.winModeBtn, { width: '48%', padding: 10 }, isPublic && styles.winModeBtnActive]}
                onPress={() => setIsPublic(true)}
              >
                <Text style={[styles.winModeText, isPublic && styles.winModeTextActive]}>🌐 Público</Text>
              </TouchableOpacity>
            </View>
            {isPublic && (
              <Text style={{ color: theme.colors.secondary, fontSize: 12, marginBottom: 15, textAlign: 'center', fontWeight: 'bold' }}>
                Tu torneo será visible para todos por 5 minutos antes de cerrarse.
              </Text>
            )}

            <TouchableOpacity style={[styles.createBtn, { width: '100%', marginTop: 20 }]} onPress={confirmCreatePrivate}>
              <Text style={styles.createBtnText}>Crear Torneo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowCreateModal(false)}>
              <Text style={styles.closeModalText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.m,
  },
  header: {
    marginTop: 40,
    marginBottom: theme.spacing.l,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textLight,
  },
  groupsBtn: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  groupsBtnText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  walletCard: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.l,
    borderRadius: theme.borderRadius.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.m,
  },
  walletLabel: {
    color: '#FFF',
    fontSize: 14,
  },
  walletAmount: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  buyCreditsBtn: {
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.m,
  },
  buyCreditsText: {
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    padding: theme.spacing.m,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.secondary,
  },
  tabText: {
    fontWeight: 'bold',
    color: theme.colors.textLight,
  },
  tabTextActive: {
    color: theme.colors.text,
  },
  gameSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: theme.spacing.m,
  },
  gameCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.l,
    borderRadius: theme.borderRadius.l,
    elevation: 3,
  },
  privateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    paddingBottom: theme.spacing.s,
  },
  privateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  privateCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.accent,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  gameStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.accent,
    marginBottom: theme.spacing.s,
  },
  gamePrice: {
    fontSize: 16,
    marginBottom: theme.spacing.xs,
  },
  gamePot: {
    fontSize: 16,
    color: theme.colors.success,
    fontWeight: 'bold',
    marginBottom: theme.spacing.m,
  },
  scheduleBadge: {
    backgroundColor: '#E3F2FD',
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.s,
    marginBottom: theme.spacing.s,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  scheduleText: {
    color: '#1565C0',
    fontWeight: 'bold',
    fontSize: 14,
  },
  previewContainer: {
    backgroundColor: theme.colors.boardBackground,
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: theme.spacing.s,
    color: theme.colors.text,
  },
  previewSubtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  previewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewCard: {
    width: '23%',
    aspectRatio: 0.65,
    borderRadius: 4,
  },
  previewHint: {
    fontSize: 10,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  playBtn: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
  },
  playBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noGameText: {
    fontSize: 16,
    color: theme.colors.textLight,
    fontStyle: 'italic',
  },
  privateActions: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    elevation: 2,
  },
  createBtn: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  createBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  joinContainer: {
    flexDirection: 'row',
  },
  joinInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: theme.borderRadius.m,
    paddingHorizontal: theme.spacing.m,
    fontSize: 16,
    marginRight: theme.spacing.s,
  },
  joinBtn: {
    backgroundColor: theme.colors.success,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    justifyContent: 'center',
  },
  joinBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: theme.spacing.m,
    alignItems: 'center',
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 16,
  },
  shareBtn: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  shareBtnText: {
    color: '#1565C0',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 15,
  },
  groupShareItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    width: '100%',
  },
  groupShareName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  groupShareAction: {
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  closeModalBtn: {
    marginTop: 20,
    padding: 15,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  closeModalText: {
    color: theme.colors.textLight,
    fontWeight: 'bold',
    fontSize: 16,
  },
  winModeBtn: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#F5F5F5'
  },
  winModeBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#E3F2FD'
  },
  winModeText: {
    color: theme.colors.text,
    fontSize: 14,
    textAlign: 'center'
  },
  winModeTextActive: {
    color: theme.colors.primary,
    fontWeight: 'bold'
  },
  onlineBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#81C784',
  },
  onlineBadgeText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: 'bold',
  }
});
