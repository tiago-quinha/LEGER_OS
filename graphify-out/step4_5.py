import json
from pathlib import Path
import networkx as nx
import graphify.build
import graphify.cluster
import graphify.export
import graphify.report
import graphify.analyze

ast_path = Path('graphify-out/.graphify_ast.json')
sem_path = Path('graphify-out/.graphify_semantic.json')

ast = json.loads(ast_path.read_text(encoding='utf-8')) if ast_path.exists() else {'nodes':[], 'edges':[]}
semantic = json.loads(sem_path.read_text(encoding='utf-8')) if sem_path.exists() else {'nodes':[], 'edges':[]}

# Build graph
G = graphify.build.build([ast, semantic])
print(f"Graph built: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

# Cluster communities
communities = graphify.cluster.cluster(G)
print(f"Communities detected: {len(communities)}")

# Cohesion scores
cohesion_scores = {}
community_labels = {}

for cid, nodes in communities.items():
    cohesion_scores[cid] = graphify.cluster.cohesion_score(G, nodes)
    # Find most central node in community
    subgraph = G.subgraph(nodes)
    if len(nodes) > 0:
        degrees = dict(subgraph.degree())
        top_node = max(degrees, key=degrees.get)
        label = G.nodes[top_node].get('label', top_node)
        community_labels[cid] = f"{label} Core"
    else:
        community_labels[cid] = f"Community {cid}"

# God nodes & Surprises
god_node_list = graphify.analyze.god_nodes(G, top_n=10)
surprise_list = graphify.analyze.surprising_connections(G, communities=communities, top_n=5)
suggested_q = graphify.analyze.suggest_questions(G, communities, community_labels, top_n=7)

# Export graph.json
graphify.export.to_json(G, communities, 'graphify-out/graph.json')
print("Exported graphify-out/graph.json")

# Export graph.html
graphify.export.to_html(G, communities, 'graphify-out/graph.html', community_labels=community_labels)
print("Exported graphify-out/graph.html")

# Detection result metadata
detect_res = json.loads(Path('graphify-out/.graphify_detect.json').read_text(encoding='utf-8'))
token_cost = {
    'input_tokens': ast.get('input_tokens', 0) + semantic.get('input_tokens', 0),
    'output_tokens': ast.get('output_tokens', 0) + semantic.get('output_tokens', 0)
}

# Generate GRAPH_REPORT.md
report_md = graphify.report.generate(
    G=G,
    communities=communities,
    cohesion_scores=cohesion_scores,
    community_labels=community_labels,
    god_node_list=god_node_list,
    surprise_list=surprise_list,
    detection_result=detect_res,
    token_cost=token_cost,
    root='.',
    suggested_questions=suggested_q
)

Path('graphify-out/GRAPH_REPORT.md').write_text(report_md, encoding='utf-8')
print("Generated graphify-out/GRAPH_REPORT.md")
