import React from 'react';
import { Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import ResponsiveContainer from '../components/ResponsiveContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

export default function BookingScreen({ route }: Props) {
  const { clinicName, clinicAddress } = route.params;

  return (
    <ResponsiveContainer>
      <Text style={styles.title}>{clinicName}</Text>
      <Text style={styles.address}>{clinicAddress}</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Book Appointment</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => Linking.openURL(`tel:`)}>
        <Text style={styles.secondaryButtonText}>Call Clinic</Text>
      </TouchableOpacity>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', color: '#0066CC', marginBottom: 8 },
  address: { fontSize: 16, color: '#555', marginBottom: 32 },
  button: { backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#E8F0FE', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#0066CC', fontSize: 16, fontWeight: '600' },
});
