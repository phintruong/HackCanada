import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { useStore } from '../store';

export default function SettingsScreen() {
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);

  return (
    <ResponsiveContainer>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionTitle}>Language</Text>
      <View style={styles.row}>
        {(['en', 'fr'] as const).map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.pill, language === lang && styles.pillActive]}
            onPress={() => setLanguage(lang)}
          >
            <Text style={[styles.pillText, language === lang && styles.pillTextActive]}>
              {lang === 'en' ? 'English' : 'Français'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Notifications</Text>
      <TouchableOpacity style={styles.settingRow}>
        <Text style={styles.settingText}>Push Notifications</Text>
        <Text style={styles.settingValue}>On</Text>
      </TouchableOpacity>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', color: '#0066CC', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12, marginTop: 16 },
  row: { flexDirection: 'row', gap: 12 },
  pill: { backgroundColor: '#E8F0FE', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  pillActive: { backgroundColor: '#0066CC' },
  pillText: { color: '#0066CC', fontWeight: '500' },
  pillTextActive: { color: '#fff' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginTop: 8 },
  settingText: { fontSize: 16, color: '#333' },
  settingValue: { fontSize: 16, color: '#0066CC', fontWeight: '500' },
});
