import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Feather } from '@expo/vector-icons';

interface EmptyStateProps {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  accentColor?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  accentColor,
}) => {
  const { colors } = useTheme();
  const tint = accentColor || colors.primary;

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${tint}18` }]}>
        <Feather name={icon} size={32} color={tint} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {description}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tint }]}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  button: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
