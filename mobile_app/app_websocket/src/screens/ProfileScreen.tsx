import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../api/auth';
import { CONFIG } from '../config';
import { exercisesApi } from '../api/exercises';

export default function ProfileScreen({ setIsLoggedIn }: any) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingMode, setIsEditingMode] = useState(false);
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = await authApi.getToken();
      const response = await fetch(`${CONFIG.API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmail(data.email || '');
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setCodiceFiscale(data.codice_fiscale || '');
        setDateOfBirth(data.date_of_birth || '');
        setPlaceOfBirth(data.place_of_birth || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSaving(true);
    try {
      const token = await authApi.getToken();
      const response = await fetch(`${CONFIG.API_URL}/users/me`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          codice_fiscale: codiceFiscale.toUpperCase(),
          date_of_birth: dateOfBirth,
          place_of_birth: placeOfBirth
        })
      });
      
      if (response.ok) {
        Alert.alert('Successo', 'Profilo aggiornato correttamente!');
        setIsEditingMode(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Errore', errorData.detail || 'Impossibile aggiornare il profilo.');
      }
    } catch (e) {
      Alert.alert('Errore', 'Errore di connessione al server.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      return Alert.alert('Attenzione', 'Inserisci sia la vecchia che la nuova password.');
    }
    setSaving(true);
    try {
      const token = await authApi.getToken();
      const response = await fetch(`${CONFIG.API_URL}/users/me/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      
      if (response.ok) {
        Alert.alert('Successo', 'Password aggiornata correttamente!');
        setOldPassword('');
        setNewPassword('');
      } else {
        const errorData = await response.json();
        Alert.alert('Errore', errorData.detail || 'Impossibile aggiornare la password.');
      }
    } catch (e) {
      Alert.alert('Errore', 'Errore di connessione al server.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    setIsLoggedIn(false);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b5998" /></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName ? firstName.charAt(0).toUpperCase() : 'P'}</Text>
          </View>
          <Text style={styles.nameText}>{firstName || lastName ? `${firstName} ${lastName}` : 'Paziente Anonimo'}</Text>
          <Text style={styles.roleText}>Paziente Registrato</Text>
        </View>

        {/* Dati Personali Card */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dati Personali</Text>
            <TouchableOpacity onPress={() => setIsEditingMode(!isEditingMode)}>
              <Ionicons name={isEditingMode ? "close-circle-outline" : "create-outline"} size={24} color="#3b5998" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color="#666" style={styles.infoIcon} />
            <View style={{flex: 1}}>
              <Text style={styles.infoLabel}>Nome</Text>
              {isEditingMode ? (
                <TextInput style={styles.editInput} value={firstName} onChangeText={setFirstName} placeholder="Inserisci Nome" />
              ) : (
                <Text style={styles.infoValue}>{firstName || 'Non inserito'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color="#666" style={styles.infoIcon} />
            <View style={{flex: 1}}>
              <Text style={styles.infoLabel}>Cognome</Text>
              {isEditingMode ? (
                <TextInput style={styles.editInput} value={lastName} onChangeText={setLastName} placeholder="Inserisci Cognome" />
              ) : (
                <Text style={styles.infoValue}>{lastName || 'Non inserito'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={20} color="#666" style={styles.infoIcon} />
            <View style={{flex: 1}}>
              <Text style={styles.infoLabel}>Codice Fiscale</Text>
              {isEditingMode ? (
                <TextInput style={styles.editInput} value={codiceFiscale} onChangeText={setCodiceFiscale} autoCapitalize="characters" maxLength={16} placeholder="Inserisci CF" />
              ) : (
                <Text style={styles.infoValue}>{codiceFiscale || 'Non inserito'}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color="#666" style={styles.infoIcon} />
            <View style={{flex: 1}}>
              <Text style={styles.infoLabel}>Data di Nascita</Text>
              {isEditingMode ? (
                <TextInput style={styles.editInput} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="GG/MM/AAAA" />
              ) : (
                <Text style={styles.infoValue}>{dateOfBirth || 'Non inserita'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#666" style={styles.infoIcon} />
            <View style={{flex: 1}}>
              <Text style={styles.infoLabel}>Luogo di Nascita</Text>
              {isEditingMode ? (
                <TextInput style={styles.editInput} value={placeOfBirth} onChangeText={setPlaceOfBirth} placeholder="Es. Roma" />
              ) : (
                <Text style={styles.infoValue}>{placeOfBirth || 'Non inserito'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.infoIcon} />
            <View style={{flex: 1}}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={[styles.infoValue, { color: '#888' }]}>{email}</Text>
            </View>
          </View>

          {isEditingMode && (
            <TouchableOpacity style={[styles.saveButton, {marginTop: 10}]} onPress={handleUpdateProfile} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Salvataggio...' : 'Salva Modifiche'}</Text>
            </TouchableOpacity>
          )}
        </View>



        {/* Modifica Password Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Modifica Password</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Vecchia Password"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="key-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Nuova Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          <TouchableOpacity style={[styles.saveButton, {backgroundColor: '#ff9800'}]} onPress={handleChangePassword} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Salvataggio...' : 'Aggiorna Password'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Esci dall'Account</Text>
        </TouchableOpacity>

        <View style={{height: 40}} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { alignItems: 'center', marginVertical: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#3b5998', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5, marginBottom: 15 },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: 'white' },
  nameText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  roleText: { fontSize: 16, color: '#666', marginTop: 5 },
  card: { backgroundColor: 'white', borderRadius: 15, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoIcon: { marginRight: 15, backgroundColor: '#f0f2f5', padding: 8, borderRadius: 10, overflow: 'hidden' },
  infoLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  infoValue: { fontSize: 16, color: '#333', fontWeight: '500' },
  editInput: { borderBottomWidth: 1, borderBottomColor: '#3b5998', fontSize: 16, paddingVertical: 5, color: '#333' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 10, marginBottom: 15, paddingHorizontal: 12 },
  icon: { marginRight: 10 },
  input: { flex: 1, height: 45, fontSize: 16 },
  saveButton: { backgroundColor: '#4caf50', borderRadius: 10, height: 45, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  saveButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  logoutButton: { backgroundColor: '#e53935', flexDirection: 'row', borderRadius: 10, height: 55, justifyContent: 'center', alignItems: 'center', shadowColor: '#e53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  logoutButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
