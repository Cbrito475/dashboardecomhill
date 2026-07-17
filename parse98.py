import re, json

path = r"C:\Users\PC\.claude\projects\c--Users-PC-Documents-N8N\30bc3db0-1924-46b1-a9b8-fe9fcfceccea\tool-results\shard98_full.txt"
with open(path, encoding='utf-8') as f:
    raw = f.read()

obj = json.loads(raw)
text = obj['result']
opens = [m.end() for m in re.finditer(r'<untrusted-data-[0-9a-f-]+>', text)]
closes = [m.start() for m in re.finditer(r'</untrusted-data-[0-9a-f-]+>', text)]
end = closes[0]
start = max(o for o in opens if o < end)
arr_text = text[start:end].strip()
data = json.loads(arr_text)
print("total rows", len(data))

from collections import defaultdict
groups = defaultdict(list)
for row in data:
    groups[row['hilo_id']].append(row)

out = []
for hilo_id, rows in groups.items():
    rows.sort(key=lambda r: r['fecha'])
    emails = set()
    for r in rows:
        m = re.search(r'[\w.+-]+@[\w.-]+', r['remitente'])
        if m and 'lorentinachile' not in m.group(0):
            emails.add(m.group(0))
    out.append({
        'hilo_id': hilo_id,
        'n': len(rows),
        'fecha_max': rows[-1]['fecha'],
        'email': list(emails),
        'asuntos': list(set(r['asunto'] for r in rows))[:2],
        'cuerpos': [(r['cuerpo'] or '')[:400] for r in rows][:4],  # first up to 4 msgs, truncated
    })

with open(r"C:\Users\PC\Documents\N8N\sac\dashboard\shard98_grouped.json", 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print("hilos", len(out))
