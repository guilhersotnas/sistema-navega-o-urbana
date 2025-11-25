import os
from pyrosm import OSM
from tqdm import tqdm
import json

# Caminho do arquivo .pbf
OSM_FILE = os.path.join("data", "sao-paulo-latest.osm.pbf")

print("🔍 Verificando arquivo:", OSM_FILE)
if not os.path.exists(OSM_FILE):
    print("❌ ERRO: Arquivo não encontrado! Verifique o caminho e o nome do arquivo.")
    exit()

print("📍 Carregando dados OSM (somente São Caetano do Sul)...")
osm = OSM(OSM_FILE)

# Extrai apenas vias de carro
roads = osm.get_network(network_type="driving")

if roads is None or roads.empty:
    print("⚠️ Nenhuma via foi carregada!")
    exit()

print(f"✅ {len(roads)} vias carregadas no total.")

# 🔹 Filtra área geográfica aproximada de São Caetano do Sul
# Oeste–Leste (-46.585 a -46.525), Sul–Norte (-23.655 a -23.565)
roads = roads.cx[-46.585:-46.525, -23.655:-23.565]
print(f"📍 {len(roads)} vias dentro do recorte de São Caetano do Sul.")

if roads.empty:
    print("❌ Nenhuma via encontrada dentro do recorte de São Caetano do Sul.")
    exit()

# 🔹 Gera grafo
print("⚙️ Gerando grafo (isso deve ser rápido)...")
G = osm.to_graph(roads, graph_type="networkx")

print(f"🔗 Nós: {G.number_of_nodes()}, Arestas: {G.number_of_edges()}")

# 🔹 Exporta nodes e edges
nodes = []
for node_id, data in G.nodes(data=True):
    nodes.append({
        "id": str(node_id),
        "lat": data.get("y"),
        "lng": data.get("x")
    })

edges = []
for u, v, data in tqdm(G.edges(data=True), desc="Processando arestas"):
    path = []
    if "geometry" in data and data["geometry"]:
        coords = list(data["geometry"].coords)
        path = [{"lat": lat, "lng": lon} for lon, lat in coords]

    edges.append({
        "from": str(u),
        "to": str(v),
        "distance": float(data.get("length", 0)),
        "tempo": 0,
        "modo": "car",
        "path": path
    })

# 🔹 Salva os arquivos
output_dir = "data"
os.makedirs(output_dir, exist_ok=True)

with open(os.path.join(output_dir, "nodes.json"), "w", encoding="utf-8") as f:
    json.dump(nodes, f, ensure_ascii=False, indent=2)

with open(os.path.join(output_dir, "edges.json"), "w", encoding="utf-8") as f:
    json.dump(edges, f, ensure_ascii=False, indent=2)

print("✅ Arquivos salvos com sucesso em /data/")
