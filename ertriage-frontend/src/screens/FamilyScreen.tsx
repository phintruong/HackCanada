import React, { useState } from 'react';
import { Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';
import FamilyMemberCard from '../components/FamilyMemberCard';
import ResponsiveContainer from '../components/ResponsiveContainer';
import { FamilyMember } from '../../../shared/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Family'>;

export default function FamilyScreen({ navigation }: Props) {
  const [members, setMembers] = useState<FamilyMember[]>([]);

  // TODO: fetch family members on mount

  function handleTriageForMember(memberId: string) {
    navigation.navigate('Vitals', { memberId });
  }

  return (
    <ResponsiveContainer>
      <Text style={styles.title}>Family Profiles</Text>

      {members.length === 0 ? (
        <Text style={styles.empty}>No family members added yet.</Text>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FamilyMemberCard member={item} onTriage={() => handleTriageForMember(item.id)} />
          )}
        />
      )}

      <TouchableOpacity style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Add Family Member</Text>
      </TouchableOpacity>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: 'bold', color: '#0066CC', marginBottom: 16 },
  empty: { color: '#999', fontSize: 16, marginBottom: 24 },
  addButton: { backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
