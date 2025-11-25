import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { listarRotas } from '../../db/rotasDb';

const BLUE = '#007AFF';
const LIGHT_GRAY = '#F2F2F7';
const DARK_GRAY = '#555';
const GRAY_DIVIDER = '#E5E5EA';

interface RotaHistorico {
  id: number;
  origem: string;
  destino: string;
  tempo: string;
  distancia: string;
  modo: 'car' | 'walking' | 'bus' | 'bicycle';
}

export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fromHistorico = params.fromHistorico === 'true';
  const modo = String(params.modo || 'car');

  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [loading, setLoading] = useState(false);
  const [rotas, setRotas] = useState<RotaHistorico[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);

  const [sugestoesOrigem, setSugestoesOrigem] = useState<string[]>([]);
  const [sugestoesDestino, setSugestoesDestino] = useState<string[]>([]);
  const [mostrandoOrigem, setMostrandoOrigem] = useState(false);
  const [mostrandoDestino, setMostrandoDestino] = useState(false);

  useEffect(() => {
    if (fromHistorico && params.origem && params.destino) {
      const origemStr = Array.isArray(params.origem) ? params.origem[0] : params.origem;
      const destinoStr = Array.isArray(params.destino) ? params.destino[0] : params.destino;
      setOrigem(origemStr);
      setDestino(destinoStr);

      router.push({
        pathname: '/resultadoRota',
        params: { origemId: origemStr, destinoId: destinoStr, modo },
      });
    }
  }, [fromHistorico, params]);

  useEffect(() => {
    const carregarHistorico = async () => {
      try {
        setCarregandoHistorico(true);
        const data = await listarRotas();
        const parsed = data.map((r: any) => ({
          ...r,
          modo: (['car', 'walking', 'bus', 'bicycle'].includes(r.modo)
            ? r.modo
            : 'car') as 'car' | 'walking' | 'bus' | 'bicycle',
        }));
        setRotas(parsed.slice(0, 5));
      } catch (err) {
        console.error('Erro ao carregar histórico:', err);
      } finally {
        setCarregandoHistorico(false);
      }
    };
    carregarHistorico();
  }, []);

  const calcularRotaHandler = () => {
    if (!origem || !destino) {
      Alert.alert('Atenção', 'Preencha origem e destino para calcular a rota.');
      return;
    }

    router.push({
      pathname: '/resultadoRota',
      params: { origemId: origem, destinoId: destino },
    });
  };

  const handlePressHistorico = (item: RotaHistorico) => {
    router.push({
      pathname: '/',
      params: {
        origem: item.origem,
        destino: item.destino,
        modo: item.modo,
        fromHistorico: 'true',
      },
    });
  };

  const filtrarSugestoes = (texto: string, tipo: 'origem' | 'destino') => {
    const todas = [...new Set(rotas.flatMap(r => [r.origem, r.destino]))].filter(Boolean);
    const filtradas = todas.filter(
      item => item.toLowerCase().includes(texto.toLowerCase()) && item !== texto
    );

    if (tipo === 'origem') {
      setSugestoesOrigem(filtradas.slice(0, 5));
      setMostrandoOrigem(true);
    } else {
      setSugestoesDestino(filtradas.slice(0, 5));
      setMostrandoDestino(true);
    }
  };

  const handleSelecionarSugestao = (texto: string, tipo: 'origem' | 'destino') => {
    Keyboard.dismiss();
    setTimeout(() => {
      if (tipo === 'origem') {
        setOrigem(texto);
        setMostrandoOrigem(false);
      } else {
        setDestino(texto);
        setMostrandoDestino(false);
      }
    }, 80);
  };

  return (
    <TouchableWithoutFeedback onPress={() => {
      Keyboard.dismiss();
      setMostrandoOrigem(false);
      setMostrandoDestino(false);
    }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Sistema de Navegação Urbana</Text>

            {/* ORIGEM */}
            <View style={{ position: 'relative', zIndex: mostrandoOrigem ? 10 : 1 }}>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={20} color="#999" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Origem"
                  value={origem}
                  onChangeText={(txt) => {
                    setOrigem(txt);
                    filtrarSugestoes(txt, 'origem');
                  }}
                  onFocus={() => setMostrandoOrigem(true)}
                />
              </View>

              {mostrandoOrigem && sugestoesOrigem.length > 0 && (
                <View style={styles.sugestoesBox}>
                  {sugestoesOrigem.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.6}
                      onPress={() => handleSelecionarSugestao(s, 'origem')}
                    >
                      <View style={styles.sugestaoItem}>
                        <Text style={styles.sugestao}>{s}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* DESTINO */}
            <View style={{ position: 'relative', zIndex: mostrandoDestino ? 10 : 1 }}>
              <View style={styles.inputContainer}>
                <Ionicons name="flag-outline" size={20} color="#999" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Destino"
                  value={destino}
                  onChangeText={(txt) => {
                    setDestino(txt);
                    filtrarSugestoes(txt, 'destino');
                  }}
                  onFocus={() => setMostrandoDestino(true)}
                />
              </View>

              {mostrandoDestino && sugestoesDestino.length > 0 && (
                <View style={styles.sugestoesBox}>
                  {sugestoesDestino.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      activeOpacity={0.6}
                      onPress={() => handleSelecionarSugestao(s, 'destino')}
                    >
                      <View style={styles.sugestaoItem}>
                        <Text style={styles.sugestao}>{s}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={calcularRotaHandler}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Calculando...' : 'Calcular Rota'}</Text>
            </TouchableOpacity>

            {/* HISTÓRICO */}
            <View style={styles.historicoContainer}>
              <Text style={styles.historicoTitulo}>Histórico recente</Text>
              {carregandoHistorico ? (
                <ActivityIndicator color={BLUE} style={{ marginTop: 20 }} />
              ) : rotas.length > 0 ? (
                rotas.slice(0, 3).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    onPress={() => handlePressHistorico(item)}
                  >
                    <View style={styles.cardHeader}>
                      <Ionicons name="navigate-circle" size={22} color={BLUE} style={{ marginRight: 10 }} />
                      <Text style={styles.cardTime}>{item.tempo}</Text>
                      <Text style={styles.cardDistance}>({item.distancia})</Text>
                    </View>
                    <Text style={styles.locationText}>
                      De: <Text style={styles.locationBold}>{item.origem}</Text>
                    </Text>
                    <Text style={styles.locationText}>
                      Para: <Text style={styles.locationBold}>{item.destino}</Text>
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.historicoVazio}>Nenhuma rota salva ainda.</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { marginTop: 10, padding: 20, paddingBottom: 120 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LIGHT_GRAY,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, height: 40 },
  button: {
    backgroundColor: BLUE,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 15,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sugestoesBox: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  sugestaoItem: { paddingVertical: 8, paddingHorizontal: 12 },
  sugestao: { fontSize: 15, color: '#333' },
  historicoContainer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: GRAY_DIVIDER },
  historicoTitulo: { fontWeight: 'bold', fontSize: 20, marginBottom: 15, color: '#000' },
  card: { backgroundColor: LIGHT_GRAY, padding: 15, borderRadius: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  cardTime: { fontSize: 15, fontWeight: 'bold', color: BLUE },
  cardDistance: { fontSize: 13, color: DARK_GRAY, marginLeft: 5 },
  locationText: { fontSize: 14, color: DARK_GRAY },
  locationBold: { fontWeight: '600', color: '#000' },
  historicoVazio: { color: DARK_GRAY, textAlign: 'center', marginTop: 10 },
});
