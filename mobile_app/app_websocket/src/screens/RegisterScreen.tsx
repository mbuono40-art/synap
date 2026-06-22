import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CONFIG } from '../config';

type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<any, 'Register'>;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calcolo automatico Data di Nascita da Codice Fiscale
  useEffect(() => {
    if (codiceFiscale.length === 16) {
      const cf = codiceFiscale.toUpperCase();
      const yearCode = cf.substring(6, 8);
      const monthCode = cf.charAt(8);
      const dayCode = parseInt(cf.substring(9, 11), 10);
      
      const monthMap: { [key: string]: string } = {
        'A': '01', 'B': '02', 'C': '03', 'D': '04', 'E': '05', 'H': '06',
        'L': '07', 'M': '08', 'P': '09', 'R': '10', 'S': '11', 'T': '12'
      };
      
      if (monthMap[monthCode] && !isNaN(dayCode)) {
        let day = dayCode;
        if (day > 40) day -= 40; // Per le donne
        
        // Assumiamo che se l'anno è > 30 sia 19XX, altrimenti 20XX (approssimazione)
        const fullYear = parseInt(yearCode) > 30 ? `19${yearCode}` : `20${yearCode}`;
        const formattedDay = day < 10 ? `0${day}` : `${day}`;
        setDateOfBirth(`${formattedDay}/${monthMap[monthCode]}/${fullYear}`);
      }
    }
  }, [codiceFiscale]);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !firstName || !lastName || !codiceFiscale) {
      return Alert.alert('Errore', 'Compila i campi obbligatori.');
    }
    if (password.length < 6) {
      return Alert.alert('Errore', 'La password deve avere almeno 6 caratteri.');
    }
    if (password !== confirmPassword) {
      return Alert.alert('Errore', 'Le password non coincidono.');
    }

    setLoading(true);
    try {
      const response = await fetch(`${CONFIG.API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          role: 'patient',
          first_name: firstName,
          last_name: lastName,
          codice_fiscale: codiceFiscale.toUpperCase(),
          date_of_birth: dateOfBirth,
          place_of_birth: placeOfBirth
        })
      });
      if (response.ok) {
        Alert.alert('Successo', 'Registrazione completata! Ora puoi fare il login.', [
          { text: 'OK', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('Errore', "Registrazione fallita. Forse l'email esiste già.");
      }
    } catch (e) {
      Alert.alert('Errore', 'Impossibile connettersi al server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#192f6a', '#3b5998', '#4c669f']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>Crea Account</Text>
        </View>

        <ScrollView style={styles.card} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.sectionTitle}>Dati Anagrafici</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.icon} />
              <TextInput style={styles.input} placeholder="Nome" placeholderTextColor="#999" value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <TextInput style={styles.input} placeholder="Cognome" placeholderTextColor="#999" value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="card-outline" size={20} color="#666" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="Codice Fiscale"
              placeholderTextColor="#999"
              value={codiceFiscale}
              onChangeText={setCodiceFiscale}
              autoCapitalize="characters"
              maxLength={16}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
              <Ionicons name="calendar-outline" size={20} color="#666" style={styles.icon} />
              <TextInput style={styles.input} placeholder="Data (GG/MM/AAAA)" placeholderTextColor="#999" value={dateOfBirth} onChangeText={setDateOfBirth} />
            </View>
            <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
              <Ionicons name="location-outline" size={20} color="#666" style={styles.icon} />
              <TextInput style={styles.input} placeholder="Città Nascita" placeholderTextColor="#999" value={placeOfBirth} onChangeText={setPlaceOfBirth} />
            </View>
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Credenziali di Accesso</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.icon} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.icon} />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#666" style={styles.icon} />
            <TextInput style={styles.input} placeholder="Conferma Password" placeholderTextColor="#999" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
          </View>

          <TouchableOpacity style={styles.registerButton} onPress={handleRegister} disabled={loading}>
            <Text style={styles.registerButtonText}>{loading ? "Attendi..." : "REGISTRATI"}</Text>
          </TouchableOpacity>
          <View style={{height: 40}} />
        </ScrollView>

      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: 'white' },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 10, marginBottom: 16, paddingHorizontal: 12 },
  icon: { marginRight: 10 },
  input: { flex: 1, height: 50, fontSize: 16, color: '#333' },
  registerButton: { backgroundColor: '#ff9800', borderRadius: 10, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#ff9800', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5, elevation: 5 },
  registerButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 }
});
