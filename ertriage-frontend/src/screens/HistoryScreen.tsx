import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import RiskBadge from '../components/RiskBadge';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { fetchHistory } from '../api/user';
import { TriageSession } from '../../../shared/types';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export default function HistoryScreen({}: Props) {
  const [sessions, setSessions] = useState<TriageSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await fetchHistory();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResponsiveContainer>
      <Text style={styles.title}>Triage History</Text>
      {loading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : sessions.length === 0 ? (
        <Text style={styles.empty}>No triage sessions yet.</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <RiskBadge level={item.riskLevel} compact />
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.recommendation}>{item.recommendation}</Text>
            </View>
          )}
        />
      )}
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', color: '#0066CC', marginBottom: 16 },
  loading: { color: '#666', fontSize: 16 },
  empty: { color: '#999', fontSize: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  date: { fontSize: 13, color: '#666' },
  recommendation: { fontSize: 14, color: '#333' },
});
