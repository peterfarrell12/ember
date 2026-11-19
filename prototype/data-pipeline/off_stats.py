import csv, sys, collections
csv.field_size_limit(10**9)
r=csv.reader(open('/home/claude/data/off_raw.tsv',encoding='utf-8',errors='replace'),delimiter='\t',quoting=csv.QUOTE_NONE)
h=next(r); ix={k:i for i,k in enumerate(h)}
c=collections.Counter(); sc=collections.Counter()
for row in r:
    if len(row)!=len(h): c['bad']+=1; continue
    ct=row[ix['countries_tags']]
    ie='en:ireland' in ct; uk='en:united-kingdom' in ct
    try: s=float(row[ix['unique_scans_n']] or 0)
    except: s=0
    k='IE' if ie else ('UK' if uk else 'other')
    c[k]+=1
    b=0 if s==0 else (1 if s<3 else (3 if s<10 else 10))
    sc[(k,b)]+=1
print(c); print(sorted(sc.items()))
