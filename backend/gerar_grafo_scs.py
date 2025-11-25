import os
from pyrosm import OSM
from tqdm import tqdm
import json
import networkx as nx
from shapely.geometry import LineString, MultiLineString

OSM_FILE = os.path.join("data", "sao-paulo-latest.osm.pbf")

print("🔍 Verificando arquivo:", OSM_FILE)
if not os.path.exists(OSM_FILE):
    print("❌ ERRO: Arquivo não encontrado!")
    exit()

print("📍 Carregando dados OSM (região ampliada de São Caetano do Sul)...")

# 🔹 Recorte ampliado (cobre toda São Caetano + entorno)
osm = OSM(OSM_FILE, bounding_box=[-46.62, -23.66, -46.52, -23.57])

# 🔹 Extrai vias para carros
roads = osm.get_network(network_type="driving")

if roads is None or roads.empty:
    print("⚠️ Nenhuma via encontrada.")
    exit()

print(f"✅ {len(roads)} vias carregadas dentro do recorte definido.")

# 🔹 Gera o grafo manualmente
print("⚙️ Gerando grafo manualmente com NetworkX...")

G = nx.Graph()
node_street_map = {}  # dicionário auxiliar para guardar o nome da rua de cada nó

for _, row in tqdm(roads.iterrows(), total=len(roads), desc="Adicionando arestas"):
    geom = row.geometry
    nome_rua = row.get("name", "Via sem nome")

    if geom is None:
        continue

    # Algumas vias são MultiLineString — quebramos em segmentos individuais
    if isinstance(geom, MultiLineString):
        lines = list(geom.geoms)
    elif isinstance(geom, LineString):
        lines = [geom]
    else:
        continue

    for line in lines:
        coords = list(line.coords)
        for i in range(len(coords) - 1):
            lon1, lat1 = coords[i]
            lon2, lat2 = coords[i + 1]

            n1 = f"{lat1:.6f},{lon1:.6f}"
            n2 = f"{lat2:.6f},{lon2:.6f}"

            G.add_node(n1, x=lon1, y=lat1)
            G.add_node(n2, x=lon2, y=lat2)

            # Guarda o nome da rua associada a esse nó (último nome substitui)
            node_street_map[n1] = nome_rua
            node_street_map[n2] = nome_rua

            dist = ((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2) ** 0.5 * 111_000

            G.add_edge(
                n1,
                n2,
                length=dist,
                highway=row.get("highway", "unknown"),
                nomeRua=nome_rua
            )

print(f"🔗 Nós totais: {G.number_of_nodes()}, Arestas: {G.number_of_edges()}")

# 🔹 Verifica conectividade (mantém o maior componente)
components = list(nx.connected_components(G))
print(f"🧩 Componentes conectados encontrados: {len(components)}")

if len(components) > 1:
    largest_component = max(components, key=len)
    G = G.subgraph(largest_component).copy()
    print(f"✅ Mantido apenas o maior componente: {len(largest_component)} nós")

# 🔹 Exporta nodes e edges com nome da rua
nodes = []
for node_id, data in G.nodes(data=True):
    nodes.append({
        "id": str(node_id),
        "lat": data.get("y"),
        "lng": data.get("x"),
        "nome": node_street_map.get(node_id, "Via sem nome")
    })

edges = []
for u, v, data in tqdm(G.edges(data=True), desc="Processando arestas"):
    edges.append({
        "from": str(u),
        "to": str(v),
        "distance": float(data.get("length", 0)),
        "tempo": 0,
        "modo": "car",
        "nomeRua": data.get("nomeRua", "Via sem nome"),
        "path": []
    })

os.makedirs("data", exist_ok=True)
with open("data/nodes.json", "w", encoding="utf-8") as f:
    json.dump(nodes, f, ensure_ascii=False, indent=2)

with open("data/edges.json", "w", encoding="utf-8") as f:
    json.dump(edges, f, ensure_ascii=False, indent=2)

print("✅ Arquivos salvos com sucesso em /data/")
print("📊 Geração concluída — agora com nomes de ruas incluídos! 🚗💨")
