import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, ScrollView } from 'react-native';
import MapView, { Polyline, Marker, LatLng } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';

const BLUE = '#007AFF';
const LIGHT_GRAY = '#F2F2F7';
const DARK_GRAY = '#555';
const RED_ACTION = '#FF3B30';

// 🔹 Tipo com nome da rua
type NodeComNome = LatLng & { nome?: string };

export default function NavegacaoAtivaScreen() {
    const { polyline, totalDistance, totalTime } = useLocalSearchParams();
    const [rota, setRota] = useState<NodeComNome[]>([]);
    const [instrucoes, setInstrucoes] = useState<string[]>([]);
    const mapRef = useRef<MapView>(null);

    // 🔹 Converte path recebido (JSON -> array com latitude/longitude + nome da rua)
    useEffect(() => {
        if (polyline) {
            try {
                const parsed = JSON.parse(polyline as string);

                const coords: NodeComNome[] = parsed.map((n: any, index: number) => ({
                    latitude: n.lat,
                    longitude: n.lng,
                    nome: n.nomeRua || n.nome || `Via ${index + 1}`,
                }));

                setRota(coords);

                // 🧭 Função para calcular o ângulo de virada
                function calcularAngulo(p1: LatLng, p2: LatLng, p3: LatLng): number {
                    const a1 = Math.atan2(p2.latitude - p1.latitude, p2.longitude - p1.longitude);
                    const a2 = Math.atan2(p3.latitude - p2.latitude, p3.longitude - p2.longitude);
                    let angulo = (a2 - a1) * (180 / Math.PI);
                    if (angulo > 180) angulo -= 360;
                    if (angulo < -180) angulo += 360;
                    return angulo;
                }

                // 🔤 Normaliza nomes de ruas para evitar duplicações
                function normalizarNome(nome: string) {
                    return nome
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '') // remove acentos
                        .replace(/^r\.?\s+/i, '') // ignora "r." ou "rua"
                        .trim();
                }

                const steps: string[] = [];
                let ultimaRua = '';
                let ultimaInstrucao = '';

                for (let i = 0; i < coords.length - 2; i++) {
                    const atual = coords[i];
                    const proximo = coords[i + 1];
                    const seguinte = coords[i + 2];

                    const ruaAtual = atual.nome || 'via desconhecida';
                    const ruaProx = proximo.nome || 'via desconhecida';

                    // Primeira instrução
                    if (i === 0) {
                        steps.push(`Siga pela ${ruaAtual}`);
                        ultimaRua = ruaAtual;
                        continue;
                    }

                    const angulo = calcularAngulo(atual, proximo, seguinte);

                    // 🔹 Ignora pequenas curvas
                    if (Math.abs(angulo) < 40) continue;

                    // 🔹 Evita repetições na mesma rua
                    if (
                        normalizarNome(ruaAtual) === normalizarNome(ultimaRua) &&
                        normalizarNome(ruaProx) === normalizarNome(ultimaRua)
                    ) continue;

                    const direcao = angulo > 0 ? 'Vire à direita' : 'Vire à esquerda';

                    // 🔹 Usa “entrar” se mudar de rua, “continuar” se for a mesma
                    const instrucao =
                        normalizarNome(ruaProx) === normalizarNome(ruaAtual)
                            ? `${direcao} para continuar na ${ruaProx}`
                            : `${direcao} para entrar na ${ruaProx}`;

                    // 🔹 Evita instruções duplicadas consecutivas
                    if (instrucao !== ultimaInstrucao) {
                        steps.push(instrucao);
                        ultimaInstrucao = instrucao;
                        ultimaRua = ruaProx;
                    }
                }

                steps.push('Você chegou ao destino 🎯');
                setInstrucoes(steps);
            } catch (err) {
                console.error('Erro ao processar polyline recebido:', err);
            }
        }
    }, [polyline]);

    useEffect(() => {
        if (rota.length > 0 && mapRef.current) {
            mapRef.current.fitToCoordinates(rota, {
                edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
                animated: true,
            });
        }
    }, [rota]);

    const encerrarRota = () => {
        router.replace('/');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Navegação Ativa</Text>

            {/* 🗺️ Mapa */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                        latitude: rota[0]?.latitude || -23.6,
                        longitude: rota[0]?.longitude || -46.56,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                >
                    {rota.length > 0 && (
                        <>
                            <Polyline coordinates={rota} strokeColor={BLUE} strokeWidth={5} />
                            <Marker coordinate={rota[0]} title="Início" pinColor="green" />
                            <Marker coordinate={rota[rota.length - 1]} title="Destino" pinColor="red" />
                        </>
                    )}
                </MapView>
            </View>

            {/* 🧭 Lista de instruções */}
            <ScrollView style={styles.instructionsList}>
                {instrucoes.map((texto, i) => (
                    <View key={i} style={styles.instructionsBox}>
                        <Ionicons
                            name={
                                texto.includes('direita')
                                    ? 'arrow-forward-circle'
                                    : texto.includes('esquerda')
                                        ? 'arrow-back-circle'
                                        : texto.includes('destino')
                                            ? 'flag'
                                            : 'navigate-circle'
                            }
                            size={28}
                            color={BLUE}
                            style={{ flexShrink: 0 }}
                        />
                        <Text style={styles.commandText} numberOfLines={2} ellipsizeMode="tail">
                            {texto}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            {/* 📊 Resumo final */}
            <View style={styles.summaryBox}>
                <Text style={styles.distanceText}>
                    Distância total: {(Number(totalDistance) / 1000).toFixed(2)} km
                </Text>
                <Text style={styles.distanceText}>
                    Tempo estimado: {Number(totalTime).toFixed(1)} min
                </Text>
            </View>

            {/* 🔴 Botão */}
            <TouchableOpacity style={styles.button} onPress={encerrarRota}>
                <Text style={styles.buttonText}>Encerrar Rota</Text>
            </TouchableOpacity>
        </View>
    );
}

// --- 🎨 Estilos ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: DARK_GRAY,
        marginBottom: 10,
    },
    mapContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        height: Dimensions.get('window').height * 0.4,
        marginBottom: 20,
    },
    map: {
        flex: 1,
    },
    instructionsList: {
        flex: 1,
        marginBottom: 20,
    },
    instructionsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: LIGHT_GRAY,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        marginBottom: 10,
    },
    commandText: {
        flex: 1,                 // 🧭 ocupa o restante da linha
        marginLeft: 10,          // espaço do ícone
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        flexWrap: 'wrap',        // permite quebrar linha
    },
    summaryBox: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
    },
    distanceText: {
        fontSize: 16,
        color: DARK_GRAY,
        marginVertical: 2,
    },
    button: {
        backgroundColor: RED_ACTION,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 30,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

