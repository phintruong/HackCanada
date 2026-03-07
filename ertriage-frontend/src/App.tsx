import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '[role="button"] { cursor: pointer; }';
  document.head.appendChild(style);
}
import HomeScreen from './screens/HomeScreen';
import VitalsScreen from './screens/VitalsScreen';
import SymptomsScreen from './screens/SymptomsScreen';
import ResultScreen from './screens/ResultScreen';
import HistoryScreen from './screens/HistoryScreen';
import FamilyScreen from './screens/FamilyScreen';
import BookingScreen from './screens/BookingScreen';
import OHIPScreen from './screens/OHIPScreen';
import SettingsScreen from './screens/SettingsScreen';


export type RootStackParamList = {
  Home: undefined;
  Vitals: { memberId?: string };
  Symptoms: { memberId?: string };
  Result: { sessionId: string };
  History: undefined;
  Family: undefined;
  Booking: { clinicName: string; clinicAddress: string };
  OHIP: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: '#0066CC' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'ER Triage E-Clip' }} />
          <Stack.Screen name="Vitals" component={VitalsScreen} options={{ title: 'Vitals Scan' }} />
          <Stack.Screen name="Symptoms" component={SymptomsScreen} options={{ title: 'Symptoms' }} />
          <Stack.Screen name="Result" component={ResultScreen} options={{ title: 'Your Result' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'History' }} />
          <Stack.Screen name="Family" component={FamilyScreen} options={{ title: 'Family' }} />
          <Stack.Screen name="Booking" component={BookingScreen} options={{ title: 'Book Clinic' }} />
          <Stack.Screen name="OHIP" component={OHIPScreen} options={{ title: 'OHIP Guide' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
