/**
 * ComposeScreen — write a text note or draw on a canvas, then send.
 * Route params: { mode: 'text' | 'draw' }
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { useApp }       from '../context/AppContext';
import { sendMessage, recordDoodleSent }  from '../services/messages';
import { sendPushNotification } from '../services/notifications';
import { DrawingCanvas } from '../components/DrawingCanvas';
import { getTodayPrompt } from '../utils/dailyPrompts';
import { COLORS }        from '../theme';
import { RootStackParamList } from '../types';

type ComposeProp = RouteProp<RootStackParamList, 'Compose'>;

const MAX_CHARS = 280;

export function ComposeScreen() {
  const navigation               = useNavigation();
  const { params: { mode } }     = useRoute<ComposeProp>();
  const { currentUser, partner } = useApp();

  const [text,       setText]      = useState('');
  const [svgPaths,   setSvgPaths]  = useState<string>('');   // serialised drawing
  const [isSending,  setIsSending] = useState(false);

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!currentUser?.pairId) return;

    const content = mode === 'text' ? text.trim() : svgPaths;
    if (!content) {
      Alert.alert(
        'Empty note',
        mode === 'text'
          ? 'Write something before sending!'
          : 'Draw something before sending!',
      );
      return;
    }

    setIsSending(true);
    try {
      await sendMessage({
        pairId:     currentUser.pairId,
        authorId:   currentUser.id,
        authorName: currentUser.name,
        content,
        type:       mode === 'text' ? 'text' : 'drawing',
      });

      // Notify partner if we have their FCM token.
      if (partner?.fcmToken) {
        const preview = mode === 'text' ? content : '🎨 Drew you something…';
        await sendPushNotification({
          recipientToken: partner.fcmToken,
          senderName:     currentUser.name,
          messagePreview: preview,
        });
      }

      if (mode === 'draw' && currentUser?.pairId) {
        await recordDoodleSent(currentUser.pairId, currentUser.id);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Send failed', e.message ?? 'Please check your connection and try again.');
    } finally {
      setIsSending(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const partnerName = partner?.name ?? 'your partner';
  const canSend     = mode === 'text' ? text.trim().length > 0 : svgPaths.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.recipient}>To: {partnerName} 💕</Text>

      {mode === 'draw' && (
        <Text style={styles.prompt}>✨ {getTodayPrompt()}</Text>
      )}

      {mode === 'text' ? (
        <TextInput
          style={styles.textArea}
          placeholder="Write your note…"
          placeholderTextColor={COLORS.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={MAX_CHARS}
          autoFocus
          textAlignVertical="top"
        />
      ) : (
        <DrawingCanvas onPathsChange={setSvgPaths} />
      )}

      {mode === 'text' && (
        <Text style={styles.charCount}>
          {text.length}/{MAX_CHARS}
        </Text>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!canSend || isSending}
        >
          {isSending
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.sendText}>Send 💌</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  recipient:    { color: COLORS.textSecondary, fontSize: 13, marginBottom: 6 },
  prompt: {
    color:        COLORS.accent,
    fontSize:     13,
    fontStyle:    'italic',
    marginBottom: 10,
  },
  textArea: {
    flex:             1,
    backgroundColor:  COLORS.surface,
    borderRadius:     16,
    padding:          16,
    color:            COLORS.text,
    fontSize:         20,
    lineHeight:       30,
    borderWidth:      1,
    borderColor:      COLORS.border,
    marginBottom:     8,
  },
  charCount:    { color: COLORS.textSecondary, fontSize: 12, textAlign: 'right', marginBottom: 12 },
  actions:      { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex:            1,
    paddingVertical: 15,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     COLORS.border,
    alignItems:      'center',
  },
  cancelText:   { color: COLORS.textSecondary, fontSize: 16 },
  sendBtn: {
    flex:            2,
    paddingVertical: 15,
    borderRadius:    14,
    backgroundColor: COLORS.accent,
    alignItems:      'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.accentDim, opacity: 0.5 },
  sendText:     { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
