import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { Faculty } from '../types';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';

export const FacultyDirectoryScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [faculties, setFaculties] = useState<Faculty[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await api.getAllFaculties();
      setFaculties(data);
    };
    load();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.headerBox, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={[styles.title, { color: colors.text }]}>Faculty & Professors</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Department Faculty Members & Subject Incharges
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {faculties.map(faculty => (
          <View
            key={faculty.id}
            style={[styles.facultyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primarySubtle }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {faculty.name.replace('Dr. ', '').replace('Prof. ', '').charAt(0)}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{faculty.name}</Text>
                <Text style={[styles.designation, { color: colors.primary }]}>
                  {faculty.designation}
                </Text>
                <Text style={[styles.dept, { color: colors.textSecondary }]}>
                  {faculty.department}
                </Text>
              </View>
            </View>

            {/* Subjects assigned */}
            <View style={[styles.subjectsBox, { backgroundColor: colors.surfaceSubtle }]}>
              <Text style={[styles.subHeading, { color: colors.textSecondary }]}>Assigned Courses:</Text>
              {faculty.assignedSubjects.map((sub, idx) => (
                <View key={idx} style={styles.subRow}>
                  <Feather name="book-open" size={12} color={colors.accent} />
                  <Text style={[styles.subName, { color: colors.text }]}>{sub}</Text>
                </View>
              ))}
            </View>

            {/* Contact links */}
            <View style={[styles.contactRow, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: colors.surfaceSubtle }]}
                onPress={() => Linking.openURL(`mailto:${faculty.email}`)}
              >
                <Feather name="mail" size={13} color={colors.primary} />
                <Text style={[styles.contactBtnText, { color: colors.primary }]} numberOfLines={1}>
                  {faculty.email}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.callBtn, { backgroundColor: colors.successSubtle }]}
                onPress={() => Linking.openURL(`tel:${faculty.phone}`)}
              >
                <Feather name="phone" size={13} color={colors.success} />
                <Text style={[styles.callBtnText, { color: colors.success }]}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerBox: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  facultyCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  designation: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  dept: {
    fontSize: 11,
    marginTop: 1,
  },
  subjectsBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    gap: 6,
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subName: {
    fontSize: 12,
    fontWeight: '600',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
