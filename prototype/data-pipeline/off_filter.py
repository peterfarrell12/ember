import sys, csv
csv.field_size_limit(10**9)
r = csv.reader(sys.stdin, delimiter='\t', quoting=csv.QUOTE_NONE)
hdr = next(r)
ix = {h:i for i,h in enumerate(hdr)}
want = ['code','product_name','brands','quantity','serving_size','serving_quantity','countries_tags','unique_scans_n','completeness',
        'energy-kcal_100g','energy_100g','fat_100g','saturated-fat_100g','carbohydrates_100g','sugars_100g','fiber_100g','proteins_100g','salt_100g','categories_tags','product_quantity','lang']
wi = [ix.get(w) for w in want]
sys.stderr.write('missing: %s\n' % [w for w,i in zip(want,wi) if i is None])
w = csv.writer(sys.stdout, delimiter='\t', quoting=csv.QUOTE_NONE, escapechar='\\', quotechar=None)
w.writerow(want)
n=k=0
ci=ix['countries_tags']; si=ix.get('unique_scans_n'); ni=ix['product_name']; ki=ix['energy-kcal_100g']; ei=ix['energy_100g']
pi=ix['proteins_100g']; fi=ix['fat_100g']; cbi=ix['carbohydrates_100g']
for row in r:
    n+=1
    if len(row) < len(hdr): continue
    if not row[ni] or not (row[ki] or row[ei]) or not row[pi] or not row[fi] or not row[cbi]: continue
    c = row[ci]
    keep = ('en:ireland' in c) or ('en:united-kingdom' in c)
    if not keep:
        try: keep = float(row[si] or 0) >= 15
        except: keep = False
    if not keep: continue
    k+=1
    w.writerow([ (row[i] if i is not None else '').replace('\t',' ').replace('\n',' ').replace('\\','') for i in wi])
    if k % 20000 == 0: sys.stderr.write('%d/%d\n' % (k,n)); sys.stderr.flush()
sys.stderr.write('done %d/%d\n' % (k,n))
