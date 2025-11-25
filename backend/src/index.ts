import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import { nodes, edges, dijkstra, reconstructPath, aStar, Edge } from "./graph";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// ✅ Endpoint de teste
app.get("/", (req, res) => {
  res.send({ message: "🚀 API do Sistema de Navegação Urbana funcionando!" });
});

// 🧭 Função para geocodificar nomes de ruas (via OpenStreetMap / Nominatim)
async function geocode(address: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ", São Caetano do Sul, São Paulo, Brasil")}`;
  const res = await fetch(url, { headers: { "User-Agent": "NavApp/1.0" } });

  // 👇 Tipagem explícita: garantimos que o JSON seja um array de objetos com lat/lon
  const data = (await res.json()) as { lat: string; lon: string }[];

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`Endereço não encontrado: ${address}`);
  }

  const { lat, lon } = data[0];
  return { lat: parseFloat(lat), lng: parseFloat(lon) };
}

// 🧩 Encontra o nó mais próximo de uma coordenada
function encontrarNoMaisProximo(lat: number, lng: number) {
  let minDist = Infinity;
  let noMaisProximo = nodes[0];

  for (const n of nodes) {
    const d = Math.hypot(lat - n.lat, lng - n.lng);
    if (d < minDist) {
      minDist = d;
      noMaisProximo = n;
    }
  }

  return noMaisProximo;
}

// ✅ Endpoint para calcular rota
// ✅ Endpoint para calcular rota
app.post("/rota", async (req, res) => {
  try {
    let { origemId, destinoId, algoritmo } = req.body;

    if (!origemId || !destinoId) {
      return res.status(400).json({ error: "origemId e destinoId são obrigatórios." });
    }

    // Se origem/destino forem textos (nomes de ruas), geocodifica e acha o nó mais próximo
    if (/[a-zA-Z]/.test(origemId)) {
      const geo = await geocode(origemId);
      const no = encontrarNoMaisProximo(geo.lat, geo.lng);
      origemId = no.id;
      console.log(`📍 Origem "${origemId}" → Nó mais próximo: ${no.id}`);
    }

    if (/[a-zA-Z]/.test(destinoId)) {
      const geo = await geocode(destinoId);
      const no = encontrarNoMaisProximo(geo.lat, geo.lng);
      destinoId = no.id;
      console.log(`🏁 Destino "${destinoId}" → Nó mais próximo: ${no.id}`);
    }

    // 🔹 ADICIONE ESTES LOGS AQUI:
    console.log("🟢 Origem nó mais próximo:", origemId);
    console.log("🔵 Destino nó mais próximo:", destinoId);

    console.time("⏱️ Tempo de cálculo da rota");

    let path: string[] = [];

    try {
      if (algoritmo === "astar") {
        console.log("🚀 Calculando com A*...");
        path = aStar(origemId, destinoId);
      } else {
        console.log("🚀 Calculando com Dijkstra...");
        const { prev } = dijkstra(origemId);
        path = reconstructPath(prev, destinoId);
      }
    } catch (err) {
      console.error("❌ Erro dentro do cálculo:", err);
    }

    console.timeEnd("⏱️ Tempo de cálculo da rota");

    if (path.length === 0) {
      return res.status(404).json({ error: "Não foi possível encontrar uma rota." });
    }

    const pathNodes = path
      .map((id) => nodes.find((n) => n.id === id))
      .filter((n): n is typeof nodes[0] => n !== undefined);

    // 🔹 Calcula distância e tempo total
    let totalDistance = 0;
    let totalTime = 0; // ⏱️ novo
    const pathEdges: Edge[] = [];

    for (let i = 1; i < path.length; i++) {
      const edge =
        edges.find((e) => e.from === path[i - 1] && e.to === path[i]) ||
        edges.find((e) => e.from === path[i] && e.to === path[i - 1]); // 🔄 bidirecional
      if (edge) {
        totalDistance += edge.distance;
        totalTime += edge.tempo; // ⏱️ soma o tempo
        pathEdges.push(edge);
      }
    }

    // 🔹 Monta polyline detalhada com nomes de ruas
    interface PontoComNome {
      lat: number;
      lng: number;
      nome?: string;
    }

    const polyline: PontoComNome[] = [];

    for (const e of pathEdges) {
      const nomeRua = e.nomeRua && e.nomeRua.trim() !== "" ? e.nomeRua : "Via sem nome";

      // Tenta usar o caminho detalhado (se existir)
      if (Array.isArray(e.path) && e.path.length > 0) {
        for (const p of e.path) {
          const ultimo = polyline[polyline.length - 1];
          // Evita duplicar pontos idênticos
          if (!ultimo || ultimo.lat !== p.lat || ultimo.lng !== p.lng) {
            polyline.push({ lat: p.lat, lng: p.lng, nome: nomeRua });
          }
        }
      } else {
        // Caso o path esteja vazio, usa os nós "from" e "to"
        const fromNode = nodes.find((n) => n.id === e.from);
        const toNode = nodes.find((n) => n.id === e.to);

        if (fromNode && toNode) {
          const ultimo = polyline[polyline.length - 1];
          if (!ultimo || ultimo.lat !== fromNode.lat || ultimo.lng !== fromNode.lng) {
            polyline.push({ lat: fromNode.lat, lng: fromNode.lng, nome: nomeRua });
          }
          polyline.push({ lat: toNode.lat, lng: toNode.lng, nome: nomeRua });
        }
      }
    }

    // 🔹 Corrige pontos consecutivos com o mesmo nome
    // (garante continuidade e evita que todas as ruas se fundam)
    for (let i = 1; i < polyline.length; i++) {
      if (polyline[i].nome === undefined) polyline[i].nome = polyline[i - 1].nome;
    }


    // 🔸 Fallback se não houver path detalhado
    if (polyline.length === 0 && pathNodes.length > 0) {
      for (const n of pathNodes) {
        polyline.push({
          lat: n.lat,
          lng: n.lng,
          nome: "Via sem nome",
        });
      }
    }

    // 🧾 Log das ruas percorridas
    console.log("🚗 Ruas percorridas:");
    for (const e of pathEdges) {
      console.log(`➡️ ${e.nomeRua || "Via sem nome"} (${e.distance.toFixed(1)} m)`);
    }

    res.json({
      path,
      pathNodes,
      pathEdges,
      totalDistance,
      totalTime, // ⏱️ novo
      polyline,
    });
  } catch (error: any) {
    console.error("❌ Erro ao calcular rota:", error.message);
    res.status(500).json({ error: "Erro interno ao calcular rota." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend rodando em http://localhost:${PORT}`);
});
