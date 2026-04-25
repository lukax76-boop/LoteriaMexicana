import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { theme } from '../../config/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [alias, setAlias] = useState('');
  const recoverPassword = useAppStore(state => state.recoverPassword);

  const handleRecover = async () => {
    if (!email || !alias) {
      Alert.alert('Error', 'Por favor ingresa tu correo y tu alias');
      return;
    }

    const response = await recoverPassword(email.trim(), alias.trim());
    
    if (response.success) {
      Alert.alert(
        'Contraseña Recuperada',
        `Tu contraseña es:\n\n${response.password}\n\nPor favor anótala en un lugar seguro.`,
        [{ text: 'Ir a Iniciar Sesión', onPress: () => navigation.navigate('Login') }]
      );
    } else {
      Alert.alert('Error', response.error || 'No se encontró una cuenta con ese correo y alias. Verifica tus datos.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recuperar Contraseña</Text>
      <Text style={styles.subtitle}>Ingresa los datos con los que te registraste para recuperar tu acceso.</Text>
      
      <View style={styles.form}>
        <TextInput 
          style={styles.input}
          placeholder="Correo Electrónico"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input}
          placeholder="Alias (Nombre en el juego)"
          placeholderTextColor="#666"
          value={alias}
          onChangeText={setAlias}
        />
        
        <TouchableOpacity style={styles.button} onPress={handleRecover}>
          <Text style={styles.buttonText}>Mostrar mi Contraseña</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={styles.linkText}>Volver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.l,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.s,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  form: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.l,
    borderRadius: theme.borderRadius.l,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: theme.spacing.m,
    fontSize: 16,
    color: '#000',
  },
  button: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
    marginTop: theme.spacing.s,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkText: {
    color: theme.colors.accent,
    textAlign: 'center',
    fontSize: 16,
  }
});
