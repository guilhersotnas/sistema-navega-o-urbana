import fs from "fs";
import path from "path";

// ---------------- TIPOS ----------------
export interface Node {
  id: string;
  lat: number;
  lng: number;
}

export interface Edge {
  from: string;
  to: string;
  distance: number;
  tempo: number;
  modo: "car" | "walking" | "bicycle" | "bus";
  nomeRua?: string; // ✅ adiciona esta linha
  path: { lat: number; lng: number }[];
}

// ---------------- LEITURA DOS DADOS ----------------
const nodesPath = path.join(__dirname, "..", "data", "nodes.json");
const edgesPath = path.join(__dirname, "..", "data", "edges.json");

export const nodes: Node[] = JSON.parse(fs.readFileSync(nodesPath, "utf-8"));
export const edges: Edge[] = JSON.parse(fs.readFileSync(edgesPath, "utf-8"));

// 🔹 Calcula tempo estimado para cada aresta se for 0
for (const e of edges) {
  if (!e.tempo || e.tempo === 0) {
    let velocidade = 0; // m/s

    switch (e.modo) {
      case "car":
        velocidade = 13.89; // 50 km/h
        break;
      case "walking":
        velocidade = 1.4; // 5 km/h
        break;
      case "bicycle":
        velocidade = 4.17; // 15 km/h
        break;
      case "bus":
        velocidade = 11.11; // 40 km/h
        break;
      default:
        velocidade = 13.89;
    }

    e.tempo = e.distance / velocidade; // tempo em segundos
  }
}

// ---------------- GRAFO BIDIRECIONAL ----------------
const graph: Record<string, Edge[]> = {};
for (const e of edges) {
  if (!graph[e.from]) graph[e.from] = [];
  if (!graph[e.to]) graph[e.to] = [];
  graph[e.from].push(e);
  graph[e.to].push({ ...e, from: e.to, to: e.from }); // bidirecional
}

// ---------------- FUNÇÕES AUXILIARES ----------------
function heuristic(a: Node, b: Node): number {
  const dx = a.lat - b.lat;
  const dy = a.lng - b.lng;
  return Math.sqrt(dx * dx + dy * dy) * 111000; // metros por grau aproximado
}

// Pequena fila de prioridade (min-heap)
class MinHeap<T> {
  private heap: { key: number; value: T }[] = [];

  insert(key: number, value: T) {
    this.heap.push({ key, value });
    this.bubbleUp();
  }

  extractMin(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const end = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = end;
      this.bubbleDown();
    }
    return min.value;
  }

  private bubbleUp() {
    let i = this.heap.length - 1;
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.heap[i].key >= this.heap[p].key) break;
      [this.heap[i], this.heap[p]] = [this.heap[p], this.heap[i]];
      i = p;
    }
  }

  private bubbleDown() {
    let i = 0;
    const len = this.heap.length;
    while (true) {
      let l = 2 * i + 1,
        r = 2 * i + 2,
        s = i;
      if (l < len && this.heap[l].key < this.heap[s].key) s = l;
      if (r < len && this.heap[r].key < this.heap[s].key) s = r;
      if (s === i) break;
      [this.heap[i], this.heap[s]] = [this.heap[s], this.heap[i]];
      i = s;
    }
  }
}

// ---------------- ALGORITMOS ----------------
export function dijkstra(startId: string) {
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited = new Set<string>();
  const pq = new MinHeap<string>();

  for (const n of nodes) {
    dist[n.id] = Infinity;
    prev[n.id] = null;
  }
  dist[startId] = 0;
  pq.insert(0, startId);

  while (true) {
    const current = pq.extractMin();
    if (!current) break;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const e of graph[current] || []) {
      const alt = dist[current] + e.distance;
      if (alt < dist[e.to]) {
        dist[e.to] = alt;
        prev[e.to] = current;
        pq.insert(alt, e.to);
      }
    }
  }

  return { dist, prev };
}

export function aStar(startId: string, endId: string): string[] {
  const startNode = nodes.find((n) => n.id === startId);
  const endNode = nodes.find((n) => n.id === endId);
  if (!startNode || !endNode) return [];

  const open = new MinHeap<string>();
  const cameFrom: Record<string, string | null> = {};
  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const closed = new Set<string>();

  for (const n of nodes) {
    gScore[n.id] = Infinity;
    fScore[n.id] = Infinity;
    cameFrom[n.id] = null;
  }

  gScore[startId] = 0;
  fScore[startId] = heuristic(startNode, endNode);
  open.insert(fScore[startId], startId);

  while (true) {
    const current = open.extractMin();
    if (!current) break;
    if (current === endId) return reconstructPath(cameFrom, endId);
    if (closed.has(current)) continue;

    closed.add(current);

    for (const e of graph[current] || []) {
      const tentativeG = gScore[current] + e.distance;
      if (tentativeG < gScore[e.to]) {
        cameFrom[e.to] = current;
        gScore[e.to] = tentativeG;
        const h = heuristic(nodes.find((n) => n.id === e.to)!, endNode);
        fScore[e.to] = tentativeG + h;
        open.insert(fScore[e.to], e.to);
      }
    }
  }

  return [];
}

export function reconstructPath(
  prev: Record<string, string | null>,
  endId: string
) {
  const path: string[] = [];
  let u: string | null = endId;
  while (u) {
    path.unshift(u);
    u = prev[u];
  }
  return path;
}