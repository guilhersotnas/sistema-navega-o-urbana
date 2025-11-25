import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { calcularRota, RotaResponse } from '../src/api';
import { salvarRota } from '../db/rotasDb';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';

const BLUE = '#007AFF';
const LIGHT_GRAY = '#F2F2F7';
const DARK_GRAY = '#555';
const GRAY_DIVIDER = '#E5E5EA';

type Node = { id: string; nome?: string; lat: number; lng: number };
type RotaCompleta = RotaResponse & {
  totalTime?: number;
  mode?: string;
};

interface RadioOptionProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  isLast?: boolean;
}

const RadioOption: React.FC<RadioOptionProps> = ({
  label,
  isSelected,
  onPress,
  isLast = false,
}) => (
  <TouchableOpacity
    style={[styles.radioOptionContainer, isLast ? { borderBottomWidth: 0 } : {}]}
    onPress={onPress}
  >
    <View style={styles.radioCircle}>{isSelected && <View style={styles.radioDot} />}</View>
    <Text style={styles.radioLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function ResultadoRotaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ origemId: string; destinoId: string }>();

  const [origem, setOrigem] = useState(params.origemId || '');
  const [destino, setDestino] = useState(params.destinoId || '');
  const [rota, setRota] = useState<RotaCompleta | null>(null);
  const [loading, setLoading] = useState(false);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<'distancia' | 'tempo'>('tempo');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (origem && destino) fetchRota(opcaoSelecionada);
  }, [origem, destino, opcaoSelecionada]);

  const fetchRota = async (criterio: 'distancia' | 'tempo') => {
    setLoading(true);
    try {
      const algoritmo = 'dijkstra';
      const data = await calcularRota(origem, destino, algoritmo);
      console.log('Dados recebidos do backend:', data);

      if (!data.pathNodes || data.pathNodes.length <= 1) {
        Alert.alert(
          'Rota não encontrada',
          'Não foi possível traçar um caminho entre os pontos selecionados.'
        );
        setRota(null);
        return;
      }

      // Calcular tempo total e modo (raw)
      const totalTime =
        data.pathEdges?.reduce((sum, e) => sum + (e.tempo || 0), 0) ?? 0;
      const rawMode = data.pathEdges?.[0]?.modo || 'car';

      // Mapear para valores curtos consistentes com o DB (opcional)
      const mapMode = (m: string) => {
        const mm = (m || '').toString().toLowerCase();
        if (mm.includes('walk') || mm.includes('walking') || mm === 'a pé' || mm === 'pedestrian') return 'walking';
        if (mm.includes('bike') || mm.includes('bicycle') || mm === 'bicicleta') return 'bicycle';
        if (mm.includes('bus') || mm === 'ônibus' || mm === 'onibus') return 'bus';
        return 'car';
      };
      const mode = mapMode(rawMode);

      // Atualiza estado da rota
      setRota({ ...data, totalTime, mode });

      // --- SALVA NO BANCO LOCAL ---
      // Não precisamos bloquear a UI se salvar falhar; logaremos apenas.
      try {
        await salvarRota(
          origem,
          destino,
          `${(data.totalDistance / 1000).toFixed(2)} km`,
          `${totalTime.toFixed(1)} min`,
          mode
        );
        console.log('Rota salva no banco local');
      } catch (saveErr) {
        console.warn('Falha ao salvar rota localmente:', saveErr);
      }

    } catch (error) {
      console.error('Erro ao buscar rota:', error);
      Alert.alert('Erro', 'Não foi possível calcular a rota.');
    } finally {
      setLoading(false);
    }
  };


  const iniciarNavegacao = async () => {
    if (!rota) return;

    router.push({
      pathname: '/navegacao',
      params: {
        polyline: JSON.stringify(rota.polyline),  // ✅ usa polyline, não pathNodes
        totalDistance: rota.totalDistance,
        totalTime: rota.totalTime ?? 0,
      },
    });
  };

  const getRegion = (): Region => {
    if (!rota || !rota.pathNodes.length) {
      return { latitude: -23.622, longitude: -46.550, latitudeDelta: 0.03, longitudeDelta: 0.03 };
    }

    const lats = rota.pathNodes.map(n => n.lat);
    const lngs = rota.pathNodes.map(n => n.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.03,
      longitudeDelta: (maxLng - minLng) * 1.5 || 0.03,
    };
  };



  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Sistema de Navegação Urbana</Text>

        <View style={styles.mapContainer}>
          {rota?.pathNodes.length ? (
            <MapView style={{ width: '100%', height: '100%' }} region={getRegion()}>
              <Marker
                coordinate={{
                  latitude: rota.pathNodes[0].lat,
                  longitude: rota.pathNodes[0].lng,
                }}
                title="Origem"
                pinColor="green"
              />

              <Marker
                coordinate={{
                  latitude: rota.pathNodes[rota.pathNodes.length - 1].lat,
                  longitude: rota.pathNodes[rota.pathNodes.length - 1].lng,
                }}
                title="Destino"
                pinColor="red"
              />

              {rota.polyline?.length > 1 && (
                <Polyline
                  coordinates={rota.polyline.map(p => ({
                    latitude: p.lat,
                    longitude: p.lng,
                  }))}
                  strokeColor={BLUE}
                  strokeWidth={4}
                />
              )}
            </MapView>
          ) : (
            <Text style={styles.mapPlaceholder}>Mapa da Rota</Text>
          )}
        </View>

        <View style={styles.optionsBox}>
          <RadioOption
            label="Menor distância"
            isSelected={opcaoSelecionada === 'distancia'}
            onPress={() => setOpcaoSelecionada('distancia')}
          />
          <RadioOption
            label="Menor tempo"
            isSelected={opcaoSelecionada === 'tempo'}
            onPress={() => setOpcaoSelecionada('tempo')}
            isLast
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={BLUE} style={{ marginVertical: 40 }} />
        ) : rota ? (
          <>
            <View style={styles.detailsBox}>
              <View style={styles.detailItem}>
                <Text style={styles.detailTitle}>Distância total</Text>
                <Text style={styles.detailValue}>{(rota.totalDistance / 1000).toFixed(2)} km</Text>
              </View>

              <View style={[styles.detailItem, { marginTop: 10 }]}>
                <Text style={styles.detailTitle}>Tempo estimado</Text>
                <Text style={styles.detailValue}>{rota.totalTime?.toFixed(1)} min</Text>
              </View>

              <View style={[styles.detailItem, { marginTop: 10 }]}>
                <Text style={styles.detailTitle}>Modo</Text>
                <Text style={styles.detailValue}>
                  {rota.mode === "car"
                    ? "Carro"
                    : rota.mode === "walking"
                      ? "A pé"
                      : rota.mode === "bicycle"
                        ? "Bicicleta"
                        : rota.mode === "bus"
                          ? "Ônibus"
                          : "Desconhecido"}
                </Text>
              </View>

            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={iniciarNavegacao}
            >
              <Text style={styles.buttonText}>Iniciar Navegação</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: {
    padding: 20,
    marginTop: 10,
    paddingTop: Platform.OS === 'ios' ? 70 : 20,
    paddingBottom: 40,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: DARK_GRAY, marginBottom: 20 },
  mapContainer: {
    backgroundColor: LIGHT_GRAY,
    borderRadius: 12,
    height: 350,
    marginBottom: 25,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapPlaceholder: { fontSize: 16, color: DARK_GRAY, opacity: 0.4 },
  optionsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 25,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
      android: { elevation: 3 },
    }),
  },
  radioOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: GRAY_DIVIDER,
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: DARK_GRAY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: BLUE },
  radioLabel: { marginLeft: 15, fontSize: 16, color: '#000' },
  detailsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 30,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
      android: { elevation: 3 },
    }),
  },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailTitle: { fontSize: 16, color: DARK_GRAY, fontWeight: 'bold' },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#000' },
  button: {
    backgroundColor: BLUE,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
