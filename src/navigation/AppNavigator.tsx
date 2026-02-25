import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { useApp } from '../context/AppContext';
import { PairingScreen } from '../screens/PairingScreen';
import { HomeScreen }    from '../screens/HomeScreen';
import { ComposeScreen } from '../screens/ComposeScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { COLORS }        from '../theme';
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { currentUser, isLoading } = useApp();

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // If the user has no pairId, show the pairing flow first.
  const isPaired = !!currentUser?.pairId;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle:      { backgroundColor: COLORS.background },
          headerTintColor:  COLORS.text,
          headerTitleStyle: { fontWeight: 'bold' },
          cardStyle:        { backgroundColor: COLORS.background },
          headerBackTitleVisible: false,
        }}
      >
        {!isPaired ? (
          <Stack.Screen
            name="Pairing"
            component={PairingScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: '💕 bubliboo', headerLeft: () => null }}
            />
            <Stack.Screen
              name="Compose"
              component={ComposeScreen}
              options={({ route }) => ({
                title: route.params.mode === 'draw' ? 'Draw a note' : 'Write a note',
              })}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{ title: 'Our notes 📖' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ title: 'Your profile' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex:            1,
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: COLORS.background,
  },
});
