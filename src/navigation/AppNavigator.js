import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';

// Screens (To be created)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminGameScreen from '../screens/admin/AdminGameScreen';
import UserDashboardScreen from '../screens/user/UserDashboardScreen';
import BuyBoardScreen from '../screens/user/BuyBoardScreen';
import GameRoomScreen from '../screens/user/GameRoomScreen';
import GroupsScreen from '../screens/user/GroupsScreen';
import ChatScreen from '../screens/user/ChatScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const currentUser = useAppStore((state) => state.currentUser);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!currentUser ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : currentUser.role === 'admin' ? (
          // Admin Stack
          <>
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <Stack.Screen name="AdminGame" component={AdminGameScreen} />
          </>
        ) : (
          // User Stack
          <>
            <Stack.Screen name="UserDashboard" component={UserDashboardScreen} />
            <Stack.Screen name="BuyBoard" component={BuyBoardScreen} />
            <Stack.Screen name="GameRoom" component={GameRoomScreen} />
            <Stack.Screen name="Groups" component={GroupsScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
