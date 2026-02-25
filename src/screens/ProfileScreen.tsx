/**
 * ProfileScreen — change display name and profile picture.
 * Avatar is compressed to 120×120 JPEG and stored as base64 in Firebase.
 */

import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useNavigation } from '@react-navigation/native';

import { useApp } from '../context/AppContext';
import { COLORS } from '../theme';

export function ProfileScreen() {
  const navigation                  = useNavigation();
  const { currentUser, updateProfile, unpair } = useApp();

  const [name,    setName]    = useState(currentUser?.name ?? '');
  const [avatar,  setAvatar]  = useState<string | null>(currentUser?.avatarBase64 ?? null);
  const [saving,  setSaving]  = useState(false);

  // ── Avatar picker ─────────────────────────────────────────────────────────

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;

    // Resize to 120×120 and compress so the base64 stays small (~10 KB).
    const manipulated = await ImageManipulator.manipulateAsync(
      result.assets[0].uri,
      [{ resize: { width: 120, height: 120 } }],
      { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );

    if (manipulated.base64) {
      setAvatar(manipulated.base64);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile(trimmed, avatar);
      navigation.goBack();
    } catch {
      Alert.alert('Save failed', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  // ── Unpair ────────────────────────────────────────────────────────────────

  function confirmUnpair() {
    Alert.alert(
      'Unpair',
      'This will disconnect you from your partner. You can pair again with a new code.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unpair', style: 'destructive', onPress: unpair },
      ],
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hasChanges =
    name.trim() !== (currentUser?.name ?? '') ||
    avatar !== (currentUser?.avatarBase64 ?? null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Avatar */}
      <TouchableOpacity style={styles.avatarBtn} onPress={pickAvatar} activeOpacity={0.8}>
        {avatar ? (
          <Image
            source={{ uri: `data:image/jpeg;base64,${avatar}` }}
            style={styles.avatarImg}
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {name.trim()[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        )}
        <View style={styles.avatarEditBadge}>
          <Text style={styles.avatarEditIcon}>📷</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.avatarHint}>tap to change photo</Text>

      {/* Name */}
      <Text style={styles.label}>Display name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={COLORS.textSecondary}
        maxLength={30}
        autoCorrect={false}
      />

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!hasChanges || saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator color={COLORS.white} />
          : <Text style={styles.saveBtnText}>Save changes</Text>}
      </TouchableOpacity>

      {/* Danger zone */}
      <View style={styles.divider} />
      <TouchableOpacity style={styles.unpairBtn} onPress={confirmUnpair} activeOpacity={0.8}>
        <Text style={styles.unpairText}>Unpair from partner</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: 24, alignItems: 'center' },

  avatarBtn: {
    marginTop:    16,
    marginBottom: 8,
    position:     'relative',
  },
  avatarImg: {
    width:        110,
    height:       110,
    borderRadius: 55,
  },
  avatarPlaceholder: {
    width:           110,
    height:          110,
    borderRadius:    55,
    backgroundColor: COLORS.accentDim,
    justifyContent:  'center',
    alignItems:      'center',
  },
  avatarInitial: {
    color:      COLORS.white,
    fontSize:   42,
    fontWeight: 'bold',
  },
  avatarEditBadge: {
    position:        'absolute',
    bottom:          0,
    right:           0,
    width:           34,
    height:          34,
    borderRadius:    17,
    backgroundColor: COLORS.surface,
    borderWidth:     2,
    borderColor:     COLORS.background,
    justifyContent:  'center',
    alignItems:      'center',
  },
  avatarEditIcon: { fontSize: 16 },
  avatarHint:    { color: COLORS.textSecondary, fontSize: 12, marginBottom: 28 },

  label: {
    color:      COLORS.textSecondary,
    fontSize:   12,
    fontWeight: '600',
    alignSelf:  'flex-start',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    width:           '100%',
    backgroundColor: COLORS.surface,
    borderRadius:    12,
    padding:         14,
    color:           COLORS.text,
    fontSize:        17,
    borderWidth:     1,
    borderColor:     COLORS.border,
    marginBottom:    20,
  },

  saveBtn: {
    width:           '100%',
    backgroundColor: COLORS.accent,
    borderRadius:    14,
    paddingVertical: 15,
    alignItems:      'center',
  },
  saveBtnDisabled: { backgroundColor: COLORS.accentDim, opacity: 0.5 },
  saveBtnText:     { color: COLORS.white, fontSize: 16, fontWeight: '700' },

  divider: {
    width:           '100%',
    height:          1,
    backgroundColor: COLORS.border,
    marginVertical:  32,
  },
  unpairBtn: {
    width:           '100%',
    borderRadius:    14,
    paddingVertical: 15,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     '#e94560',
  },
  unpairText: { color: '#e94560', fontSize: 16, fontWeight: '600' },
});
