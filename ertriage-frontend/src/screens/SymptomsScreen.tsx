import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import SymptomCard from '../components/SymptomCard';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { useStore } from '../store';
import { submitTriage } from '../api/triage';

type Props = NativeStackScreenProps<RootStackParamList, 'Symptoms'>;

const SYMPTOM_QUESTIONS = [
  { key: 'chestPain', label: 'Chest pain or pressure' },
  { key: 'shortnessOfBreath', label: 'Shortness of breath' },
  { key: 'fever', label: 'Fever' },
  { key: 'dizziness', label: 'Dizziness or loss of balance' },
  { key: 'severeHeadache', label: 'Severe headache or confusion' },
  { key: 'injuryOrBleeding', label: 'Injury or bleeding' },
] as const;

export default function SymptomsScreen({ navigation, route }: Props) {
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const vitals = useStore((s) => s.vitals);

  function toggleAnswer(key: string) {
    setAnswers((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit() {
    if (!vitals) return;

    setLoading(true);
    try {
      const result = await submitTriage({
        vitals,
        symptoms: {
          chestPain: answers.chestPain || false,
          shortnessOfBreath: answers.shortnessOfBreath || false,
          fever: answers.fever || false,
          dizziness: answers.dizziness || false,
          severeHeadache: answers.severeHeadache || false,
          injuryOrBleeding: answers.injuryOrBleeding || false,
        },
        city: 'Kitchener', // TODO: get from user location
        memberId: route.params?.memberId,
      });

      useStore.getState().setTriageResult(result);
      navigation.navigate('Result', { sessionId: 'latest' });
    } catch (err) {
      console.error('Triage submission failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResponsiveContainer scroll>
      <Text style={styles.title}>How are you feeling?</Text>
      <Text style={styles.subtitle}>Tap any symptoms you are experiencing</Text>

      {SYMPTOM_QUESTIONS.map((q) => (
        <SymptomCard
          key={q.key}
          label={q.label}
          selected={answers[q.key] || false}
          onPress={() => toggleAnswer(q.key)}
        />
      ))}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Analyzing...' : 'Get Recommendation'}</Text>
      </TouchableOpacity>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', color: '#0066CC', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  button: { backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16, marginBottom: 32 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
