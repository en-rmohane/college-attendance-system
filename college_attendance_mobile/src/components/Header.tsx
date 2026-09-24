import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons, Feather } from '@expo/vector-icons';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  onNotificationPress,
  onProfilePress,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, role } = useAuth();

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const isAdmin = role === 'admin';
  const isAccountant = role === 'accountant';
  const isProf = role === 'professor';
  const isLibrarian = role === 'librarian' || role === 'assistant_librarian';
  const isBusIncharge = role === 'bus_incharge' || role === 'transport_manager' || role === 'transport_incharge' || role === 'driver';

  const roleLabel = isAdmin
    ? 'ADMIN'
    : isAccountant
    ? 'ACCOUNTS'
    : isLibrarian
    ? 'LIBRARIAN'
    : isBusIncharge
    ? 'BUS INCHARGE'
    : isProf
    ? 'FACULTY'
    : 'STUDENT';

  const roleColor = isAdmin
    ? colors.coral
    : isAccountant
    ? colors.purple
    : isLibrarian
    ? colors.teal
    : isBusIncharge
    ? colors.coral
    : isProf
    ? colors.teal
    : colors.amber;

  const roleBg = isAdmin
    ? colors.softPeach
    : isAccountant
    ? colors.softLavender
    : isLibrarian
    ? colors.softCyan
    : isBusIncharge
    ? colors.softPeach
    : isProf
    ? colors.softCyan
    : colors.softYellow;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.headerBg,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* Left section: Logo or Back Button */}
      <View style={styles.leftSection}>
        {showBack ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
            onPress={onBackPress}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.brandRow}>
            {/* Pastel Campus Emblem */}
            <View style={[styles.logoIconBox, { backgroundColor: colors.primary }]}>
              <Ionicons name="school" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.titleCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.brandTitle, { color: colors.text }]}>
                  {title || 'SBITM ERP'}
                </Text>
                <View style={[styles.headerRoleBadge, { backgroundColor: roleBg, borderColor: `${roleColor}40` }]}>
                  <Animated.View
                    style={[
                      styles.pulseDot,
                      {
                        backgroundColor: roleColor,
                        opacity: pulseAnim,
                      },
                    ]}
                  />
                  <Text style={[styles.headerRoleText, { color: roleColor }]}>{roleLabel}</Text>
                </View>
              </View>
              <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>
                {subtitle || (isAdmin ? 'Administration Portal' : isProf ? 'Department Faculty' : 'Academic Portal')}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Right section: Theme Toggle, Notifications, Profile Avatar */}
      <View style={styles.rightSection}>
        {/* Dark Mode Toggle */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={18}
            color={isDark ? colors.amber : colors.primary}
          />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}
          onPress={onNotificationPress}
          activeOpacity={0.7}
        >
          <Feather name="bell" size={18} color={colors.text} />
          <View style={[styles.notifBadge, { backgroundColor: colors.coral }]} />
        </TouchableOpacity>

        {/* User Avatar */}
        <TouchableOpacity
          style={[styles.avatarBtn, { borderColor: roleColor }]}
          onPress={onProfilePress}
          activeOpacity={0.8}
        >
          {user?.profilePhoto ? (
            <Image source={{ uri: user.profilePhoto }} style={styles.avatarImg} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: roleColor }]}>
              <Text style={styles.avatarText}>{isAdmin ? 'A' : isProf ? 'F' : userInitial}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 66,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B6CFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  titleCol: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  pulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  headerRoleText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    overflow: 'hidden',
    marginLeft: 2,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
