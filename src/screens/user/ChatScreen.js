import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../config/theme';

export default function ChatScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  
  const currentUser = useAppStore(state => state.currentUser);
  const users = useAppStore(state => state.users);
  const messages = useAppStore(state => state.messages);
  const groups = useAppStore(state => state.groups);
  const games = useAppStore(state => state.games);
  const sendMessage = useAppStore(state => state.sendMessage);
  const joinPrivateGame = useAppStore(state => state.joinPrivateGame);
  const addGroupMembers = useAppStore(state => state.addGroupMembers);
  const removeGroupMember = useAppStore(state => state.removeGroupMember);

  if (!currentUser) return null;

  const [text, setText] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [newAliases, setNewAliases] = useState('');
  const flatListRef = useRef(null);

  const group = groups.find(g => g.id === groupId);
  const groupMessages = messages.filter(m => m.groupId === groupId);
  const isCreator = group?.creatorId === currentUser?.id;

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(groupId, text.trim());
      setText('');
    }
  };

  const handleJoinFromChat = (gameId) => {
    joinPrivateGame(gameId);
    navigation.navigate('UserDashboard'); // Volvemos al dashboard donde detectará la sala
  };

  const handleAddMembers = () => {
    if (!newAliases.trim()) return;
    const aliases = newAliases.split(',').map(a => a.trim()).filter(a => a);
    
    const validAliases = aliases.filter(alias => users.some(u => u.alias === alias));
    
    if (validAliases.length === 0) {
      Alert.alert('Error', 'No se encontró ningún usuario con esos ALIAS.');
      return;
    }

    addGroupMembers(groupId, validAliases);
    Alert.alert('Éxito', `Se añadieron ${validAliases.length} integrantes al grupo.`);
    setNewAliases('');
  };

  const handleRemoveMember = (targetId) => {
    Alert.alert('Confirmar', '¿Seguro que quieres expulsar a este usuario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Expulsar', style: 'destructive', onPress: () => removeGroupMember(groupId, targetId) }
    ]);
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === currentUser.id;
    const sender = users.find(u => u.id === item.senderId);
    const alias = sender ? sender.alias : 'Usuario';
    
    const words = item.text.split(' ');
    let inviteGameId = null;
    
    for (const word of words) {
      if (word.length >= 5) {
        const foundGame = games.find(g => g.id === word && g.type === 'private');
        if (foundGame) {
          inviteGameId = foundGame.id;
          break;
        }
      }
    }

    return (
      <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
        {!isMe && <Text style={styles.senderAlias}>{alias}</Text>}
        <Text style={isMe ? styles.myText : styles.otherText}>{item.text}</Text>
        <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        
        {inviteGameId && (
          <TouchableOpacity style={styles.joinBtn} onPress={() => handleJoinFromChat(inviteGameId)}>
            <Text style={styles.joinBtnText}>🎮 ¡UNIRSE A LA JUGADA!</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!group) return null; // Fallback in case group is deleted

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{groupName}</Text>
        <TouchableOpacity onPress={() => setShowInfo(true)}>
          <Text style={styles.infoIcon}>⚙️ Info</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={groupMessages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje o pega el código..."
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>Enviar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Información del Grupo */}
      <Modal visible={showInfo} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Información del Grupo</Text>
            
            <View style={{ maxHeight: 250, width: '100%' }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Integrantes ({group.members.length}):</Text>
              <FlatList
                data={group.members}
                keyExtractor={item => item}
                renderItem={({ item }) => {
                  const u = users.find(x => x.id === item);
                  const isCreatorOfGroup = item === group.creatorId;
                  return (
                    <View style={styles.memberRow}>
                      <Text style={styles.memberName}>{u ? u.alias : 'Desconocido'} {isCreatorOfGroup && '👑'}</Text>
                      {isCreator && !isCreatorOfGroup && (
                        <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemoveMember(item)}>
                          <Text style={styles.removeBtnText}>Expulsar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            </View>

            {isCreator && (
              <View style={styles.addMemberSection}>
                <Text style={{ fontWeight: 'bold', marginTop: 15, marginBottom: 5 }}>Agregar Amigos:</Text>
                <TextInput
                  style={styles.addInput}
                  placeholder="ALIAS (separados por comas)"
                  value={newAliases}
                  onChangeText={setNewAliases}
                />
                <TouchableOpacity style={styles.addBtn} onPress={handleAddMembers}>
                  <Text style={styles.addBtnText}>+ Agregar</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowInfo(false)}>
              <Text style={styles.closeModalText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: theme.spacing.m,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
  },
  backButton: {
    marginRight: theme.spacing.m,
  },
  backText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
  },
  infoIcon: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  messageList: {
    padding: theme.spacing.m,
    paddingBottom: 20,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.secondary,
    borderBottomRightRadius: 0,
  },
  otherBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 0,
    elevation: 1,
  },
  senderAlias: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  myText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  otherText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.5)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  joinBtn: {
    backgroundColor: theme.colors.success,
    padding: theme.spacing.s,
    borderRadius: theme.borderRadius.s,
    marginTop: theme.spacing.s,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.m,
    backgroundColor: '#FFF',
    elevation: 4,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.m,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    marginLeft: theme.spacing.m,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendText: {
    color: '#FFF',
    fontWeight: 'bold',
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
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  memberName: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  removeBtn: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  removeBtnText: {
    color: theme.colors.error,
    fontWeight: 'bold',
    fontSize: 12,
  },
  addMemberSection: {
    width: '100%',
    borderTopWidth: 1,
    borderColor: '#EEE',
    paddingTop: 10,
    marginTop: 10,
  },
  addInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  addBtn: {
    backgroundColor: theme.colors.success,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#FFF',
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
  }
});
