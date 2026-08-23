import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BatlloBackground } from '../components/BatlloBackground';
import {
  editPhotoStoryCaption,
  hiddenCount,
  hideAlbumCard,
  reorderAlbumCards,
  restoreHiddenCards,
  setAlbumTheme,
  setCoverFromCard,
  setPhotoCrop,
  visibleCards,
} from '../domain/album';
import { formatDistanceKm, formatDuration, formatPace } from '../domain/geo';
import { track } from '../services/analytics';
import { getAlbumByRunId, saveAlbum } from '../services/albumStore';
import type { TravelAlbum } from '../types/album';
import { ALBUM_ACCENTS, ALBUM_LAYOUTS } from '../types/album';
import { colors, fonts, radii, spacing } from '../theme';

type Props = {
  runId: string;
  onBack: () => void;
  onShare: () => void;
};

export function AlbumScreen({ runId, onBack, onShare }: Props) {
  const insets = useSafeAreaInsets();
  const [album, setAlbum] = useState<TravelAlbum | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getAlbumByRunId(runId).then((a) => {
      setAlbum(a);
      if (a) track('album_ready_viewed', { albumId: a.id });
    });
  }, [runId]);

  const apply = async (next: TravelAlbum) => {
    setAlbum(next);
    await saveAlbum(next);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  if (!album) {
    return (
      <BatlloBackground>
        <View style={[styles.center, { paddingTop: insets.top + 40 }]}>
          <Text style={styles.spark}>✦</Text>
          <Text style={styles.loading}>✦ Preparando tu álbum…</Text>
          <Text style={styles.loadingHint}>Montando portada, historias y cierre editorial</Text>
          <Pressable onPress={onBack}>
            <Text style={styles.back}>← Volver</Text>
          </Pressable>
        </View>
      </BatlloBackground>
    );
  }

  const cards = visibleCards(album);
  const hidden = hiddenCount(album);

  return (
    <BatlloBackground>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 28 },
        ]}
      >
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Resumen</Text>
        </Pressable>
        <Text style={styles.title}>Tu Travel Album</Text>
        <Text style={styles.meta}>
          {album.createdBy === 'ai'
            ? '✦ Primera edición'
            : album.createdBy === 'user'
              ? 'Editado por ti'
              : 'Plantilla local'}{' '}
          · {cards.length} tarjetas
          {savedFlash ? ' · guardado' : ''}
        </Text>

        {hidden > 0 ? (
          <Pressable
            style={styles.restoreBar}
            onPress={() => {
              void apply(restoreHiddenCards(album));
              track('album_edit', { action: 'restore_hidden' });
            }}
          >
            <Text style={styles.restoreLabel}>
              Restaurar {hidden} ocultas
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.themeRow}>
          <Text style={styles.themeLabel}>Layout</Text>
          {ALBUM_LAYOUTS.map((l) => (
            <Pressable
              key={l.id}
              style={[styles.themeChip, album.theme.layout === l.id && styles.themeChipOn]}
              onPress={() => {
                void apply(setAlbumTheme(album, { layout: l.id }));
                track('album_edit', { action: 'layout', layout: l.id });
              }}
            >
              <Text
                style={[
                  styles.themeChipLabel,
                  album.theme.layout === l.id && styles.themeChipLabelOn,
                ]}
              >
                {l.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.themeRow}>
          <Text style={styles.themeLabel}>Color</Text>
          {ALBUM_ACCENTS.map((a) => (
            <Pressable
              key={a.id}
              style={[
                styles.swatch,
                { backgroundColor: a.color },
                album.theme.accent === a.color && styles.swatchOn,
              ]}
              onPress={() => {
                void apply(setAlbumTheme(album, { accent: a.color }));
                track('album_edit', { action: 'accent', accent: a.id });
              }}
            />
          ))}
        </View>

        {cards.map((card, index) => {
          const fullIndex = album.cards.findIndex((c) => c.id === card.id);
          const accent = album.theme.accent;
          const radius =
            album.theme.layout === 'minimal'
              ? 12
              : album.theme.layout === 'mosaic'
                ? 8
                : 28;
          return (
            <View
              key={card.id}
              style={[
                styles.card,
                {
                  backgroundColor: album.theme.bg,
                  borderRadius: radius,
                  borderLeftWidth: 3,
                  borderLeftColor: accent,
                },
              ]}
            >
              {card.type === 'cover' && (
                <>
                  <Text style={[styles.cardType, { color: accent }]}>PORTADA</Text>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  {card.subtitle ? <Text style={styles.cardBody}>{card.subtitle}</Text> : null}
                </>
              )}
              {card.type === 'city_distance' && (
                <>
                  <Text style={[styles.cardType, { color: accent }]}>CIUDAD</Text>
                  <Text style={styles.cardTitle}>
                    {card.city} · {card.distanceLabel}
                  </Text>
                </>
              )}
              {card.type === 'route_map' && (
                <>
                  <Text style={[styles.cardType, { color: accent }]}>MAPA</Text>
                  <View style={styles.mapStub}>
                    <View style={[styles.mapLine, { backgroundColor: accent }]} />
                    <Text style={styles.cardBody}>Polyline de tu Discovery Run</Text>
                  </View>
                </>
              )}
              {card.type === 'photo_story' && (
                <>
                  <Text style={[styles.cardType, { color: accent }]}>FOTO · HISTORIA</Text>
                  <View
                    style={[
                      styles.photoStub,
                      {
                        transform: [
                          { scale: card.crop?.zoom ?? 1 },
                          { translateX: (card.crop?.offsetX ?? 0) * 24 },
                          { translateY: (card.crop?.offsetY ?? 0) * 16 },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.photoStubLabel}>
                      {card.photoId ? 'Foto capturada' : 'Sin foto · tip editorial'}
                    </Text>
                  </View>
                  <Text style={styles.cardTitle}>{card.placeName}</Text>
                  {editingId === card.id ? (
                    <TextInput
                      style={styles.input}
                      value={draft}
                      onChangeText={setDraft}
                      multiline
                      autoFocus
                      onBlur={() => {
                        void apply(editPhotoStoryCaption(album, card.id, draft));
                        setEditingId(null);
                        track('album_edit', { action: 'edit_caption' });
                      }}
                    />
                  ) : (
                    <Pressable
                      onPress={() => {
                        setEditingId(card.id);
                        setDraft(card.storyExcerpt);
                      }}
                    >
                      <Text style={styles.cardBody}>{card.storyExcerpt}</Text>
                      <Text style={styles.editHint}>Toca para editar</Text>
                    </Pressable>
                  )}
                  <View style={styles.cropRow}>
                    <Pressable
                      onPress={() => {
                        const z = (card.crop?.zoom ?? 1) >= 1.4 ? 1 : 1.45;
                        void apply(
                          setPhotoCrop(album, card.id, {
                            zoom: z,
                            offsetX: card.crop?.offsetX ?? 0,
                            offsetY: card.crop?.offsetY ?? 0,
                          }),
                        );
                        track('album_edit', { action: 'crop_zoom' });
                      }}
                    >
                      <Text style={styles.action}>Zoom</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void apply(
                          setPhotoCrop(album, card.id, {
                            zoom: card.crop?.zoom ?? 1,
                            offsetX: ((card.crop?.offsetX ?? 0) + 0.15) % 0.45,
                            offsetY: card.crop?.offsetY ?? 0,
                          }),
                        );
                        track('album_edit', { action: 'crop_pan' });
                      }}
                    >
                      <Text style={styles.action}>Reposition</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        void apply(setCoverFromCard(album, card.id));
                        track('album_edit', { action: 'set_cover' });
                      }}
                    >
                      <Text style={styles.action}>Portada</Text>
                    </Pressable>
                  </View>
                </>
              )}
              {card.type === 'stats' && (
                <>
                  <Text style={[styles.cardType, { color: accent }]}>STATS</Text>
                  <Text style={styles.cardTitle}>
                    {formatDistanceKm(card.distanceM)} · {formatDuration(card.durationSec)}
                  </Text>
                  <Text style={styles.cardBody}>
                    {formatPace(card.paceSec)} · {card.places} lugares
                  </Text>
                </>
              )}
              {card.type === 'final' && (
                <>
                  <Text style={[styles.cardType, { color: accent }]}>CIERRE</Text>
                  <Text style={styles.cardBody}>{card.caption}</Text>
                </>
              )}

              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => {
                    if (fullIndex > 0) {
                      void apply(reorderAlbumCards(album, fullIndex, fullIndex - 1));
                      track('album_edit', { action: 'reorder_up' });
                    }
                  }}
                >
                  <Text style={[styles.action, fullIndex === 0 && styles.actionDim]}>↑</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (fullIndex < album.cards.length - 1) {
                      void apply(reorderAlbumCards(album, fullIndex, fullIndex + 1));
                      track('album_edit', { action: 'reorder_down' });
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.action,
                      fullIndex >= album.cards.length - 1 && styles.actionDim,
                    ]}
                  >
                    ↓
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void apply(hideAlbumCard(album, card.id));
                    track('album_edit', { action: 'hide' });
                  }}
                >
                  <Text style={styles.action}>Ocultar</Text>
                </Pressable>
                <Text style={styles.index}>{index + 1}</Text>
              </View>
            </View>
          );
        })}

        <Pressable
          style={styles.cta}
          onPress={() => {
            track('share_cta_tapped', { from: 'album' });
            onShare();
          }}
        >
          <Text style={styles.ctaLabel}>Compartir álbum</Text>
        </Pressable>
      </ScrollView>
    </BatlloBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg },
  center: { flex: 1, alignItems: 'center', gap: 12, paddingHorizontal: 24 },
  spark: { fontSize: 32, color: colors.terracotta },
  loading: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },
  loadingHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  back: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 28,
    color: colors.ink,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.secondaryText,
    marginBottom: 16,
  },
  restoreBar: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borders,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  restoreLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.terracotta,
  },
  themeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  themeLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.secondaryText,
    marginRight: 4,
  },
  themeChip: {
    borderWidth: 1,
    borderColor: colors.borders,
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  themeChipOn: {
    backgroundColor: colors.terracotta,
    borderColor: colors.terracotta,
  },
  themeChipLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.ink,
  },
  themeChipLabelOn: { color: colors.white },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: {
    borderColor: colors.ink,
  },
  card: {
    backgroundColor: colors.ink,
    padding: 18,
    marginBottom: 12,
    ...radii.cardSoft,
  },
  cropRow: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
  },
  cardType: {
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.mosaicYellow,
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: colors.surface,
    marginBottom: 6,
  },
  cardBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: 'rgba(255,248,239,0.8)',
  },
  editHint: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,248,239,0.4)',
  },
  mapStub: {
    backgroundColor: '#3a2a1c',
    borderRadius: 16,
    padding: 14,
    marginBottom: 4,
  },
  mapLine: {
    height: 3,
    width: '70%',
    backgroundColor: colors.terracotta,
    borderRadius: 4,
    marginBottom: 10,
  },
  photoStub: {
    height: 88,
    backgroundColor: '#3a2a1c',
    borderRadius: 16,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoStubLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: 'rgba(255,248,239,0.55)',
  },
  input: {
    backgroundColor: '#3a2a1c',
    color: colors.surface,
    fontFamily: fonts.body,
    fontSize: 14,
    padding: 10,
    borderRadius: 12,
    minHeight: 64,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
  },
  action: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.terracotta,
  },
  actionDim: { opacity: 0.35 },
  index: {
    marginLeft: 'auto',
    fontFamily: fonts.mono,
    fontSize: 12,
    color: 'rgba(255,248,239,0.4)',
  },
  cta: {
    marginTop: 8,
    backgroundColor: colors.terracotta,
    paddingVertical: 16,
    alignItems: 'center',
    ...radii.primaryButton,
  },
  ctaLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.white,
  },
});
