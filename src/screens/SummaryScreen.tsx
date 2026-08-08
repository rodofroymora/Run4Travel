import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import { MedalBadge } from '../components/MedalBadge';
import { PaceChart } from '../components/PaceChart';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  onBack?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  onViewAlbum?: () => void;
};

export function SummaryScreen({ onBack, onShare, onSave, onViewAlbum }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <BatlloBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backLabel}>← Hoy</Text>
        </Pressable>

        <View style={styles.hero}>
          <MedalBadge label={'10K\nCOMPLETADA'} size={120} />
          <Text style={styles.greeting}>¡Molt bé, Marta!</Text>
          <Text style={styles.runMeta}>Modernisme Loop · Barcelona · 7:02 am</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, radii.cardStat]}>
            <Text style={styles.statValue}>10.24 km</Text>
            <Text style={styles.statLabel}>distancia</Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                borderTopLeftRadius: 36,
                borderTopRightRadius: 28,
                borderBottomRightRadius: 40,
                borderBottomLeftRadius: 24,
              },
            ]}
          >
            <Text style={styles.statValue}>57:48</Text>
            <Text style={styles.statLabel}>tiempo</Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                borderTopLeftRadius: 24,
                borderTopRightRadius: 40,
                borderBottomRightRadius: 28,
                borderBottomLeftRadius: 36,
              },
            ]}
          >
            <Text style={styles.statValue}>5:38 /km</Text>
            <Text style={styles.statLabel}>
              ritmo · PB <Text style={styles.spark}>✦</Text>
            </Text>
          </View>
          <View
            style={[
              styles.statCard,
              {
                borderTopLeftRadius: 40,
                borderTopRightRadius: 24,
                borderBottomRightRadius: 36,
                borderBottomLeftRadius: 28,
              },
            ]}
          >
            <Text style={styles.statValue}>14</Text>
            <Text style={styles.statLabel}>historias escuchadas</Text>
          </View>
        </View>

        <View style={styles.block}>
          <PaceChart />
        </View>

        <Pressable
          style={({ pressed }) => [styles.albumCard, pressed && styles.pressed]}
          onPress={onViewAlbum}
        >
          <View style={styles.albumIcon}>
            <Text style={styles.albumSpark}>✦</Text>
          </View>
          <View style={styles.albumInfo}>
            <Text style={styles.albumTitle}>Tu álbum está listo</Text>
            <Text style={styles.albumMeta}>6 fotos editadas · Modernisme Loop</Text>
          </View>
          <Text style={styles.albumAction}>Ver →</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
          onPress={onShare}
          accessibilityRole="button"
        >
          <Text style={styles.shareLabel}>Compartir carrera</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.saveBtn, pressed && styles.pressed]}
          onPress={onSave}
          accessibilityRole="button"
        >
          <Text style={styles.saveLabel}>Guardar</Text>
        </Pressable>
      </ScrollView>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.lg,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  backLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    marginTop: 16,
    fontFamily: fonts.heading,
    fontSize: 30,
    letterSpacing: -0.6,
    color: colors.ink,
    textAlign: 'center',
  },
  runMeta: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 16,
    paddingHorizontal: 14,
    minHeight: 88,
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: fonts.monoBold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  spark: {
    color: colors.terracotta,
    fontFamily: fonts.bodySemi,
  },
  block: {
    marginBottom: spacing.md,
  },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 36,
    borderBottomRightRadius: 32,
    borderBottomLeftRadius: 40,
  },
  albumIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.mosaicYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumSpark: {
    fontSize: 18,
    color: colors.ink,
  },
  albumInfo: { flex: 1 },
  albumTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 2,
  },
  albumMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.secondaryText,
  },
  albumAction: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.terracotta,
  },
  shareBtn: {
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
    ...radii.primaryButton,
  },
  shareLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.white,
  },
  saveBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 999,
  },
  saveLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
  pressed: { opacity: 0.88 },
});
