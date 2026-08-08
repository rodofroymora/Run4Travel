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
  visibleCards,
} from '../domain/album';
import { formatDistanceKm, formatDuration, formatPace } from '../domain/geo';
import { track } from '../services/analytics';
import { getAlbumByRunId, saveAlbum } from '../services/albumStore';
import type { TravelAlbum } from '../types/album';
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

        {cards.map((card, index) => {
          const fullIndex = album.cards.findIndex((c) => c.id === card.id);
          return (
            <View key={card.id} style={styles.card}>
              {card.type === 'cover' && (
                <>
                  <Text style={styles.cardType}>PORTADA</Text>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  {card.subtitle ? <Text style={styles.cardBody}>{card.subtitle}</Text> : null}
                </>
              )}
              {card.type === 'city_distance' && (
                <>
                  <Text style={styles.cardType}>CIUDAD</Text>
                  <Text style={styles.cardTitle}>
                    {card.city} · {card.distanceLabel}
                  </Text>
                </>
              )}
              {card.type === 'route_map' && (
                <>
                  <Text style={styles.cardType}>MAPA</Text>
                  <View style={styles.mapStub}>
                    <View style={styles.mapLine} />
                    <Text style={styles.cardBody}>Polyline de tu Discovery Run</Text>
                  </View>
                </>
              )}
              {card.type === 'photo_story' && (
                <>
                  <Text style={styles.cardType}>FOTO · HISTORIA</Text>
                  <View style={styles.photoStub}>
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
                </>
              )}
              {card.type === 'stats' && (
                <>
                  <Text style={styles.cardType}>STATS</Text>
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
                  <Text style={styles.cardType}>CIERRE</Text>
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
  card: {
    backgroundColor: colors.ink,
    padding: 18,
    marginBottom: 12,
    ...radii.cardSoft,
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
