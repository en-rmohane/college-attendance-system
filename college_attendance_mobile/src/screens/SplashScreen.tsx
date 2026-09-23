import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
  TouchableOpacity,
  StatusBar,
  Easing,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';

interface SplashScreenProps {
  onFinish: () => void;
}

const { width, height } = Dimensions.get('window');

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { colors, isDark } = useTheme();

  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const pulseRing = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;

  const titleFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(25)).current;

  const subtitleFade = useRef(new Animated.Value(0)).current;
  const progressBar = useRef(new Animated.Value(0)).current;
  const bottomBadgeFade = useRef(new Animated.Value(0)).current;

  const [statusText, setStatusText] = useState('Initializing Secure Session...');
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    // 1. Logo Entry Sequence
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Continuous Pulsing Glow Ring
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseRing, {
            toValue: 1.4,
            duration: 1600,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1600,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseRing, {
            toValue: 0.9,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.7,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();

    // 3. Title & Subtitle Reveal
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleFade, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    setTimeout(() => {
      Animated.timing(subtitleFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      Animated.timing(bottomBadgeFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 800);

    // 4. Progress bar fill
    Animated.timing(progressBar, {
      toValue: 1,
      duration: 2200,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Status updates
    const t1 = setTimeout(() => {
      setStatusText('Syncing Academic Rosters & Biometrics...');
      setProgressPercent(45);
    }, 800);

    const t2 = setTimeout(() => {
      setStatusText('Connecting to Campus ERP Cloud...');
      setProgressPercent(80);
    }, 1500);

    const t3 = setTimeout(() => {
      setStatusText('Ready! Welcome to SBITM ✨');
      setProgressPercent(100);
    }, 2200);

    // Finish Splash
    const timer = setTimeout(() => {
      onFinish();
    }, 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(timer);
    };
  }, []);

  const progressWidth = progressBar.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B132B" translucent />

      {/* Subtle Background Radial Glow Circles */}
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />

      {/* Top Skip Button */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={onFinish}
        activeOpacity={0.7}
      >
        <Text style={styles.skipBtnText}>Skip</Text>
        <Feather name="chevron-right" size={14} color="#94A3B8" />
      </TouchableOpacity>

      {/* Center Animated Logo Block */}
      <View style={styles.centerContent}>
        {/* Pulsing Ripple Effect */}
        <Animated.View
          style={[
            styles.pulseCircle,
            {
              transform: [{ scale: pulseRing }],
              opacity: ringOpacity,
            },
          ]}
        />

        {/* Animated App Icon & Shield */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Brand Titles */}
        <Animated.View
          style={[
            styles.titleBox,
            {
              opacity: titleFade,
              transform: [{ translateY: titleSlide }],
            },
          ]}
        >
          <View style={styles.pillTag}>
            <Ionicons name="sparkles" size={12} color="#F59E0B" />
            <Text style={styles.pillTagText}>NEXT-GEN SMART CAMPUS ERP</Text>
          </View>
          <Text style={styles.mainTitle}>SBITM ERP</Text>
          <Text style={styles.subTitle}>
            Shri Balaji Institute of Technology & Management
          </Text>
        </Animated.View>

        {/* Subtitle / Features */}
        <Animated.View style={[styles.featuresRow, { opacity: subtitleFade }]}>
          <View style={styles.featureItem}>
            <Ionicons name="finger-print" size={14} color="#38BDF8" />
            <Text style={styles.featureText}>Smart Att.</Text>
          </View>
          <View style={styles.featureDot} />
          <View style={styles.featureItem}>
            <Ionicons name="calendar-outline" size={14} color="#A78BFA" />
            <Text style={styles.featureText}>Timetable</Text>
          </View>
          <View style={styles.featureDot} />
          <View style={styles.featureItem}>
            <Ionicons name="ribbon-outline" size={14} color="#34D399" />
            <Text style={styles.featureText}>Marks & Desk</Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Loading Progress & Footer */}
      <View style={styles.bottomContainer}>
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
          </View>
          <Text style={styles.statusText}>{statusText}</Text>
        </View>

        <Animated.View style={[styles.footerBadge, { opacity: bottomBadgeFade }]}>
          <Ionicons name="shield-checkmark" size={14} color="#10B981" />
          <Text style={styles.footerText}>Enterprise 256-bit Encrypted • Betul (M.P.)</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B132B',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  bgGlowTop: {
    position: 'absolute',
    top: -100,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#1E3A8A',
    opacity: 0.25,
  },
  bgGlowBottom: {
    position: 'absolute',
    bottom: -120,
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    backgroundColor: '#0369A1',
    opacity: 0.2,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    marginRight: 24,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  skipBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  pulseCircle: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    borderColor: '#38BDF8',
    top: 5,
  },
  logoContainer: {
    width: 130,
    height: 130,
    borderRadius: 30,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  titleBox: {
    alignItems: 'center',
    marginTop: 26,
  },
  pillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    marginBottom: 10,
  },
  pillTagText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  subTitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
    lineHeight: 18,
    fontWeight: '500',
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  featureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressTrack: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  statusText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.8,
  },
  footerText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
});
