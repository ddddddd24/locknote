/**
 * PairingScreen — first-launch flow.
 * Users enter their name, then either:
 *  - Generate a 6-character code and wait for their partner to join, OR
 *  - Enter their partner's code to complete the pair.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { createPairCode, joinWithCode, watchForPairAccepted, startDemoPair } from '../services/auth';
import { COLORS } from '../theme';

type Step = 'name' | 'choose' | 'create' | 'join';

export function PairingScreen() {
  const { currentUser, login, setPairId } = useApp();

  const [step,       setStep]       = useState<Step>('name');
  const [name,       setName]       = useState('');
  const [pairCode,   setPairCode]   = useState('');
  const [inputCode,  setInputCode]  = useState('');
  const [isLoading,  setIsLoading]  = useState(false);
  const [waitingMsg, setWaitingMsg] = useState('');

  // Unsubscribe ref for the Firebase watcher.
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // If a user is already stored (name entered) but not paired, skip to choose.
  useEffect(() => {
    if (currentUser && !currentUser.pairId && step === 'name') {
      setName(currentUser.name);
      setStep('choose');
    }
  }, [currentUser]);

  // Cleanup Firebase watcher on unmount.
  useEffect(() => {
    return () => { unsubscribeRef.current?.(); };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleNameSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Enter your name', 'Please enter a display name so your partner recognises you.');
      return;
    }
    setIsLoading(true);
    try {
      await login(name.trim());
      setStep('choose');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const code = await createPairCode(currentUser.id, currentUser.name);
      setPairCode(code);
      setStep('create');

      // Watch for partner joining.
      setWaitingMsg('Waiting for your partner to enter the code…');
      unsubscribeRef.current = watchForPairAccepted(currentUser.id, async (newPairId) => {
        unsubscribeRef.current?.();
        await setPairId(newPairId);
        // Navigation happens automatically via AppNavigator re-render.
      });
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not create code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoMode = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const newPairId = await startDemoPair(currentUser.id);
      await setPairId(newPairId);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not start demo mode.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinCode = async () => {
    if (!currentUser) return;
    const trimmed = inputCode.trim().toUpperCase();
    if (trimmed.length !== 6) {
      Alert.alert('Invalid code', 'Please enter the 6-character code your partner shared.');
      return;
    }
    setIsLoading(true);
    try {
      const newPairId = await joinWithCode(trimmed, currentUser.id, currentUser.name);
      await setPairId(newPairId);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Could not join pair.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>💕</Text>
        <Text style={styles.title}>bubliboo</Text>
        <Text style={styles.subtitle}>just for the two of you</Text>

        {/* Step: Name */}
        {step === 'name' && (
          <View style={styles.card}>
            <Text style={styles.label}>What's your name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNameSubmit}
            />
            <TouchableOpacity style={styles.btn} onPress={handleNameSubmit} disabled={isLoading}>
              {isLoading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.btnText}>Continue →</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Step: Choose create/join */}
        {step === 'choose' && (
          <View style={styles.card}>
            <Text style={styles.label}>Hey {currentUser?.name} 👋</Text>
            <Text style={styles.hint}>Connect with one other person to get started.</Text>
            <TouchableOpacity style={styles.btn} onPress={handleCreateCode} disabled={isLoading}>
              {isLoading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.btnText}>Create an invite code</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnOutline} onPress={() => setStep('join')}>
              <Text style={styles.btnOutlineText}>Enter a code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={handleDemoMode} disabled={isLoading}>
              <Text style={styles.btnGhostText}>Test alone 🧪</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setStep('name')}>
              <Text style={styles.btnGhostText}>← Change name</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step: Show generated code + wait */}
        {step === 'create' && (
          <View style={styles.card}>
            <Text style={styles.label}>Your invite code</Text>
            <Text style={styles.codeDisplay}>{pairCode}</Text>
            <Text style={styles.hint}>Share this with your partner. It works once.</Text>
            {waitingMsg ? (
              <View style={styles.waitRow}>
                <ActivityIndicator color={COLORS.accent} style={{ marginRight: 8 }} />
                <Text style={styles.waitText}>{waitingMsg}</Text>
              </View>
            ) : null}
            <TouchableOpacity style={styles.btnOutline} onPress={() => setStep('choose')}>
              <Text style={styles.btnOutlineText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step: Enter partner's code */}
        {step === 'join' && (
          <View style={styles.card}>
            <Text style={styles.label}>Enter your partner's code</Text>
            <TextInput
              style={[styles.input, styles.codeInput]}
              placeholder="ABC123"
              placeholderTextColor={COLORS.textSecondary}
              value={inputCode}
              onChangeText={(t) => setInputCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              autoFocus
              returnKeyType="go"
              onSubmitEditing={handleJoinCode}
            />
            <TouchableOpacity style={styles.btn} onPress={handleJoinCode} disabled={isLoading}>
              {isLoading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.btnText}>Join →</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnOutline} onPress={() => setStep('choose')}>
              <Text style={styles.btnOutlineText}>← Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.background },
  content:     { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logo:        { fontSize: 64, marginBottom: 8 },
  title:       { fontSize: 36, fontWeight: 'bold', color: COLORS.accent, letterSpacing: 2 },
  subtitle:    { fontSize: 14, color: COLORS.textSecondary, marginBottom: 40 },
  card: {
    width:           '100%',
    backgroundColor: COLORS.surface,
    borderRadius:    20,
    padding:         24,
    gap:             12,
  },
  label:       { fontSize: 18, fontWeight: '600', color: COLORS.text },
  hint:        { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  input: {
    backgroundColor: COLORS.surfaceHigh,
    color:           COLORS.text,
    borderRadius:    12,
    paddingHorizontal: 16,
    paddingVertical:   12,
    fontSize:        16,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  codeInput:   { textAlign: 'center', fontSize: 28, letterSpacing: 8, fontWeight: 'bold' },
  btn: {
    backgroundColor: COLORS.accent,
    borderRadius:    12,
    paddingVertical: 14,
    alignItems:      'center',
  },
  btnText:     { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnOutline: {
    borderWidth:     1,
    borderColor:     COLORS.accent,
    borderRadius:    12,
    paddingVertical: 14,
    alignItems:      'center',
  },
  btnOutlineText: { color: COLORS.accent, fontSize: 16, fontWeight: '600' },
  btnGhost: {
    paddingVertical: 10,
    alignItems:      'center',
  },
  btnGhostText: { color: COLORS.textSecondary, fontSize: 14 },
  codeDisplay: {
    fontSize:    48,
    fontWeight:  'bold',
    color:       COLORS.success,
    textAlign:   'center',
    letterSpacing: 10,
    paddingVertical: 12,
  },
  waitRow:     { flexDirection: 'row', alignItems: 'center' },
  waitText:    { color: COLORS.textSecondary, fontSize: 13 },
});
