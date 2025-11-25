import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { listarRotas, initDatabase, limparHistorico } from '../../db/rotasDb';

const BLUE = '#007AFF';
const LIGHT_GRAY = '#F2F2F7';
const DARK_GRAY = '#555';

interface RotaHistorico {
    id: number;
    origem: string;
    destino: string;
    tempo: string;
    distancia: string;
    modo: 'car' | 'walking' | 'bus' | 'bicycle';
}

export default function HistoricoScreen() {
    const [rotas, setRotas] = useState<RotaHistorico[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        initDatabase();
        carregar();
    }, []);

    const carregar = async () => {
        try {
            setLoading(true);
            const data = await listarRotas();

            const parsed = data.map((r: any) => ({
                ...r,
                // força o modo a um dos valores válidos
                modo: (['car', 'walking', 'bus', 'bicycle'].includes(r.modo)
                    ? r.modo
                    : 'car') as 'car' | 'walking' | 'bus' | 'bicycle',
            }));

            setRotas(parsed);
        } catch (e) {
            console.error('Erro ao carregar histórico', e);
        } finally {
            setLoading(false);
        }
    };

    const limpar = async () => {
        await limparHistorico();
        carregar();
    };

    const handlePress = (item: RotaHistorico) => {
        // Redireciona para a tela Home passando os dados da rota
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

    const renderItem = ({ item }: { item: RotaHistorico }) => (
        <TouchableOpacity style={styles.card} onPress={() => handlePress(item)}>
            <View style={styles.cardHeader}>
                <Ionicons name="navigate-circle" size={22} color={BLUE} style={{ marginRight: 10 }} />
                <Text style={styles.cardTime}>{item.tempo}</Text>
                <Text style={styles.cardDistance}>({item.distancia})</Text>
            </View>

            <Text style={styles.locationText}>De: <Text style={styles.locationBold}>{item.origem}</Text></Text>
            <Text style={styles.locationText}>Para: <Text style={styles.locationBold}>{item.destino}</Text></Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Histórico</Text>
                <TouchableOpacity onPress={limpar}>
                    <Ionicons name="trash" size={24} color={BLUE} />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator color={BLUE} size="large" style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={rotas}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="map-outline" size={50} color={DARK_GRAY} />
                            <Text style={styles.emptyText}>Nenhuma rota registrada ainda.</Text>
                            <Text style={styles.emptySubtitle}>Calcule sua primeira rota na Home!</Text>
                        </View>
                    }
                    contentContainerStyle={{ padding: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        paddingTop: Platform.OS === 'ios' ? 70 : 20,
        paddingHorizontal: 20,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#000' },
    card: {
        backgroundColor: LIGHT_GRAY,
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    cardTime: { fontSize: 16, fontWeight: 'bold', color: BLUE },
    cardDistance: { fontSize: 14, color: DARK_GRAY, marginLeft: 5 },
    locationText: { fontSize: 15, color: DARK_GRAY },
    locationBold: { fontWeight: '600', color: '#000' },
    emptyContainer: { alignItems: 'center', marginTop: 50 },
    emptyText: { fontSize: 18, fontWeight: 'bold', marginTop: 15, color: DARK_GRAY },
    emptySubtitle: { fontSize: 14, color: DARK_GRAY, marginTop: 5 },
});
