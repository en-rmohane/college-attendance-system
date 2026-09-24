import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  Animated,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface RealtimeItem {
  id: string | number;
  title: string;
  subtitle: string;
  code: string;
  badge?: string;
}

interface RealCameraScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (scannedCode: string) => void;
  title?: string;
  subtitle?: string;
  targetHint?: string;
  mode?: 'barcode' | 'qr';
  realtimeItemsTitle?: string;
  realtimeItems?: RealtimeItem[];
}

export const RealCameraScanner: React.FC<RealCameraScannerProps> = ({
  visible,
  onClose,
  onScan,
  title = 'Optical Camera Scanner',
  subtitle = 'Point camera at Barcode or QR Code to scan',
  targetHint = 'ALIGN CODE WITHIN FRAME',
  mode = 'barcode',
  realtimeItemsTitle = 'LIVE REGISTERED DATABASE RECORDS:',
  realtimeItems = [],
}) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [scannedLock, setScannedLock] = useState(false);
  const scanAnim = useRef(new Animated.Value(0)).current;

  // Web camera video ref & stream
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const webStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (visible) {
      setScannedLock(false);
      setManualInput('');

      // Laser beam animation
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      );
      loop.start();

      // Request permission on mobile if needed
      if (Platform.OS !== 'web' && (!permission || !permission.granted)) {
        requestPermission();
      }

      // Web camera stream initialization
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ video: { facingMode: 'environment' } })
          .then((stream) => {
            webStreamRef.current = stream;
            if (webVideoRef.current) {
              webVideoRef.current.srcObject = stream;
              webVideoRef.current.play().catch(() => {});
            }
          })
          .catch((err) => {
            console.log('Web camera stream access notice:', err);
          });
      }

      return () => {
        loop.stop();
        if (webStreamRef.current) {
          webStreamRef.current.getTracks().forEach((t) => t.stop());
          webStreamRef.current = null;
        }
      };
    }
  }, [visible, permission]);

  const handleBarcodeScanned = (data: string) => {
    if (scannedLock || !data) return;
    setScannedLock(true);
    onScan(data.trim());
  };

  const handleManualSubmit = () => {
    if (!manualInput.trim()) return;
    setScannedLock(true);
    onScan(manualInput.trim());
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconCircleBtn}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.mainTitle}>{title}</Text>
            <Text style={styles.subTitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setTorch(!torch)}
            style={[styles.iconCircleBtn, torch && { backgroundColor: '#F59E0B' }]}
          >
            <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={20} color={torch ? '#000' : '#FFF'} />
          </TouchableOpacity>
        </View>

        {/* Camera View Area */}
        <View style={styles.cameraWrapper}>
          {Platform.OS === 'web' ? (
            <View style={styles.cameraFeedBox}>
              <video
                ref={(ref) => {
                  webVideoRef.current = ref;
                  if (ref && webStreamRef.current) {
                    ref.srcObject = webStreamRef.current;
                    ref.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  backgroundColor: '#0F172A',
                }}
              />
            </View>
          ) : permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'code128',
                  'ean13',
                  'code39',
                  'upc_a',
                  'upc_e',
                  'ean8',
                  'pdf417',
                  'aztec',
                  'datamatrix',
                ],
              }}
              onBarcodeScanned={({ data }) => handleBarcodeScanned(data)}
            />
          ) : (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={54} color="#94A3B8" />
              <Text style={styles.permissionTitle}>Camera Access Required</Text>
              <Text style={styles.permissionSub}>
                Allow camera permission to scan physical student ID cards and book barcodes live.
              </Text>
              <TouchableOpacity onPress={() => requestPermission()} style={styles.permissionBtn}>
                <Ionicons name="shield-checkmark" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.permissionBtnText}>Enable Device Camera</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Viewfinder Overlay Frame */}
          <View style={styles.viewfinderTarget}>
            {/* 4 Corner brackets */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Laser scan line */}
            <Animated.View
              style={[
                styles.laserLine,
                {
                  transform: [
                    {
                      translateY: scanAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 200],
                      }),
                    },
                  ],
                },
              ]}
            />

            <MaterialCommunityIcons
              name={mode === 'qr' ? 'qrcode-scan' : 'barcode-scan'}
              size={48}
              color="rgba(255,255,255,0.25)"
            />
            <Text style={styles.viewfinderHintText}>{targetHint}</Text>
          </View>

          {/* Manual Input Strip inside Camera */}
          <View style={styles.manualInputRow}>
            <View style={styles.manualInputWrapper}>
              <Ionicons name="keypad-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
              <TextInput
                placeholder="Type or paste Roll No / Barcode..."
                placeholderTextColor="#64748B"
                value={manualInput}
                onChangeText={setManualInput}
                style={styles.manualInputField}
                autoCapitalize="characters"
                onSubmitEditing={handleManualSubmit}
              />
              {manualInput.trim().length > 0 && (
                <TouchableOpacity onPress={handleManualSubmit} style={styles.manualSubmitBtn}>
                  <Text style={styles.manualSubmitBtnText}>SCAN</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Real-time Registered Database Records Strip (100% Real API Data) */}
        {realtimeItems.length > 0 && (
          <View style={styles.realtimeSection}>
            <View style={styles.realtimeHeaderRow}>
              <Ionicons name="server" size={12} color="#38BDF8" />
              <Text style={styles.realtimeHeaderText}>
                {realtimeItemsTitle} ({realtimeItems.length} ACTIVE)
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.realtimeList}
            >
              {realtimeItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleBarcodeScanned(item.code)}
                  style={styles.realtimeCard}
                  activeOpacity={0.8}
                >
                  <View style={styles.realtimeAvatar}>
                    <Text style={styles.realtimeAvatarText}>{item.title.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.realtimeTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.realtimeSub} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                    <Text style={styles.realtimeCode}>*{item.code}*</Text>
                  </View>
                  <View style={styles.realtimeSelectPill}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.realtimeSelectText}>SELECT</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitles: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  subTitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  cameraWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cameraFeedBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
  },
  permissionBox: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 14,
    marginBottom: 6,
  },
  permissionSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  viewfinderTarget: {
    width: 290,
    height: 230,
    borderRadius: 18,
    backgroundColor: 'rgba(15,23,42,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#38BDF8',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  laserLine: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: 3,
    backgroundColor: '#EF4444',
    borderRadius: 2,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  viewfinderHintText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 8,
  },
  manualInputRow: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  manualInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  manualInputField: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: 10,
    fontSize: 13,
  },
  manualSubmitBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  manualSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  realtimeSection: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  realtimeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  realtimeHeaderText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  realtimeList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  realtimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 250,
    gap: 10,
  },
  realtimeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  realtimeAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  realtimeTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  realtimeSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 1,
  },
  realtimeCode: {
    color: '#38BDF8',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    marginTop: 2,
  },
  realtimeSelectPill: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    gap: 2,
  },
  realtimeSelectText: {
    color: '#10B981',
    fontSize: 8,
    fontWeight: '800',
  },
});
