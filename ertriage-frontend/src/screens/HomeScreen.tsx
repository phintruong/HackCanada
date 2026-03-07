import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import ResponsiveContainer from '../components/ResponsiveContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  return (
    <ResponsiveContainer center>
      <Text style={styles.title}>ER Triage E-Clip</Text>
      <Text style={styles.subtitle}>The right care, at the right place, in under 3 minutes.</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Vitals', {})}>
        <Text style={styles.primaryButtonText}>Start Triage Check</Text>
      </TouchableOpacity>

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('History')}>
          <Text style={styles.secondaryButtonText}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Family')}>
          <Text style={styles.secondaryButtonText}>Family</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('OHIP')}>
          <Text style={styles.secondaryButtonText}>OHIP Guide</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.secondaryButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: 'bold', color: '#0066CC', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center', marginBottom: 32 },
  primaryButton: { backgroundColor: '#0066CC', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12, marginBottom: 24 },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  secondaryButton: { backgroundColor: '#E8F0FE', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  secondaryButtonText: { color: '#0066CC', fontSize: 14, fontWeight: '500' },
});
