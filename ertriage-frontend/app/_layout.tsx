import { Stack } from 'expo-router';
import { Platform } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '[role="button"] { cursor: pointer; }';
  document.head.appendChild(style);
}

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0066CC' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen name="home" options={{ title: 'ER Triage E-Clip' }} />
      <Stack.Screen name="vitals" options={{ title: 'Vitals Scan' }} />
      <Stack.Screen name="symptoms" options={{ title: 'Symptoms' }} />
      <Stack.Screen name="result" options={{ title: 'Your Result' }} />
      <Stack.Screen name="history" options={{ title: 'History' }} />
      <Stack.Screen name="family" options={{ title: 'Family' }} />
      <Stack.Screen name="booking" options={{ title: 'Book Clinic' }} />
      <Stack.Screen name="ohip" options={{ title: 'OHIP Guide' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
