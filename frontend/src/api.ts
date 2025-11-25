export const EXPO_PUBLIC_API_URL = "http://192.168.0.168:3000";

export interface Node {
    id: string;
    nome: string;
    lat: number;
    lng: number;
}

export interface RotaResponse {
    pathNodes: Node[];
    path: string[];
    totalDistance: number;
    pathEdges?: {
        from: string;
        to: string;
        distance: number;
        tempo: number;
        modo: string;
        path: { lat: number; lng: number }[];
    }[];
    polyline: { lat: number; lng: number }[];
}

export async function calcularRota(
    origemId: string,
    destinoId: string,
    algoritmo: 'dijkstra' | 'astar' = 'dijkstra'
): Promise<RotaResponse> {
    try {
        const response = await fetch(`${EXPO_PUBLIC_API_URL}/rota`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origemId, destinoId, algoritmo }),
        });

        if (!response.ok) {
            throw new Error('Erro ao calcular rota');
        }

        const data: RotaResponse = await response.json();
        return data;

    } catch (error) {
        console.error(error);
        throw error;
    }
}
