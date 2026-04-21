import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ScrollView } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../config/theme';

const isWeb = Platform.OS === 'web';
const timeOptions = [];
for (let i = 0; i < 24; i++) {
  const hr = i.toString().padStart(2, '0');
  timeOptions.push(`${hr}:00`);
  timeOptions.push(`${hr}:30`);
}

let WebDatePicker = () => null;
let WebTimePicker = () => null;

if (isWeb) {
  // eslint-disable-next-line react/display-name
  WebDatePicker = ({ value, onChange }) => {
    return React.createElement('input', {
      type: 'date',
      value: value,
      onChange: (e) => onChange(e.target.value),
      style: { padding: '10px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '16px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }
    });
  };
  // eslint-disable-next-line react/display-name
  WebTimePicker = ({ value, onChange }) => {
    const options = timeOptions.map(t => React.createElement('option', { key: t, value: t }));
    const datalist = React.createElement('datalist', { id: 'time-options' }, ...options);
    const input = React.createElement('input', {
      type: 'text',
      list: 'time-options',
      value: value,
      placeholder: 'Selecciona o escribe (ej. 15:45)',
      onChange: (e) => onChange(e.target.value),
      style: { padding: '10px', borderRadius: '8px', border: '1px solid #CCC', fontSize: '16px', marginBottom: '10px', width: '100%', boxSizing: 'border-box' }
    });
    return React.createElement('div', null, input, datalist);
  };
}

export default function AdminDashboardScreen({ navigation }) {
  const currentUser = useAppStore(state => state.currentUser);
  const createGame = useAppStore(state => state.createGame);
  const logout = useAppStore(state => state.logout);
  const currentGame = useAppStore(state => state.currentGame);
  
  const [newGamePrice, setNewGamePrice] = useState('50');
  const [newGamePrize, setNewGamePrize] = useState('80');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  const handleCreateGame = () => {
    if (currentGame && currentGame.status !== 'finished') {
      Alert.alert('Aviso', 'Ya hay un juego en curso o pendiente. Termina ese primero.');
      navigation.navigate('AdminGame');
      return;
    }
    
    const price = parseInt(newGamePrice);
    const prize = parseInt(newGamePrize);
    if (isNaN(price) || isNaN(prize)) {
      Alert.alert('Error', 'Ingrese números válidos para costo y pozo');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      Alert.alert('Error', 'La fecha y hora de programación son obligatorias para la sala universal.');
      return;
    }
    
    createGame(price, prize, scheduledDate.trim(), scheduledTime.trim());
    setScheduledDate('');
    setScheduledTime('');
    navigation.navigate('AdminGame');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Panel de Administrador</Text>
        <Text style={styles.subtitle}>Hola, {currentUser.alias}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Crear Nuevo Juego</Text>
        <Text style={styles.label}>Costo de la Tabla (Créditos)</Text>
        <TextInput 
          style={styles.input}
          value={newGamePrice}
          onChangeText={setNewGamePrice}
          keyboardType="numeric"
        />
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Porcentaje para Pozo (%)</Text>
            <TextInput style={styles.input} value={newGamePrize} onChangeText={setNewGamePrize} keyboardType="numeric" />
        </View>
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Fecha Programada (Obligatorio)</Text>
            {isWeb ? (
              <WebDatePicker value={scheduledDate} onChange={setScheduledDate} />
            ) : (
              <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={scheduledDate} onChangeText={setScheduledDate} />
            )}
        </View>
        <View style={styles.inputGroup}>
            <Text style={styles.label}>Hora Programada (Obligatorio)</Text>
            {isWeb ? (
              <WebTimePicker value={scheduledTime} onChange={setScheduledTime} />
            ) : (
              <TextInput style={styles.input} placeholder="HH:MM" value={scheduledTime} onChangeText={setScheduledTime} />
            )}
        </View>
        
        <TouchableOpacity style={styles.button} onPress={handleCreateGame}>
          <Text style={styles.buttonText}>Organizar Juego</Text>
        </TouchableOpacity>
      </View>

      {currentGame && currentGame.status !== 'finished' && (
        <TouchableOpacity style={styles.activeGameButton} onPress={() => navigation.navigate('AdminGame')}>
          <Text style={styles.activeGameText}>Ir al Juego Activo</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
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
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.textLight,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.l,
    borderRadius: theme.borderRadius.l,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: theme.spacing.m,
    color: theme.colors.text,
  },
  label: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.s,
    fontSize: 18,
  },
  inputGroup: {
    marginBottom: theme.spacing.s,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.success,
    marginBottom: theme.spacing.m,
  },
  button: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  activeGameButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
    marginTop: theme.spacing.l,
  },
  activeGameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  logoutButton: {
    marginTop: 'auto',
    padding: theme.spacing.m,
    alignItems: 'center',
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 16,
  }
});
