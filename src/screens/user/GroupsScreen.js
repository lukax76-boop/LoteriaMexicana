import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Alert } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../config/theme';

export default function GroupsScreen({ navigation }) {
  const currentUser = useAppStore(state => state.currentUser);
  const groups = useAppStore(state => state.groups);
  const users = useAppStore(state => state.users);
  const createGroup = useAppStore(state => state.createGroup);

  const [groupName, setGroupName] = useState('');
  const [aliasesInput, setAliasesInput] = useState('');

  const myGroups = groups.filter(g => g.members.includes(currentUser.id));

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Debes ponerle un nombre al grupo.');
      return;
    }
    if (!aliasesInput.trim()) {
      Alert.alert('Error', 'Debes ingresar al menos un ALIAS.');
      return;
    }

    const aliases = aliasesInput.split(',').map(a => a.trim()).filter(a => a);
    
    // Check if at least one alias exists
    const validAliases = aliases.filter(alias => users.some(u => u.alias === alias));
    
    if (validAliases.length === 0) {
      Alert.alert('Error', 'No se encontró ningún usuario con esos ALIAS.');
      return;
    }

    createGroup(groupName, validAliases);
    Alert.alert('Éxito', `Grupo creado con ${validAliases.length} amigos.`);
    setGroupName('');
    setAliasesInput('');
  };

  const renderGroupItem = ({ item }) => {
    const membersCount = item.members.length;
    return (
      <TouchableOpacity 
        style={styles.groupCard} 
        onPress={() => navigation.navigate('Chat', { groupId: item.id, groupName: item.name })}
      >
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupMembers}>{membersCount} miembros</Text>
        </View>
        <Text style={styles.enterText}>ENTRAR →</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('UserDashboard')} style={styles.backButton}>
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mis Grupos</Text>
      </View>

      <View style={styles.createSection}>
        <Text style={styles.sectionTitle}>Crear Nuevo Grupo</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre del grupo (ej. La Familia)"
          value={groupName}
          onChangeText={setGroupName}
        />
        <TextInput
          style={styles.input}
          placeholder="ALIAS de amigos (separados por comas)"
          value={aliasesInput}
          onChangeText={setAliasesInput}
        />
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateGroup}>
          <Text style={styles.createBtnText}>CREAR GRUPO</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Tus Chats</Text>
      {myGroups.length === 0 ? (
        <Text style={styles.emptyText}>Aún no estás en ningún grupo.</Text>
      ) : (
        <FlatList
          data={myGroups}
          keyExtractor={item => item.id}
          renderItem={renderGroupItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
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
    alignItems: 'center',
  },
  backButton: {
    marginRight: theme.spacing.m,
  },
  backText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  createSection: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: theme.spacing.m,
    color: theme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: theme.borderRadius.s,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    fontSize: 16,
  },
  createBtn: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.s,
    alignItems: 'center',
  },
  createBtnText: {
    fontWeight: 'bold',
    color: theme.colors.text,
    fontSize: 16,
  },
  emptyText: {
    color: theme.colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  groupCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
    elevation: 1,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  groupMembers: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  enterText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  }
});
