import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Feather, Ionicons } from '@expo/vector-icons';

export const LoginScreen = () => {
  const { colors } = useTheme();
  const { login, isLoading } = useAuth();

  const [usernameOrRoll, setUsernameOrRoll] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 16,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(btnScale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(btnScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  const handleLogin = async () => {
    setErrorMessage('');
    if (!usernameOrRoll.trim()) {
      setErrorMessage('Please enter your Roll Number or Username.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }
    const res = await login(usernameOrRoll.trim(), password.trim());
    if (!res.success && res.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Abstract Soft Pastel Floating Shapes */}
      <View style={styles.floatingContainer} pointerEvents="none">
        <View style={[styles.floatingCircle1, { backgroundColor: colors.softBlue }]} />
        <View style={[styles.floatingCircle2, { backgroundColor: colors.softLavender }]} />
        <View style={[styles.floatingCircle3, { backgroundColor: colors.softPink }]} />
        <View style={[styles.floatingCircle4, { backgroundColor: colors.softCyan }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.animatedWrapper,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top Branding Section */}
          <View style={styles.heroSection}>
            <View style={[styles.appIconBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.appIconImage}
                resizeMode="cover"
              />
            </View>
            <View style={[styles.tagPill, { backgroundColor: colors.softLavender }]}>
              <Text style={[styles.tagPillText, { color: colors.purple }]}>SBITM ERP PORTAL</Text>
            </View>
            <Text style={[styles.collegeName, { color: colors.text }]}>
              College Management System
            </Text>
            <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
              SHRI BALAJI INSTITUTE OF TECHNOLOGY & MANAGEMENT
            </Text>
          </View>

          {/* Translucent Frosted Login Form Card */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.shadowMedium,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>Welcome Back 👋</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
              Sign in with your institutional credentials to access your dashboard.
            </Text>

            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: colors.dangerSubtle, borderColor: colors.danger }]}>
                <Feather name="alert-circle" size={15} color={colors.danger} style={{ marginRight: 6 }} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Username / Roll Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Institutional ID / Roll Number
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
              >
                <Feather name="user" size={17} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. 0545CS231001 or admin"
                  placeholderTextColor={colors.textMuted}
                  value={usernameOrRoll}
                  onChangeText={setUsernameOrRoll}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
              <View
                style={[
                  styles.inputContainer,
                  { backgroundColor: colors.surfaceSubtle, borderColor: colors.border },
                ]}
              >
                <Feather name="lock" size={17} color={colors.primary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Enter Password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleLogin}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              <Animated.View
                style={[
                  styles.loginBtn,
                  {
                    backgroundColor: colors.primary,
                    transform: [{ scale: btnScale }],
                  },
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.loginBtnText}>Access Portal</Text>
                    <Feather name="arrow-right" size={17} color="#FFF" />
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>

            {/* Quick Demo Access Pills */}
            <View style={{ marginTop: 20 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' }}>
                QUICK ACCESS / TEST ROLES
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {[
                  { label: 'Bus Incharge', user: 'busincharge', pass: '123456', bg: colors.softPeach, text: colors.coral },
                  { label: 'Librarian', user: 'librarian', pass: 'librarian123', bg: colors.softCyan, text: colors.teal },
                  { label: 'Fee Officer', user: 'accountant', pass: '123456', bg: colors.softLavender, text: colors.purple },
                  { label: 'Student', user: '0545CS251001', pass: '123456', bg: colors.softYellow, text: colors.amber },
                  { label: 'Faculty', user: 'pankaj', pass: '123456', bg: colors.softBlue, text: colors.primary },
                  { label: 'Admin', user: 'admin', pass: '123456', bg: colors.softGreen, text: colors.green },
                ].map((pill, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => {
                      setUsernameOrRoll(pill.user);
                      setPassword(pill.pass);
                    }}
                    style={{
                      backgroundColor: pill.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: pill.text }}>{pill.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.footerNote}>
            <View style={styles.securityBadge}>
              <Feather name="shield" size={12} color={colors.green} style={{ marginRight: 4 }} />
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                End-to-End Encrypted & Campus WAF Protected
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  floatingCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.8,
  },
  floatingCircle2: {
    position: 'absolute',
    top: 140,
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.7,
  },
  floatingCircle3: {
    position: 'absolute',
    bottom: 60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.6,
  },
  floatingCircle4: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.6,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  animatedWrapper: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  appIconBox: {
    width: 78,
    height: 78,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  appIconImage: {
    width: '100%',
    height: '100%',
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  tagPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  collegeName: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  appTagline: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
    fontWeight: '500',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#5B6CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footerNote: {
    alignItems: 'center',
    marginTop: 20,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
